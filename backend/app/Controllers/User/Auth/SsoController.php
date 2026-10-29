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

use App\App;
use App\Chat\User;
use App\Cache\Cache;
use App\Chat\Activity;
use App\Chat\SsoIdentity;
use App\Helpers\ApiResponse;
use App\Helpers\OAuthStateCookie;
use App\Config\ConfigInterface;
use App\Helpers\PanelIpBlockGuard;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\OidcIdTokenVerifier;
use App\Helpers\EmailDomainValidator;
use App\Helpers\AbuseIPDBRegistrationGuard;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * Google and GitHub single sign-on (authorization code flow with state and PKCE).
 *
 * Sign-ins never set the session here: the callback hands a short lived token to the
 * login page, which exchanges it through PUT /api/user/auth/login so the ban, deletion
 * and two factor rules of the normal login apply.
 */
class SsoController
{
    public const PROVIDERS = ['google', 'github'];

    private const GOOGLE_DISCOVERY = 'https://accounts.google.com/.well-known/openid-configuration';
    private const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
    private const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
    private const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
    private const GITHUB_API = 'https://api.github.com';

    /** GET /api/user/auth/sso/{provider}/login */
    public function login(Request $request, string $provider): RedirectResponse
    {
        return $this->start($provider, null);
    }

    /** GET /api/user/auth/sso/{provider}/link (authenticated) */
    public function link(Request $request, string $provider): RedirectResponse
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['uuid'])) {
            return new RedirectResponse('/auth/login');
        }

        return $this->start($provider, (string) $user['uuid']);
    }

    /** GET /api/user/auth/sso/{provider}/callback */
    public function callback(Request $request, string $provider): RedirectResponse
    {
        $app = App::getInstance(true);
        $state = $request->query->get('state');
        $cached = is_string($state) && $state !== '' ? Cache::get('sso_state_' . $state) : null;
        if (!is_array($cached) || ($cached['provider'] ?? '') !== $provider || !OAuthStateCookie::matches($request, $state)) {
            return self::errorRedirect('sso_invalid_state', false);
        }
        Cache::forget('sso_state_' . $state);
        $linkUserUuid = isset($cached['link_user_uuid']) && is_string($cached['link_user_uuid']) ? $cached['link_user_uuid'] : null;
        $isLink = $linkUserUuid !== null;

        $config = $this->providerConfig($provider);
        if ($config === null) {
            return self::errorRedirect('sso_disabled', $isLink);
        }
        if ($request->query->get('error') !== null) {
            return self::errorRedirect('sso_access_denied', $isLink);
        }
        $code = $request->query->get('code');
        if (!is_string($code) || $code === '') {
            return self::errorRedirect('sso_missing_code', $isLink);
        }

        try {
            $profile = $provider === 'google'
                ? $this->googleProfile($config, $code, (string) $cached['code_verifier'], (string) $cached['nonce'])
                : $this->githubProfile($config, $code, (string) $cached['code_verifier']);
        } catch (\RuntimeException $e) {
            $app->getLogger()->warning('SSO ' . $provider . ' callback failed: ' . $e->getMessage());

            return self::errorRedirect(str_starts_with($e->getMessage(), 'sso_') ? $e->getMessage() : 'sso_token_failed', $isLink);
        }

        if (!self::emailDomainAllowed($profile['email'])) {
            return self::errorRedirect('sso_email_domain_not_allowed', $isLink);
        }

        if ($isLink) {
            return $this->completeLink($linkUserUuid, $provider, $profile);
        }

        return $this->loginOrRegister($provider, $profile);
    }

    /** GET /api/user/auth/sso/identities (authenticated) */
    public function identities(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['id'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $config = App::getInstance(true)->getConfig();

        return ApiResponse::success([
            'identities' => SsoIdentity::listForUser((int) $user['id']),
            'password_set' => ($user['password_set'] ?? 'true') !== 'false',
            'providers' => [
                'google' => $config->getSetting(ConfigInterface::SSO_GOOGLE_ENABLED, 'false') === 'true',
                'github' => $config->getSetting(ConfigInterface::SSO_GITHUB_ENABLED, 'false') === 'true',
            ],
        ], 'Linked sign-in providers', 200);
    }

    /** DELETE /api/user/auth/sso/{provider}/unlink (authenticated) */
    public function unlink(Request $request, string $provider): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || empty($user['id'])) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        if (!in_array($provider, self::PROVIDERS, true)) {
            return ApiResponse::error('Unknown sign-in provider', 'SSO_PROVIDER_UNKNOWN', 404);
        }
        if (SsoIdentity::findByUserAndProvider((int) $user['id'], $provider) === null) {
            return ApiResponse::error('This provider is not linked', 'SSO_NOT_LINKED', 404);
        }
        if (self::isLastLoginMethod($user, $provider)) {
            return ApiResponse::error('Set a password or link another provider before removing your last sign-in method', 'SSO_LAST_LOGIN_METHOD', 409);
        }
        if (!SsoIdentity::unlink((int) $user['id'], $provider)) {
            return ApiResponse::error('Failed to unlink provider', 'SSO_UNLINK_FAILED', 500);
        }
        self::audit((string) $user['uuid'], 'sso_unlink', 'Unlinked ' . self::label($provider) . ' sign-in');

        return ApiResponse::success([], 'Provider unlinked successfully', 200);
    }

    /**
     * True when removing $method ("google", "github", "oidc:<uuid>" or "discord") would leave
     * an account without a password and without any other way to sign in.
     */
    public static function isLastLoginMethod(array $user, string $method): bool
    {
        if (($user['password_set'] ?? 'true') !== 'false') {
            return false;
        }
        $others = 0;
        try {
            foreach (SsoIdentity::listForUser((int) $user['id']) as $identity) {
                if ($identity['provider'] !== $method) {
                    ++$others;
                }
            }
        } catch (\Throwable $e) {
            return false;
        }
        if ($method !== 'discord' && ($user['discord_oauth2_linked'] ?? 'false') === 'true') {
            ++$others;
        }

        return $others === 0;
    }

    /**
     * Allowed email domains for every SSO sign-in (Google, GitHub and OIDC). Empty list allows all.
     */
    public static function emailDomainAllowed(?string $email): bool
    {
        $raw = (string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SSO_ALLOWED_EMAIL_DOMAINS, '');
        $domains = array_values(array_filter(array_map(
            static fn ($d) => ltrim(strtolower(trim($d)), '@'),
            preg_split('/[\s,]+/', $raw) ?: []
        )));
        if ($domains === []) {
            return true;
        }
        if ($email === null || !str_contains($email, '@')) {
            return false;
        }
        $domain = strtolower(substr($email, strrpos($email, '@') + 1));

        return in_array($domain, $domains, true);
    }

    public static function autoLinkEnabled(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SSO_AUTO_LINK_VERIFIED_EMAIL, 'false') === 'true';
    }

    /**
     * Hand a resolved user to the login page. The page exchanges the token via PUT /api/user/auth/login.
     */
    public static function loginHandoff(array $user, string $provider): RedirectResponse
    {
        if (($user['deleted'] ?? 'false') === 'true') {
            return self::errorRedirect('sso_account_unavailable', false);
        }
        if (($user['banned'] ?? 'false') === 'true') {
            return self::errorRedirect('sso_user_banned', false);
        }
        $token = bin2hex(random_bytes(32));
        Cache::put('sso_login_handoff_' . $token, ['user_uuid' => $user['uuid'], 'provider' => $provider], 5);

        $response = new RedirectResponse('/auth/login?sso_login_token=' . $token);
        OAuthStateCookie::clear($response);
        OAuthStateCookie::attach($response, $token, OAuthStateCookie::HANDOFF);

        return $response;
    }

    /**
     * Consume a handoff token (single use). Returns the stored payload or null.
     */
    public static function consumeHandoff(string $token, ?Request $request = null): ?array
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }
        // The token must come back from the browser that finished the provider callback.
        if ($request !== null && !OAuthStateCookie::matches($request, $token, OAuthStateCookie::HANDOFF)) {
            return null;
        }
        $data = Cache::get('sso_login_handoff_' . $token);
        Cache::forget('sso_login_handoff_' . $token);

        return is_array($data) && isset($data['user_uuid']) ? $data : null;
    }

    public static function audit(string $userUuid, string $name, string $context): void
    {
        Activity::createActivity([
            'user_uuid' => $userUuid,
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }

    public static function label(string $provider): string
    {
        return match (true) {
            $provider === 'google' => 'Google',
            $provider === 'github' => 'GitHub',
            $provider === 'discord' => 'Discord',
            str_starts_with($provider, 'oidc:') => 'OIDC',
            default => $provider,
        };
    }

    public static function errorRedirect(string $code, bool $accountSettings): RedirectResponse
    {
        $target = $accountSettings ? '/dashboard/account?tab=settings&error=' : '/auth/login?error=';

        return new RedirectResponse($target . urlencode($code));
    }

    /**
     * PKCE (RFC 7636) S256 pair.
     *
     * @return array{0: string, 1: string} verifier, challenge
     */
    public static function pkcePair(): array
    {
        $verifier = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        return [$verifier, $challenge];
    }

    /**
     * Create a panel account for an SSO sign-in. Applies the registration email, IP and abuse guards.
     */
    public static function provisionUser(array $profile, string $lastNameFallback): ?array
    {
        $app = App::getInstance(true);
        $email = trim((string) ($profile['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        if (EmailDomainValidator::getRejection($app->getConfig(), $email) !== null) {
            return null;
        }
        $ip = CloudFlareRealIP::getRealIP();
        if (PanelIpBlockGuard::isBlocked($ip)) {
            return null;
        }
        $abuseDecision = AbuseIPDBRegistrationGuard::evaluate($ip);
        if (AbuseIPDBRegistrationGuard::shouldBlock($abuseDecision)) {
            return null;
        }

        $source = (string) ($profile['username'] ?? '') !== '' ? (string) $profile['username'] : strstr($email, '@', true);
        $base = substr(preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower((string) $source)) ?: 'user', 0, 27);
        $first = trim((string) ($profile['first_name'] ?? ''));
        $last = trim((string) ($profile['last_name'] ?? ''));
        $uuid = User::generateUuid();
        $hashed = password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT);

        $userId = false;
        for ($attempt = 0; $attempt < 5 && $userId === false; ++$attempt) {
            $username = $attempt === 0 ? $base : substr($base . '_' . bin2hex(random_bytes(2)), 0, 32);
            $userId = User::createUser([
                'username' => $username,
                'first_name' => $first !== '' ? $first : $username,
                'last_name' => $last !== '' ? $last : $lastNameFallback,
                'email' => $email,
                'password' => $hashed,
                'uuid' => $uuid,
                'remember_token' => User::generateAccountToken(),
                'first_ip' => $ip,
                'last_ip' => $ip,
            ], true);
        }
        if ($userId === false) {
            $app->getLogger()->error('Failed to create SSO user for ' . $email);

            return null;
        }
        User::updateUser($uuid, ['password_set' => 'false']);
        AbuseIPDBRegistrationGuard::applyAutoBanIfNeeded($uuid, $abuseDecision);

        return User::getUserByUuid($uuid);
    }

    private function loginOrRegister(string $provider, array $profile): RedirectResponse
    {
        $config = App::getInstance(true)->getConfig();
        $user = null;
        $identity = SsoIdentity::findByProviderSubject($provider, $profile['subject']);
        if ($identity !== null) {
            $user = User::getUserById((int) $identity['user_id']);
        }

        $verifiedEmail = $profile['email_verified'] && $profile['email'] !== null ? $profile['email'] : null;

        if ($user === null && $verifiedEmail !== null && self::autoLinkEnabled()) {
            $user = User::getUserByEmail($verifiedEmail);
            if ($user !== null && ($user['deleted'] ?? 'false') !== 'true' && ($user['banned'] ?? 'false') !== 'true') {
                SsoIdentity::link((int) $user['id'], $provider, $profile['subject'], $profile['email']);
                self::audit($user['uuid'], 'sso_link', 'Linked ' . self::label($provider) . ' sign-in by verified email');
            }
        }

        if ($user === null) {
            $registrationOpen = $config->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'true') === 'true'
                && $config->getSetting(ConfigInterface::SSO_ALLOW_REGISTRATION, 'false') === 'true'
                && $config->getSetting(ConfigInterface::MAINTENANCE_MODE_ENABLED, 'false') !== 'true';
            if (!$registrationOpen) {
                return self::errorRedirect('sso_account_not_linked', false);
            }
            if ($verifiedEmail === null) {
                return self::errorRedirect('sso_email_not_verified', false);
            }
            if (User::getUserByEmail($verifiedEmail) !== null) {
                return self::errorRedirect('sso_email_in_use', false);
            }
            $user = self::provisionUser($profile, self::label($provider));
            if ($user === null) {
                return self::errorRedirect('sso_registration_failed', false);
            }
            SsoIdentity::link((int) $user['id'], $provider, $profile['subject'], $profile['email']);
            self::audit($user['uuid'], 'sso_register', 'Registered with ' . self::label($provider));
        }

        $identity = SsoIdentity::findByProviderSubject($provider, $profile['subject']);
        if ($identity !== null && (int) $identity['user_id'] === (int) $user['id']) {
            SsoIdentity::touchLogin((int) $identity['id']);
        }

        return self::loginHandoff($user, $provider);
    }

    private function completeLink(string $userUuid, string $provider, array $profile): RedirectResponse
    {
        $user = User::getUserByUuid($userUuid);
        if ($user === null) {
            return self::errorRedirect('sso_user_not_found', true);
        }
        $existing = SsoIdentity::findByProviderSubject($provider, $profile['subject']);
        if ($existing !== null && (int) $existing['user_id'] !== (int) $user['id']) {
            return self::errorRedirect('sso_already_linked', true);
        }
        if (!SsoIdentity::link((int) $user['id'], $provider, $profile['subject'], $profile['email'])) {
            return self::errorRedirect('sso_link_failed', true);
        }
        self::audit($user['uuid'], 'sso_link', 'Linked ' . self::label($provider) . ' sign-in');

        return new RedirectResponse('/dashboard/account?tab=settings&linked=' . $provider);
    }

    private function start(string $provider, ?string $linkUserUuid): RedirectResponse
    {
        $isLink = $linkUserUuid !== null;
        $config = $this->providerConfig($provider);
        if ($config === null) {
            return self::errorRedirect('sso_disabled', $isLink);
        }

        $state = bin2hex(random_bytes(16));
        $nonce = bin2hex(random_bytes(16));
        [$verifier, $challenge] = self::pkcePair();
        Cache::put('sso_state_' . $state, [
            'provider' => $provider,
            'nonce' => $nonce,
            'code_verifier' => $verifier,
            'link_user_uuid' => $linkUserUuid,
        ], 10);

        $params = [
            'client_id' => $config['client_id'],
            'redirect_uri' => $this->redirectUri($provider),
            'response_type' => 'code',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ];

        if ($provider === 'google') {
            $discovery = $this->fetchJson(self::GOOGLE_DISCOVERY);
            $endpoint = is_array($discovery) && is_string($discovery['authorization_endpoint'] ?? null)
                ? $discovery['authorization_endpoint']
                : 'https://accounts.google.com/o/oauth2/v2/auth';
            $params['scope'] = 'openid email profile';
            $params['nonce'] = $nonce;
            $params['prompt'] = 'select_account';
        } else {
            $endpoint = self::GITHUB_AUTHORIZE;
            $params['scope'] = 'read:user user:email';
            $params['allow_signup'] = 'false';
        }

        $response = new RedirectResponse($endpoint . '?' . http_build_query($params));
        OAuthStateCookie::attach($response, $state);

        return $response;
    }

    /**
     * @return array{client_id: string, client_secret: string}|null
     */
    private function providerConfig(string $provider): ?array
    {
        $config = App::getInstance(true)->getConfig();
        $keys = match ($provider) {
            'google' => [ConfigInterface::SSO_GOOGLE_ENABLED, ConfigInterface::SSO_GOOGLE_CLIENT_ID, ConfigInterface::SSO_GOOGLE_CLIENT_SECRET],
            'github' => [ConfigInterface::SSO_GITHUB_ENABLED, ConfigInterface::SSO_GITHUB_CLIENT_ID, ConfigInterface::SSO_GITHUB_CLIENT_SECRET],
            default => null,
        };
        if ($keys === null || $config->getSetting($keys[0], 'false') !== 'true') {
            return null;
        }
        $clientId = trim((string) $config->getSetting($keys[1], ''));
        $secret = trim((string) $config->getSetting($keys[2], ''));
        if ($clientId === '' || $secret === '') {
            return null;
        }

        return ['client_id' => $clientId, 'client_secret' => $secret];
    }

    private function redirectUri(string $provider): string
    {
        return rtrim((string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, ''), '/')
            . '/api/user/auth/sso/' . $provider . '/callback';
    }

    private function googleProfile(array $config, string $code, string $verifier, string $nonce): array
    {
        $discovery = $this->fetchJson(self::GOOGLE_DISCOVERY);
        if (!is_array($discovery) || !is_string($discovery['token_endpoint'] ?? null)) {
            throw new \RuntimeException('sso_discovery_failed');
        }
        $token = $this->postForm($discovery['token_endpoint'], [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri('google'),
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'code_verifier' => $verifier,
        ]);
        $idToken = $token['id_token'] ?? null;
        if (!is_string($idToken) || $idToken === '') {
            throw new \RuntimeException('sso_token_failed');
        }

        $result = OidcIdTokenVerifier::verify($idToken, $discovery, $config['client_secret']);
        $claims = $result['claims'];
        if ($result['verdict'] !== OidcIdTokenVerifier::VERDICT_VERIFIED || !is_array($claims)) {
            throw new \RuntimeException('sso_invalid_id_token');
        }
        if (!in_array($claims['iss'] ?? '', self::GOOGLE_ISSUERS, true)) {
            throw new \RuntimeException('sso_invalid_id_token');
        }
        $aud = $claims['aud'] ?? null;
        if (!($aud === $config['client_id'] || (is_array($aud) && in_array($config['client_id'], $aud, true)))) {
            throw new \RuntimeException('sso_invalid_id_token');
        }
        if (!OidcIdTokenVerifier::nonceMatches($nonce, isset($claims['nonce']) && is_string($claims['nonce']) ? $claims['nonce'] : null)) {
            throw new \RuntimeException('sso_invalid_id_token');
        }
        $subject = $claims['sub'] ?? null;
        if (!is_string($subject) || $subject === '') {
            throw new \RuntimeException('sso_missing_subject');
        }
        $email = is_string($claims['email'] ?? null) ? $claims['email'] : null;
        $verified = ($claims['email_verified'] ?? false) === true || ($claims['email_verified'] ?? '') === 'true';

        return [
            'subject' => $subject,
            'email' => $email,
            'email_verified' => $verified && $email !== null,
            'first_name' => is_string($claims['given_name'] ?? null) ? $claims['given_name'] : '',
            'last_name' => is_string($claims['family_name'] ?? null) ? $claims['family_name'] : '',
            'username' => $email !== null ? (string) strstr($email, '@', true) : '',
        ];
    }

    private function githubProfile(array $config, string $code, string $verifier): array
    {
        $token = $this->postForm(self::GITHUB_TOKEN, [
            'code' => $code,
            'redirect_uri' => $this->redirectUri('github'),
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'code_verifier' => $verifier,
        ]);
        $accessToken = $token['access_token'] ?? null;
        if (!is_string($accessToken) || $accessToken === '') {
            throw new \RuntimeException('sso_token_failed');
        }
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
        ];
        $ghUser = $this->fetchJson(self::GITHUB_API . '/user', $headers);
        if (!is_array($ghUser) || !isset($ghUser['id'])) {
            throw new \RuntimeException('sso_user_failed');
        }

        $email = null;
        $emails = $this->fetchJson(self::GITHUB_API . '/user/emails', $headers);
        if (is_array($emails)) {
            foreach ($emails as $row) {
                if (is_array($row) && ($row['verified'] ?? false) === true && is_string($row['email'] ?? null)) {
                    if (($row['primary'] ?? false) === true) {
                        $email = $row['email'];
                        break;
                    }
                    $email ??= $row['email'];
                }
            }
        }

        $name = is_string($ghUser['name'] ?? null) ? trim($ghUser['name']) : '';
        $parts = $name !== '' ? explode(' ', $name, 2) : ['', ''];

        return [
            'subject' => (string) $ghUser['id'],
            'email' => $email,
            'email_verified' => $email !== null,
            'first_name' => $parts[0] ?? '',
            'last_name' => $parts[1] ?? '',
            'username' => is_string($ghUser['login'] ?? null) ? $ghUser['login'] : '',
        ];
    }

    private function postForm(string $url, array $fields): array
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $data = is_string($response) ? json_decode($response, true) : null;
        if (!is_array($data)) {
            throw new \RuntimeException('sso_token_failed');
        }

        return $data;
    }

    private function fetchJson(string $url, array $headers = []): ?array
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, 'FeatherPanel');
        if ($headers !== []) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            return null;
        }
        $data = json_decode((string) $response, true);

        return is_array($data) ? $data : null;
    }
}
