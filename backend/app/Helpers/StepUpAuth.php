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

namespace App\Helpers;

use App\App;
use App\Chat\Permission;
use App\Chat\UserSession;
use App\Config\ConfigInterface;
use App\Mail\templates\EmailLoginCode;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Step-up re-authentication for sensitive actions.
 *
 * A signed-in browser session has to confirm the account again (password, or
 * the authenticator code when two-factor is on, or a code sent by e-mail)
 * before it may impersonate a user, hand out admin permissions, create API
 * keys or change the custom JavaScript. A successful confirmation marks the
 * current session as elevated for {@see self::TTL_SECONDS}; the marker lives
 * server side (Redis, or the file store without Redis) and is keyed by the
 * hash of the session token, so it cannot be carried to another session.
 *
 * API key (Bearer) requests are not asked to re-authenticate: API keys are
 * full-access credentials by design and are used by automation that has no
 * one to type a password. Creating new keys still needs an elevated browser
 * session, so a stolen session cookie alone cannot mint a long-lived key.
 */
class StepUpAuth
{
    public const ERROR_CODE = 'REAUTH_REQUIRED';
    /** How long a confirmation keeps the session elevated (15 minutes). */
    public const TTL_SECONDS = 900;
    /** Lifetime of an e-mailed confirmation code. */
    public const CODE_TTL_SECONDS = 600;
    /** Wrong answers allowed per account and window before re-auth is paused. */
    public const MAX_FAILURES = 5;
    public const FAILURE_WINDOW_SECONDS = 900;
    /**
     * Accounts that can only confirm with a password (no 2FA, no mail) may have
     * no usable password at all (Discord/OIDC/SSO sign-ups). For them a session
     * signed in this recently counts as confirmed.
     */
    public const RECENT_LOGIN_SECONDS = 300;
    /** How long the account stays paused once MAX_FAILURES is reached. */
    public const LOCKOUT_SECONDS = 900;

    public const ACTION_IMPERSONATE = 'impersonate';
    public const ACTION_ADMIN_ROLE = 'admin_role';
    public const ACTION_API_KEY = 'api_key';
    public const ACTION_CUSTOM_JS = 'custom_js';
    /** Changing the password, e-mail or two-factor setup the confirmation itself relies on. */
    public const ACTION_ACCOUNT_SECURITY = 'account_security';

    public const METHOD_PASSWORD = 'password';
    public const METHOD_TOTP = 'totp';
    public const METHOD_EMAIL_CODE = 'email_code';
    /** Lifetime of the per-session code generation counter (outlives every code it numbers). */
    private const CODE_GENERATION_TTL_SECONDS = 86400;

    /**
     * Gate a sensitive action. Returns null when the request may continue,
     * otherwise the 403 REAUTH_REQUIRED response to send back.
     */
    public static function require(Request $request, string $action): ?Response
    {
        if ($request->attributes->get('auth_type') !== 'session') {
            // API keys are full access by design (see class doc).
            return null;
        }
        if (self::isElevated($request)) {
            return null;
        }
        $actor = self::actor($request);
        if (is_array($actor) && self::recentLoginCounts($request, $actor)) {
            return null;
        }

        return ApiResponse::error(
            'Confirm your identity to continue.',
            self::ERROR_CODE,
            403,
            [
                'reauth_required' => true,
                'action' => $action,
                'methods' => is_array($actor) ? self::methodsFor($actor) : [self::METHOD_PASSWORD],
                'ttl_seconds' => self::TTL_SECONDS,
                'sign_in_again' => is_array($actor) && self::passwordOnly($request, $actor),
                'sign_in_again_seconds' => self::RECENT_LOGIN_SECONDS,
            ]
        );
    }

    /** Whether the account can only confirm with a password (and is not being impersonated). */
    public static function passwordOnly(Request $request, array $actor): bool
    {
        return !$request->attributes->has('impersonator') && self::methodsFor($actor) === [self::METHOD_PASSWORD];
    }

    /** Password-only accounts: a session created in the last RECENT_LOGIN_SECONDS counts as confirmed. */
    public static function recentLoginCounts(Request $request, array $actor): bool
    {
        if (!self::passwordOnly($request, $actor)) {
            return false;
        }
        $token = $request->cookies->get('remember_token');
        if (!is_string($token) || $token === '' || !UserSession::isSessionToken($token)) {
            return false;
        }
        $age = UserSession::ageSeconds($token, (int) ($actor['id'] ?? 0));

        return $age !== null && $age >= 0 && $age <= self::RECENT_LOGIN_SECONDS;
    }

    /** The person at the keyboard: the admin while impersonating, otherwise the signed-in user. */
    public static function actor(Request $request): ?array
    {
        $impersonator = $request->attributes->get('impersonator');
        if (is_array($impersonator)) {
            return $impersonator;
        }
        $user = $request->attributes->get('user');

        return is_array($user) ? $user : null;
    }

    /** SHA-256 of the session token cookie, or null when the request has no session cookie. */
    public static function sessionHash(Request $request): ?string
    {
        $token = $request->cookies->get('remember_token');
        if (!is_string($token) || $token === '') {
            $token = $_COOKIE['remember_token'] ?? null;
        }
        if (!is_string($token) || $token === '') {
            return null;
        }

        return UserSession::hash($token);
    }

    public static function isElevated(Request $request): bool
    {
        return self::secondsLeft($request) > 0;
    }

    /** Seconds left on the current session's elevation (0 when not elevated). */
    public static function secondsLeft(Request $request): int
    {
        $key = self::elevationKey($request);

        return $key === null ? 0 : SecurityStore::ttl($key);
    }

    /** Mark the current session as elevated. Returns the lifetime in seconds, 0 on failure. */
    public static function grant(Request $request): int
    {
        $key = self::elevationKey($request);
        if ($key === null || !SecurityStore::flag($key, self::TTL_SECONDS)) {
            return 0;
        }

        return self::TTL_SECONDS;
    }

    public static function revoke(Request $request): void
    {
        $key = self::elevationKey($request);
        if ($key !== null) {
            SecurityStore::delete($key);
        }
    }

    /**
     * Methods the account can confirm with. With two-factor enabled the
     * authenticator code is required (a password alone is not enough);
     * otherwise the password, or an e-mailed code when mail is configured.
     * Accounts created through Discord/OIDC/SSO/LDAP carry a random password
     * nobody knows, so for them the e-mailed code (or 2FA) is the way in.
     *
     * @return list<string>
     */
    public static function methodsFor(array $user): array
    {
        if (($user['two_fa_enabled'] ?? 'false') === 'true' && (string) ($user['two_fa_key'] ?? '') !== '') {
            return [self::METHOD_TOTP];
        }
        $methods = [self::METHOD_PASSWORD];
        if (self::mailAvailable() && (string) ($user['email'] ?? '') !== '') {
            $methods[] = self::METHOD_EMAIL_CODE;
        }

        return $methods;
    }

    /** Whether the account has used up its wrong answers for the current window. */
    public static function isLockedOut(array $user): bool
    {
        return SecurityStore::exists(self::lockKey($user));
    }

    public static function lockoutSecondsLeft(array $user): int
    {
        return SecurityStore::ttl(self::lockKey($user));
    }

    /** Count one wrong answer; returns true when the account is now locked out. */
    public static function recordFailure(array $user): bool
    {
        if (SecurityStore::hit(self::failureKey($user), self::FAILURE_WINDOW_SECONDS)['count'] < self::MAX_FAILURES) {
            return false;
        }
        // The pause starts now, independent of when the first wrong answer was counted.
        SecurityStore::flag(self::lockKey($user), self::LOCKOUT_SECONDS);
        SecurityStore::delete(self::failureKey($user));

        return true;
    }

    public static function clearFailures(array $user): void
    {
        SecurityStore::delete([self::failureKey($user), self::lockKey($user)]);
    }

    public static function checkPassword(array $user, string $password): bool
    {
        $hash = (string) ($user['password'] ?? '');
        if ($hash === '' || $password === '') {
            return false;
        }

        return password_verify($password, $hash);
    }

    public static function checkTotp(array $user, string $code): bool
    {
        return TotpVerifier::verify($user, $code);
    }

    /**
     * Create a fresh e-mail code for this session (any previous one stops working)
     * and queue the mail. Returns false when no code could be stored.
     */
    public static function sendEmailCode(Request $request, array $user): bool
    {
        $session = self::sessionHash($request);
        if ($session === null || (string) ($user['email'] ?? '') === '') {
            return false;
        }
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $generation = SecurityStore::hit(self::codeGenerationKey($user, $session), self::CODE_GENERATION_TTL_SECONDS)['count'];
        if ($generation <= 0 || !SecurityStore::flag(self::codeKey($user, $session, $generation, $code), self::CODE_TTL_SECONDS)) {
            return false;
        }

        $config = App::getInstance(true)->getConfig();
        EmailLoginCode::send([
            'uuid' => $user['uuid'],
            'enabled' => 'true',
            'first_name' => $user['first_name'] ?? '',
            'last_name' => $user['last_name'] ?? '',
            'email' => $user['email'],
            'username' => $user['username'] ?? '',
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, ''),
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, ''),
            'login_code' => $code,
            'expires_minutes' => (int) (self::CODE_TTL_SECONDS / 60),
            // The code must only be readable from the mailbox, not from the panel's mail history.
            'hide_in_panel' => true,
        ]);

        return true;
    }

    /** Check (and burn) the e-mailed code for this session. */
    public static function checkEmailCode(Request $request, array $user, string $code): bool
    {
        $session = self::sessionHash($request);
        $code = preg_replace('/\D/', '', $code) ?? '';
        if ($session === null || strlen($code) !== 6) {
            return false;
        }
        $generation = SecurityStore::count(self::codeGenerationKey($user, $session));
        if ($generation <= 0) {
            return false;
        }
        $key = self::codeKey($user, $session, $generation, $code);
        if (!SecurityStore::exists($key)) {
            return false;
        }
        // Only burn this code: the generation counter stays so superseded codes never match again.
        SecurityStore::delete($key);

        return true;
    }

    /** Whether a permission node hands out admin access (anything under `admin.`). */
    public static function isAdminPermission(string $permission): bool
    {
        return str_starts_with(strtolower(trim($permission)), 'admin.');
    }

    /** Whether a role carries at least one admin permission. */
    public static function roleGrantsAdmin(int $roleId): bool
    {
        if ($roleId <= 0) {
            return false;
        }
        try {
            foreach (Permission::getPermissionsByRoleId($roleId) as $row) {
                if (is_array($row) && self::isAdminPermission((string) ($row['permission'] ?? ''))) {
                    return true;
                }
            }
        } catch (\Throwable) {
            // Unknown state: ask for confirmation rather than skip it.
            return true;
        }

        return false;
    }

    private static function elevationKey(Request $request): ?string
    {
        $actor = self::actor($request);
        $session = self::sessionHash($request);
        if (!is_array($actor) || empty($actor['uuid']) || $session === null) {
            return null;
        }

        return 'reauth:elevated:' . $actor['uuid'] . ':' . $session;
    }

    private static function failureKey(array $user): string
    {
        return 'reauth:failures:' . ($user['uuid'] ?? '');
    }

    private static function lockKey(array $user): string
    {
        return 'reauth:locked:' . ($user['uuid'] ?? '');
    }

    private static function codeGenerationKey(array $user, string $session): string
    {
        return 'reauth:code-gen:' . ($user['uuid'] ?? '') . ':' . $session;
    }

    private static function codeKey(array $user, string $session, int $generation, string $code): string
    {
        return 'reauth:code:' . ($user['uuid'] ?? '') . ':' . $session . ':' . $generation . ':' . hash('sha256', $code);
    }

    private static function mailAvailable(): bool
    {
        try {
            return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SMTP_ENABLED, 'false') === 'true';
        } catch (\Throwable) {
            return false;
        }
    }
}
