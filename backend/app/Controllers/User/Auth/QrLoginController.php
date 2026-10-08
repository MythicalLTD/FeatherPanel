<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Controllers\User\Auth;

use App\Chat\User;
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Discord-style QR login: desktop starts a challenge, phone (already logged in)
 * approves, desktop exchanges a one-time token for a session cookie.
 */
class QrLoginController
{
    private const CHALLENGE_TTL_MINUTES = 3;
    private const EXCHANGE_TTL_MINUTES = 2;
    private const EXPIRES_IN_SECONDS = 180;
    private const POLL_INTERVAL_SECONDS = 2;
    private const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private const CACHE_PREFIX = 'qr_login:';
    private const CODE_PREFIX = 'qr_login_code:';
    private const EXCHANGE_PREFIX = 'qr_login_exchange:';
    private const POLL_PREFIX = 'qr_login_last_poll:';

    #[OA\Post(
        path: '/api/user/auth/qr/start',
        summary: 'Start QR login challenge',
        description: 'Creates a short-lived QR login challenge for Discord-style sign-in from a phone that is already logged in.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Challenge created'),
            new OA\Response(response: 429, description: 'Rate limited'),
        ]
    )]
    public function start(Request $request): Response
    {
        $challengeId = bin2hex(random_bytes(16));
        $desktopSecret = bin2hex(random_bytes(32));
        $userCode = $this->generateUserCode();
        $now = time();

        $payload = [
            'status' => 'pending',
            'desktop_secret_hash' => hash('sha256', $desktopSecret),
            'user_code' => $userCode,
            'desktop_ip' => CloudFlareRealIP::getRealIP(),
            'desktop_ua' => substr((string) $request->headers->get('User-Agent', ''), 0, 512),
            'user_uuid' => null,
            'approver_ip' => null,
            'exchange_token' => null,
            'created_at' => $now,
            'expires_at' => $now + self::EXPIRES_IN_SECONDS,
        ];

        Cache::put(self::CACHE_PREFIX . $challengeId, $payload, self::CHALLENGE_TTL_MINUTES);
        Cache::put(self::CODE_PREFIX . $this->normalizeUserCode($userCode), $challengeId, self::CHALLENGE_TTL_MINUTES);

        $verificationUri = AppUrlHelper::baseUrl() . '/dashboard/account/login-device';
        $verificationUriComplete = AppUrlHelper::baseUrl() . '/auth/qr?c=' . urlencode($challengeId);

        return ApiResponse::success([
            'challenge_id' => $challengeId,
            'desktop_secret' => $desktopSecret,
            'user_code' => $userCode,
            'expires_in' => self::EXPIRES_IN_SECONDS,
            'poll_interval' => self::POLL_INTERVAL_SECONDS,
            'verification_uri' => $verificationUri,
            'verification_uri_complete' => $verificationUriComplete,
        ], 'QR login challenge started', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/qr/poll',
        summary: 'Poll QR login challenge',
        description: 'Desktop polls challenge status. When approved, returns a one-time exchange_token.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Challenge status'),
            new OA\Response(response: 400, description: 'Invalid challenge or secret'),
            new OA\Response(response: 429, description: 'Polling too fast'),
        ]
    )]
    public function poll(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_BODY', 400);
        }

        $challengeId = isset($data['challenge_id']) && is_string($data['challenge_id'])
            ? trim($data['challenge_id'])
            : '';
        $desktopSecret = isset($data['desktop_secret']) && is_string($data['desktop_secret'])
            ? trim($data['desktop_secret'])
            : '';

        if ($challengeId === '' || $desktopSecret === '') {
            return ApiResponse::error('challenge_id and desktop_secret are required', 'MISSING_FIELDS', 400);
        }

        $challenge = $this->loadChallenge($challengeId);
        if ($challenge === null) {
            return ApiResponse::error('Challenge not found or expired', 'QR_CHALLENGE_EXPIRED', 400);
        }

        if (!$this->verifyDesktopSecret($challenge, $desktopSecret)) {
            return ApiResponse::error('Invalid desktop secret', 'INVALID_DESKTOP_SECRET', 400);
        }

        $pollKey = self::POLL_PREFIX . hash('sha256', $challengeId);
        $now = time();
        $lastPoll = Cache::get($pollKey);
        if (is_numeric($lastPoll) && ($now - (int) $lastPoll) < self::POLL_INTERVAL_SECONDS) {
            return ApiResponse::error('Slow down', 'SLOW_DOWN', 429, [
                'status' => $challenge['status'],
                'interval' => self::POLL_INTERVAL_SECONDS,
            ]);
        }
        Cache::put($pollKey, $now, 1);

        if ($this->isExpired($challenge)) {
            $this->forgetChallenge($challengeId, $challenge);

            return ApiResponse::success([
                'status' => 'expired',
            ], 'Challenge expired', 200);
        }

        $status = (string) ($challenge['status'] ?? 'pending');
        $response = [
            'status' => $status,
            'user_code' => $challenge['user_code'] ?? null,
            'expires_in' => max(0, (int) ($challenge['expires_at'] ?? $now) - $now),
        ];

        if (in_array($status, ['scanned', 'approved'], true)) {
            $scanner = $this->publicScannerProfile(
                isset($challenge['user_uuid']) && is_string($challenge['user_uuid'])
                    ? $challenge['user_uuid']
                    : null
            );
            if ($scanner !== null) {
                $response['scanner'] = $scanner;
            }
        }

        if ($status === 'approved' && !empty($challenge['exchange_token'])) {
            $response['exchange_token'] = $challenge['exchange_token'];
        }

        return ApiResponse::success($response, 'QR login status', 200);
    }

    #[OA\Get(
        path: '/api/user/auth/qr/{challenge_id}',
        summary: 'Get QR login challenge for approval',
        description: 'Authenticated phone loads challenge details and marks it as scanned.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Challenge details'),
            new OA\Response(response: 400, description: 'Invalid or expired challenge'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function show(Request $request, array $args): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        $challengeId = isset($args['challenge_id']) && is_string($args['challenge_id'])
            ? trim($args['challenge_id'])
            : '';
        if ($challengeId === '' || !preg_match('/^[a-f0-9]{32}$/', $challengeId)) {
            return ApiResponse::error('Invalid challenge id', 'INVALID_CHALLENGE_ID', 400);
        }

        $challenge = $this->loadChallenge($challengeId);
        if ($challenge === null || $this->isExpired($challenge)) {
            if ($challenge !== null) {
                $this->forgetChallenge($challengeId, $challenge);
            }

            return ApiResponse::error('Challenge not found or expired', 'QR_CHALLENGE_EXPIRED', 400);
        }

        $status = (string) ($challenge['status'] ?? 'pending');
        if (in_array($status, ['denied', 'consumed'], true)) {
            return ApiResponse::error('Challenge is no longer available', 'QR_CHALLENGE_UNAVAILABLE', 400);
        }

        if ($status === 'approved') {
            // Already approved — phone can still show confirmation state.
        } elseif ($status === 'scanned') {
            $boundUuid = isset($challenge['user_uuid']) && is_string($challenge['user_uuid'])
                ? $challenge['user_uuid']
                : '';
            if ($boundUuid !== '' && $boundUuid !== (string) $user['uuid']) {
                return ApiResponse::error(
                    'This QR code was already scanned by another account',
                    'QR_CHALLENGE_CLAIMED',
                    400
                );
            }
        } elseif ($status === 'pending') {
            $challenge['status'] = 'scanned';
            $challenge['user_uuid'] = $user['uuid'];
            $challenge['approver_ip'] = CloudFlareRealIP::getRealIP();
            $this->storeChallenge($challengeId, $challenge);
            $status = 'scanned';
        } else {
            return ApiResponse::error('Challenge is no longer available', 'QR_CHALLENGE_UNAVAILABLE', 400);
        }

        return ApiResponse::success([
            'challenge_id' => $challengeId,
            'status' => $status,
            'user_code' => $challenge['user_code'] ?? null,
            'desktop_ip' => $challenge['desktop_ip'] ?? null,
            'desktop_ua' => $challenge['desktop_ua'] ?? null,
            'expires_in' => max(0, (int) ($challenge['expires_at'] ?? time()) - time()),
        ], 'QR login challenge', 200);
    }

    #[OA\Get(
        path: '/api/user/auth/qr/code/{user_code}',
        summary: 'Look up QR login challenge by user code',
        description: 'Authenticated user enters the short code shown on another device to load and mark the challenge as scanned.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Challenge details'),
            new OA\Response(response: 400, description: 'Invalid or expired code'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function showByCode(Request $request, array $args): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        $rawCode = isset($args['user_code']) && is_string($args['user_code'])
            ? $args['user_code']
            : '';
        $userCode = $this->normalizeUserCode($rawCode);
        if ($userCode === '' || !preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', $userCode)) {
            return ApiResponse::error('Invalid sign-in code', 'INVALID_USER_CODE', 400);
        }

        $challengeId = Cache::get(self::CODE_PREFIX . $userCode);
        if (!is_string($challengeId) || $challengeId === '') {
            return ApiResponse::error('Challenge not found or expired', 'QR_CHALLENGE_EXPIRED', 400);
        }

        return $this->show($request, ['challenge_id' => $challengeId]);
    }

    #[OA\Post(
        path: '/api/user/auth/qr/{challenge_id}/approve',
        summary: 'Approve QR login challenge',
        description: 'Authenticated phone approves the desktop login. Does not set a cookie on the phone; mints an exchange token for the desktop.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Approved'),
            new OA\Response(response: 400, description: 'Invalid challenge'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'User banned or deleted'),
        ]
    )]
    public function approve(Request $request, array $args): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        if (($user['banned'] ?? 'false') === 'true' || ($user['deleted'] ?? 'false') === 'true') {
            return ApiResponse::error('Account is not allowed to approve QR login', 'USER_BANNED', 403);
        }

        $challengeId = isset($args['challenge_id']) && is_string($args['challenge_id'])
            ? trim($args['challenge_id'])
            : '';
        if ($challengeId === '' || !preg_match('/^[a-f0-9]{32}$/', $challengeId)) {
            return ApiResponse::error('Invalid challenge id', 'INVALID_CHALLENGE_ID', 400);
        }

        $challenge = $this->loadChallenge($challengeId);
        if ($challenge === null || $this->isExpired($challenge)) {
            if ($challenge !== null) {
                $this->forgetChallenge($challengeId, $challenge);
            }

            return ApiResponse::error('Challenge not found or expired', 'QR_CHALLENGE_EXPIRED', 400);
        }

        $status = (string) ($challenge['status'] ?? 'pending');
        if (!in_array($status, ['pending', 'scanned'], true)) {
            return ApiResponse::error('Challenge cannot be approved', 'QR_CHALLENGE_UNAVAILABLE', 400);
        }

        $boundUuid = isset($challenge['user_uuid']) && is_string($challenge['user_uuid'])
            ? $challenge['user_uuid']
            : '';
        if ($boundUuid !== '' && $boundUuid !== (string) $user['uuid']) {
            return ApiResponse::error(
                'This QR code was claimed by another account',
                'QR_CHALLENGE_CLAIMED',
                403
            );
        }

        $exchangeToken = bin2hex(random_bytes(32));
        $challenge['status'] = 'approved';
        $challenge['user_uuid'] = $user['uuid'];
        $challenge['approver_ip'] = CloudFlareRealIP::getRealIP();
        $challenge['exchange_token'] = $exchangeToken;
        $this->storeChallenge($challengeId, $challenge);

        Cache::put(self::EXCHANGE_PREFIX . hash('sha256', $exchangeToken), [
            'challenge_id' => $challengeId,
            'user_uuid' => $user['uuid'],
            'expires_at' => time() + (self::EXCHANGE_TTL_MINUTES * 60),
        ], self::EXCHANGE_TTL_MINUTES);

        return ApiResponse::success([
            'status' => 'approved',
        ], 'QR login approved', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/qr/{challenge_id}/deny',
        summary: 'Deny QR login challenge',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Denied'),
            new OA\Response(response: 400, description: 'Invalid challenge'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function deny(Request $request, array $args): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        $challengeId = isset($args['challenge_id']) && is_string($args['challenge_id'])
            ? trim($args['challenge_id'])
            : '';
        if ($challengeId === '' || !preg_match('/^[a-f0-9]{32}$/', $challengeId)) {
            return ApiResponse::error('Invalid challenge id', 'INVALID_CHALLENGE_ID', 400);
        }

        $challenge = $this->loadChallenge($challengeId);
        if ($challenge === null || $this->isExpired($challenge)) {
            if ($challenge !== null) {
                $this->forgetChallenge($challengeId, $challenge);
            }

            return ApiResponse::error('Challenge not found or expired', 'QR_CHALLENGE_EXPIRED', 400);
        }

        $status = (string) ($challenge['status'] ?? 'pending');
        if (!in_array($status, ['pending', 'scanned'], true)) {
            return ApiResponse::error('Challenge cannot be denied', 'QR_CHALLENGE_UNAVAILABLE', 400);
        }

        $boundUuid = isset($challenge['user_uuid']) && is_string($challenge['user_uuid'])
            ? $challenge['user_uuid']
            : '';
        if ($boundUuid !== '' && $boundUuid !== (string) $user['uuid']) {
            return ApiResponse::error(
                'This QR code was claimed by another account',
                'QR_CHALLENGE_CLAIMED',
                403
            );
        }

        $challenge['status'] = 'denied';
        $challenge['user_uuid'] = $user['uuid'];
        $challenge['approver_ip'] = CloudFlareRealIP::getRealIP();
        $challenge['exchange_token'] = null;
        $this->storeChallenge($challengeId, $challenge);

        return ApiResponse::success([
            'status' => 'denied',
        ], 'QR login denied', 200);
    }

    #[OA\Post(
        path: '/api/user/auth/qr/exchange',
        summary: 'Exchange QR login token for session',
        description: 'Desktop redeems the one-time exchange_token and receives the remember_token cookie via completeLogin.',
        tags: ['User - Authentication'],
        responses: [
            new OA\Response(response: 200, description: 'Logged in'),
            new OA\Response(response: 400, description: 'Invalid or expired token'),
            new OA\Response(response: 403, description: 'User banned or deleted'),
        ]
    )]
    public function exchange(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_BODY', 400);
        }

        $exchangeToken = isset($data['exchange_token']) && is_string($data['exchange_token'])
            ? trim($data['exchange_token'])
            : '';
        if ($exchangeToken === '' || !preg_match('/^[a-f0-9]{64}$/', $exchangeToken)) {
            return ApiResponse::error('exchange_token is required', 'EXCHANGE_TOKEN_REQUIRED', 400);
        }

        $exchangeKey = self::EXCHANGE_PREFIX . hash('sha256', $exchangeToken);
        $exchange = Cache::get($exchangeKey);
        if (!is_array($exchange) || empty($exchange['user_uuid']) || empty($exchange['challenge_id'])) {
            return ApiResponse::error('Invalid or expired exchange token', 'INVALID_EXCHANGE_TOKEN', 400);
        }

        if (isset($exchange['expires_at']) && (int) $exchange['expires_at'] < time()) {
            Cache::forget($exchangeKey);

            return ApiResponse::error('Invalid or expired exchange token', 'INVALID_EXCHANGE_TOKEN', 400);
        }

        $challengeId = (string) $exchange['challenge_id'];
        $challenge = $this->loadChallenge($challengeId);
        if ($challenge === null) {
            Cache::forget($exchangeKey);

            return ApiResponse::error('Invalid or expired exchange token', 'INVALID_EXCHANGE_TOKEN', 400);
        }

        if (($challenge['status'] ?? '') !== 'approved' || ($challenge['exchange_token'] ?? '') !== $exchangeToken) {
            Cache::forget($exchangeKey);

            return ApiResponse::error('Invalid or expired exchange token', 'INVALID_EXCHANGE_TOKEN', 400);
        }

        $userInfo = User::getUserByUuid((string) $exchange['user_uuid']);
        if (!$userInfo) {
            Cache::forget($exchangeKey);
            $this->forgetChallenge($challengeId, $challenge);

            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 400);
        }

        if (($userInfo['banned'] ?? 'false') === 'true' || ($userInfo['deleted'] ?? 'false') === 'true') {
            Cache::forget($exchangeKey);
            $this->forgetChallenge($challengeId, $challenge);

            return ApiResponse::error('Account is banned or deleted', 'USER_BANNED', 403);
        }

        // Consume tokens before minting cookie so retries cannot reuse them.
        $challenge['status'] = 'consumed';
        $challenge['exchange_token'] = null;
        Cache::forget($exchangeKey);
        $this->forgetChallenge($challengeId, $challenge);

        return (new LoginController())->completeLogin($userInfo);
    }

    /**
     * Public profile shown on the desktop QR panel after a phone scans.
     *
     * @return array{username: string, display_name: string, avatar: string|null}|null
     */
    private function publicScannerProfile(?string $userUuid): ?array
    {
        if ($userUuid === null || $userUuid === '') {
            return null;
        }

        $user = User::getUserByUuid($userUuid);
        if (!$user) {
            return null;
        }

        $username = trim((string) ($user['username'] ?? ''));
        $first = trim((string) ($user['first_name'] ?? ''));
        $last = trim((string) ($user['last_name'] ?? ''));
        $display = trim($first . ' ' . $last);
        if ($display === '') {
            $display = $username !== '' ? $username : 'User';
        }

        $avatar = $user['avatar'] ?? null;
        if (!is_string($avatar) || $avatar === '') {
            $avatar = null;
        }

        return [
            'username' => $username !== '' ? $username : $display,
            'display_name' => $display,
            'avatar' => $avatar,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadChallenge(string $challengeId): ?array
    {
        $raw = Cache::get(self::CACHE_PREFIX . $challengeId);

        return is_array($raw) ? $raw : null;
    }

    /**
     * @param array<string, mixed> $challenge
     */
    private function storeChallenge(string $challengeId, array $challenge): void
    {
        $ttlMinutes = self::CHALLENGE_TTL_MINUTES;
        if (isset($challenge['expires_at']) && is_numeric($challenge['expires_at'])) {
            $remaining = max(1, (int) ceil(((int) $challenge['expires_at'] - time()) / 60));
            $ttlMinutes = min(self::CHALLENGE_TTL_MINUTES, $remaining);
        }
        Cache::put(self::CACHE_PREFIX . $challengeId, $challenge, $ttlMinutes);

        $userCode = isset($challenge['user_code']) && is_string($challenge['user_code'])
            ? $this->normalizeUserCode($challenge['user_code'])
            : '';
        if ($userCode !== '') {
            Cache::put(self::CODE_PREFIX . $userCode, $challengeId, $ttlMinutes);
        }
    }

    /**
     * @param array<string, mixed> $challenge
     */
    private function forgetChallenge(string $challengeId, array $challenge): void
    {
        Cache::forget(self::CACHE_PREFIX . $challengeId);
        $userCode = isset($challenge['user_code']) && is_string($challenge['user_code'])
            ? $this->normalizeUserCode($challenge['user_code'])
            : '';
        if ($userCode !== '') {
            Cache::forget(self::CODE_PREFIX . $userCode);
        }
    }

    /**
     * @param array<string, mixed> $challenge
     */
    private function verifyDesktopSecret(array $challenge, string $desktopSecret): bool
    {
        $hash = $challenge['desktop_secret_hash'] ?? '';
        if (!is_string($hash) || $hash === '') {
            return false;
        }

        return hash_equals($hash, hash('sha256', $desktopSecret));
    }

    /**
     * @param array<string, mixed> $challenge
     */
    private function isExpired(array $challenge): bool
    {
        if (!isset($challenge['expires_at']) || !is_numeric($challenge['expires_at'])) {
            return true;
        }

        return (int) $challenge['expires_at'] < time();
    }

    private function normalizeUserCode(string $raw): string
    {
        $cleaned = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw) ?? '');
        if (strlen($cleaned) !== 8) {
            return '';
        }

        return substr($cleaned, 0, 4) . '-' . substr($cleaned, 4, 4);
    }

    private function generateUserCode(): string
    {
        $alphabet = self::USER_CODE_ALPHABET;
        $max = strlen($alphabet) - 1;
        $code = '';
        for ($i = 0; $i < 8; ++$i) {
            $code .= $alphabet[random_int(0, $max)];
        }

        return substr($code, 0, 4) . '-' . substr($code, 4, 4);
    }
}
