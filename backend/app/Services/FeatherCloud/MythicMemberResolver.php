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
use Symfony\Component\HttpFoundation\Request;

/**
 * Resolves the Mythic team member id for X-Panel-User-Uuid.
 *
 * Never asks humans to paste Mythic user ids. Preferred match order:
 * 1) FeatherPanel user uuid map
 * 2) Email (case-insensitive) from last /panel/team/members sync
 * 3) Stored OAuth authorizer for the linking admin
 */
class MythicMemberResolver
{
    public const UNMAPPED_MESSAGE = 'Link your Mythic account or ask your team owner to invite a matching email. Member actions run as your Mythic identity automatically — you never need to enter a Mythic user id.';

    /**
     * @param array<string, mixed>|null $user FeatherPanel user row from auth middleware
     */
    public static function resolveForUser(?array $user): ?string
    {
        if ($user === null) {
            return null;
        }

        $config = App::getInstance(true)->getConfig();
        $featherUuid = trim((string) ($user['uuid'] ?? ''));
        $email = strtolower(trim((string) ($user['email'] ?? '')));

        $map = self::readMemberMap($config);

        if ($featherUuid !== '' && isset($map['by_feather_uuid'][$featherUuid])) {
            return self::normalizeMythicId($map['by_feather_uuid'][$featherUuid]);
        }

        if ($email !== '' && isset($map['by_email'][$email])) {
            return self::normalizeMythicId($map['by_email'][$email]);
        }

        $authorizerMythic = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '') ?? ''));
        $linkingFeather = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_FEATHER_UUID, '') ?? ''));
        if ($authorizerMythic !== '' && $featherUuid !== '' && $linkingFeather !== '' && hash_equals($linkingFeather, $featherUuid)) {
            return self::normalizeMythicId($authorizerMythic);
        }

        return null;
    }

    public static function resolveFromRequest(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        $user = $request->attributes->get('user');

        return self::resolveForUser(is_array($user) ? $user : null);
    }

    /**
     * Persist OAuth authorizer + team metadata after a successful link.
     *
     * @param array<string, mixed> $meta Optional Mythic finish metadata
     */
    public static function persistLinkIdentity(
        ?string $teamUuid,
        ?string $mythicUserId,
        ?string $linkingFeatherUuid,
        array $meta = [],
    ): void {
        $config = App::getInstance(true)->getConfig();

        $team = trim((string) ($teamUuid ?? ''));
        if ($team !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, $team);
        }

        $mythicId = self::normalizeMythicId($mythicUserId);
        if ($mythicId !== null) {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, $mythicId);
        }

        $featherUuid = trim((string) ($linkingFeatherUuid ?? ''));
        if ($featherUuid !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_FEATHER_UUID, $featherUuid);
        }

        $email = strtolower(trim((string) ($meta['mythic_user_email'] ?? $meta['email'] ?? '')));
        if ($email !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_EMAIL, $email);
        }

        $name = trim((string) ($meta['mythic_user_name'] ?? $meta['name'] ?? ''));
        if ($name !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_NAME, $name);
        }

        $teamName = trim((string) ($meta['team_name'] ?? ''));
        if ($teamName !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_NAME, $teamName);
        }

        $teamSlug = trim((string) ($meta['team_slug'] ?? ''));
        if ($teamSlug !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_SLUG, $teamSlug);
        }

        $cloudId = trim((string) ($meta['cloud_id'] ?? ''));
        if ($cloudId !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_ID, $cloudId);
        }

        $cloudName = trim((string) ($meta['cloud_name'] ?? ''));
        if ($cloudName !== '') {
            $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_NAME, $cloudName);
        }

        $map = self::readMemberMap($config);
        if ($mythicId !== null) {
            if ($featherUuid !== '') {
                $map['by_feather_uuid'][$featherUuid] = $mythicId;
            }
            if ($email !== '') {
                $map['by_email'][$email] = $mythicId;
            }
        }
        self::writeMemberMap($config, $map);
    }

    /**
     * Sync Mythic team members and rebuild the email / uuid map.
     *
     * @return array{synced: int, map: array<string, mixed>}
     */
    public static function syncTeamMembers(FeatherCloudClient $client, ?string $linkingFeatherUuid = null): array
    {
        $config = App::getInstance(true)->getConfig();
        $map = self::readMemberMap($config);
        $page = 1;
        $synced = 0;

        do {
            $payload = $client->getTeamMembers($page, 100);
            $members = self::extractMembersList($payload);
            if ($members === []) {
                break;
            }

            foreach ($members as $member) {
                $mythicId = self::extractMemberMythicId($member);
                if ($mythicId === null) {
                    continue;
                }

                $memberEmail = strtolower(trim((string) ($member['email'] ?? $member['user']['email'] ?? '')));
                if ($memberEmail !== '') {
                    $map['by_email'][$memberEmail] = $mythicId;
                }

                ++$synced;
            }

            ++$page;
            $hasMore = count($members) >= 100;
        } while ($hasMore && $page <= 20);

        if ($linkingFeatherUuid !== null && $linkingFeatherUuid !== '') {
            $authorizer = self::normalizeMythicId(
                $config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '')
            );
            if ($authorizer !== null) {
                $map['by_feather_uuid'][$linkingFeatherUuid] = $authorizer;
            }
        }

        $map['synced_at'] = gmdate('c');
        self::writeMemberMap($config, $map);

        return ['synced' => $synced, 'map' => $map];
    }

    /**
     * Wipe all Mythic link state (team, authorizer, member map, display metadata).
     * Does not touch panel identity / access keys — caller clears those separately.
     */
    public static function clearLinkState(): void
    {
        $config = App::getInstance(true)->getConfig();
        $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_NAME, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_TEAM_SLUG, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_FEATHER_UUID, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_EMAIL, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_NAME, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_ID, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_NAME, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_MEMBER_MAP, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_MEMBER_USER_UUID, null);
        $config->setSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, null);
    }

    /**
     * @return array{
     *   by_email: array<string, string>,
     *   by_feather_uuid: array<string, string>,
     *   synced_at: string|null
     * }
     */
    private static function readMemberMap(object $config): array
    {
        $raw = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_MEMBER_MAP, '') ?? ''));
        $decoded = $raw !== '' ? json_decode($raw, true) : null;
        if (!is_array($decoded)) {
            $decoded = [];
        }

        return [
            'by_email' => is_array($decoded['by_email'] ?? null) ? $decoded['by_email'] : [],
            'by_feather_uuid' => is_array($decoded['by_feather_uuid'] ?? null) ? $decoded['by_feather_uuid'] : [],
            'synced_at' => isset($decoded['synced_at']) ? (string) $decoded['synced_at'] : null,
        ];
    }

    /**
     * @param array{by_email: array<string, string>, by_feather_uuid: array<string, string>, synced_at: string|null} $map
     */
    private static function writeMemberMap(object $config, array $map): void
    {
        $config->setSetting(ConfigInterface::FEATHERCLOUD_MEMBER_MAP, json_encode([
            'by_email' => $map['by_email'] ?? [],
            'by_feather_uuid' => $map['by_feather_uuid'] ?? [],
            'synced_at' => $map['synced_at'] ?? gmdate('c'),
        ], JSON_THROW_ON_ERROR));
    }

    private static function normalizeMythicId(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $id = trim((string) $value);
        if ($id === '' || !preg_match('/^\d+$/', $id)) {
            return null;
        }

        return $id;
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return list<array<string, mixed>>
     */
    private static function extractMembersList(array $payload): array
    {
        if (isset($payload['members']) && is_array($payload['members'])) {
            return array_values(array_filter($payload['members'], 'is_array'));
        }
        if (isset($payload['data']) && is_array($payload['data'])) {
            $inner = $payload['data'];
            if (isset($inner['members']) && is_array($inner['members'])) {
                return array_values(array_filter($inner['members'], 'is_array'));
            }
            if (array_is_list($inner)) {
                return array_values(array_filter($inner, 'is_array'));
            }
        }
        if (array_is_list($payload)) {
            return array_values(array_filter($payload, 'is_array'));
        }

        return [];
    }

    /**
     * @param array<string, mixed> $member
     */
    private static function extractMemberMythicId(array $member): ?string
    {
        foreach (['id', 'user_id', 'mythic_user_id', 'uuid'] as $key) {
            if (isset($member[$key])) {
                $normalized = self::normalizeMythicId($member[$key]);
                if ($normalized !== null) {
                    return $normalized;
                }
            }
        }

        if (isset($member['user']) && is_array($member['user'])) {
            return self::extractMemberMythicId($member['user']);
        }

        return null;
    }
}
