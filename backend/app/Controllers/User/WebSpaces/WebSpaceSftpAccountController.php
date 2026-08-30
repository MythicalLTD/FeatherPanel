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

namespace App\Controllers\User\WebSpaces;

use App\Helpers\ApiResponse;
use App\Helpers\WebSpaceGateway;
use App\Chat\WebSpaceSftpAccount;
use App\WebSpaceSubuserPermissions;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\CheckWebSpacePermission;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Extra SFTP accounts with optional subdirectory jails (not classic FTP).
 */
class WebSpaceSftpAccountController
{
    public function index(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $accounts = WebSpaceSftpAccount::listByWebSpaceId((int) $resolved['space']['id']);
        $short = (string) ($resolved['space']['uuidShort'] ?? '');
        foreach ($accounts as &$row) {
            $row['login'] = $row['account_name'] . '.' . $short;
        }
        unset($row);

        return ApiResponse::success(['accounts' => $accounts], 'OK', 200);
    }

    public function create(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $name = WebSpaceSftpAccount::normalizeAccountName($content['account_name'] ?? '');
        $password = (string) ($content['password'] ?? '');
        if ($name === null) {
            return ApiResponse::error(
                'account_name must be 2–32 chars: start with a letter, then letters/digits/_/-',
                'INVALID_ACCOUNT_NAME',
                400
            );
        }
        if (strlen($password) < 8) {
            return ApiResponse::error('password must be at least 8 characters', 'INVALID_PASSWORD', 400);
        }

        $id = WebSpaceSftpAccount::create([
            'webspace_id' => (int) $resolved['space']['id'],
            'account_name' => $name,
            'password' => $password,
            'home_relative' => $content['home_relative'] ?? '',
            'enabled' => array_key_exists('enabled', $content) ? !empty($content['enabled']) : true,
        ]);
        if ($id === false) {
            return ApiResponse::error('Failed to create SFTP account (name may already exist)', 'CREATE_FAILED', 400);
        }

        $account = WebSpaceSftpAccount::getById($id);
        if ($account) {
            $account['login'] = $account['account_name'] . '.' . ($resolved['space']['uuidShort'] ?? '');
        }

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.sftp_account.created', [
            'account_id' => $id,
            'account_name' => $name,
        ]);

        return ApiResponse::success(['account' => $account], 'Created', 201);
    }

    public function delete(Request $request, string $uuidShort, int $accountId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!WebSpaceSftpAccount::delete($accountId, (int) $resolved['space']['id'])) {
            return ApiResponse::error('Failed to delete account', 'DELETE_FAILED', 400);
        }

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.sftp_account.deleted', [
            'account_id' => $accountId,
        ]);

        return ApiResponse::success([], 'Deleted', 200);
    }

    public function resetPassword(Request $request, string $uuidShort, int $accountId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        $password = is_array($content) ? (string) ($content['password'] ?? '') : '';
        if (strlen($password) < 8) {
            return ApiResponse::error('password must be at least 8 characters', 'INVALID_PASSWORD', 400);
        }

        if (!WebSpaceSftpAccount::updatePassword($accountId, (int) $resolved['space']['id'], $password)) {
            return ApiResponse::error('Failed to update password', 'UPDATE_FAILED', 400);
        }

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.sftp_account.password_reset', [
            'account_id' => $accountId,
        ]);

        return ApiResponse::success([], 'Password updated', 200);
    }

    public function update(Request $request, string $uuidShort, int $accountId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $webspaceId = (int) $resolved['space']['id'];
        if (array_key_exists('home_relative', $content)) {
            WebSpaceSftpAccount::updateHome($accountId, $webspaceId, (string) $content['home_relative']);
        }
        if (array_key_exists('enabled', $content)) {
            WebSpaceSftpAccount::setEnabled($accountId, $webspaceId, !empty($content['enabled']));
        }

        $account = WebSpaceSftpAccount::getById($accountId);
        if (!$account || (int) $account['webspace_id'] !== $webspaceId) {
            return ApiResponse::error('Account not found', 'NOT_FOUND', 404);
        }
        $account['login'] = $account['account_name'] . '.' . ($resolved['space']['uuidShort'] ?? '');

        return ApiResponse::success(['account' => $account], 'Updated', 200);
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array | Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied instanceof Response) {
            return $denied;
        }

        return ['user' => $user, 'space' => $space];
    }
}
