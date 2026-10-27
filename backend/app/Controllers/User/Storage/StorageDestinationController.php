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

namespace App\Controllers\User\Storage;

use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\Chat\UserStorageDestination;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\Storage\StorageSettings;
use App\Services\Storage\StorageException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Storage\StorageDestinationService;

/**
 * Bring-your-own backup storage destinations for the signed-in user.
 */
class StorageDestinationController
{
    public function index(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $rows = UserStorageDestination::listForUser((int) $user['id']);

        return ApiResponse::success([
            'destinations' => array_map([StorageDestinationService::class, 'view'], $rows),
            'capabilities' => self::capabilities(),
        ], 'Storage destinations retrieved');
    }

    public function create(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if (!StorageSettings::byoEnabled()) {
            return ApiResponse::error('Bring-your-own backup storage is disabled on this panel', 'BYO_STORAGE_DISABLED', 403);
        }
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $provider = strtolower(trim((string) ($body['provider'] ?? 's3')));
        if (!in_array($provider, StorageSettings::allowedProviders(), true)) {
            return ApiResponse::error('This storage provider is not allowed on this panel', 'PROVIDER_NOT_ALLOWED', 403);
        }
        $name = mb_substr(trim((string) ($body['name'] ?? '')), 0, 100);
        if ($name === '') {
            return ApiResponse::error('Name is required', 'NAME_REQUIRED', 422);
        }
        if (UserStorageDestination::countForUser((int) $user['id']) >= StorageSettings::maxDestinationsPerUser()) {
            return ApiResponse::error('You reached the maximum number of storage destinations', 'DESTINATION_LIMIT_REACHED', 400);
        }
        try {
            $config = StorageDestinationService::normalizeS3Config((array) ($body['config'] ?? []));
        } catch (StorageException $e) {
            return ApiResponse::error($e->getMessage(), $e->errorCode(), $e->status());
        }
        $id = UserStorageDestination::create((int) $user['id'], $name, $provider, $config);
        if (!$id) {
            return ApiResponse::error('Failed to save the storage destination', 'DESTINATION_CREATE_FAILED', 500);
        }
        $row = UserStorageDestination::getById($id);
        $test = null;
        if (!array_key_exists('test', $body) || !empty($body['test'])) {
            $test = StorageDestinationService::test($row);
            $row = UserStorageDestination::getById($id);
        }
        $this->audit($user, 'storage_destination_created', 'Added backup storage "' . $name . '" (' . $provider . ', ' . $config['endpoint'] . ')');

        return ApiResponse::success(['destination' => StorageDestinationService::view($row), 'test' => $test], 'Storage destination created', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $row = UserStorageDestination::getForUser($id, (int) $user['id']);
        if ($row === null) {
            return ApiResponse::error('Storage destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $update = [];
        if (array_key_exists('name', $body)) {
            $name = mb_substr(trim((string) $body['name']), 0, 100);
            if ($name === '') {
                return ApiResponse::error('Name is required', 'NAME_REQUIRED', 422);
            }
            $update['name'] = $name;
        }
        if (isset($body['config']) && is_array($body['config'])) {
            try {
                $update['config'] = StorageDestinationService::normalizeS3Config($body['config'], UserStorageDestination::config($row));
            } catch (StorageException $e) {
                return ApiResponse::error($e->getMessage(), $e->errorCode(), $e->status());
            }
        }
        UserStorageDestination::update($id, $update);
        $row = UserStorageDestination::getById($id);
        $test = null;
        if (isset($update['config'])) {
            $test = StorageDestinationService::test($row);
            $row = UserStorageDestination::getById($id);
        }
        $this->audit($user, 'storage_destination_updated', 'Updated backup storage "' . $row['name'] . '"');

        return ApiResponse::success(['destination' => StorageDestinationService::view($row), 'test' => $test], 'Storage destination updated');
    }

    public function test(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $row = UserStorageDestination::getForUser($id, (int) $user['id']);
        if ($row === null) {
            return ApiResponse::error('Storage destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        $result = StorageDestinationService::test($row);
        $this->audit($user, 'storage_destination_tested', 'Tested backup storage "' . $row['name'] . '": ' . ($result['ok'] ? 'ok' : 'failed'));
        $view = StorageDestinationService::view((array) UserStorageDestination::getById($id));
        if (!$result['ok']) {
            return ApiResponse::error('Storage test failed: ' . $result['error'], 'DESTINATION_TEST_FAILED', 422, ['destination' => $view]);
        }

        return ApiResponse::success(['destination' => $view], 'Storage destination works');
    }

    public function delete(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $row = UserStorageDestination::getForUser($id, (int) $user['id']);
        if ($row === null) {
            return ApiResponse::error('Storage destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        $orphaned = UserStorageDestination::countBackups($id);
        UserStorageDestination::softDelete($id);
        $this->audit($user, 'storage_destination_deleted', 'Removed backup storage "' . $row['name'] . '" (' . $orphaned . ' backups orphaned, objects kept in the bucket)');

        return ApiResponse::success(['orphaned_backups' => $orphaned], 'Storage destination removed');
    }

    /**
     * @return array<string, mixed>
     */
    public static function capabilities(): array
    {
        $enabled = StorageSettings::byoEnabled();
        $providers = $enabled ? StorageSettings::allowedProviders() : [];

        return [
            'byo_enabled' => $enabled,
            'byo_s3' => $enabled && in_array('s3', $providers, true),
            'providers' => $providers,
            'max_destinations' => StorageSettings::maxDestinationsPerUser(),
        ];
    }

    private function audit(array $user, string $name, string $context): void
    {
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
