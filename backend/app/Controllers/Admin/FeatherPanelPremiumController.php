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

namespace App\Controllers\Admin;

use App\App;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Services\FeatherCloud\FeatherPanelPremium;
use App\Services\FeatherCloud\MythicMemberResolver;
use App\Services\FeatherCloud\FeatherCloudException;

class FeatherPanelPremiumController
{
    private const SIDEBAR_SCOPES = ['admin', 'main', 'server'];

    #[OA\Get(
        path: '/api/admin/featherpanel-premium',
        summary: 'Get FeatherPanel Premium entitlement and customization settings',
        tags: ['Admin - FeatherPanel Premium']
    )]
    public function show(Request $request): Response
    {
        $refresh = filter_var($request->query->get('refresh', false), FILTER_VALIDATE_BOOLEAN);
        if ($refresh) {
            $this->tryRefreshEntitlement($request);
        }

        return ApiResponse::success($this->payload($request), 'FeatherPanel Premium status retrieved', 200);
    }

    #[OA\Post(
        path: '/api/admin/featherpanel-premium',
        summary: 'Update FeatherPanel Premium customization settings',
        tags: ['Admin - FeatherPanel Premium']
    )]
    public function update(Request $request): Response
    {
        // Refresh entitlement before write so cancelled subscriptions cannot save.
        $this->tryRefreshEntitlement($request);

        if (!FeatherPanelPremium::canCustomizeUi()) {
            return ApiResponse::error(
                'FeatherPanel Premium is required to customize branding and AI appearance.',
                'PREMIUM_REQUIRED',
                403
            );
        }

        $body = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $config = App::getInstance(true)->getConfig();

        if (array_key_exists('chatbot_display_name', $body)) {
            $name = trim((string) $body['chatbot_display_name']);
            if (mb_strlen($name) > 64) {
                return ApiResponse::error('AI display name must be at most 64 characters.', 'INVALID_DISPLAY_NAME', 400);
            }
            $config->setSetting(ConfigInterface::CHATBOT_DISPLAY_NAME, $name);
        }

        if (array_key_exists('chatbot_avatar_url', $body)) {
            $avatar = trim((string) $body['chatbot_avatar_url']);
            if ($avatar !== '' && !$this->isAllowedAssetUrl($avatar)) {
                return ApiResponse::error(
                    'AI avatar must be an http(s) URL or a path starting with /.',
                    'INVALID_AVATAR_URL',
                    400
                );
            }
            if (mb_strlen($avatar) > 2048) {
                return ApiResponse::error('AI avatar URL is too long.', 'INVALID_AVATAR_URL', 400);
            }
            $config->setSetting(ConfigInterface::CHATBOT_AVATAR_URL, $avatar);
        }

        if (array_key_exists('branding_show_powered_by', $body)) {
            $show = filter_var($body['branding_show_powered_by'], FILTER_VALIDATE_BOOLEAN);
            $config->setSetting(ConfigInterface::BRANDING_SHOW_POWERED_BY, $show ? 'true' : 'false');
        }

        if (array_key_exists('sidebar_navigation_config', $body)) {
            if (!FeatherPanelPremium::canCustomSidebar()) {
                return ApiResponse::error(
                    'FeatherPanel Premium is required to customize the sidebar.',
                    'PREMIUM_REQUIRED',
                    403
                );
            }

            $normalized = $this->normalizeSidebarConfig($body['sidebar_navigation_config']);
            if ($normalized === null) {
                return ApiResponse::error('Invalid sidebar navigation configuration.', 'INVALID_SIDEBAR_CONFIG', 400);
            }

            $encoded = $normalized === [] ? '' : json_encode($normalized, JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                return ApiResponse::error('Failed to encode sidebar configuration.', 'INVALID_SIDEBAR_CONFIG', 400);
            }
            if (strlen($encoded) > 100000) {
                return ApiResponse::error('Sidebar configuration is too large.', 'INVALID_SIDEBAR_CONFIG', 400);
            }
            $config->setSetting(ConfigInterface::SIDEBAR_NAVIGATION_CONFIG, $encoded);
        }

        return ApiResponse::success($this->payload($request), 'FeatherPanel Premium settings saved', 200);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(?Request $request = null): array
    {
        $config = App::getInstance(true)->getConfig();
        $teamUuid = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_UUID, '') ?? ''));
        $linkedAt = $config->getSetting(ConfigInterface::FEATHERCLOUD_LINKED_AT, null);
        $hasIdentity = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '') ?? '')) !== ''
            && trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '') ?? '')) !== '';
        $mythicUserId = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID, '') ?? ''));
        $linked = $hasIdentity && ($linkedAt || ($teamUuid !== '' && $mythicUserId !== ''));

        $premium = FeatherPanelPremium::statusPayload();

        return [
            'linked' => (bool) $linked,
            'team_uuid' => $teamUuid !== '' ? $teamUuid : null,
            'team_name' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_NAME, '') ?: null,
            'team_slug' => $config->getSetting(ConfigInterface::FEATHERCLOUD_TEAM_SLUG, '') ?: null,
            'premium' => $premium,
            'settings' => [
                'chatbot_display_name' => (string) ($config->getSetting(ConfigInterface::CHATBOT_DISPLAY_NAME, '') ?? ''),
                'chatbot_avatar_url' => (string) ($config->getSetting(ConfigInterface::CHATBOT_AVATAR_URL, '') ?? ''),
                'branding_show_powered_by' => ($config->getSetting(ConfigInterface::BRANDING_SHOW_POWERED_BY, 'true') ?? 'true') === 'true',
                'sidebar_navigation_config' => $this->decodeSidebarConfig(
                    (string) ($config->getSetting(ConfigInterface::SIDEBAR_NAVIGATION_CONFIG, '') ?? '')
                ),
            ],
            'current_user_mapped' => MythicMemberResolver::resolveFromRequest($request) !== null,
        ];
    }

    private function tryRefreshEntitlement(?Request $request = null): void
    {
        $client = new FeatherCloudClient();
        if (!$client->isConfigured()) {
            // Not linked / no keys: keep grace cache if still valid (e.g. temporary config glitch).
            // Intentional disconnect already called clear().
            FeatherPanelPremium::retainOnUpstreamFailure(
                new FeatherCloudException('Mythic Panel API credentials are not configured', 'CREDENTIALS_NOT_CONFIGURED', 503)
            );

            return;
        }

        try {
            $mythicUserId = MythicMemberResolver::resolveFromRequest($request);
            if ($mythicUserId === null || $mythicUserId === '') {
                $mythicUserId = trim((string) (App::getInstance(true)->getConfig()->getSetting(
                    ConfigInterface::FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID,
                    ''
                ) ?? ''));
            }
            if ($mythicUserId !== '') {
                $client = $client->withMemberUserUuid($mythicUserId);
            }

            $summary = $client->getSummary();
            FeatherPanelPremium::persistFromSummary($summary);
            App::getInstance(true)->getConfig()->setSetting(
                ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT,
                gmdate('c')
            );
        } catch (FeatherCloudException $e) {
            FeatherPanelPremium::retainOnUpstreamFailure($e);
        } catch (\Throwable $e) {
            FeatherPanelPremium::retainOnUpstreamFailure($e);
        }
    }

    private function isAllowedAssetUrl(string $url): bool
    {
        if (str_starts_with($url, '/')) {
            return !str_starts_with($url, '//');
        }

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return $scheme === 'http' || $scheme === 'https';
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeSidebarConfig(string $raw): array
    {
        if ($raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Nav item IDs may include plugin route paths (slashes), e.g. plugin-foo-/admin/bar.
     */
    private function isValidNavItemId(string $id, int $maxLength = 256): bool
    {
        if ($id === '' || mb_strlen($id) > $maxLength) {
            return false;
        }

        // Allow path segments used by plugin sidebar IDs (slashes, %, ~, @, +).
        return (bool) preg_match('/^[a-zA-Z0-9._:\\/@%+~-]+$/', $id);
    }

    /**
     * @return array<string, mixed>|null null on invalid, [] for empty/default
     */
    private function normalizeSidebarConfig(mixed $input): ?array
    {
        if ($input === null || $input === '' || $input === []) {
            return [];
        }

        if (is_string($input)) {
            $decoded = json_decode($input, true);
            if (!is_array($decoded)) {
                return null;
            }
            $input = $decoded;
        }

        if (!is_array($input)) {
            return null;
        }

        $out = [];
        foreach (self::SIDEBAR_SCOPES as $scope) {
            if (!array_key_exists($scope, $input)) {
                continue;
            }
            $scopeData = $input[$scope];
            if (!is_array($scopeData)) {
                return null;
            }

            $hidden = [];
            if (isset($scopeData['hidden']) && is_array($scopeData['hidden'])) {
                foreach ($scopeData['hidden'] as $id) {
                    if (!is_string($id)) {
                        return null;
                    }
                    $id = trim($id);
                    if (!$this->isValidNavItemId($id)) {
                        return null;
                    }
                    $hidden[] = $id;
                    if (count($hidden) > 200) {
                        return null;
                    }
                }
            }

            $order = [];
            if (isset($scopeData['order']) && is_array($scopeData['order'])) {
                foreach ($scopeData['order'] as $id) {
                    if (!is_string($id)) {
                        return null;
                    }
                    $id = trim($id);
                    if (!$this->isValidNavItemId($id)) {
                        return null;
                    }
                    $order[] = $id;
                    if (count($order) > 200) {
                        return null;
                    }
                }
            }

            $customLinks = [];
            if (isset($scopeData['custom_links']) && is_array($scopeData['custom_links'])) {
                foreach ($scopeData['custom_links'] as $link) {
                    if (!is_array($link)) {
                        return null;
                    }
                    $linkId = trim((string) ($link['id'] ?? ''));
                    $name = trim((string) ($link['name'] ?? ''));
                    $url = trim((string) ($link['url'] ?? ''));
                    $group = trim((string) ($link['group'] ?? 'overview'));
                    $icon = trim((string) ($link['icon'] ?? 'external-link'));
                    $openInNewTab = filter_var($link['open_in_new_tab'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $priority = isset($link['priority']) ? (int) $link['priority'] : 1000;

                    // Skip unfinished draft rows (e.g. Add link then save without editing URL).
                    if ($url === '' || $url === 'https://' || $url === 'http://') {
                        continue;
                    }

                    if ($linkId === '' || !preg_match('/^[a-zA-Z0-9._:-]+$/', $linkId) || mb_strlen($linkId) > 64) {
                        return null;
                    }
                    if ($name === '' || mb_strlen($name) > 64) {
                        return null;
                    }
                    if (mb_strlen($url) > 2048 || !$this->isAllowedAssetUrl($url)) {
                        return null;
                    }
                    if ($group === '' || mb_strlen($group) > 32 || !preg_match('/^[a-zA-Z0-9_-]+$/', $group)) {
                        return null;
                    }
                    if ($icon === '' || mb_strlen($icon) > 64 || !preg_match('/^[a-zA-Z0-9_-]+$/', $icon)) {
                        return null;
                    }

                    $customLinks[] = [
                        'id' => $linkId,
                        'name' => $name,
                        'url' => $url,
                        'group' => $group,
                        'icon' => $icon,
                        'open_in_new_tab' => $openInNewTab,
                        'priority' => max(0, min(100000, $priority)),
                    ];
                    if (count($customLinks) > 30) {
                        return null;
                    }
                }
            }

            if ($hidden === [] && $order === [] && $customLinks === []) {
                continue;
            }

            $out[$scope] = [
                'hidden' => array_values(array_unique($hidden)),
                'order' => array_values(array_unique($order)),
                'custom_links' => $customLinks,
            ];
        }

        return $out;
    }
}
