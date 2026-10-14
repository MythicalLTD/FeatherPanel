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

/**
 * Helpers for password reset tokens that are stored in `featherpanel_users.mail_verify`.
 *
 * FP-18: `mail_verify` is overloaded. An empty/NULL value means "email verified",
 * every other value is either a pending email-verification token or a password
 * reset token. Without a schema change both can only be told apart by the shape of
 * the stored value, so reset tokens are now written with a "fpreset:" prefix while
 * the token that is sent by mail keeps its original "<64 hex>.<expiry>" shape.
 *
 * Stored formats (the part after "fpreset:" is what the user received by mail):
 *   fpreset:v:<token>      reset token issued for an already verified address
 *   fpreset:u:<token>      reset token issued for an address that is NOT verified
 *   fpreset:legacy:<token> reset token whose prior verification state is unknown
 *   fpreset:used:<random>  consumed reset token of a not verified address
 *   <token>                legacy value written before this change (no prefix)
 *
 * A password reset therefore never turns an unverified address into a verified
 * one, and a stored reset token is never mistaken for an email-verification
 * token (only an empty value means "verified"). Raw legacy reset tokens do not
 * by themselves decide verified vs unverified — they keep a compatibility state.
 */
final class PasswordResetTokenHelper
{
    /** Prefix that marks a `mail_verify` value as a password reset token. */
    public const PREFIX = 'fpreset:';

    /** Stored state: the address was verified before the reset was requested. */
    public const STATE_VERIFIED = 'v';

    /** Stored state: the address was (and stays) not verified. */
    public const STATE_UNVERIFIED = 'u';

    /** State of a token issued before this change (no prefix, state unknown). */
    public const STATE_LEGACY = 'legacy';

    /** Marker prefix for a reset token that was already used. */
    private const USED_PREFIX = 'fpreset:used:';

    /** Lifetime of a reset token in seconds (unchanged behaviour). */
    private const DEFAULT_TTL_SECONDS = 3600;

    /**
     * Create the token that is embedded in the reset link.
     * Keeps the existing "<64 hex>.<unix timestamp>" shape.
     */
    public static function issueToken(?int $ttlSeconds = null): string
    {
        $ttlSeconds ??= self::DEFAULT_TTL_SECONDS;

        return bin2hex(random_bytes(32)) . '.' . (time() + $ttlSeconds);
    }

    /**
     * The `mail_verify` value to store for a freshly issued token. The state of
     * the address is read from the value that is stored right now, so a second
     * reset request neither verifies nor un-verifies an account.
     */
    public static function mailVerifyForNewRequest(?string $currentMailVerify, string $token): string
    {
        return self::storedValue(self::stateForCurrentValue($currentMailVerify), $token);
    }

    /**
     * Build the stored representation of a reset token for the given state.
     */
    public static function storedValue(string $state, string $token): string
    {
        if ($state === self::STATE_VERIFIED) {
            return self::PREFIX . self::STATE_VERIFIED . ':' . $token;
        }

        if ($state === self::STATE_LEGACY) {
            return self::PREFIX . self::STATE_LEGACY . ':' . $token;
        }

        return self::PREFIX . self::STATE_UNVERIFIED . ':' . $token;
    }

    /**
     * True when the value is a reset token written by this helper.
     * Read sites that treat `mail_verify` as a verification flag must use
     * {@see isEmailVerified()} instead of treating every non-empty value as
     * "not verified".
     */
    public static function isResetTokenValue(?string $value): bool
    {
        return is_string($value) && str_starts_with($value, self::PREFIX);
    }

    /**
     * Whether the account's email should be treated as verified for login.
     *
     * Empty/NULL is verified. A pending reset for a previously verified address
     * (`fpreset:v:…`) does not revoke that status. Legacy / unknown-state reset
     * tokens also do not flip eligibility based on token shape alone. Explicit
     * unverified markers and plain email-verification tokens still block login.
     */
    public static function isEmailVerified(?string $mailVerify): bool
    {
        $value = is_string($mailVerify) ? trim($mailVerify) : '';
        if ($value === '') {
            return true;
        }

        if (str_starts_with($value, self::PREFIX . self::STATE_VERIFIED . ':')) {
            return true;
        }

        // Compatibility: raw or prefixed legacy reset tokens must not alone
        // decide that the address is unverified.
        if (self::isLegacyResetTokenValue($value)) {
            return true;
        }

        return false;
    }

    /**
     * `mail_verify` value to keep after a reset was completed (or the stored
     * token turned out to be expired). Verified addresses stay verified (NULL),
     * not verified addresses stay not verified - the reset token must never
     * count as an email verification. Legacy/unknown state keeps a non-empty
     * compatibility marker that does not change login eligibility by shape.
     *
     * @return string|null null means "verified", a non-empty string means "not verified"
     *                     (or a legacy compatibility marker that stays login-eligible)
     */
    public static function mailVerifyAfterReset(string $state): ?string
    {
        if ($state === self::STATE_UNVERIFIED) {
            return self::USED_PREFIX . bin2hex(random_bytes(16));
        }

        if ($state === self::STATE_LEGACY) {
            // Preserve unknown prior state without inventing verified/unverified
            // from the token shape. Login treats this marker as still eligible.
            return self::PREFIX . self::STATE_LEGACY . ':used:' . bin2hex(random_bytes(16));
        }

        return null;
    }

    /**
     * Classify the currently stored `mail_verify` value.
     *
     * Empty means verified. Prefixed reset tokens carry an explicit state.
     * Raw legacy reset tokens keep {@see STATE_LEGACY} so they never alone
     * decide verified vs unverified. Everything else is a pending email
     * verification token (not verified).
     */
    private static function stateForCurrentValue(?string $currentMailVerify): string
    {
        $value = is_string($currentMailVerify) ? trim($currentMailVerify) : '';
        if ($value === '') {
            return self::STATE_VERIFIED;
        }

        if (str_starts_with($value, self::PREFIX . self::STATE_VERIFIED . ':')) {
            return self::STATE_VERIFIED;
        }

        if (str_starts_with($value, self::PREFIX . self::STATE_LEGACY . ':')) {
            return self::STATE_LEGACY;
        }

        if (self::isResetTokenValue($value)) {
            return self::STATE_UNVERIFIED;
        }

        // Raw legacy reset token (no prefix): state unknown — do not treat as unverified.
        if (self::isLegacyResetTokenShape($value)) {
            return self::STATE_LEGACY;
        }

        // Pending email verification token: the address is not verified yet.
        return self::STATE_UNVERIFIED;
    }

    /**
     * Raw `<64 hex>.<unix>` token written before the fpreset: prefix existed,
     * or a prefixed legacy compatibility value.
     */
    private static function isLegacyResetTokenValue(string $value): bool
    {
        if (str_starts_with($value, self::PREFIX . self::STATE_LEGACY . ':')) {
            return true;
        }

        return self::isLegacyResetTokenShape($value);
    }

    private static function isLegacyResetTokenShape(string $value): bool
    {
        return (bool) preg_match('/^[a-f0-9]{64}\.\d+$/', $value);
    }
}
