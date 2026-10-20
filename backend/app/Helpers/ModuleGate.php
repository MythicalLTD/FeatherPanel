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
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin-toggleable panel modules (game servers, web hosting, VDS).
 *
 * A disabled module keeps its data but its user and admin API answers 403 MODULE_DISABLED.
 * Daemon callbacks (Wings, FeatherQuilld, Proxmox tasks) are never gated so running
 * infrastructure keeps reporting while a module is hidden.
 */
class ModuleGate
{
    public const GAME = 'game';
    public const WEB = 'web';
    public const VDS = 'vds';

    /** @var array<string, string> */
    private const SETTING_KEYS = [
        self::GAME => ConfigInterface::MODULE_GAME_ENABLED,
        self::WEB => ConfigInterface::MODULE_WEB_ENABLED,
        self::VDS => ConfigInterface::MODULE_VDS_ENABLED,
    ];

    /**
     * API path prefixes owned by a module. Matched on whole path segments.
     *
     * @var array<string, string>
     */
    private const PREFIXES = [
        '/api/user/servers' => self::GAME,
        '/api/user/spells' => self::GAME,
        '/api/user/realms' => self::GAME,
        '/api/admin/servers' => self::GAME,
        '/api/admin/server-activities' => self::GAME,
        '/api/admin/nodes' => self::GAME,
        '/api/admin/allocations' => self::GAME,
        '/api/admin/realms' => self::GAME,
        '/api/admin/spells' => self::GAME,
        '/api/admin/spell-variables' => self::GAME,
        '/api/admin/mounts' => self::GAME,
        '/api/admin/wings-backups' => self::GAME,
        '/api/admin/backup-schedules' => self::GAME,
        '/api/admin/subdomains' => self::GAME,
        '/api/admin/pterodactyl-importer' => self::GAME,
        '/api/admin/analytics/servers' => self::GAME,
        '/api/user/webspaces' => self::WEB,
        '/api/admin/webspaces' => self::WEB,
        '/api/admin/web-nodes' => self::WEB,
        '/api/admin/webplates' => self::WEB,
        '/api/admin/hosting-packages' => self::WEB,
        '/api/admin/mail-hosts' => self::WEB,
        '/api/admin/dns-hosts' => self::WEB,
        '/api/user/vm-instances' => self::VDS,
        '/api/user/vds-chatbot' => self::VDS,
        '/api/admin/vm-instances' => self::VDS,
        '/api/admin/vm-nodes' => self::VDS,
        '/api/admin/vm-templates' => self::VDS,
        '/api/admin/analytics/vds' => self::VDS,
    ];

    public static function moduleForPath(string $path): ?string
    {
        foreach (self::PREFIXES as $prefix => $module) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return $module;
            }
        }

        return null;
    }

    public static function isEnabled(string $module): bool
    {
        $key = self::SETTING_KEYS[$module] ?? null;
        if ($key === null) {
            return true;
        }

        return App::getInstance(true)->getConfig()->getSetting($key, 'true') !== 'false';
    }

    /**
     * Returns the refusal for a request to a disabled module, or null when it may proceed.
     */
    public static function check(string $path): ?Response
    {
        $module = self::moduleForPath($path);
        if ($module === null || self::isEnabled($module)) {
            return null;
        }

        return ApiResponse::error(
            'This module is disabled by the administrator',
            'MODULE_DISABLED',
            403,
            ['module' => $module],
        );
    }
}
