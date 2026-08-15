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

namespace App\Services\FeatherCloud;

use App\App;
use App\Config\ConfigInterface;

/**
 * Team-scoped FeatherPanel Premium entitlement from Mythic GET /panel/summary.
 *
 * Authoritative Mythic responses update the cache immediately.
 * Upstream outages keep the last successful grant until expires_at (grace cache).
 * Disconnect / rotate always clears.
 */
class FeatherPanelPremium
{
    public const MYTHIC_APP_BASE = 'https://my.mythicalsystems.org';

    /**
     * How long a successful active grant stays valid if Mythic cannot be reached.
     * Refreshed on every successful active sync.
     */
    public const CACHE_GRACE_SECONDS = 7 * 24 * 60 * 60;

    /** @var list<string> */
    public const FEATURE_KEYS = [
        'remove_branding',
        'rename_ai_agent',
        'custom_sidebar',
        'higher_limits',
        'priority_support',
        'priority_suggestions',
    ];

    /**
     * @return array<string, bool>
     */
    public static function defaultFeatures(): array
    {
        $features = [];
        foreach (self::FEATURE_KEYS as $key) {
            $features[$key] = false;
        }

        return $features;
    }

    /**
     * Persist entitlement from a Mythic /panel/summary payload.
     * Missing entitlement object is treated as an authoritative inactive.
     *
     * @param array<string, mixed> $summary
     */
    public static function persistFromSummary(array $summary): void
    {
        $entitlements = $summary['entitlements'] ?? null;
        $premium = is_array($entitlements) ? ($entitlements['featherpanel_premium'] ?? null) : null;

        if (!is_array($premium)) {
            self::setInactive();

            return;
        }

        $active = filter_var($premium['active'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $features = self::normalizeFeatures(is_array($premium['features'] ?? null) ? $premium['features'] : []);

        self::writeState($active, $features);
    }

    /**
     * Hard clear — disconnect / rotate / intentional wipe.
     */
    public static function clear(): void
    {
        self::setInactive();
    }

    /**
     * Mythic unreachable or refresh failed: keep cached grant until expires_at.
     * Expired grants are retired here so outages past the grace window still fail closed.
     */
    public static function retainOnUpstreamFailure(?\Throwable $error = null): void
    {
        if (self::isExpired()) {
            self::setInactive();
            App::getInstance(true)->getLogger()->info(
                'FeatherPanel Premium cache expired during upstream failure; entitlement cleared.'
            );

            return;
        }

        $config = App::getInstance(true)->getConfig();
        // Touch checked_at only when still within grace so admins see last attempt vs last grant.
        $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_LAST_FAILURE_AT, gmdate('c'));

        $message = $error !== null ? $error->getMessage() : 'unknown error';
        App::getInstance(true)->getLogger()->warning(
            'FeatherPanel Premium refresh failed; retaining cached entitlement until expires_at: ' . $message
        );
    }

    public static function isActive(): bool
    {
        self::expireIfNeeded();

        $config = App::getInstance(true)->getConfig();

        return ($config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, 'false') ?? 'false') === 'true';
    }

    /**
     * @return array<string, bool>
     */
    public static function features(): array
    {
        self::expireIfNeeded();

        $config = App::getInstance(true)->getConfig();
        $raw = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_FEATURES, '') ?? '';
        if (!is_string($raw) || $raw === '') {
            return self::defaultFeatures();
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return self::defaultFeatures();
        }

        return self::normalizeFeatures($decoded);
    }

    /**
     * UI customization (AI rename/avatar, remove powered-by, hide version, custom sidebar) is gated on active for now.
     * Mythic feature flags are reserved; AND them in later when Mythic enables them.
     */
    public static function canCustomizeUi(): bool
    {
        return self::isActive();
    }

    public static function canCustomSidebar(): bool
    {
        return self::canCustomizeUi();
    }

    public static function manageUrl(): string
    {
        $config = App::getInstance(true)->getConfig();
        $slug = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_SLUG, '') ?? ''));
        if ($slug !== '') {
            return self::MYTHIC_APP_BASE . '/' . rawurlencode($slug) . '/featherpanel-premium';
        }

        return self::MYTHIC_APP_BASE . '/clouds';
    }

    /**
     * @return array{
     *   active: bool,
     *   features: array<string, bool>,
     *   checked_at: string|null,
     *   expires_at: string|null,
     *   last_failure_at: string|null,
     *   using_cache: bool,
     *   can_customize_ui: bool,
     *   can_custom_sidebar: bool,
     *   manage_url: string
     * }
     */
    public static function statusPayload(): array
    {
        self::expireIfNeeded();

        $config = App::getInstance(true)->getConfig();
        $active = ($config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, 'false') ?? 'false') === 'true';
        $checkedAt = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_CHECKED_AT, null);
        $expiresAt = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_EXPIRES_AT, null);
        $lastFailureAt = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_LAST_FAILURE_AT, null);

        $usingCache = false;
        if ($active && is_string($lastFailureAt) && $lastFailureAt !== '') {
            $failureTs = strtotime($lastFailureAt);
            $checkedTs = is_string($checkedAt) ? strtotime($checkedAt) : false;
            if ($failureTs !== false && ($checkedTs === false || $failureTs >= $checkedTs)) {
                $usingCache = true;
            }
        }

        return [
            'active' => $active,
            'features' => self::features(),
            'checked_at' => $checkedAt,
            'expires_at' => $expiresAt,
            'last_failure_at' => $lastFailureAt,
            'using_cache' => $usingCache,
            'can_customize_ui' => $active,
            'can_custom_sidebar' => $active,
            'manage_url' => self::manageUrl(),
        ];
    }

    /**
     * @param array<string, mixed> $input
     *
     * @return array<string, bool>
     */
    private static function normalizeFeatures(array $input): array
    {
        $features = self::defaultFeatures();
        foreach (self::FEATURE_KEYS as $key) {
            if (array_key_exists($key, $input)) {
                $features[$key] = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN);
            }
        }

        return $features;
    }

    /**
     * @param array<string, bool> $features
     */
    private static function writeState(bool $active, array $features, bool $forceResetCustomizations = false): void
    {
        $config = App::getInstance(true)->getConfig();
        $wasActive = ($config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, 'false') ?? 'false') === 'true'
            && !self::isExpired();

        $now = time();
        $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, $active ? 'true' : 'false');
        $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_FEATURES, json_encode($features, JSON_UNESCAPED_SLASHES));
        $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_CHECKED_AT, gmdate('c', $now));
        $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_LAST_FAILURE_AT, null);

        if ($active) {
            $config->setSetting(
                ConfigInterface::FEATHERPANEL_PREMIUM_EXPIRES_AT,
                gmdate('c', $now + self::CACHE_GRACE_SECONDS)
            );
        } else {
            $config->setSetting(ConfigInterface::FEATHERPANEL_PREMIUM_EXPIRES_AT, null);
        }

        if ($forceResetCustomizations || (!$active && $wasActive)) {
            self::resetCustomizations();
        }
    }

    private static function setInactive(): void
    {
        self::writeState(false, self::defaultFeatures(), true);
    }

    private static function isExpired(): bool
    {
        $config = App::getInstance(true)->getConfig();
        $active = ($config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, 'false') ?? 'false') === 'true';
        if (!$active) {
            return false;
        }

        $expiresAt = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_EXPIRES_AT, null);
        if (!is_string($expiresAt) || $expiresAt === '') {
            // Legacy cache without expiry: allow one grace window from checked_at, else expire.
            $checkedAt = $config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_CHECKED_AT, null);
            if (!is_string($checkedAt) || $checkedAt === '') {
                return true;
            }
            $checkedTs = strtotime($checkedAt);
            if ($checkedTs === false) {
                return true;
            }

            return time() > ($checkedTs + self::CACHE_GRACE_SECONDS);
        }

        $expiresTs = strtotime($expiresAt);

        return $expiresTs === false || time() > $expiresTs;
    }

    private static function expireIfNeeded(): void
    {
        $config = App::getInstance(true)->getConfig();
        $active = ($config->getSetting(ConfigInterface::FEATHERPANEL_PREMIUM_ACTIVE, 'false') ?? 'false') === 'true';
        if (!$active) {
            return;
        }

        if (self::isExpired()) {
            self::setInactive();
        }
    }

    private static function resetCustomizations(): void
    {
        $config = App::getInstance(true)->getConfig();
        $config->setSetting(ConfigInterface::BRANDING_SHOW_POWERED_BY, 'true');
        $config->setSetting(ConfigInterface::BRANDING_SHOW_VERSION, 'true');
        $config->setSetting(ConfigInterface::CHATBOT_DISPLAY_NAME, '');
        $config->setSetting(ConfigInterface::CHATBOT_AVATAR_URL, '');
        $config->setSetting(ConfigInterface::SIDEBAR_NAVIGATION_CONFIG, '');
    }
}
