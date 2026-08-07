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

namespace App\Controllers\System;

use App\App;
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Services\FeatherCloud\FeatherPanelPremium;
use App\Services\FeatherCloud\MythicMemberResolver;
use App\Services\FeatherCloud\FeatherCloudException;

class CloudV1Controller
{
    public const CACHE_SUMMARY = 'feathercloud:sync:summary';
    public const CACHE_PRODUCTS = 'feathercloud:sync:products';

    #[OA\Get(
        path: '/api/cloud/v1/status',
        summary: 'Mythic Cloud link status',
        tags: ['System - Mythic Cloud'],
        security: [['PanelAccess' => []]]
    )]
    public function status(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();

        $teamUuid = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, '') ?? ''));
        $mythicUserId = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '') ?? ''));
        $linkedAt = $config->getSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, null);
        $lastSyncedAt = $config->getSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, null);
        $hasIdentity = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? '')) !== ''
            && trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? '')) !== '';
        $hasAccess = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '') ?? '')) !== ''
            && trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '') ?? '')) !== '';

        $linked = $hasIdentity && ($linkedAt || ($teamUuid !== '' && $mythicUserId !== ''));

        return ApiResponse::success([
            'linked' => $linked,
            'has_identity_keys' => $hasIdentity,
            'has_access_keys' => $hasAccess,
            'team_uuid' => $teamUuid !== '' ? $teamUuid : null,
            'team_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_NAME, '') ?: null,
            'mythic_user_id' => $mythicUserId !== '' ? $mythicUserId : null,
            'cloud_id' => $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_ID, '') ?: null,
            'cloud_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_NAME, '') ?: null,
            'linked_at' => $linkedAt,
            'last_sync_at' => $lastSyncedAt,
            'panel_version' => defined('APP_VERSION') ? (string) APP_VERSION : null,
        ], 'Cloud status retrieved', 200);
    }

    #[OA\Post(
        path: '/api/cloud/v1/sync',
        summary: 'Pull Mythic summary + purchases into panel cache',
        tags: ['System - Mythic Cloud'],
        security: [['PanelAccess' => []]]
    )]
    public function sync(Request $request): Response
    {
        try {
            $result = self::runSync();

            return ApiResponse::success($result, 'Cloud sync completed', 200);
        } catch (FeatherCloudException $e) {
            $status = $e->getHttpStatusCode();
            if ($status === 401) {
                $status = 503;
            }

            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $status);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Mythic cloud sync failed: ' . $e->getMessage());

            return ApiResponse::error('Cloud sync failed: ' . $e->getMessage(), 'CLOUD_SYNC_FAILED', 500);
        }
    }

    /**
     * Shared sync used by Mythic → panel and admin UI.
     *
     * @throws FeatherCloudException
     *
     * @return array<string, mixed>
     */
    public static function runSync(): array
    {
        $config = App::getInstance(true)->getConfig();
        $client = new FeatherCloudClient();

        if (!$client->isConfigured()) {
            throw new FeatherCloudException(
                'Mythic Panel API identity keys (FCPUB/FCPRIV) are not configured.',
                'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                503
            );
        }

        $mythicUserId = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '') ?? ''));
        if ($mythicUserId !== '') {
            $client = $client->withMemberUserUuid($mythicUserId);
        }

        try {
            $summary = $client->getSummary();
            FeatherPanelPremium::persistFromSummary($summary);
        } catch (FeatherCloudException $e) {
            // Keep cached Premium through Mythic outages until expires_at.
            FeatherPanelPremium::retainOnUpstreamFailure($e);
            throw $e;
        }

        $products = $client->getPurchasedProducts(1, 100);

        Cache::put(self::CACHE_SUMMARY, $summary, 600);
        Cache::put(self::CACHE_PRODUCTS, $products, 600);

        // Refresh email→Mythic member map when possible.
        $membersSynced = 0;
        try {
            $syncResult = MythicMemberResolver::syncTeamMembers($client);
            $membersSynced = (int) ($syncResult['synced'] ?? 0);
        } catch (\Throwable) {
            $membersSynced = 0;
        }

        $timestamp = gmdate('c');
        $config->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, $timestamp);

        $purchaseCount = 0;
        if (isset($products['purchases']) && is_array($products['purchases'])) {
            $purchaseCount = count($products['purchases']);
        } elseif (isset($products['items']) && is_array($products['items'])) {
            $purchaseCount = count($products['items']);
        } elseif (array_is_list($products)) {
            $purchaseCount = count($products);
        }

        return [
            'synced_at' => $timestamp,
            'last_sync_at' => $timestamp,
            'summary' => $summary,
            'purchases_count' => $purchaseCount,
            'members_synced' => $membersSynced,
            'team_uuid' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, '') ?: null,
            'mythic_user_id' => $mythicUserId !== '' ? $mythicUserId : null,
            'premium' => FeatherPanelPremium::statusPayload(),
        ];
    }
}
