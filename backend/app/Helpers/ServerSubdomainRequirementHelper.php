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
use App\Permissions;
use App\Chat\Subdomain;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Response;

/**
 * Panel-wide "require subdomain before using a server" gate.
 *
 * Mirrors the API-keys pattern: a setting turns the rule on for everyone,
 * and {@see Permissions::USER_SERVERS_BYPASS_SUBDOMAIN_REQUIREMENT} (or admin.root)
 * lets selected roles skip it.
 */
class ServerSubdomainRequirementHelper
{
    public static function isRequired(): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::SERVER_REQUIRE_SUBDOMAIN, 'false') === 'true';
    }

    public static function userBypasses(array $user): bool
    {
        if (!isset($user['uuid']) || !is_string($user['uuid']) || $user['uuid'] === '') {
            return false;
        }

        // admin.root is included via PermissionHelper. Staff who can view servers in admin
        // also bypass so support is not blocked by the customer-facing requirement.
        return PermissionHelper::hasPermission(
            $user['uuid'],
            Permissions::USER_SERVERS_BYPASS_SUBDOMAIN_REQUIREMENT,
            $user
        ) || PermissionHelper::hasPermission(
            $user['uuid'],
            Permissions::ADMIN_SERVERS_VIEW,
            $user
        );
    }

    public static function serverCompliant(int $serverId): bool
    {
        return Subdomain::existsByServerId($serverId);
    }

    /**
     * True when this user must not see allocation IPs / start the server yet.
     */
    public static function shouldEnforce(array $user, int $serverId): bool
    {
        if (!self::isRequired()) {
            return false;
        }

        if (self::userBypasses($user)) {
            return false;
        }

        return !self::serverCompliant($serverId);
    }

    /**
     * @return array{required: bool, compliant: bool, bypassed: bool, enforced: bool}
     */
    public static function requirementMeta(array $user, int $serverId): array
    {
        $required = self::isRequired();
        $bypassed = $required && self::userBypasses($user);
        $compliant = self::serverCompliant($serverId);

        return [
            'required' => $required,
            'compliant' => $compliant,
            'bypassed' => $bypassed,
            'enforced' => $required && !$bypassed && !$compliant,
        ];
    }

    /**
     * Strip node IPs from an allocation payload. Port is kept so users can connect via subdomain:port.
     *
     * @param array<string, mixed>|null $allocation
     *
     * @return array<string, mixed>|null
     */
    public static function redactAllocation(?array $allocation): ?array
    {
        if ($allocation === null) {
            return null;
        }

        $allocation['ip'] = null;

        $alias = $allocation['ip_alias'] ?? null;
        if (is_string($alias) && $alias !== '' && filter_var($alias, FILTER_VALIDATE_IP)) {
            $allocation['ip_alias'] = null;
        }

        return $allocation;
    }

    public static function forbiddenResponse(): Response
    {
        return ApiResponse::error(
            'A subdomain is required before you can start this server. Create one under Network → Subdomains.',
            'SUBDOMAIN_REQUIRED',
            403
        );
    }
}
