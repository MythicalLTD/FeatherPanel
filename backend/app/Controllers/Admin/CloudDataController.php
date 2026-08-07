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
use App\Services\FeatherCloud\MythicEggsClient;
use App\Services\FeatherCloud\FeatherCloudClient;
use App\Services\FeatherCloud\FeatherPanelPremium;
use App\Services\FeatherCloud\MythicMemberResolver;
use App\Services\FeatherCloud\FeatherCloudException;
use App\Services\FeatherCloud\MythicIssueReportCollector;

class CloudDataController
{
    #[OA\Get(path: '/api/admin/cloud/data/summary', summary: 'Get Mythic Cloud summary', tags: ['Admin - FeatherCloud'])]
    public function getSummary(Request $request): Response
    {
        return $this->proxy(static function (FeatherCloudClient $client): array {
            try {
                $data = $client->getSummary();
                FeatherPanelPremium::persistFromSummary($data);
                App::getInstance(true)->getConfig()->setSetting(ConfigInterface::FEATHERCLOUD_LAST_SYNCED_AT, gmdate('c'));

                return $data;
            } catch (FeatherCloudException $e) {
                FeatherPanelPremium::retainOnUpstreamFailure($e);
                throw $e;
            }
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
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = (int) $request->query->get('limit', 50);
        if ($limit < 1) {
            $limit = 50;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getPurchasedProducts($page, $limit),
            'Products retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/store', summary: 'Mythic marketplace store catalog', tags: ['Admin - FeatherCloud'])]
    public function getStore(Request $request): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
            return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $limit = (int) $request->query->get('limit', 50);
        if ($limit < 1) {
            $limit = 50;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $query = [
            'page' => $page,
            'limit' => $limit,
            'q' => $request->query->get('q'),
            'type' => $request->query->get('type'),
            'price' => $request->query->get('price'),
            'category' => $request->query->get('category'),
            'cloud_download' => $request->query->get('cloud_download'),
        ];

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getStore($query),
            'Store catalog retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/store/products/{slug}', summary: 'Mythic store product detail', tags: ['Admin - FeatherCloud'])]
    public function getStoreProduct(Request $request, string $slug): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
            return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getStoreProduct($slug),
            'Store product retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/store/products/{slug}/versions', summary: 'Store product versions', tags: ['Admin - FeatherCloud'])]
    public function getStoreProductVersions(Request $request, string $slug): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_MARKETPLACE_ENABLED)) {
            return ApiResponse::error('Marketplace module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getStoreProductVersions($slug),
            'Product versions retrieved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/store/products/{slug}/reviews', summary: 'Store product reviews', tags: ['Admin - FeatherCloud'])]
    public function getStoreProductReviews(Request $request, string $slug): Response
    {
        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getStoreProductReviews($slug),
            'Product reviews retrieved successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/store/products/{slug}/reviews', summary: 'Create/update store product review', tags: ['Admin - FeatherCloud'])]
    public function createStoreProductReview(Request $request, string $slug): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $rating = isset($payload['rating']) ? (int) $payload['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            return ApiResponse::error('Rating must be an integer from 1 to 5.', 'INVALID_RATING', 400);
        }

        $comment = trim((string) ($payload['comment'] ?? ''));
        if (strlen($comment) < 5 || strlen($comment) > 1000) {
            return ApiResponse::error('Comment is required (5–1000 characters).', 'INVALID_COMMENT', 400);
        }

        $body = [
            'rating' => $rating,
            'comment' => $comment,
        ];

        return $this->proxy(
            function (FeatherCloudClient $client) use ($slug, $body, $request): array {
                return $this->clientWithMember($client, $request)->createStoreProductReview($slug, $body);
            },
            'Product review saved successfully'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/data/store/products/{slug}/questions', summary: 'Store product questions', tags: ['Admin - FeatherCloud'])]
    public function getStoreProductQuestions(Request $request, string $slug): Response
    {
        return $this->proxy(
            static fn (FeatherCloudClient $client): array => $client->getStoreProductQuestions($slug),
            'Product questions retrieved successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/store/products/{slug}/questions', summary: 'Ask a store product question', tags: ['Admin - FeatherCloud'])]
    public function createStoreProductQuestion(Request $request, string $slug): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $bodyText = trim((string) ($payload['body'] ?? ''));
        if ($bodyText === '' || strlen($bodyText) > 2000) {
            return ApiResponse::error('Question body is required (max 2000 characters).', 'INVALID_QUESTION', 400);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($slug, $bodyText, $request): array {
                return $this->clientWithMember($client, $request)->createStoreProductQuestion($slug, ['body' => $bodyText]);
            },
            'Question submitted successfully'
        );
    }

    #[OA\Post(path: '/api/admin/cloud/data/store/products/{slug}/questions/{questionId}/replies', summary: 'Reply to store product question', tags: ['Admin - FeatherCloud'])]
    public function replyStoreProductQuestion(Request $request, string $slug, string $questionId): Response
    {
        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $bodyText = trim((string) ($payload['body'] ?? ''));
        if ($bodyText === '' || strlen($bodyText) > 2000) {
            return ApiResponse::error('Reply body is required (max 2000 characters).', 'INVALID_REPLY', 400);
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($slug, $questionId, $bodyText, $request): array {
                return $this->clientWithMember($client, $request)->replyStoreProductQuestion($slug, $questionId, [
                    'body' => $bodyText,
                ]);
            },
            'Reply submitted successfully'
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

        $rating = isset($payload['rating']) ? (int) $payload['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            return ApiResponse::error('Rating must be an integer from 1 to 5.', 'INVALID_RATING', 400);
        }

        $comment = trim((string) ($payload['comment'] ?? ''));
        if (strlen($comment) < 5 || strlen($comment) > 1000) {
            return ApiResponse::error('Comment is required (5–1000 characters).', 'INVALID_COMMENT', 400);
        }

        $payload = [
            'rating' => $rating,
            'comment' => $comment,
        ];

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

        try {
            $eggs = new MythicEggsClient();
            $payload = $eggs->listEggs($query);

            return ApiResponse::success($payload, 'Eggs retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs/{id}', summary: 'Get Mythic egg detail', tags: ['Admin - FeatherCloud'])]
    public function getEgg(Request $request, string $id): Response
    {
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
            return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        try {
            $eggs = new MythicEggsClient();
            $payload = $eggs->getEgg($id);

            return ApiResponse::success($payload, 'Egg retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/data/eggs/{id}/download', summary: 'Download Mythic egg JSON', tags: ['Admin - FeatherCloud'])]
    public function downloadEgg(Request $request, string $id): Response
    {
        try {
            if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_EGGS_ENABLED)) {
                return ApiResponse::error('Eggs module is disabled', 'CLOUD_MODULE_DISABLED', 403);
            }

            $eggs = new MythicEggsClient();
            $content = $eggs->downloadEgg($id);
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

        try {
            // Prefer eggs host for public list (camelCase meta, no CloudApiResponse).
            $eggs = new MythicEggsClient();
            $payload = $eggs->getEggReviews($id);

            return ApiResponse::success($payload, 'Egg reviews retrieved successfully', 200);
        } catch (FeatherCloudException $e) {
            return $this->cloudErrorResponse($e);
        } catch (\Exception $e) {
            return ApiResponse::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
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

        $rating = isset($payload['rating']) ? (int) $payload['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            return ApiResponse::error('Rating must be an integer from 1 to 5.', 'INVALID_RATING', 400);
        }

        $body = ['rating' => $rating];
        if (array_key_exists('comment', $payload)) {
            $comment = $payload['comment'];
            if ($comment !== null && $comment !== '') {
                $comment = trim((string) $comment);
                if (strlen($comment) > 1000) {
                    return ApiResponse::error('Comment must be at most 1000 characters.', 'INVALID_COMMENT', 400);
                }
                $body['comment'] = $comment;
            } else {
                $body['comment'] = null;
            }
        }

        return $this->proxy(
            function (FeatherCloudClient $client) use ($id, $body, $request): array {
                // Review writes use panels host (keys + X-Panel-User-Uuid).
                return $this->clientWithMember($client, $request)->createEggReview($id, $body);
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

        // Mythic rejects non-string plugins/extensions/counts and invalid install_type always normalize.
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
        if (!$this->moduleEnabled(ConfigInterface::FEATHERCLOUD_ISSUES_ENABLED)) {
            return ApiResponse::error('Issues module is disabled', 'CLOUD_MODULE_DISABLED', 403);
        }

        $payload = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($payload)) {
            return ApiResponse::error('Invalid JSON payload provided.', 'INVALID_JSON_PAYLOAD', 400);
        }

        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            return ApiResponse::error('Title is required', 'TITLE_REQUIRED', 400);
        }

        // Strip legacy "[Feature]" prefix suggestions board does not use GitHub labels.
        $stripped = preg_replace('/^\[feature\]\s*/i', '', $title);
        if (is_string($stripped) && trim($stripped) !== '') {
            $title = trim($stripped);
        }

        $why = trim((string) ($payload['why'] ?? ''));
        $body = trim((string) ($payload['body'] ?? ''));
        if ($why !== '') {
            $body = ($body !== '' ? $body . "\n\n" : '') . "Why this helps:\n" . $why;
        }

        // Light environment context only (no panel/node logs) append to body.
        $autoCollect = filter_var($payload['auto_collect'] ?? true, FILTER_VALIDATE_BOOLEAN);
        if ($autoCollect) {
            try {
                $collector = new MythicIssueReportCollector();
                $collected = $collector->collect($payload, false, false);
                $merged = $collector->mergeIntoPayload(['body' => $body, 'diagnostics' => []], $collected);
                $body = trim((string) ($merged['body'] ?? $body));
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'Mythic suggestion env collect failed: ' . $e->getMessage()
                );
            }
        }

        if ($body === '') {
            return ApiResponse::error('Body is required', 'BODY_REQUIRED', 400);
        }

        $project = MythicIssueReportCollector::PROJECT;
        $suggestionPayload = [
            'title' => $title,
            'body' => $body,
        ];

        return $this->proxy(
            function (FeatherCloudClient $client) use ($project, $suggestionPayload, $request): array {
                return $this->clientWithMember($client, $request)->createSuggestion($project, $suggestionPayload);
            },
            'Suggestion created successfully'
        );
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
        $message = $e->getMessage();

        // Prevent frontend global-auth handlers from treating external 401s as session expiry.
        if ($status === 401) {
            $status = 503;
        }

        $message = match ($code) {
            'PANEL_DOWNLOADS_DISABLED' => 'Panel downloads are disabled for this product.',
            'ACCESS_DENIED' => 'Access denied for this Mythic marketplace action.',
            'INVALID_USER_UUID' => 'Missing or invalid Mythic user id for this panel user. Re-link Cloud Connections.',
            'USER_NOT_TEAM_MEMBER' => 'This panel user is not a member of the linked Mythic team.',
            'MEMBER_UUID_REQUIRED' => 'Your panel user is not mapped to a Mythic team member. Re-link Cloud Connections with a matching email.',
            'CREDENTIALS_NOT_CONFIGURED' => 'Mythic Cloud credentials are not configured. Link your panel in Cloud Management.',
            'REVIEW_NOT_FOUND' => 'No review found for this Mythic team member.',
            default => $message,
        };

        return ApiResponse::error($message, $code, $status);
    }
}
