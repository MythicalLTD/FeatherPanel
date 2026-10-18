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

namespace App\Controllers\User\User;

use App\Chat\UserPreference;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Middleware\AuthMiddleware;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Per-user browser UI state (theme, layout, sidebar, list views, dashboard...) so a
 * customization made on one device shows up on the others. The browser decides which
 * of its storage keys are synced; the server stores them as opaque strings.
 */
class UiPreferencesController
{
    /** Storage keys the browser may sync. */
    private const KEY_PATTERN = '/^[A-Za-z0-9_.:\-]{1,128}$/';

    private const MAX_VALUE_LENGTH = 65536;

    private const MAX_ENTRIES = 400;

    private const MAX_TOTAL_BYTES = 524288;

    private const MAX_CHANGES_PER_REQUEST = 100;

    #[OA\Get(
        path: '/api/user/preferences/ui',
        summary: 'Get synced UI state',
        description: 'Browser UI state stored for the current user, keyed by storage key. Each entry has its value (null when removed) and the server time in milliseconds it was written.',
        tags: ['User - Session'],
        responses: [
            new OA\Response(response: 200, description: 'UI state retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function get(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        return ApiResponse::success(self::present(UserPreference::getUiState((string) $user['uuid'])), 'UI state retrieved', 200);
    }

    #[OA\Patch(
        path: '/api/user/preferences/ui',
        summary: 'Save changed UI state entries',
        description: 'Merges the given entries into the stored UI state. Send {"entries": {"key": "value"}}; a null value removes the key.',
        tags: ['User - Session'],
        responses: [
            new OA\Response(response: 200, description: 'UI state saved'),
            new OA\Response(response: 400, description: 'Invalid entries'),
            new OA\Response(response: 413, description: 'UI state too large'),
        ]
    )]
    public function update(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['entries']) || !is_array($data['entries'])) {
            return ApiResponse::error('Send the changed entries as an object', 'INVALID_UI_STATE', 400);
        }
        if (count($data['entries']) > self::MAX_CHANGES_PER_REQUEST) {
            return ApiResponse::error('Too many entries in one request', 'INVALID_UI_STATE', 400);
        }

        $changes = [];
        foreach ($data['entries'] as $key => $value) {
            $key = (string) $key;
            if (!preg_match(self::KEY_PATTERN, $key)) {
                return ApiResponse::error('Invalid UI state key', 'INVALID_UI_STATE', 400, ['key' => mb_substr($key, 0, 128)]);
            }
            if ($value !== null && !is_string($value)) {
                return ApiResponse::error('UI state values must be strings or null', 'INVALID_UI_STATE', 400, ['key' => $key]);
            }
            if (is_string($value) && strlen($value) > self::MAX_VALUE_LENGTH) {
                return ApiResponse::error('UI state value is too large', 'UI_STATE_TOO_LARGE', 413, ['key' => $key]);
            }
            $changes[$key] = $value;
        }

        // Size check against the merged result before writing anything.
        $current = UserPreference::getUiState((string) $user['uuid']);
        $merged = $current['entries'];
        foreach ($changes as $key => $value) {
            $merged[$key] = ['v' => $value, 't' => 0];
        }
        if (count($merged) > self::MAX_ENTRIES || strlen((string) json_encode($merged)) > self::MAX_TOTAL_BYTES) {
            return ApiResponse::error('Your saved UI state is too large', 'UI_STATE_TOO_LARGE', 413);
        }

        $state = UserPreference::mergeUiState((string) $user['uuid'], $changes);
        if ($state === null) {
            return ApiResponse::error('Failed to save UI state', 'FAILED_TO_UPDATE_PREFERENCES', 500);
        }

        return ApiResponse::success(self::present($state), 'UI state saved', 200);
    }

    /**
     * Keep "entries" a JSON object even when empty.
     *
     * @param array{version: int, entries: array<string, array{v: ?string, t: int}>} $state
     */
    private static function present(array $state): array
    {
        return ['version' => $state['version'], 'entries' => (object) $state['entries']];
    }
}
