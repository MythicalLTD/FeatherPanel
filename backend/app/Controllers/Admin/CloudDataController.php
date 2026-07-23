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
use App\Services\FeatherCloud\MythicMemberResolver;
use App\Services\FeatherCloud\FeatherCloudException;
use App\Services\FeatherCloud\MythicIssueReportCollector;

class CloudDataController
{
    #[OA\Get(path: '/api/admin/cloud/data/summary', summary: 'Get Mythic Cloud summary', tags: ['Admin - FeatherCloud'])]
    public function getSummary(Request $request): Response
    {
        return $this->proxy(static function (FeatherCloudClient $client): array {
            $data = $client->getSummary();
            App::getInstance(true)->getConfig()->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, gmdate('c'));

            return $data;
        }, 'Cloud summary retrieved successfully');
    }

    #[OA\Get(path: '/api/admin/cloud/data/cloud', summary: 'Get Mythic cloud connection details', tags: ['Admin - FeatherCloud'])]
    public function getCloud(Request $request): Response
    {
        return $this->proxy(static fn (FeatherCloudClient $client): array => $client->getCloud(), 'Cloud details retrieved successfully');
    }

    #[OA\Get(path: '/api/admin/cloud/data/credits', summary: 'Get team credits', tags: ['Admin - FeatherCloud'])]
    public function getCredits(Request $request): Response
    {
        return $this->proxy(static fn (FeatherCloudClient $client): array => $client->getTotalCredits(), 'Credits retrieved successfully');
    }

    #[OA\Get(path: '/api/admin/cloud/data/team', summary: 'Get team information', tags: ['Admin - FeatherCloud'])]
    public function getTeam(Request $request): Response
    {
        return $this->proxy(static fn (FeatherCloudClient $client): array => $client->getTeam(), 'Team information retrieved successfully');
    }

    #[OA\Get(path: '/api/admin/cloud/data/products', summary: 'Get purchased products', tags: ['Admin - FeatherCloud'])]
    public function getProducts(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 50);

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getPurchasedProducts($page, $limit),
            'Products retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/products/{slug}/releases', summary: 'List product releases', tags: ['Admin - FeatherCloud'])]
    public function getProductReleases(Request $request, string $slug): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
            return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getProductReleases($slug),
            'Product releases retrieved successfully'
        );
    }

    #[OA\Get(
        path: '/api/admin/cloud/data/products/{slug}/releases/{version}/download',
        summary: 'Download product release .fpa',
        tags: ['Admin - FeatherCloud']
    )]
    public function downloadProductRelease(Request $request, string $slug, string $version): Response
    {
        try {
            if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
                return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
            }

            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error(
                    'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
                    'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                    503
                );
            }

            $fileContent = $client->downloadProductRelease($slug, $version);
            $response = new Response($fileContent, 200);
            $response->headers->set('Content-Type', 'application/octet-stream');
            $response->headers->set('Content-Disposition', 'attachment; filename="' . $slug . '-' . $version . '.fpa"');

            return $response;
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to download product release: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/data/products/{slug}/reviews', summary: 'List product reviews (public)', tags: ['Admin - FeatherCloud'])]
    public function getProductReviews(Request $request, string $slug): Response
    {
        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getProductReviews($slug),
            'Product reviews retrieved successfully',
            false
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/products/{slug}/reviews', summary: 'Create/update product review', tags: ['Admin - FeatherCloud'])]
    public function createProductReview(Request $request, string $slug): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($slug, $payload, $request): array {
                return $this->clientWithMember($client, $request)->createProductReview($slug, $payload);
            },
            'Product review saved successfully'
        );
    }

    #[OA\Delete(path: '/api/admin/cloud/data/products/{slug}/reviews/{reviewId}', summary: 'Delete product review', tags: ['Admin - FeatherCloud'])]
    public function deleteProductReview(Request $request, string $slug, string $reviewId): Response
    {
        return $this->proxy(
            function (FeatherCloudClient $client) use ($slug, $reviewId, $request): array {
                return $this->clientWithMember($client, $request)->deleteProductReview($slug, $reviewId);
            },
            'Product review deleted successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/download/{packageName}/{version}', summary: 'Download premium package', tags: ['Admin - FeatherCloud'])]
    public function downloadPackage(Request $request, string $packageName, string $version): Response
    {
        try {
            if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
                return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
            }

            $client = new FeatherCloudClient();
            if (!$client->isConfigured()) {
                return ApiResponse::error(
                    'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
                    'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                    503
                );
            }

            $fileContent = $client->downloadPremiumPackage($packageName, $version);
            $response = new Response($fileContent, 200);
            $response->headers->set('Content-Type', 'application/octet-stream');
            $response->headers->set('Content-Disposition', "attachment; filename=\"{$packageName}-{$version}.fpa\"");

            return $response;
        } catch (FeatherCloudException $e) {
            if ($e->getErrorCode() === 'CREDENTIALS_NOT_CONFIGURED') {
                return ApiResponse::error(
                    'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
                    'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                    503
                );
            }

            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to download package: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs', summary: 'List Mythic egg catalog', tags: ['Admin - FeatherCloud'])]
    public function listEggs(Request $request): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $query = array_filter([
            'q' => $request->query->get('q'),
            'search' => $request->query->get('search'),
            'category' => $request->query->get('category'),
            'channel' => $request->query->get('channel'),
            'sort' => $request->query->get('sort'),
            'page' => $request->query->get('page'),
            'per_page' => $request->query->get('per_page'),
        ], static fn ($v) => $v !== null && $v !== '');

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->listEggs($query),
            'Eggs retrieved successfully',
            false
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs/{id}', summary: 'Get Mythic egg detail', tags: ['Admin - FeatherCloud'])]
    public function getEgg(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getEgg($id),
            'Egg retrieved successfully',
            false
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs/{id}/download', summary: 'Download Mythic egg JSON', tags: ['Admin - FeatherCloud'])]
    public function downloadEgg(Request $request, string $id): Response
    {
        try {
            if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
                return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
            }

            $client = new FeatherCloudClient();
            $content = $client->downloadEgg($id);
            $response = new Response($content, 200);
            $response->headers->set('Content-Type', 'application/json');
            $response->headers->set('Content-Disposition', 'attachment; filename="egg-' . $id . '.json"');

            return $response;
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to download egg: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs/{id}/reviews', summary: 'List egg reviews (public)', tags: ['Admin - FeatherCloud'])]
    public function getEggReviews(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getEggReviews($id),
            'Egg reviews retrieved successfully',
            false
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/eggs/{id}/reviews', summary: 'Create/update egg review', tags: ['Admin - FeatherCloud'])]
    public function createEggReview(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($id, $payload, $request): array {
                return $this->clientWithMember($client, $request)->createEggReview($id, $payload);
            },
            'Egg review saved successfully'
        );
    }

    #[OA\Delete(path: '/api/admin/cloud/data/eggs/{id}/reviews', summary: 'Delete own egg review', tags: ['Admin - FeatherCloud'])]
    public function deleteEggReview(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($id, $request): array {
                return $this->clientWithMember($client, $request)->deleteEggReview($id);
            },
            'Egg review deleted successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/pastes', summary: 'Create Mythic paste/log', tags: ['Admin - FeatherCloud'])]
    public function createPaste(Request $request): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_PASTES_ENABLED)) {
            return ApiResponse::error('Pastes module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->createPaste($payload),
            'Paste created successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/pastes/{id}', summary: 'Get Mythic paste metadata', tags: ['Admin - FeatherCloud'])]
    public function getPaste(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_PASTES_ENABLED)) {
            return ApiResponse::error('Pastes module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getPaste($id),
            'Paste retrieved successfully',
            false
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/issues/projects', summary: 'List Mythic issue projects', tags: ['Admin - FeatherCloud'])]
    public function listIssueProjects(Request $request): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->listIssueProjects(),
            'Issue projects retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/issues/{project}', summary: 'List Mythic issues', tags: ['Admin - FeatherCloud'])]
    public function listIssues(Request $request, string $project): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $query = array_filter([
            'state' => $request->query->get('state'),
            'mine' => $request->query->get('mine'),
            'team_uuid' => $request->query->get('team_uuid'),
        ], static fn ($v) => $v !== null && $v !== '');

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->listIssues($project, $query),
            'Issues retrieved successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/issues/{project}', summary: 'Create Mythic issue with diagnostics', tags: ['Admin - FeatherCloud'])]
    public function createIssue(Request $request, string $project): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        // FeatherPanel always reports against the featherpanel Mythic project.
        $project = MythicIssueReportCollector::PROJECT;

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            return ApiResponse::error('Title is required', 'TITLE_REQUIRED', 400);
        }

        $autoCollect = filter_var($payload['auto_collect'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $includeNodes = filter_var($payload['include_node_diagnostics'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $includePanelLogs = filter_var($payload['include_panel_logs'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if ($autoCollect) {
            @set_time_limit(180);
            try {
                $collector = new MythicIssueReportCollector();
                $collected = $collector->collect($payload, $includeNodes, $includePanelLogs);
                $payload = $collector->mergeIntoPayload($payload, $collected);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'Mythic issue auto-diagnostics failed: ' . $e->getMessage()
                );
                // Still send the issue with whatever diagnostics we can assemble.
                if (!isset($payload['diagnostics']) || !is_array($payload['diagnostics'])) {
                    $payload['diagnostics'] = $this->buildDiagnostics($request, $payload);
                }
            }
        } elseif (!isset($payload['diagnostics']) || !is_array($payload['diagnostics'])) {
            $payload['diagnostics'] = $this->buildDiagnostics($request, $payload);
        }

        unset($payload['auto_collect'], $payload['include_node_diagnostics'], $payload['include_panel_logs']);

        // Mythic rejects non-string plugins/extensions/counts and invalid install_type — always normalize.
        if (isset($payload['diagnostics']) && is_array($payload['diagnostics'])) {
            $payload['diagnostics'] = MythicIssueReportCollector::normalizeDiagnosticsForMythic($payload['diagnostics']);
        }
        if (isset($payload['logs']) && !is_string($payload['logs'])) {
            $payload['logs'] = is_scalar($payload['logs']) ? (string) $payload['logs'] : json_encode($payload['logs']);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($project, $payload, $request): array {
                return $this->clientWithMember($client, $request)->createIssue($project, $payload);
            },
            'Issue created successfully'
        );
    }

    #[OA\Post(
        path: '/api/admin/cloud/data/report',
        summary: 'Report a FeatherPanel issue (always project featherpanel)',
        tags: ['Admin - FeatherCloud']
    )]
    public function reportIssue(Request $request): Response
    {
        return $this->createIssue($request, MythicIssueReportCollector::PROJECT);
    }

    #[OA\Post(
        path: '/api/admin/cloud/data/suggestion',
        summary: 'Submit a FeatherPanel feature suggestion (always project featherpanel)',
        tags: ['Admin - FeatherCloud']
    )]
    public function submitSuggestion(Request $request): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            return ApiResponse::error('Title is required', 'TITLE_REQUIRED', 400);
        }

        if (!str_starts_with(strtolower($title), '[feature]')) {
            $payload['title'] = '[Feature] ' . $title;
        }

        $why = trim((string) ($payload['why'] ?? ''));
        $body = trim((string) ($payload['body'] ?? ''));
        if ($why !== '') {
            $payload['body'] = ($body !== '' ? $body . "\n\n" : '') . "Why this helps:\n" . $why;
        }
        unset($payload['why']);

        // Suggestions only need environment context — skip panel/node logs.
        $payload['auto_collect'] = $payload['auto_collect'] ?? true;
        $payload['include_node_diagnostics'] = false;
        $payload['include_panel_logs'] = false;

        $forward = Request::create(
            '/api/admin/cloud/data/report',
            'POST',
            [],
            $request->cookies->all(),
            [],
            $request->server->all(),
            json_encode($payload)
        );
        foreach ($request->attributes->all() as $key => $value) {
            $forward->attributes->set($key, $value);
        }

        return $this->createIssue($forward, MythicIssueReportCollector::PROJECT);
    }

    #[OA\Get(path: '/api/admin/cloud/data/issues/{project}/{number}', summary: 'Get Mythic issue', tags: ['Admin - FeatherCloud'])]
    public function getIssue(Request $request, string $project, string $number): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getIssue($project, $number),
            'Issue retrieved successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/issues/{project}/{number}/comments', summary: 'Comment on Mythic issue', tags: ['Admin - FeatherCloud'])]
    public function commentOnIssue(Request $request, string $project, string $number): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($project, $number, $payload, $request): array {
                return $this->clientWithMember($client, $request)->commentOnIssue($project, $number, $payload);
            },
            'Comment created successfully'
        );
    }

    /**
     * @param callable(FeatherCloudClient): array $callback
     */
    private function proxy(callable $callback, string $successMessage, bool $requireAuth = true): Response
    {
        try {
            $client = new FeatherCloudClient();
            if ($requireAuth && !$client->isConfigured()) {
                return ApiResponse::error(
                    'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
                    'CLOUD_CREDENTIALS_NOT_CONFIGURED',
                    503
                );
            }

            $data = $callback($client);

            return ApiResponse::success($data, $successMessage, 200);
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    private function clientWithMember(FeatherCloudClient $client, ?Request $request = null): FeatherCloudClient
    {
        $mapped = MythicMemberResolver::resolveFromRequest($request);

        return $mapped !== null ? $client->withMemberUserUuid($mapped) : $client;
    }

    private function moduleEnabled(string $setting): bool
    {
        $value = App::getInstance(true)->getConfig()->getSetting($setting, 'true');

        return ($value ?? 'true') === 'true';
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    private function buildDiagnostics(Request $request, array $payload): array
    {
        $existing = is_array($payload['diagnostics'] ?? null) ? $payload['diagnostics'] : [];

        $userCount = '0';
        $serverCount = '0';
        try {
            $userCount = (string) \App\Chat\User::getCount();
        } catch (\Throwable) {
        }
        try {
            $serverCount = (string) \App\Chat\Server::getCount();
        } catch (\Throwable) {
        }

        $appUrl = (string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, '') ?? '');

        return MythicIssueReportCollector::normalizeDiagnosticsForMythic(array_merge([
            'version' => defined('APP_VERSION') ? (string) APP_VERSION : '',
            'php_version' => PHP_VERSION,
            'database' => 'mysql',
            'os' => PHP_OS_FAMILY,
            'install_type' => MythicIssueReportCollector::detectInstallType(),
            'install_location' => $appUrl !== '' ? $appUrl : dirname(__DIR__, 3),
            'user_count' => $userCount,
            'server_count' => $serverCount,
            'plugins' => [],
            'extensions' => array_map('strval', get_loaded_extensions()),
            'steps' => isset($payload['steps']) ? (string) $payload['steps'] : '',
            'expected' => isset($payload['expected']) ? (string) $payload['expected'] : '',
            'actual' => isset($payload['actual']) ? (string) $payload['actual'] : '',
            'logs' => isset($payload['logs']) ? (string) $payload['logs'] : '',
        ], $existing));
    }

    private function cloudErrorResponse(FeatherCloudException $e): Response
    {
        $status = $e->getHttpStatusCode();
        $code = $e->getErrorCode();

        // Prevent frontend global-auth handlers from treating external 401s as session expiry.
        if ($status === 401) {
            $status = 503;
        }

        return ApiResponse::error($e->getMessage(), $code, $status);
    }
}
