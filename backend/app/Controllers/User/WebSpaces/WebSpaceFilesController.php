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

use App\App;
use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\WebSpaceGateway;
use App\Helpers\WebSpaceFileShare;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePathValidator;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\CheckWebSpacePermission;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User WebSpace file browser (proxied to FeatherQuilld).
 */
class WebSpaceFilesController
{
    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/files/list', summary: 'List WebSpace files', tags: ['User - WebSpace Files'])]
    public function list(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $directory = (string) $request->query->get('directory', '/');
        $page = (int) $request->query->get('page', 0);
        $perPage = (int) $request->query->get('per_page', 0);
        $query = ['directory' => $directory];
        if ($page > 0) {
            $query['page'] = $page;
        }
        if ($perPage > 0) {
            $query['per_page'] = $perPage;
        }
        $daemon = FeatherQuilldClient::listWebSpaceFiles($resolved['webNode'], $resolved['uuid'], $query);

        return $this->daemonResponse($daemon, 'DAEMON_LIST_FAILED');
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/file-capabilities', summary: 'WebSpace file manager capabilities', tags: ['User - WebSpace Files'])]
    public function fileCapabilities(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $caps = \App\Helpers\WebSpaceFileCapabilities::resolve($resolved['webNode'], $resolved['uuid']);

        return ApiResponse::success(['capabilities' => $caps], 'OK', 200);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/files/contents', summary: 'Read WebSpace file', tags: ['User - WebSpace Files'])]
    public function contents(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve(
            $request,
            $uuidShort,
            WebSpaceSubuserPermissions::FILE_READ_CONTENT,
            [WebSpaceSubuserPermissions::FILE_READ]
        );
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $file = (string) $request->query->get('file', '');
        if ($file === '') {
            return ApiResponse::error('Missing file query parameter', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::getWebSpaceFileContents($resolved['webNode'], $resolved['uuid'], $file);

        return $this->daemonResponse($daemon, 'DAEMON_CONTENTS_FAILED');
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/write', summary: 'Write WebSpace file', tags: ['User - WebSpace Files'])]
    public function write(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $file = (string) ($content['file'] ?? '');
        if ($file === '') {
            return ApiResponse::error('file is required', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }

        $contents = array_key_exists('contents', $content) ? (string) $content['contents'] : '';
        $daemon = FeatherQuilldClient::writeWebSpaceFile($resolved['webNode'], $resolved['uuid'], $file, $contents);

        return $this->daemonResponse($daemon, 'DAEMON_WRITE_FAILED', $resolved, 'webspace.file.updated', ['file' => $file]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/create-directory', summary: 'Create WebSpace directory', tags: ['User - WebSpace Files'])]
    public function createDirectory(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $name = trim((string) ($content['name'] ?? ''));
        if ($name === '') {
            return ApiResponse::error('name is required', 'MISSING_NAME', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($name, 'name')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::createWebSpaceDirectory($resolved['webNode'], $resolved['uuid'], $name);

        $response = $this->daemonResponse($daemon, 'DAEMON_CREATE_DIRECTORY_FAILED', $resolved, 'webspace.file.created', ['name' => $name]);
        if ($daemon['ok']) {
            WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceDirectoryCreated(), WebSpacePluginEvents::basePayload(
                $resolved['user']['uuid'] ?? null,
                $resolved['space'],
                [
                    'path' => $name,
                    'context' => ['source' => 'user'],
                ],
            ));
        }

        return $response;
    }

    #[OA\Put(path: '/api/user/webspaces/{uuidShort}/files/rename', summary: 'Rename WebSpace file', tags: ['User - WebSpace Files'])]
    public function rename(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $from = (string) ($content['from'] ?? '');
        $to = (string) ($content['to'] ?? '');
        if ($from === '' || $to === '') {
            return ApiResponse::error('from and to are required', 'MISSING_PATHS', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($from, 'from')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($to, 'to')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::renameWebSpaceFile($resolved['webNode'], $resolved['uuid'], $from, $to);

        return $this->daemonResponse($daemon, 'DAEMON_RENAME_FAILED', $resolved, 'webspace.file.renamed', [
            'from' => $from,
            'to' => $to,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/copy', summary: 'Copy WebSpace file or directory', tags: ['User - WebSpace Files'])]
    public function copy(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $from = trim((string) ($content['from'] ?? $content['file'] ?? ''));
        $to = isset($content['to']) ? trim((string) $content['to']) : (isset($content['destination']) ? trim((string) $content['destination']) : '');
        if ($from === '') {
            return ApiResponse::error('from is required', 'MISSING_PATH', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($from, 'from')) !== null) {
            return $rejected;
        }
        if ($to !== '' && ($rejected = WebSpacePathValidator::reject($to, 'to')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::copyWebSpaceFile(
            $resolved['webNode'],
            $resolved['uuid'],
            $from,
            $to !== '' ? $to : null,
        );

        return $this->daemonResponse($daemon, 'DAEMON_COPY_FAILED', $resolved, 'webspace.file.copied', [
            'from' => $from,
            'to' => $to,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/copy-many', summary: 'Copy many WebSpace files', tags: ['User - WebSpace Files'])]
    public function copyMany(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $files = $content['files'] ?? null;
        if (!is_array($files) || $files === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }

        $paths = array_values(array_filter(array_map('strval', $files), static fn (string $p): bool => $p !== ''));
        if ($paths === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }
        if (($invalid = WebSpacePathValidator::firstInvalid($paths)) !== null) {
            return ApiResponse::error("Invalid path in files: {$invalid}", 'INVALID_PATH', 400);
        }

        $destination = isset($content['destination']) ? trim((string) $content['destination']) : '';
        if ($destination !== '' && ($rejected = WebSpacePathValidator::reject($destination, 'destination')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::copyManyWebSpaceFiles(
            $resolved['webNode'],
            $resolved['uuid'],
            $paths,
            $destination !== '' ? $destination : null,
        );

        return $this->daemonResponse($daemon, 'DAEMON_COPY_MANY_FAILED', $resolved, 'webspace.file.copy_many', [
            'files' => $paths,
            'destination' => $destination,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/create-symlink', summary: 'Create WebSpace symlink', tags: ['User - WebSpace Files'])]
    public function createSymlink(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $link = trim((string) ($content['link'] ?? ''));
        $target = trim((string) ($content['target'] ?? ''));
        if ($link === '' || $target === '') {
            return ApiResponse::error('link and target are required', 'MISSING_PATH', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($link, 'link')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($target, 'target')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::createWebSpaceSymlink(
            $resolved['webNode'],
            $resolved['uuid'],
            $link,
            $target,
        );

        return $this->daemonResponse($daemon, 'DAEMON_SYMLINK_FAILED', $resolved, 'webspace.file.symlink', [
            'link' => $link,
            'target' => $target,
        ]);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/files/fingerprints', summary: 'Fingerprint WebSpace files', tags: ['User - WebSpace Files'])]
    public function fingerprints(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve(
            $request,
            $uuidShort,
            WebSpaceSubuserPermissions::FILE_READ_CONTENT,
            [WebSpaceSubuserPermissions::FILE_READ]
        );
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $filesParam = $request->query->all('files');
        if ($filesParam === [] || $filesParam === null) {
            $raw = $request->query->get('files');
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                $filesParam = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $raw)));
            } elseif (is_array($raw)) {
                $filesParam = $raw;
            } else {
                $filesParam = [];
            }
        }

        $paths = array_values(array_filter(array_map('strval', is_array($filesParam) ? $filesParam : []), static fn (string $p): bool => $p !== ''));
        if ($paths === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }
        if (($invalid = WebSpacePathValidator::firstInvalid($paths)) !== null) {
            return ApiResponse::error("Invalid path in files: {$invalid}", 'INVALID_PATH', 400);
        }

        $algorithm = strtolower(trim((string) $request->query->get('algorithm', 'sha256')));
        if (!in_array($algorithm, ['sha1', 'sha256'], true)) {
            return ApiResponse::error('algorithm must be sha1 or sha256', 'INVALID_ALGORITHM', 400);
        }

        $daemon = FeatherQuilldClient::fingerprintWebSpaceFiles(
            $resolved['webNode'],
            $resolved['uuid'],
            $paths,
            $algorithm,
        );

        return $this->daemonResponse($daemon, 'DAEMON_FINGERPRINT_FAILED', $resolved, 'webspace.file.fingerprinted', [
            'files' => $paths,
            'algorithm' => $algorithm,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/delete', summary: 'Delete WebSpace files', tags: ['User - WebSpace Files'])]
    public function delete(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $files = $content['files'] ?? null;
        if (!is_array($files) || $files === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }

        $paths = array_values(array_filter(array_map('strval', $files), static fn (string $p): bool => $p !== ''));
        if ($paths === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }
        if (($invalid = WebSpacePathValidator::firstInvalid($paths)) !== null) {
            return ApiResponse::error("Invalid path in files: {$invalid}", 'INVALID_PATH', 400);
        }

        $permanent = !empty($content['permanent']);
        $useTrash = !array_key_exists('use_trash', $content) || !empty($content['use_trash']);
        if ($permanent || !$this->isFileTrashEnabled()) {
            $useTrash = false;
        }

        $daemon = FeatherQuilldClient::deleteWebSpaceFiles(
            $resolved['webNode'],
            $resolved['uuid'],
            $paths,
            $permanent,
            $useTrash,
        );

        $event = $useTrash && !$permanent ? 'webspace.file.trashed' : 'webspace.file.deleted';
        $response = $this->daemonResponse($daemon, 'DAEMON_DELETE_FAILED', $resolved, $event, ['files' => $paths]);
        if ($daemon['ok']) {
            WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceFilesDeleted(), WebSpacePluginEvents::basePayload(
                $resolved['user']['uuid'] ?? null,
                $resolved['space'],
                [
                    'paths' => $paths,
                    'context' => ['source' => 'user'],
                ],
            ));
        }

        return $response;
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/compress', summary: 'Compress WebSpace files', tags: ['User - WebSpace Files'])]
    public function compress(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $root = (string) ($content['root'] ?? $content['directory'] ?? '/');
        if (($rejected = WebSpacePathValidator::reject($root, 'root')) !== null) {
            return $rejected;
        }
        $files = $content['files'] ?? null;
        if (!is_array($files) || $files === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }

        $paths = array_values(array_filter(array_map('strval', $files), static fn (string $p): bool => $p !== ''));
        if ($paths === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }
        if (($invalid = WebSpacePathValidator::firstInvalid($paths)) !== null) {
            return ApiResponse::error("Invalid path in files: {$invalid}", 'INVALID_PATH', 400);
        }

        $name = isset($content['name']) ? trim((string) $content['name']) : null;
        if ($name !== null && $name !== '' && !WebSpacePathValidator::isSafeFilename($name)) {
            return ApiResponse::error("Invalid name: must not contain '/', '\\', or be '.'/'..'", 'INVALID_NAME', 400);
        }
        $extension = trim((string) ($content['extension'] ?? 'tar.gz'));
        if ($extension === '') {
            $extension = 'tar.gz';
        }

        $daemon = FeatherQuilldClient::compressWebSpaceFiles(
            $resolved['webNode'],
            $resolved['uuid'],
            $root !== '' ? $root : '/',
            $paths,
            $name !== '' ? $name : null,
            $extension,
        );

        return $this->daemonResponse($daemon, 'DAEMON_COMPRESS_FAILED', $resolved, 'webspace.file.compressed', [
            'root' => $root,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/decompress', summary: 'Decompress WebSpace archive', tags: ['User - WebSpace Files'])]
    public function decompress(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $file = trim((string) ($content['file'] ?? ''));
        $root = (string) ($content['root'] ?? '/');
        if ($file === '') {
            return ApiResponse::error('file is required', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($root, 'root')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::decompressWebSpaceFile(
            $resolved['webNode'],
            $resolved['uuid'],
            $file,
            $root !== '' ? $root : '/',
        );

        return $this->daemonResponse($daemon, 'DAEMON_DECOMPRESS_FAILED', $resolved, 'webspace.file.decompressed', [
            'file' => $file,
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/chmod', summary: 'Change WebSpace file permissions', tags: ['User - WebSpace Files'])]
    public function chmod(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $files = $content['files'] ?? null;
        if (!is_array($files) || $files === []) {
            return ApiResponse::error('files must be a non-empty array', 'MISSING_FILES', 400);
        }

        $normalized = [];
        foreach ($files as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $path = trim((string) ($entry['file'] ?? ''));
            $mode = trim((string) ($entry['mode'] ?? ''));
            if ($path === '' || $mode === '') {
                continue;
            }
            if (WebSpacePathValidator::sanitizeRelativePath($path) === null) {
                return ApiResponse::error("Invalid path in files: {$path}", 'INVALID_PATH', 400);
            }
            $normalized[] = ['file' => $path, 'mode' => $mode];
        }

        if ($normalized === []) {
            return ApiResponse::error('files must include file and mode', 'MISSING_FILES', 400);
        }

        $daemon = FeatherQuilldClient::chmodWebSpaceFiles($resolved['webNode'], $resolved['uuid'], $normalized);

        return $this->daemonResponse($daemon, 'DAEMON_CHMOD_FAILED', $resolved, 'webspace.file.chmod', [
            'files' => $normalized,
        ]);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/files/search', summary: 'Search WebSpace files', tags: ['User - WebSpace Files'])]
    public function search(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $query = trim((string) $request->query->get('query', ''));
        if ($query === '') {
            return ApiResponse::error('query is required', 'MISSING_QUERY', 400);
        }

        $directory = (string) $request->query->get('directory', '/');
        $limit = (int) $request->query->get('limit', 100);
        $daemon = FeatherQuilldClient::searchWebSpaceFiles(
            $resolved['webNode'],
            $resolved['uuid'],
            $query,
            $directory !== '' ? $directory : '/',
            $limit > 0 ? $limit : 100,
        );

        return $this->daemonResponse($daemon, 'DAEMON_SEARCH_FAILED');
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/pull', summary: 'Pull remote file into WebSpace', tags: ['User - WebSpace Files'])]
    public function pull(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $url = trim((string) ($content['url'] ?? ''));
        if ($url === '') {
            return ApiResponse::error('url is required', 'MISSING_URL', 400);
        }

        $directory = (string) ($content['directory'] ?? $content['root'] ?? '/');
        if (($rejected = WebSpacePathValidator::reject($directory, 'directory')) !== null) {
            return $rejected;
        }
        $fileName = isset($content['file_name']) ? trim((string) $content['file_name']) : (isset($content['filename']) ? trim((string) $content['filename']) : null);
        if ($fileName !== null && $fileName !== '' && !WebSpacePathValidator::isSafeFilename($fileName)) {
            return ApiResponse::error("Invalid file_name: must not contain '/', '\\', or be '.'/'..'", 'INVALID_NAME', 400);
        }

        if (!empty($content['background'])) {
            $daemon = FeatherQuilldClient::pullWebSpaceFileBackground(
                $resolved['webNode'],
                $resolved['uuid'],
                $url,
                $directory !== '' ? $directory : '/',
                $fileName !== '' ? $fileName : null,
            );
            if (!$daemon['ok']) {
                return $this->daemonResponse($daemon, 'DAEMON_PULL_FAILED');
            }
            $body = is_array($daemon['body']) ? $daemon['body'] : [];

            return ApiResponse::success($body, 'Pull started', 202);
        }

        $daemon = FeatherQuilldClient::pullWebSpaceFile(
            $resolved['webNode'],
            $resolved['uuid'],
            $url,
            $directory !== '' ? $directory : '/',
            $fileName !== '' ? $fileName : null,
        );

        return $this->daemonResponse($daemon, 'DAEMON_PULL_FAILED', $resolved, 'webspace.file.pulled', [
            'url' => $url,
            'directory' => $directory,
        ]);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/files/download', summary: 'Download WebSpace file', tags: ['User - WebSpace Files'])]
    public function download(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $file = trim((string) $request->query->get('file', ''));
        if ($file === '') {
            return ApiResponse::error('file is required', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::downloadWebSpaceFile($resolved['webNode'], $resolved['uuid'], $file);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon download failed',
                'DAEMON_DOWNLOAD_FAILED',
                $daemon['status'] >= 400 && $daemon['status'] < 600 ? (int) $daemon['status'] : 502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $contents = (string) ($body['contents'] ?? '');
        $filename = (string) ($body['filename'] ?? basename($file));
        $contentType = (string) ($body['content_type'] ?? 'application/octet-stream');

        return new Response($contents, 200, [
            'Content-Type' => $contentType,
            'Content-Disposition' => 'attachment; filename="' . str_replace('"', '', $filename) . '"',
        ]);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/files/upload', summary: 'Upload WebSpace file', tags: ['User - WebSpace Files'])]
    public function upload(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $directory = (string) $request->query->get('directory', $request->request->get('directory', '/'));
        if (($rejected = WebSpacePathValidator::reject($directory, 'directory')) !== null) {
            return $rejected;
        }
        $files = $request->files->all();
        if ($files === []) {
            return ApiResponse::error('No files uploaded', 'MISSING_FILES', 400);
        }

        $last = null;
        foreach ($files as $uploaded) {
            if (is_array($uploaded)) {
                foreach ($uploaded as $one) {
                    if (!$one) {
                        continue;
                    }
                    $originalName = (string) $one->getClientOriginalName();
                    if (!WebSpacePathValidator::isSafeFilename($originalName)) {
                        return ApiResponse::error("Invalid uploaded filename: {$originalName}", 'INVALID_FILENAME', 400);
                    }
                    $last = FeatherQuilldClient::uploadWebSpaceFile(
                        $resolved['webNode'],
                        $resolved['uuid'],
                        $directory !== '' ? $directory : '/',
                        $originalName,
                        (string) $one->getPathname(),
                        (string) ($one->getMimeType() ?: 'application/octet-stream'),
                    );
                    if (!$last['ok']) {
                        return $this->daemonResponse($last, 'DAEMON_UPLOAD_FAILED');
                    }
                }
                continue;
            }
            if (!$uploaded) {
                continue;
            }
            $originalName = (string) $uploaded->getClientOriginalName();
            if (!WebSpacePathValidator::isSafeFilename($originalName)) {
                return ApiResponse::error("Invalid uploaded filename: {$originalName}", 'INVALID_FILENAME', 400);
            }
            $last = FeatherQuilldClient::uploadWebSpaceFile(
                $resolved['webNode'],
                $resolved['uuid'],
                $directory !== '' ? $directory : '/',
                $originalName,
                (string) $uploaded->getPathname(),
                (string) ($uploaded->getMimeType() ?: 'application/octet-stream'),
            );
            if (!$last['ok']) {
                return $this->daemonResponse($last, 'DAEMON_UPLOAD_FAILED');
            }
        }

        if ($last === null) {
            return ApiResponse::error('No files uploaded', 'MISSING_FILES', 400);
        }

        return $this->daemonResponse($last, 'DAEMON_UPLOAD_FAILED', $resolved, 'webspace.file.uploaded', [
            'directory' => $directory,
        ]);
    }

    public function listTrash(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!$this->isFileTrashEnabled()) {
            return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
        }

        $limits = $this->getTrashLimits();
        $daemon = FeatherQuilldClient::listWebSpaceTrash(
            $resolved['webNode'],
            $resolved['uuid'],
            (int) $limits['max_size_bytes'],
            (int) $limits['retention_days'],
        );

        return $this->daemonResponse($daemon, 'DAEMON_TRASH_LIST_FAILED', $resolved, 'webspace.trash.listed');
    }

    public function restoreTrash(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!$this->isFileTrashEnabled()) {
            return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $ids = $content['ids'] ?? null;
        if (!is_array($ids) || $ids === []) {
            return ApiResponse::error('ids must be a non-empty array', 'MISSING_IDS', 400);
        }

        $daemon = FeatherQuilldClient::restoreWebSpaceTrash(
            $resolved['webNode'],
            $resolved['uuid'],
            array_map('strval', $ids),
            !empty($content['overwrite']),
        );

        return $this->daemonResponse($daemon, 'DAEMON_TRASH_RESTORE_FAILED', $resolved, 'webspace.trash.restored', [
            'ids' => $ids,
        ]);
    }

    public function deleteTrash(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!$this->isFileTrashEnabled()) {
            return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $ids = $content['ids'] ?? null;
        if (!is_array($ids) || $ids === []) {
            return ApiResponse::error('ids must be a non-empty array', 'MISSING_IDS', 400);
        }

        $daemon = FeatherQuilldClient::deleteWebSpaceTrashEntries(
            $resolved['webNode'],
            $resolved['uuid'],
            array_map('strval', $ids),
        );

        return $this->daemonResponse($daemon, 'DAEMON_TRASH_DELETE_FAILED', $resolved, 'webspace.trash.deleted', [
            'ids' => $ids,
        ]);
    }

    public function emptyTrash(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        if (!$this->isFileTrashEnabled()) {
            return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
        }

        $daemon = FeatherQuilldClient::emptyWebSpaceTrash($resolved['webNode'], $resolved['uuid']);

        return $this->daemonResponse($daemon, 'DAEMON_TRASH_EMPTY_FAILED', $resolved, 'webspace.trash.emptied');
    }

    public function downloadDirectory(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $directory = trim((string) $request->query->get('path', $request->query->get('directory', '/')));
        $format = trim((string) $request->query->get('format', 'tar.gz'));
        if ($directory === '') {
            return ApiResponse::error('path is required', 'MISSING_PATH', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($directory, 'path')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::downloadWebSpaceDirectory(
            $resolved['webNode'],
            $resolved['uuid'],
            $directory,
            $format !== '' ? $format : 'tar.gz',
        );
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon directory download failed',
                'DAEMON_DIRECTORY_DOWNLOAD_FAILED',
                $daemon['status'] >= 400 && $daemon['status'] < 600 ? (int) $daemon['status'] : 502,
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];

        return new Response((string) ($body['contents'] ?? ''), 200, [
            'Content-Type' => (string) ($body['content_type'] ?? 'application/octet-stream'),
            'Content-Disposition' => 'attachment; filename="' . str_replace('"', '', (string) ($body['filename'] ?? 'download.tar.gz')) . '"',
        ]);
    }

    public function listArchive(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $directory = (string) $request->query->get('directory', '/');
        $file = trim((string) $request->query->get('file', ''));
        if ($file === '') {
            return ApiResponse::error('file is required', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($directory, 'directory')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::listWebSpaceArchive(
            $resolved['webNode'],
            $resolved['uuid'],
            $directory,
            $file,
            (string) $request->query->get('archive_path', ''),
        );

        return $this->daemonResponse($daemon, 'DAEMON_ARCHIVE_LIST_FAILED');
    }

    public function extractArchiveSelection(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $entries = $content['entries'] ?? null;
        if (!is_array($entries) || $entries === []) {
            return ApiResponse::error('entries must be a non-empty array', 'MISSING_ENTRIES', 400);
        }

        $root = (string) ($content['root'] ?? '/');
        $file = (string) ($content['file'] ?? '');
        $destination = (string) ($content['destination'] ?? '/');
        if (($rejected = WebSpacePathValidator::reject($root, 'root')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }
        if (($rejected = WebSpacePathValidator::reject($destination, 'destination')) !== null) {
            return $rejected;
        }

        $daemon = FeatherQuilldClient::extractWebSpaceArchiveSelection(
            $resolved['webNode'],
            $resolved['uuid'],
            $root,
            $file,
            $destination,
            array_values(array_map('strval', $entries)),
        );

        return $this->daemonResponse($daemon, 'DAEMON_ARCHIVE_EXTRACT_FAILED', $resolved, 'webspace.file.archive_extracted');
    }

    public function searchAdvanced(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $filters = [
            'directory' => (string) $request->query->get('directory', '/'),
            'pattern' => (string) $request->query->get('pattern', ''),
            'include' => (string) $request->query->get('include', ''),
            'exclude' => (string) $request->query->get('exclude', ''),
            'case_insensitive' => $request->query->get('case_insensitive', 'true') !== 'false' ? 'true' : 'false',
            'content' => (string) $request->query->get('content', ''),
            'content_case_insensitive' => $request->query->get('content_case_insensitive', 'true') !== 'false' ? 'true' : 'false',
            'limit' => (int) $request->query->get('limit', 100),
        ];
        if ($request->query->has('min_size')) {
            $filters['min_size'] = (int) $request->query->get('min_size');
        }
        if ($request->query->has('max_size')) {
            $filters['max_size'] = (int) $request->query->get('max_size');
        }

        $daemon = FeatherQuilldClient::searchWebSpaceFilesAdvanced($resolved['webNode'], $resolved['uuid'], $filters);

        return $this->daemonResponse($daemon, 'DAEMON_SEARCH_FAILED');
    }

    public function wipeAll(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $daemon = FeatherQuilldClient::wipeWebSpaceFiles($resolved['webNode'], $resolved['uuid']);

        return $this->daemonResponse($daemon, 'DAEMON_WIPE_FAILED', $resolved, 'webspace.files.wiped');
    }

    public function getUploadUrl(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $directory = (string) $request->query->get('directory', '/');
        if (($rejected = WebSpacePathValidator::reject($directory, 'directory')) !== null) {
            return $rejected;
        }
        $fileName = trim((string) $request->query->get('file_name', ''));
        if ($fileName !== '' && !WebSpacePathValidator::isSafeFilename($fileName)) {
            return ApiResponse::error("Invalid file_name: must not contain '/', '\\', or be '.'/'..'", 'INVALID_NAME', 400);
        }
        $token = FeatherQuilldClient::createWebSpaceUploadToken(
            $resolved['webNode'],
            $resolved['uuid'],
            $directory !== '' ? $directory : '/',
            $fileName !== '' ? $fileName : null,
        );

        return ApiResponse::success($token, 'Upload URL generated', 200);
    }

    public function shareFile(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve(
            $request,
            $uuidShort,
            WebSpaceSubuserPermissions::FILE_READ_CONTENT,
            [WebSpaceSubuserPermissions::FILE_READ],
        );
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $file = trim((string) ($content['file'] ?? ''));
        if ($file === '') {
            return ApiResponse::error('file is required', 'MISSING_FILE', 400);
        }
        if (($rejected = WebSpacePathValidator::reject($file, 'file')) !== null) {
            return $rejected;
        }

        $ttlDays = (int) ($content['ttl_days'] ?? 1);
        if (!in_array($ttlDays, [1, 5], true)) {
            $ttlDays = 1;
        }

        try {
            $result = WebSpaceFileShare::share($resolved['webNode'], $resolved['uuid'], $file, $ttlDays);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'SHARE_FAILED', 502);
        }

        $this->logFileActivity($resolved, 'webspace.file.shared', ['path' => $file, 'public_id' => $result['public_id']]);

        return ApiResponse::success($result, 'File shared successfully', 200);
    }

    public function getShareJobs(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return ApiResponse::success(['shares' => WebSpaceFileShare::listForWebSpace($resolved['uuid'])], 'Share jobs retrieved', 200);
    }

    public function deleteShareJob(Request $request, string $uuidShort, string $shareId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        WebSpaceFileShare::delete($shareId);

        return ApiResponse::success([], 'Share job cancelled', 200);
    }

    public function listPullJobs(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $daemon = FeatherQuilldClient::listWebSpacePullJobs($resolved['webNode'], $resolved['uuid']);
        if (!$daemon['ok']) {
            return $this->daemonResponse($daemon, 'DAEMON_PULL_JOBS_FAILED');
        }
        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $jobs = is_array($body['data'] ?? null) ? $body['data'] : [];

        return ApiResponse::success(['downloads' => $jobs], 'Pull jobs retrieved', 200);
    }

    public function cancelPullJob(Request $request, string $uuidShort, string $identifier): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::FILE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $daemon = FeatherQuilldClient::cancelWebSpacePullJob($resolved['webNode'], $resolved['uuid'], $identifier);

        return $this->daemonResponse($daemon, 'DAEMON_PULL_CANCEL_FAILED', $resolved, 'webspace.file.pull_cancelled');
    }

    private function isFileTrashEnabled(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::FILE_TRASH_ENABLED, 'false') === 'true';
    }

    /**
     * @return array{max_size_bytes: int, retention_days: int}
     */
    private function getTrashLimits(): array
    {
        $config = App::getInstance(true)->getConfig();
        $maxMb = (int) $config->getSetting(ConfigInterface::FILE_TRASH_MAX_SIZE_MB, '512');
        $retentionDays = (int) $config->getSetting(ConfigInterface::FILE_TRASH_RETENTION_DAYS, '30');

        return [
            'max_size_bytes' => $maxMb > 0 ? $maxMb * 1024 * 1024 : 0,
            'retention_days' => $retentionDays,
        ];
    }

    /**
     * @param list<string>|null $anyOf
     *
     * @return array{user: array<string, mixed>, space: array<string, mixed>, webNode: array<string, mixed>, uuid: string}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission, ?array $anyOf = null): array | Response
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

        if ($anyOf !== null) {
            $denied = CheckWebSpacePermission::requireAny($request, $space, array_merge([$permission], $anyOf));
        } else {
            $denied = CheckWebSpacePermission::require($request, $space, $permission);
        }
        if ($denied !== null) {
            return $denied;
        }

        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        return [
            'user' => $user,
            'space' => $space,
            'webNode' => $webNode,
            'uuid' => (string) $space['uuid'],
        ];
    }

    /**
     * @param array{user: array<string, mixed>, space: array<string, mixed>, webNode: array<string, mixed>, uuid: string}|Response $resolved
     */
    private function logFileActivity(array $resolved, string $event, array $metadata = []): void
    {
        \App\Helpers\WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], $event, $metadata);
    }

    /**
     * @param array{ok: bool, status: int, body: mixed, error: ?string} $daemon
     * @param array{user: array<string, mixed>, space: array<string, mixed>}|null $resolved
     */
    private function daemonResponse(array $daemon, string $errorCode, ?array $resolved = null, ?string $activityEvent = null, array $activityMeta = []): Response
    {
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon file operation failed',
                $errorCode,
                $daemon['status'] >= 400 && $daemon['status'] < 600 ? (int) $daemon['status'] : 502,
                ['daemon' => $daemon],
            );
        }

        if ($resolved !== null && $activityEvent !== null) {
            $this->logFileActivity($resolved, $activityEvent, $activityMeta);
        }

        // FeatherQuilld daemon endpoints are inconsistent: some return a bare payload
        // (e.g. {"ok": true}, or {"ok": true, "data": {"path": ...}}), others wrap their
        // *entire* payload in a "data" key with nothing else alongside it, as a list or object
        // (list/search/pull-jobs return {"data": [...]} or {"data": {"entries": [...]}}).
        // ApiResponse::success() always wraps whatever we pass it in another "data" key, so
        // blindly forwarding the full daemon body for the latter group used to produce
        // {"data": {"data": [...]}} — the frontend reads response.data and got the wrapper
        // object instead of the actual list, showing "No Files Found" even though the daemon
        // returned real entries. Unwrap the daemon's own "data" key only when it is the sole
        // top-level key AND itself an array/object, so there is always exactly one "data"
        // envelope for those endpoints. Endpoints that pair "data" with sibling keys (e.g.
        // "ok") keep both intact, and endpoints whose "data" value is a bare scalar (e.g.
        // files/contents returning {"data": "<file text>"}) are left untouched — the frontend
        // already expects that shape as response.data.data for the file editor.
        $body = is_array($daemon['body']) ? $daemon['body'] : ['data' => $daemon['body']];
        if (array_keys($body) === ['data'] && is_array($body['data'])) {
            $body = $body['data'];
        }

        return ApiResponse::success($body, 'OK', 200);
    }
}
