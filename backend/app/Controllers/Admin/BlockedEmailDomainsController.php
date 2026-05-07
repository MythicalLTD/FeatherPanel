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
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Chat\BlockedEmailDomain;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\EmailDomainValidator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\BlockedEmailDomainImportUrlValidator;

#[OA\Schema(
    schema: 'BlockedEmailDomainRow',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'domain', type: 'string'),
        new OA\Property(property: 'source', type: 'string', enum: ['manual', 'preset', 'import']),
        new OA\Property(property: 'created_at', type: 'string', nullable: true),
    ]
)]
class BlockedEmailDomainsController
{
    #[OA\Get(
        path: '/api/admin/blocked-email-domains',
        summary: 'List blocked email domains',
        tags: ['Admin - Security'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1)),
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100)),
            new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $search = trim((string) $request->query->get('search', ''));

        $rows = BlockedEmailDomain::search($page, $limit, $search);
        $total = BlockedEmailDomain::countSearch($search);
        $app = App::getInstance(true);

        return ApiResponse::success([
            'domains' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
            'blocking_enabled' => $app->getConfig()->getSetting(ConfigInterface::EMAIL_DOMAIN_BLOCKING_ENABLED, 'false'),
            'preset_source_path' => basename(BlockedEmailDomain::presetFilePath()),
        ], 'OK', 200);
    }

    #[OA\Put(
        path: '/api/admin/blocked-email-domains',
        summary: 'Add a blocked domain',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['domain'],
                properties: [new OA\Property(property: 'domain', type: 'string', description: 'example.com or user@example.com')]
            )
        ),
        tags: ['Admin - Security'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Validation error'),
            new OA\Response(response: 409, description: 'Duplicate'),
        ]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['domain']) || !is_string($data['domain'])) {
            return ApiResponse::error('Field domain is required', 'VALIDATION_ERROR', 400);
        }
        $normalized = BlockedEmailDomain::normalizeDomainInput($data['domain']);
        if ($normalized === null) {
            return ApiResponse::error('Invalid domain', 'INVALID_DOMAIN', 400);
        }

        $id = BlockedEmailDomain::create($normalized, 'manual');
        if ($id === false) {
            return ApiResponse::error('Domain already exists or could not be saved', 'DUPLICATE_DOMAIN', 409);
        }

        EmailDomainValidator::invalidateBlockedDomainsCache();

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_email_domain_create',
            'context' => 'Added blocked email domain: ' . $normalized,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['id' => $id, 'domain' => $normalized], 'Domain blocked', 201);
    }

    #[OA\Delete(
        path: '/api/admin/blocked-email-domains/{id}',
        summary: 'Remove a blocked domain',
        tags: ['Admin - Security'],
        responses: [
            new OA\Response(response: 200, description: 'Removed'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function delete(Request $request, int $id): Response
    {
        if ($id <= 0) {
            return ApiResponse::error('Invalid id', 'INVALID_ID', 400);
        }
        if (!BlockedEmailDomain::deleteById($id)) {
            return ApiResponse::error('Domain entry not found', 'NOT_FOUND', 404);
        }

        EmailDomainValidator::invalidateBlockedDomainsCache();

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_email_domain_delete',
            'context' => 'Removed blocked email domain id ' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Removed', 200);
    }

    #[OA\Post(
        path: '/api/admin/blocked-email-domains/import-preset',
        summary: 'Import bundled disposable-domain list into the database',
        tags: ['Admin - Security'],
        responses: [
            new OA\Response(response: 200, description: 'Import finished'),
            new OA\Response(response: 500, description: 'Preset file missing or import failed'),
        ]
    )]
    public function importPreset(Request $request): Response
    {
        @set_time_limit(600);
        $result = BlockedEmailDomain::importFromPresetFile();
        if ($result === false) {
            return ApiResponse::error('Preset list is not available or import failed', 'IMPORT_FAILED', 500);
        }

        EmailDomainValidator::invalidateBlockedDomainsCache();

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_email_domain_import_preset',
            'context' => 'Imported preset disposable domains; new rows (approx): ' . $result['inserted'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'inserted' => $result['inserted'],
            'skipped_lines' => $result['skipped_lines'],
        ], 'Preset import completed', 200);
    }

    #[OA\Post(
        path: '/api/admin/blocked-email-domains/import-url',
        summary: 'Import blocked domains from a plain-text URL (one domain per line)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['url'],
                properties: [new OA\Property(property: 'url', type: 'string', format: 'uri')]
            )
        ),
        tags: ['Admin - Security'],
        responses: [
            new OA\Response(response: 200, description: 'Import finished'),
            new OA\Response(response: 400, description: 'Invalid URL'),
            new OA\Response(response: 502, description: 'Fetch failed'),
        ]
    )]
    public function importFromUrl(Request $request): Response
    {
        @set_time_limit(600);
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['url']) || !is_string($data['url'])) {
            return ApiResponse::error('Field url is required', 'VALIDATION_ERROR', 400);
        }

        try {
            $url = BlockedEmailDomainImportUrlValidator::assertFetchablePublicUrl($data['url']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_URL', 400);
        }

        $result = BlockedEmailDomain::importFromRemoteUrl($url);
        if ($result === false) {
            return ApiResponse::error('Could not download or import from this URL (HTTP error, size limit, or network failure). Redirects are not followed — use the final URL.', 'IMPORT_URL_FAILED', 502);
        }

        EmailDomainValidator::invalidateBlockedDomainsCache();

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_email_domain_import_url',
            'context' => 'Imported blocked domains from URL; new rows: ' . $result['inserted'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'inserted' => $result['inserted'],
            'skipped_lines' => $result['skipped_lines'],
        ], 'URL import completed', 200);
    }

    #[OA\Post(
        path: '/api/admin/blocked-email-domains/import-text',
        summary: 'Import blocked domains from pasted plain text (one domain per line)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['text'],
                properties: [new OA\Property(property: 'text', type: 'string')]
            )
        ),
        tags: ['Admin - Security'],
        responses: [
            new OA\Response(response: 200, description: 'Import finished'),
            new OA\Response(response: 400, description: 'Body too large or invalid'),
        ]
    )]
    public function importFromText(Request $request): Response
    {
        @set_time_limit(600);
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['text']) || !is_string($data['text'])) {
            return ApiResponse::error('Field text is required', 'VALIDATION_ERROR', 400);
        }
        $text = $data['text'];
        if (strlen($text) > 2097152) {
            return ApiResponse::error('Pasted text is too large (max 2 MB)', 'TEXT_TOO_LARGE', 400);
        }

        $result = BlockedEmailDomain::importFromDecodedText($text, 'import');
        if ($result === false) {
            return ApiResponse::error('Import failed', 'IMPORT_TEXT_FAILED', 500);
        }

        EmailDomainValidator::invalidateBlockedDomainsCache();

        Activity::createActivity([
            'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
            'name' => 'blocked_email_domain_import_text',
            'context' => 'Imported blocked domains from pasted text; new rows: ' . $result['inserted'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'inserted' => $result['inserted'],
            'skipped_lines' => $result['skipped_lines'],
        ], 'Text import completed', 200);
    }
}
