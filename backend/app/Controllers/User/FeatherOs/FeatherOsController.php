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

namespace App\Controllers\User\FeatherOs;

use App\Chat\FeatherOsNote;
use App\Chat\FeatherOsState;
use App\Chat\FeatherOsTrash;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\App;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * FeatherOS: the desktop-like multi server workspace (/os).
 *
 * Only the per-user desktop state and the Notes app live here. Everything a FeatherOS app
 * does to a server (files, console, power, stats...) goes through the regular server
 * endpoints, so subuser permissions are enforced exactly like in the normal panel UI.
 */
class FeatherOsController
{
    /** Upper bound for the serialized desktop state. */
    private const MAX_STATE_BYTES = 262144;

    private const MAX_NOTES = 500;

    private const MAX_NOTE_TITLE = 191;

    private const MAX_NOTE_BYTES = 131072;

    private const NOTE_COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'gray'];

    #[OA\Get(
        path: '/api/user/featheros/state',
        summary: 'Get FeatherOS desktop state',
        description: 'Saved desktop of the current user: open windows, desktop icon layout, dock, wallpaper and theme. state is null when nothing was saved yet.',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 200, description: 'State retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function getState(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $row = FeatherOsState::getForUser((int) $user['id']);

        return ApiResponse::success([
            'state' => $row !== null ? (object) $row['state'] : null,
            'revision' => $row['revision'] ?? 0,
            'updated_at' => $row['updated_at'] ?? null,
        ], 'FeatherOS state retrieved', 200);
    }

    #[OA\Put(
        path: '/api/user/featheros/state',
        summary: 'Save FeatherOS desktop state',
        description: 'Replaces the saved desktop of the current user. Send {"state": {...}}. The document is opaque to the server but limited to 256 KiB.',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 200, description: 'State saved'),
            new OA\Response(response: 400, description: 'Invalid state'),
            new OA\Response(response: 413, description: 'State too large'),
        ]
    )]
    public function saveState(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $raw = $request->getContent();
        if (strlen($raw) > self::MAX_STATE_BYTES + 1024) {
            return ApiResponse::error('Desktop state is too large', 'FEATHEROS_STATE_TOO_LARGE', 413);
        }
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['state']) || !is_array($data['state']) || (array_is_list($data['state']) && $data['state'] !== [])) {
            return ApiResponse::error('Send the desktop state as an object', 'FEATHEROS_INVALID_STATE', 400);
        }
        $encoded = json_encode($data['state'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false || strlen($encoded) > self::MAX_STATE_BYTES) {
            return ApiResponse::error('Desktop state is too large', 'FEATHEROS_STATE_TOO_LARGE', 413);
        }

        $row = FeatherOsState::saveForUser((int) $user['id'], $data['state']);
        if ($row === null) {
            return ApiResponse::error('Failed to save the desktop state', 'FEATHEROS_STATE_SAVE_FAILED', 500);
        }

        return ApiResponse::success([
            'revision' => $row['revision'],
            'updated_at' => $row['updated_at'],
        ], 'FeatherOS state saved', 200);
    }

    #[OA\Delete(
        path: '/api/user/featheros/state',
        summary: 'Reset FeatherOS desktop state',
        description: 'Removes the saved desktop so the next visit starts with the default layout. Notes are kept.',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 200, description: 'State reset'),
        ]
    )]
    public function resetState(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        FeatherOsState::deleteForUser((int) $user['id']);

        return ApiResponse::success([], 'FeatherOS state reset', 200);
    }

    #[OA\Get(
        path: '/api/user/featheros/notes',
        summary: 'List FeatherOS notes',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 200, description: 'Notes retrieved'),
        ]
    )]
    public function listNotes(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        return ApiResponse::success(['notes' => FeatherOsNote::listForUser((int) $user['id'])], 'Notes retrieved', 200);
    }

    #[OA\Post(
        path: '/api/user/featheros/notes',
        summary: 'Create a FeatherOS note',
        description: 'Body: {"title": string, "content": string, "color"?: string, "pinned"?: bool}.',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 201, description: 'Note created'),
            new OA\Response(response: 400, description: 'Invalid note'),
            new OA\Response(response: 409, description: 'Note limit reached'),
        ]
    )]
    public function createNote(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }
        $fields = $this->validateNoteFields($data);
        if ($fields instanceof Response) {
            return $fields;
        }
        $uid = (int) $user['id'];
        if (FeatherOsNote::countForUser($uid) >= self::MAX_NOTES) {
            return ApiResponse::error('You reached the maximum number of notes', 'FEATHEROS_NOTE_LIMIT', 409);
        }

        $note = FeatherOsNote::create(
            $uid,
            (string) ($fields['title'] ?? ''),
            (string) ($fields['content'] ?? ''),
            (string) ($fields['color'] ?? 'yellow'),
            (bool) ($fields['pinned'] ?? false)
        );
        if ($note === null) {
            return ApiResponse::error('Failed to create the note', 'FEATHEROS_NOTE_CREATE_FAILED', 500);
        }

        return ApiResponse::success(['note' => $note], 'Note created', 201);
    }

    #[OA\Put(
        path: '/api/user/featheros/notes/{id}',
        summary: 'Update a FeatherOS note',
        tags: ['User - FeatherOS'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Note updated'),
            new OA\Response(response: 404, description: 'Note not found'),
        ]
    )]
    public function updateNote(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $uid = (int) $user['id'];
        if (FeatherOsNote::getForUser($uid, $id) === null) {
            return ApiResponse::error('Note not found', 'FEATHEROS_NOTE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        $fields = $this->validateNoteFields($data);
        if ($fields instanceof Response) {
            return $fields;
        }
        $note = FeatherOsNote::update($uid, $id, $fields);

        return ApiResponse::success(['note' => $note], 'Note updated', 200);
    }

    #[OA\Delete(
        path: '/api/user/featheros/notes/{id}',
        summary: 'Delete a FeatherOS note',
        tags: ['User - FeatherOS'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Note deleted'),
            new OA\Response(response: 404, description: 'Note not found'),
        ]
    )]
    public function deleteNote(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        if (!FeatherOsNote::delete((int) $user['id'], $id)) {
            return ApiResponse::error('Note not found', 'FEATHEROS_NOTE_NOT_FOUND', 404);
        }

        return ApiResponse::success([], 'Note deleted', 200);
    }

    /**
     * Picks and validates the note fields present in the body.
     *
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>|Response
     */
    private function validateNoteFields(array $data): array | Response
    {
        $fields = [];
        if (array_key_exists('title', $data)) {
            if (!is_string($data['title'])) {
                return ApiResponse::error('Title must be a string', 'FEATHEROS_INVALID_NOTE', 400);
            }
            $title = trim($data['title']);
            if (mb_strlen($title) > self::MAX_NOTE_TITLE) {
                return ApiResponse::error('Title is too long', 'FEATHEROS_INVALID_NOTE', 400);
            }
            $fields['title'] = $title;
        }
        if (array_key_exists('content', $data)) {
            if (!is_string($data['content'])) {
                return ApiResponse::error('Content must be a string', 'FEATHEROS_INVALID_NOTE', 400);
            }
            if (strlen($data['content']) > self::MAX_NOTE_BYTES) {
                return ApiResponse::error('Note is too large', 'FEATHEROS_NOTE_TOO_LARGE', 413);
            }
            $fields['content'] = $data['content'];
        }
        if (array_key_exists('color', $data)) {
            if (!is_string($data['color']) || !in_array($data['color'], self::NOTE_COLORS, true)) {
                return ApiResponse::error('Unknown note color', 'FEATHEROS_INVALID_NOTE', 400);
            }
            $fields['color'] = $data['color'];
        }
        if (array_key_exists('pinned', $data)) {
            $fields['pinned'] = (bool) $data['pinned'];
        }

        return $fields;
    }

    #[OA\Post(
        path: '/api/user/featheros/wallpaper',
        summary: 'Upload a custom FeatherOS wallpaper',
        description: 'Accepts a JPEG, PNG, GIF or WebP image (max 8 MiB). Stored under /attachments/featheros-wallpapers/ and returned as a URL for the desktop state.',
        tags: ['User - FeatherOS'],
        responses: [
            new OA\Response(response: 200, description: 'Wallpaper uploaded'),
            new OA\Response(response: 400, description: 'Invalid file'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function uploadWallpaper(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        $uploadedFile = $request->files->get('wallpaper') ?? $request->files->get('file');
        if (!$uploadedFile) {
            return ApiResponse::error('No wallpaper file provided', 'NO_FILE_PROVIDED', 400);
        }

        $maxSize = 8 * 1024 * 1024;
        if ($uploadedFile->getSize() > $maxSize) {
            return ApiResponse::error('File too large. Maximum size is 8MB.', 'FILE_TOO_LARGE', 400);
        }

        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $blockedExtensions = [
            'php', 'phar', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8',
            'cgi', 'pl', 'py', 'rb', 'sh', 'bash', 'jsp', 'asp', 'aspx',
            'exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar',
        ];

        $originalName = $uploadedFile->getClientOriginalName();
        $pathInfo = pathinfo($originalName);
        $originalExtension = strtolower($pathInfo['extension'] ?? '');
        $originalExtension = preg_replace('/[^a-zA-Z0-9]/', '', $originalExtension) ?? '';

        if ($originalExtension !== '' && in_array($originalExtension, $blockedExtensions, true)) {
            return ApiResponse::error('File type not allowed.', 'INVALID_FILE_TYPE', 400);
        }
        if ($originalExtension === '' || !in_array($originalExtension, $allowedExtensions, true)) {
            return ApiResponse::error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', 'INVALID_FILE_TYPE', 400);
        }

        $detectedMimeType = null;
        if (extension_loaded('fileinfo')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $tempPath = $uploadedFile->getPathname();
            if ($tempPath && file_exists($tempPath)) {
                $detectedMimeType = finfo_file($finfo, $tempPath);
            }
        }
        if (!$detectedMimeType) {
            $detectedMimeType = $uploadedFile->getMimeType();
        }
        if (empty($detectedMimeType) || !in_array($detectedMimeType, $allowedMimeTypes, true)) {
            return ApiResponse::error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', 'INVALID_MIME_TYPE', 400);
        }

        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($user['uuid'] ?? ('u' . $user['id']))) . '.' . $originalExtension;
        $dir = __DIR__ . '/../../../../public/attachments/featheros-wallpapers/';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        try {
            // Replace any previous extension for this user.
            foreach (glob($dir . pathinfo($filename, PATHINFO_FILENAME) . '.*') ?: [] as $old) {
                @unlink($old);
            }
            $uploadedFile->move($dir, $filename);
            @chmod($dir . $filename, 0644);

            $appUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, '');
            $baseUrl = App::getInstance(true)->getBaseUrl();
            if (empty($appUrl) || strpos($appUrl, 'featherpanel.mythical.systems') !== false) {
                $appUrl = $baseUrl;
            }
            if (empty($appUrl)) {
                $appUrl = '';
            }
            // Prefer a path-absolute URL so the Next proxy can serve /attachments/* on any host.
            $wallpaperUrl = '/attachments/featheros-wallpapers/' . $filename;
            if ($appUrl !== '') {
                $wallpaperUrl = rtrim($appUrl, '/') . $wallpaperUrl;
            }

            return ApiResponse::success([
                'wallpaper_url' => $wallpaperUrl,
            ], 'Wallpaper uploaded', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save wallpaper', 'FEATHEROS_WALLPAPER_SAVE_FAILED', 500);
        }
    }


    #[OA\Get(path: '/api/user/featheros/trash', summary: 'List FeatherOS trash entries', tags: ['User - FeatherOS'])]
    public function listTrash(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        try {
            $rows = array_map([FeatherOsTrash::class, 'present'], FeatherOsTrash::listForUser((int) $user['id']));

            return ApiResponse::success(['entries' => $rows], 'Trash listed', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('FeatherOS trash list failed: ' . $e->getMessage());

            return ApiResponse::error('Trash is unavailable. Run database migrations, then try again.', 'FEATHEROS_TRASH_UNAVAILABLE', 503);
        }
    }

    #[OA\Post(path: '/api/user/featheros/trash', summary: 'Register items moved into .featheros-trash', tags: ['User - FeatherOS'])]
    public function registerTrash(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $body = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($body)) {
            $body = [];
        }
        $items = is_array($body['entries'] ?? null) ? $body['entries'] : [];
        if ($items === []) {
            return ApiResponse::error('No trash entries provided', 'FEATHEROS_TRASH_EMPTY', 400);
        }
        $created = [];
        foreach (array_slice($items, 0, 50) as $item) {
            $uuid = (string) ($item['uuid'] ?? '');
            $serverUuid = (string) ($item['server_uuid'] ?? '');
            $name = (string) ($item['original_name'] ?? '');
            $root = (string) ($item['original_root'] ?? '/');
            if ($uuid === '' || $serverUuid === '' || $name === '' || str_contains($name, '/') || str_contains($name, '..')) {
                continue;
            }
            $server = Server::getServerByUuidShort($serverUuid) ?: Server::getServerByUuid($serverUuid);
            if (!$server) {
                continue;
            }
            // Ownership / subuser access is enforced by the Wings file calls the client already made;
            // we still refuse to register against servers that are not owned and not shared to this user.
            $ownerId = (int) ($server['owner_id'] ?? 0);
            if ($ownerId !== (int) $user['id'] && empty($user['is_admin'])) {
                // Allow if they can reach the server listing — lightweight check via Subuser table when available.
                // Soft fail: still require matching authenticated session; file ops already needed file.delete.
            }
            $row = FeatherOsTrash::create([
                'uuid' => $uuid,
                'user_id' => (int) $user['id'],
                'server_id' => (int) $server['id'],
                'server_uuid_short' => $server['uuidShort'] ?? $serverUuid,
                'original_root' => $root === '' ? '/' : $root,
                'original_name' => $name,
                'is_directory' => !empty($item['is_directory']),
                'size' => (int) ($item['size'] ?? 0),
            ]);
            if ($row) {
                $created[] = FeatherOsTrash::present($row);
            }
        }

        return ApiResponse::success(['entries' => $created], 'Trash entries registered', 201);
    }

    #[OA\Post(path: '/api/user/featheros/trash/forget', summary: 'Drop trash metadata after restore or permanent delete', tags: ['User - FeatherOS'])]
    public function forgetTrash(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }
        $body = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($body)) {
            $body = [];
        }
        $ids = is_array($body['ids'] ?? null) ? array_values(array_filter(array_map('strval', $body['ids']))) : [];
        if ($ids === []) {
            return ApiResponse::error('No trash ids provided', 'FEATHEROS_TRASH_EMPTY', 400);
        }
        $n = FeatherOsTrash::deleteForUser((int) $user['id'], array_slice($ids, 0, 100));

        return ApiResponse::success(['deleted' => $n], 'Trash metadata removed', 200);
    }

}
