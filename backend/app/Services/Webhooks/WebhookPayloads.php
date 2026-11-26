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

namespace App\Services\Webhooks;

use App\Chat\User;

/**
 * Builds webhook "data" objects from database rows. Only listed fields leave the panel:
 * no passwords, tokens, 2FA keys, startup commands or internal notes.
 */
final class WebhookPayloads
{
    /** @param array<string, mixed>|null $server */
    public static function server(?array $server, array $extra = []): array
    {
        $server ??= [];
        $out = [
            'id' => self::int($server['id'] ?? null),
            'uuid' => self::str($server['uuid'] ?? null),
            'uuid_short' => self::str($server['uuidShort'] ?? null),
            'external_id' => self::str($server['external_id'] ?? null),
            'name' => self::str($server['name'] ?? null),
            'description' => self::str($server['description'] ?? null),
            'status' => self::str($server['status'] ?? null),
            'suspended' => self::bool($server['suspended'] ?? null),
            'suspension_reason' => self::str($server['suspension_reason'] ?? null),
            'owner_id' => self::int($server['owner_id'] ?? null),
            'node_id' => self::int($server['node_id'] ?? null),
            'realm_id' => self::int($server['realms_id'] ?? null),
            'spell_id' => self::int($server['spell_id'] ?? null),
            'allocation_id' => self::int($server['allocation_id'] ?? null),
            'limits' => [
                'memory' => self::int($server['memory'] ?? null),
                'swap' => self::int($server['swap'] ?? null),
                'disk' => self::int($server['disk'] ?? null),
                'io' => self::int($server['io'] ?? null),
                'cpu' => self::int($server['cpu'] ?? null),
            ],
            'feature_limits' => [
                'databases' => self::int($server['database_limit'] ?? null),
                'allocations' => self::int($server['allocation_limit'] ?? null),
                'backups' => self::int($server['backup_limit'] ?? null),
            ],
            'expires_at' => self::str($server['expires_at'] ?? null),
            'created_at' => self::str($server['created_at'] ?? null),
            'updated_at' => self::str($server['updated_at'] ?? null),
        ];
        $ownerId = $out['owner_id'];
        if ($ownerId !== null && !array_key_exists('owner', $extra)) {
            $owner = self::lookupUser($ownerId);
            $out['owner'] = $owner !== null ? self::userRef($owner) : null;
        }

        return array_merge($out, $extra);
    }

    /** @param array<string, mixed>|null $user */
    public static function user(?array $user, array $extra = []): array
    {
        $user ??= [];

        return array_merge([
            'id' => self::int($user['id'] ?? null),
            'uuid' => self::str($user['uuid'] ?? null),
            'external_id' => self::str($user['external_id'] ?? null),
            'username' => self::str($user['username'] ?? null),
            'email' => self::str($user['email'] ?? null),
            'first_name' => self::str($user['first_name'] ?? null),
            'last_name' => self::str($user['last_name'] ?? null),
            'role_id' => self::int($user['role_id'] ?? null),
            'banned' => self::bool($user['banned'] ?? null),
            'two_fa_enabled' => self::bool($user['two_fa_enabled'] ?? null),
            'first_seen' => self::str($user['first_seen'] ?? null),
        ], $extra);
    }

    /**
     * @param array<string, mixed> $backup
     * @param array<string, mixed> $server
     */
    public static function backup(array $backup, array $server): array
    {
        return [
            'backup' => [
                'id' => self::int($backup['id'] ?? null),
                'uuid' => self::str($backup['uuid'] ?? null),
                'name' => self::str($backup['name'] ?? null),
                'successful' => self::bool($backup['is_successful'] ?? null),
                'locked' => self::bool($backup['is_locked'] ?? null),
                'bytes' => self::int($backup['bytes'] ?? null),
                'checksum' => self::str($backup['checksum'] ?? null),
                'adapter' => self::str($backup['disk'] ?? null),
                'completed_at' => self::str($backup['completed_at'] ?? null),
                'created_at' => self::str($backup['created_at'] ?? null),
            ],
            'server' => self::server($server),
        ];
    }

    /** @param array<string, mixed>|null $vds */
    public static function vds(?array $vds, array $extra = []): array
    {
        $vds ??= [];
        $out = [
            'id' => self::int($vds['id'] ?? null),
            'external_id' => self::str($vds['external_id'] ?? null),
            'vmid' => self::int($vds['vmid'] ?? null),
            'vm_node_id' => self::int($vds['vm_node_id'] ?? null),
            'type' => self::str($vds['vm_type'] ?? null),
            'hostname' => self::str($vds['hostname'] ?? null),
            'status' => self::str($vds['status'] ?? null),
            'suspended' => self::bool($vds['suspended'] ?? null),
            'ip_address' => self::str($vds['ip_address'] ?? null),
            'plan_id' => self::int($vds['plan_id'] ?? null),
            'template_id' => self::int($vds['template_id'] ?? null),
            'memory' => self::int($vds['memory'] ?? null),
            'cpus' => self::int($vds['cpus'] ?? null),
            'cores' => self::int($vds['cores'] ?? null),
            'disk_gb' => self::int($vds['disk_gb'] ?? null),
            'user_uuid' => self::str($vds['user_uuid'] ?? null),
            'expires_at' => self::str($vds['expires_at'] ?? null),
            'created_at' => self::str($vds['created_at'] ?? null),
        ];
        if ($out['user_uuid'] !== null && !array_key_exists('owner', $extra)) {
            $owner = self::lookupUserByUuid($out['user_uuid']);
            $out['owner'] = $owner !== null ? self::userRef($owner) : null;
        }

        return array_merge($out, $extra);
    }

    /** @param array<string, mixed>|null $space */
    public static function webspace(?array $space, array $extra = []): array
    {
        $space ??= [];
        $out = [
            'id' => self::int($space['id'] ?? null),
            'uuid' => self::str($space['uuid'] ?? null),
            'uuid_short' => self::str($space['uuidShort'] ?? null),
            'external_id' => self::str($space['external_id'] ?? null),
            'name' => self::str($space['name'] ?? null),
            'status' => self::str($space['status'] ?? null),
            'web_node_id' => self::int($space['web_node_id'] ?? null),
            'webplate_id' => self::int($space['webplate_id'] ?? null),
            'hosting_package_id' => self::int($space['hosting_package_id'] ?? null),
            'owner_id' => self::int($space['owner_id'] ?? null),
            'disk' => self::int($space['disk'] ?? null),
            'created_at' => self::str($space['created_at'] ?? null),
        ];
        if ($out['owner_id'] !== null && !array_key_exists('owner', $extra)) {
            $owner = self::lookupUser($out['owner_id']);
            $out['owner'] = $owner !== null ? self::userRef($owner) : null;
        }

        return array_merge($out, $extra);
    }

    /**
     * Names of the fields an update touched, without internal token columns.
     *
     * @param array<string, mixed> $data
     *
     * @return array<int, string>
     */
    public static function changedKeys(array $data): array
    {
        $internal = ['remember_token', 'two_fa_key', 'email_login_code', 'email_login_expires', 'account_deletion_otp', 'account_deletion_otp_expires', 'discord_oauth2_access_token', 'mail_verify', 'updated_at'];

        return array_values(array_filter(array_map('strval', array_keys($data)), static fn (string $k): bool => !in_array($k, $internal, true)));
    }

    /**
     * Who did it: a short reference to the acting user, or null for the system.
     *
     * @param array<string, mixed>|null $user
     */
    public static function actor(?array $user): ?array
    {
        if (!is_array($user) || empty($user['uuid'])) {
            return null;
        }

        return self::userRef($user);
    }

    /** @param array<string, mixed> $user */
    public static function userRef(array $user): array
    {
        return [
            'id' => self::int($user['id'] ?? null),
            'uuid' => self::str($user['uuid'] ?? null),
            'username' => self::str($user['username'] ?? null),
            'email' => self::str($user['email'] ?? null),
            'external_id' => self::str($user['external_id'] ?? null),
        ];
    }

    private static function lookupUser(int $id): ?array
    {
        try {
            $user = User::getUserById($id);

            return is_array($user) ? $user : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function lookupUserByUuid(string $uuid): ?array
    {
        try {
            $user = User::getUserByUuid($uuid);

            return is_array($user) ? $user : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function int(mixed $v): ?int
    {
        if ($v === null || $v === '' || !is_numeric($v)) {
            return null;
        }

        return (int) $v;
    }

    private static function str(mixed $v): ?string
    {
        if ($v === null || is_array($v) || is_object($v)) {
            return null;
        }
        $s = (string) $v;

        return $s === '' ? null : $s;
    }

    private static function bool(mixed $v): bool
    {
        return in_array($v, [true, 1, '1', 'true', 'yes'], true);
    }
}
