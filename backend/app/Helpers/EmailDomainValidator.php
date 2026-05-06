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

use App\Config\ConfigFactory;
use App\Config\ConfigInterface;
use App\Chat\BlockedEmailDomain;

/**
 * When email_domain_blocking_enabled is true, rejects addresses whose domain matches a row
 * in featherpanel_blocked_email_domains (suffix match, e.g. sub.test.com matches test.com).
 */
final class EmailDomainValidator
{
    public const ERROR_DOMAIN_BLACKLIST = 'EMAIL_DOMAIN_NOT_ALLOWED';

    /** @var array<string, true>|null */
    private static ?array $blockedFlipCache = null;

    public static function invalidateBlockedDomainsCache(): void
    {
        self::$blockedFlipCache = null;
    }

    public static function getRejection(ConfigFactory $config, string $email): ?array
    {
        if ($config->getSetting(ConfigInterface::EMAIL_DOMAIN_BLOCKING_ENABLED, 'false') !== 'true') {
            return null;
        }

        $flip = self::blockedDomainsFlip();
        if ($flip === []) {
            return null;
        }

        $domain = self::extractDomain($email);
        if ($domain === null) {
            return null;
        }

        if (self::domainMatchesAnySuffix($domain, $flip)) {
            return [
                'message' => 'This email domain is not allowed.',
                'code' => self::ERROR_DOMAIN_BLACKLIST,
            ];
        }

        return null;
    }

    /**
     * @param array<string, true> $blockedFlip
     */
    public static function matchesBlockedDomains(string $email, array $blockedFlip): bool
    {
        $domain = self::extractDomain($email);
        if ($domain === null) {
            return false;
        }

        return self::domainMatchesAnySuffix($domain, $blockedFlip);
    }

    public static function extractDomain(string $email): ?string
    {
        $email = strtolower(trim($email));
        $at = strrpos($email, '@');
        if ($at === false) {
            return null;
        }
        $domain = trim(substr($email, $at + 1));
        if ($domain === '') {
            return null;
        }

        if (function_exists('idn_to_ascii')) {
            $ascii = idn_to_ascii($domain, \IDNA_DEFAULT, \INTL_IDNA_VARIANT_UTS46);
            if ($ascii !== false) {
                $domain = strtolower((string) $ascii);
            }
        }

        return $domain !== '' ? $domain : null;
    }

    /**
     * @return array<string, true>
     */
    private static function blockedDomainsFlip(): array
    {
        if (self::$blockedFlipCache !== null) {
            return self::$blockedFlipCache;
        }
        try {
            self::$blockedFlipCache = BlockedEmailDomain::fetchAllDomainsAsFlip();
        } catch (\Throwable) {
            self::$blockedFlipCache = [];
        }

        return self::$blockedFlipCache;
    }

    /**
     * @param array<string, true> $blockedFlip
     */
    private static function domainMatchesAnySuffix(string $domain, array $blockedFlip): bool
    {
        $current = $domain;
        while ($current !== '') {
            if (isset($blockedFlip[$current])) {
                return true;
            }
            $dot = strpos($current, '.');
            if ($dot === false) {
                break;
            }
            $current = substr($current, $dot + 1);
        }

        return false;
    }
}
