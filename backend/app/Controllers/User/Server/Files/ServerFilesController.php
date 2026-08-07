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

namespace App\Controllers\User\Server\Files;

use App\App;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\WingsUrlHelper;
use App\Plugins\Events\Events\ServerEvent;
use App\Services\Wings\Services\JwtService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerFilesEvent;
use App\Controllers\User\Server\CheckSubuserPermissionsTrait;

#[OA\Schema(
    schema: 'ServerFileItem',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'File or directory name'),
        new OA\Property(property: 'type', type: 'string', enum: ['file', 'directory'], description: 'Item type'),
        new OA\Property(property: 'size', type: 'integer', nullable: true, description: 'File size in bytes (directory entry size for folders)'),
        new OA\Property(property: 'directory_size', type: 'integer', nullable: true, description: 'Recursive size of folder contents in bytes (only when requested from Wings)'),
        new OA\Property(property: 'permissions', type: 'string', nullable: true, description: 'File permissions'),
        new OA\Property(property: 'modified_at', type: 'string', format: 'date-time', nullable: true, description: 'Last modified timestamp'),
        new OA\Property(property: 'path', type: 'string', description: 'Full file path'),
    ]
)]
#[OA\Schema(
    schema: 'FileOperationRequest',
    type: 'object',
    required: ['files', 'root'],
    properties: [
        new OA\Property(property: 'files', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of file paths'),
        new OA\Property(property: 'root', type: 'string', description: 'Root directory path'),
    ]
)]
#[OA\Schema(
    schema: 'CompressRequest',
    type: 'object',
    required: ['files', 'root'],
    properties: [
        new OA\Property(property: 'files', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of file paths'),
        new OA\Property(property: 'root', type: 'string', description: 'Root directory path'),
        new OA\Property(property: 'name', type: 'string', nullable: true, description: 'Archive name (optional, auto-generated if not provided)'),
        new OA\Property(property: 'extension', type: 'string', nullable: true, description: 'Archive type: zip, tar.gz, tgz, tar.bz2, tbz2, tar.xz, txz', default: 'tar.gz'),
    ]
)]
#[OA\Schema(
    schema: 'RenameRequest',
    type: 'object',
    required: ['files', 'root'],
    properties: [
        new OA\Property(property: 'files', type: 'array', items: new OA\Items(type: 'object', properties: [
            new OA\Property(property: 'from', type: 'string'),
            new OA\Property(property: 'to', type: 'string'),
        ]), description: 'Array of rename operations'),
        new OA\Property(property: 'root', type: 'string', description: 'Root directory path'),
    ]
)]
#[OA\Schema(
    schema: 'CopyRequest',
    type: 'object',
    required: ['files', 'location'],
    properties: [
        new OA\Property(property: 'files', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of file paths to copy'),
        new OA\Property(property: 'location', type: 'string', description: 'Destination location'),
    ]
)]
#[OA\Schema(
    schema: 'CreateDirectoryRequest',
    type: 'object',
    required: ['name', 'path'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Directory name'),
        new OA\Property(property: 'path', type: 'string', description: 'Parent directory path'),
    ]
)]
#[OA\Schema(
    schema: 'DecompressRequest',
    type: 'object',
    required: ['file', 'root'],
    properties: [
        new OA\Property(property: 'file', type: 'string', description: 'Archive file path'),
        new OA\Property(property: 'root', type: 'string', description: 'Root directory path'),
    ]
)]
#[OA\Schema(
    schema: 'PullFileRequest',
    type: 'object',
    required: ['url', 'root'],
    properties: [
        new OA\Property(property: 'url', type: 'string', format: 'uri', description: 'URL to download from'),
        new OA\Property(property: 'root', type: 'string', description: 'Destination directory path'),
        new OA\Property(property: 'fileName', type: 'string', nullable: true, description: 'Custom filename'),
        new OA\Property(property: 'foreground', type: 'boolean', nullable: true, description: 'Run in foreground', default: false),
        new OA\Property(property: 'useHeader', type: 'boolean', nullable: true, description: 'Use headers', default: true),
    ]
)]
#[OA\Schema(
    schema: 'DownloadProcess',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Download process ID'),
        new OA\Property(property: 'url', type: 'string', description: 'Download URL'),
        new OA\Property(property: 'status', type: 'string', description: 'Download status'),
        new OA\Property(property: 'progress', type: 'number', nullable: true, description: 'Download progress percentage'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Process creation time'),
    ]
)]
class ServerFilesController
{
    use CheckSubuserPermissionsTrait;

    private const MAX_LIST_ITEMS = 250;

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/files',
        summary: 'Get server files',
        description: 'Retrieve directory contents for a specific server path. Lists files and directories with their properties.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'Directory path to list',
                required: false,
                schema: new OA\Schema(type: 'string', default: '/')
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Case-insensitive filename substring filter applied before the list item limit',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'contents', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerFileItem')),
                        new OA\Property(property: 'limited', type: 'boolean', description: 'True when more matching items exist beyond the returned limit'),
                        new OA\Property(property: 'limit', type: 'integer', description: 'Maximum number of items returned'),
                        new OA\Property(property: 'total', type: 'integer', description: 'Number of matching items before applying the limit'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch files'),
        ]
    )]
    public function getFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.read permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $path = $this->getPathFromQuery();
            $search = trim((string) ($_GET['search'] ?? ''));

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->listDirectory($server['uuid'], $path, true);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($this->isWingsConnectionUnavailableError($error)) {
                    return ApiResponse::error(
                        'Wings Connection Unavailable. Please contact the support team. Technical details: ' . $error,
                        'WINGS_CONNECTION_UNAVAILABLE',
                        503
                    );
                }

                return ApiResponse::error('Failed to fetch files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_listed', [
                'path' => $path,
                'search' => $search !== '' ? $search : null,
            ], $user);

            $contents = $response->getData();
            if (!is_array($contents)) {
                $contents = [];
            }

            // Filter the full Wings listing by name before applying the display cap.
            // Client-side filtering only saw the first MAX_LIST_ITEMS and missed the rest.
            if ($search !== '') {
                $needle = mb_strtolower($search);
                $contents = array_values(array_filter($contents, static function ($item) use ($needle): bool {
                    if (!is_array($item)) {
                        return false;
                    }
                    $name = (string) ($item['name'] ?? '');
                    if ($name === '' && isset($item['path'])) {
                        $name = basename((string) $item['path']);
                    }

                    return $name !== '' && mb_stripos($name, $needle) !== false;
                }));
            }

            $total = count($contents);
            $limited = $total > self::MAX_LIST_ITEMS;
            $contents = array_values(array_slice($contents, 0, self::MAX_LIST_ITEMS));

            return ApiResponse::success([
                'contents' => $contents,
                'limited' => $limited,
                'limit' => self::MAX_LIST_ITEMS,
                'total' => $total,
            ], 'Files fetched successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'fetch files');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/archive-list',
        summary: 'List directory inside an archive',
        description: 'Browse supported archives (zip, tar, …) on the server without extracting them.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'path', in: 'query', required: false, schema: new OA\Schema(type: 'string', default: '/')),
            new OA\Parameter(name: 'file', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'archive_path', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Archive listing retrieved'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function listArchiveDirectory(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $directory = $this->getPathFromQuery('/');
            $file = $_GET['file'] ?? '';
            if ($file === '' || !is_string($file)) {
                return ApiResponse::error('Missing file parameter (archive path relative to path).', 'MISSING_FILE', 400);
            }
            $innerPath = isset($_GET['archive_path']) && is_string($_GET['archive_path']) ? $_GET['archive_path'] : '';

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->listArchiveDirectory($server['uuid'], $directory, $file, $innerPath);
            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if ($this->isWingsConnectionUnavailableError($error)) {
                    return ApiResponse::error(
                        'Wings Connection Unavailable. Please contact the support team. Technical details: ' . $error,
                        'WINGS_CONNECTION_UNAVAILABLE',
                        503
                    );
                }

                return ApiResponse::error('Failed to list archive: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $data = $response->getData();
            if (!is_array($data)) {
                $data = ['contents' => [], 'truncated' => false];
            }

            return ApiResponse::success($data, 'Archive listing retrieved successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'list archive');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/search-files',
        summary: 'Search files with advanced filters',
        description: 'Search server files by path patterns, content text and size constraints.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(name: 'uuidShort', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'directory', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'pattern', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'include', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'exclude', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'case_insensitive', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'content', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'content_case_insensitive', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'min_size', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'max_size', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'max_content_size', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'include_oversized', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Search completed successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function searchFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $filters = [
                'directory' => $_GET['directory'] ?? $this->getPathFromQuery('/'),
                'pattern' => $_GET['pattern'] ?? '',
                'include' => $_GET['include'] ?? '',
                'exclude' => $_GET['exclude'] ?? '',
                'case_insensitive' => $_GET['case_insensitive'] ?? 'true',
                'content' => $_GET['content'] ?? '',
                'content_case_insensitive' => $_GET['content_case_insensitive'] ?? 'true',
                'min_size' => $_GET['min_size'] ?? '0',
                'max_size' => $_GET['max_size'] ?? '0',
                'max_content_size' => $_GET['max_content_size'] ?? strval(5 * 1024 * 1024),
                'include_oversized' => $_GET['include_oversized'] ?? 'false',
            ];

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->searchFiles($server['uuid'], $filters);
            if (!$response->isSuccessful()) {
                return ApiResponse::error(
                    'Failed to search files: ' . $response->getError(),
                    'WINGS_ERROR',
                    $response->getStatusCode()
                );
            }

            $this->logActivity($server, $node, 'files_searched', [
                'directory' => $filters['directory'],
                'pattern' => $filters['pattern'],
                'include' => $filters['include'],
                'exclude' => $filters['exclude'],
                'content' => $filters['content'] !== '' ? '[provided]' : '',
            ], $user);

            $results = $response->getData();
            if (!is_array($results)) {
                $results = [];
            }

            $results = array_values(array_slice($results, 0, self::MAX_LIST_ITEMS));

            return ApiResponse::success($results, 'File search completed successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'search files');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/file',
        summary: 'Get file content',
        description: 'Retrieve the raw content of a specific file with appropriate MIME type headers.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'File path to read',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'File content retrieved successfully',
                content: new OA\MediaType(
                    mediaType: 'application/octet-stream',
                    schema: new OA\Schema(type: 'string', format: 'binary')
                ),
                headers: [
                    new OA\Header(
                        header: 'Content-Type',
                        description: 'MIME type of the file',
                        schema: new OA\Schema(type: 'string', example: 'text/plain')
                    ),
                ]
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch file'),
        ]
    )]
    public function getFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.read-content permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $path = $this->getPathFromQuery();

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getFileContentsRaw($server['uuid'], $path, false);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to fetch file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Get the raw file content
            $fileContent = $response->getRawBody();

            // Check if there's an actual error in the response data (not just empty content)
            // Empty files are valid and should be allowed
            if (is_array($response->getData()) && isset($response->getData()['error'])) {
                return ApiResponse::error('File content error: ' . $response->getData()['error'], 'FILE_CONTENT_ERROR', 500);
            }

            // If fileContent is null (not just empty string), it might indicate an error
            // But if it's an empty string, that's a valid empty file
            if ($fileContent === null) {
                // Check if response indicates an error
                $responseData = $response->getData();
                if (is_array($responseData) && (isset($responseData['error']) || isset($responseData['error_message']))) {
                    return ApiResponse::error('File content could not be retrieved', 'FILE_CONTENT_ERROR', 500);
                }
                // If no error indicated, treat as empty file
                $fileContent = '';
            }

            // Determine content type based on file extension
            $contentType = $this->getMimeType($path);

            // Log activity
            $this->logActivity($server, $node, 'file_viewed', [
                'path' => $path,

                'file_size' => strlen($fileContent),
                'content_type' => $contentType,
            ], $user);

            // Return file content with appropriate content type
            return new Response($fileContent, 200, ['Content-Type' => $contentType]);
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'fetch file');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/file-hash',
        summary: 'Get file hashes',
        description: 'Calculate and return hashes for a file on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'File path to hash',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'File hashes calculated successfully'),
            new OA\Response(response: 400, description: 'Bad request - Missing file path'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to hash file'),
        ]
    )]
    public function getFileHashes(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.read-content permission (hashing requires reading file bytes)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $path = $this->getPathFromQuery('');
            if ($path === '') {
                return ApiResponse::error('File path is required', 'MISSING_PATH', 400);
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getFileContentsRaw($server['uuid'], $path, false);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to hash file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $fileContent = $response->getRawBody();
            if ($fileContent === null) {
                $fileContent = '';
            }

            $hashes = [
                'md5' => hash('md5', $fileContent),
                'sha1' => hash('sha1', $fileContent),
                'sha256' => hash('sha256', $fileContent),
                'size' => strlen($fileContent),
                'path' => $path,
            ];

            $this->logActivity($server, $node, 'file_hashed', [
                'path' => $path,
                'size' => $hashes['size'],
            ], $user);

            return ApiResponse::success($hashes, 'File hashes calculated successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'hash file');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/write-file',
        summary: 'Write file content',
        description: 'Write raw content to a file on the server. Content-Type must not be application/json. Send empty body to clear file contents.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'File path to write to',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/octet-stream',
                schema: new OA\Schema(type: 'string', format: 'binary', description: 'Raw file content')
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File written successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid content type'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 415, description: 'Unsupported media type - JSON content type not allowed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to write file'),
        ]
    )]
    public function writeFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.update permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_UPDATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $path = $this->getPathFromQuery();

            // Reject JSON bodies – file saves must be raw text/binary
            $contentType = $request->headers->get('Content-Type', '');
            if (stripos($contentType, 'application/json') !== false) {
                return ApiResponse::error('JSON body not allowed for file writes. Send raw text/binary.', 'INVALID_CONTENT_TYPE', 415);
            }

            $content = $request->getContent();
            // Allow empty content to clear files
            if ($content === null) {
                return ApiResponse::error('Request body is missing', 'MISSING_CONTENT', 400);
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->writeFile($server['uuid'], $path, $content);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to write file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'file_written', [
                'path' => $path,

                'content_length' => strlen($content),
                'file_exists' => file_exists($path),
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFileSaved(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $path,
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'File written successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'write file');
        }
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/rename',
        summary: 'Rename files or folders',
        description: 'Rename multiple files or folders on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RenameRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files renamed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to rename files'),
        ]
    )]
    public function renameFileOrFolder(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.update permission (renaming is updating)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_UPDATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['files', 'root']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->renameFiles($server['uuid'], $data['root'], $data['files']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to rename files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'file_renamed', [
                'root' => $data['root'],
                'files' => $data['files'],

            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFileRenamed(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'root' => $data['root'],
                        'files' => $data['files'],
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'File renamed successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'rename files');
        }
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/delete-files',
        summary: 'Delete files',
        description: 'Delete multiple files or folders from the server. This action cannot be undone.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FileOperationRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete files'),
        ]
    )]
    public function deleteFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.delete permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_DELETE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['files', 'root']);
            $permanent = !empty($data['permanent']);
            $deleteOptions = $this->buildTrashDeleteOptions($permanent);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deleteFiles($server['uuid'], $data['root'], $data['files'], $deleteOptions);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to delete files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $usedTrash = !empty($deleteOptions['use_trash']) && empty($deleteOptions['permanent']);

            // Log activity
            $this->logActivity($server, $node, $usedTrash ? 'files_trashed' : 'files_deleted', [
                'root' => $data['root'],
                'files' => $data['files'],

                'file_count' => count($data['files']),
                'trash' => $usedTrash,
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFilesDeleted(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                    ]
                );
            }

            $message = $usedTrash ? 'Files moved to trash successfully' : 'Files deleted successfully';

            return ApiResponse::success($response->getData(), $message);
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'delete files');
        }
    }

    public function listTrash(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            if (!$this->isFileTrashEnabled()) {
                return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
            }

            $limits = $this->getTrashLimits();
            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->listTrash(
                $server['uuid'],
                (int) $limits['max_size_bytes'],
                (int) $limits['retention_days']
            );

            if (!$response->isSuccessful()) {
                return ApiResponse::error('Failed to list trash: ' . $response->getError(), 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'trash_listed', [], $user);

            return ApiResponse::success($response->getData(), 'Trash listed successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'list trash');
        }
    }

    public function restoreTrash(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_UPDATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            if (!$this->isFileTrashEnabled()) {
                return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
            }

            $data = $this->validateJsonBody($request, ['ids']);
            $overwrite = isset($data['overwrite']) && (bool) $data['overwrite'];
            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->restoreTrash($server['uuid'], $data['ids'], $overwrite);

            if (!$response->isSuccessful()) {
                return ApiResponse::error('Failed to restore files: ' . $response->getError(), 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'trash_restored', [
                'ids' => $data['ids'],
                'count' => count($data['ids']),
            ], $user);

            return ApiResponse::success($response->getData(), 'Files restored successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'restore trash');
        }
    }

    public function deleteTrashEntries(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_DELETE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            if (!$this->isFileTrashEnabled()) {
                return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
            }

            $data = $this->validateJsonBody($request, ['ids']);
            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deleteTrashEntries($server['uuid'], $data['ids']);

            if (!$response->isSuccessful()) {
                return ApiResponse::error('Failed to delete trash entries: ' . $response->getError(), 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'trash_deleted', [
                'ids' => $data['ids'],
                'count' => count($data['ids']),
            ], $user);

            return ApiResponse::success($response->getData(), 'Trash entries deleted permanently');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'delete trash entries');
        }
    }

    public function emptyTrash(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_DELETE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            if (!$this->isFileTrashEnabled()) {
                return ApiResponse::error('File trash is disabled on this panel', 'TRASH_DISABLED', 403);
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->emptyTrash($server['uuid']);

            if (!$response->isSuccessful()) {
                return ApiResponse::error('Failed to empty trash: ' . $response->getError(), 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'trash_emptied', [], $user);

            return ApiResponse::success($response->getData(), 'Trash emptied successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'empty trash');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/wipe-all-files',
        summary: 'Wipe all server files',
        description: 'Delete all files and folders in the server root directory. This action cannot be undone.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'All files wiped successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                        new OA\Property(property: 'deleted_count', type: 'integer', description: 'Number of files/folders deleted'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server or missing file.delete permission'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to wipe files'),
        ]
    )]
    public function wipeAllFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.delete permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_DELETE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $wings = $this->createWingsConnection($node);

            // List all files in root directory
            $listResponse = $wings->getServer()->listDirectory($server['uuid'], '/');
            if (!$listResponse->isSuccessful()) {
                return ApiResponse::error('Failed to list server files: ' . $listResponse->getError(), 'WINGS_ERROR', $listResponse->getStatusCode());
            }

            $responseData = $listResponse->getData();

            // Handle different response structures
            if (is_array($responseData) && isset($responseData['contents']) && is_array($responseData['contents'])) {
                $files = $responseData['contents'];
            } elseif (is_array($responseData)) {
                $files = $responseData;
            } else {
                $files = [];
            }

            if (empty($files) || !is_array($files)) {
                return ApiResponse::success(['deleted_count' => 0], 'No files found to delete');
            }

            // Extract file names from the list
            $fileNames = [];
            foreach ($files as $file) {
                if (is_array($file)) {
                    if (isset($file['name'])) {
                        $fileNames[] = $file['name'];
                    } elseif (isset($file['path'])) {
                        $fileNames[] = basename($file['path']);
                    }
                } elseif (is_string($file)) {
                    $fileNames[] = $file;
                }
            }

            if (empty($fileNames)) {
                return ApiResponse::success(['deleted_count' => 0], 'No files found to delete');
            }

            // Delete all files in root
            $deleteResponse = $wings->getServer()->deleteFiles($server['uuid'], '/', $fileNames);
            if (!$deleteResponse->isSuccessful()) {
                return ApiResponse::error('Failed to delete files: ' . $deleteResponse->getError(), 'WINGS_ERROR', $deleteResponse->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_wiped', [
                'root' => '/',
                'file_count' => count($fileNames),
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFilesDeleted(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                    ]
                );
            }

            return ApiResponse::success(['deleted_count' => count($fileNames)], 'All server files wiped successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'wipe all files');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/copy-files',
        summary: 'Copy files',
        description: 'Copy multiple files or folders to a new location on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CopyRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files copied successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to copy files'),
        ]
    )]
    public function copyFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.create permission (creating copies)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_CREATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['files', 'location']);
            if (!is_array($data['files']) || empty($data['files'])) {
                return ApiResponse::error('At least one file or directory must be provided', 'INVALID_COPY_REQUEST', 400);
            }

            $wings = $this->createWingsConnection($node);
            $destinationRoot = $this->normalizeDirectoryPath((string) $data['location']);
            $copiedFiles = [];

            foreach ($data['files'] as $sourcePath) {
                if (!is_string($sourcePath) || trim($sourcePath) === '') {
                    continue;
                }

                $normalizedSourcePath = $this->normalizeAbsolutePath($sourcePath);
                $copyResponse = $wings->getServer()->copyFiles($server['uuid'], $normalizedSourcePath, []);
                if (!$copyResponse->isSuccessful()) {
                    return ApiResponse::error(
                        'Failed to copy files: ' . $copyResponse->getError(),
                        'WINGS_ERROR',
                        $copyResponse->getStatusCode()
                    );
                }

                $copiedFiles[] = $normalizedSourcePath;
            }

            if (empty($copiedFiles)) {
                return ApiResponse::error('No valid files were provided to copy', 'INVALID_COPY_REQUEST', 400);
            }

            // Log activity
            $this->logActivity($server, $node, 'files_copied', [
                'location' => $destinationRoot,
                'files' => $copiedFiles,

                'file_count' => count($copiedFiles),
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFilesCopied(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_paths' => $copiedFiles,
                    ]
                );
            }

            return ApiResponse::success([
                'location' => $destinationRoot,
                'files' => $copiedFiles,
                'copied_count' => count($copiedFiles),
            ], 'Files copied successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'copy files');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/create-directory',
        summary: 'Create directory',
        description: 'Create a new directory on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CreateDirectoryRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Directory created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create directory'),
        ]
    )]
    public function createDirectory(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.create permission (creating directories)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_CREATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['name', 'path']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->createDirectory($server['uuid'], $data['name'], $data['path']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to create directory: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'directory_created', [
                'name' => $data['name'],
                'path' => $data['path'],

                'full_path' => rtrim($data['path'], '/') . '/' . $data['name'],
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerDirectoryCreated(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'directory_path' => rtrim($data['path'], '/') . '/' . $data['name'],
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'Directory created successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'create directory');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/compress-files',
        summary: 'Compress files',
        description: 'Compress multiple files or folders into an archive.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CompressRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files compressed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to compress files'),
        ]
    )]
    public function compressFiles(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.archive permission
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_ARCHIVE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['files', 'root']);

            // Get optional name and extension (default to generated name and tar.gz)
            $name = $data['name'] ?? '';
            $extension = $data['extension'] ?? 'tar.gz';

            // For large archives, process asynchronously to avoid Cloudflare timeout (100s limit)
            // Return immediately to client, then process in background
            // This matches how Pterodactyl/Pelican handle it - they return instantly

            // Return immediately to avoid Cloudflare 504 timeout
            // Continue processing in background after response is sent
            ignore_user_abort(true);

            // Send response immediately (before Cloudflare timeout)
            $immediateResponse = ApiResponse::success([
                'message' => 'Archive compression started. Large archives may take several minutes to complete.',
                'status' => 'processing',
            ], 'Compression started successfully');

            // Flush output to send response immediately
            $immediateResponse->send();

            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            } else {
                // Fallback for non-FastCGI environments
                if (ob_get_level() > 0) {
                    ob_end_flush();
                }
                flush();
            }

            // Now process compression in background (after response sent)
            try {
                $wings = $this->createWingsConnection($node);
                $wingsResponse = $wings->getServer()->compressFiles($server['uuid'], $data['root'], $data['files'], $name, $extension);

                if (!$wingsResponse->isSuccessful()) {
                    $error = $wingsResponse->getError();
                    App::getInstance(true)->getLogger()->error("Background compression failed for server {$server['uuid']}: {$error}");

                    // Note: Can't return error to client since response already sent
                    return $immediateResponse;
                }

                // Log activity
                $this->logActivity($server, $node, 'files_compressed', [
                    'root' => $data['root'],
                    'files' => $data['files'],
                    'name' => $name,
                    'extension' => $extension,
                    'file_count' => count($data['files']),
                ], $user);

                // Emit event
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        ServerEvent::onServerFileCompressed(),
                        [
                            'user_uuid' => $user['uuid'],
                            'server_uuid' => $server['uuid'],
                            'file_path' => $data['root'],
                        ]
                    );
                }
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error("Background compression exception for server {$server['uuid']}: " . $e->getMessage());
                // Response already sent, can't return error
            }

            // Return the immediate response (already sent, but needed for method signature)
            return $immediateResponse;
        } catch (\App\Services\Wings\Exceptions\WingsConnectionException $e) {
            // Check if it's a timeout error
            $errorMessage = $e->getMessage();
            if (strpos(strtolower($errorMessage), 'timeout') !== false || strpos(strtolower($errorMessage), 'timed out') !== false) {
                return ApiResponse::error(
                    'Archive creation timed out. This may occur with very large archives (>4GB). Please try compressing smaller sets of files or contact support.',
                    'ARCHIVE_TIMEOUT',
                    504
                );
            }

            return $this->handleWingsError($e, 'compress files');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'compress files');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/decompress-archive',
        summary: 'Decompress archive',
        description: 'Decompress an archive file on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/DecompressRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Archive decompressed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to decompress archive'),
        ]
    )]
    public function decompressArchive(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.archive permission (decompressing archives)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_ARCHIVE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['file', 'root']);

            // ServerService handles the timeout per-request (15 minutes like pelican)
            // Large archives over 4GB can take significant time to decompress
            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->decompressArchive($server['uuid'], $data['file'], $data['root']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                // Provide more helpful error message for timeout/large file issues
                if (strpos(strtolower($error), 'timeout') !== false || strpos(strtolower($error), 'timed out') !== false) {
                    return ApiResponse::error(
                        'Archive decompression timed out. This may occur with very large archives (>4GB). Please try again or contact support.',
                        'ARCHIVE_TIMEOUT',
                        $response->getStatusCode()
                    );
                }

                return ApiResponse::error('Failed to decompress archive: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'archive_decompressed', [
                'file' => $data['file'],
                'root' => $data['root'],

            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFileDecompressed(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $data['root'],
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'Archive decompressed successfully');
        } catch (\App\Services\Wings\Exceptions\WingsConnectionException $e) {
            // Check if it's a timeout error
            $errorMessage = $e->getMessage();
            if (strpos(strtolower($errorMessage), 'timeout') !== false || strpos(strtolower($errorMessage), 'timed out') !== false) {
                return ApiResponse::error(
                    'Archive decompression timed out. This may occur with very large archives (>4GB). Please try again or contact support.',
                    'ARCHIVE_TIMEOUT',
                    504
                );
            }

            return $this->handleWingsError($e, 'decompress archive');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'decompress archive');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/extract-archive-selection',
        summary: 'Extract selected paths from an archive',
        description: 'Extract specific files or directories from an on-disk archive into a destination folder without unpacking the whole archive.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['root', 'file', 'destination', 'entries'],
                properties: [
                    new OA\Property(property: 'root', type: 'string', description: 'Directory on the server that contains the archive'),
                    new OA\Property(property: 'file', type: 'string', description: 'Archive file name relative to root'),
                    new OA\Property(
                        property: 'destination',
                        type: 'string',
                        description: 'Destination directory relative to server root (use empty string for /)'
                    ),
                    new OA\Property(
                        property: 'entries',
                        type: 'array',
                        items: new OA\Items(type: 'string'),
                        description: 'Paths inside the archive to extract'
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Extraction started or completed successfully'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function extractArchiveSelection(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_ARCHIVE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['root', 'file', 'destination', 'entries']);
            if (!is_array($data['entries'])) {
                return ApiResponse::error('Field entries must be an array of strings.', 'INVALID_ENTRIES', 400);
            }
            $entries = [];
            foreach ($data['entries'] as $entry) {
                if (is_string($entry) && $entry !== '') {
                    $entries[] = $entry;
                }
            }
            if ($entries === []) {
                return ApiResponse::error('At least one non-empty archive entry path is required.', 'INVALID_ENTRIES', 400);
            }

            $root = $this->normalizeDirectoryPath((string) $data['root']);
            $file = (string) $data['file'];

            $destRaw = $data['destination'];
            if (!is_string($destRaw)) {
                return ApiResponse::error('Field destination must be a string.', 'INVALID_DESTINATION', 400);
            }
            $destination = ($destRaw === '' || $destRaw === '/') ? '' : ltrim($this->normalizeDirectoryPath($destRaw), '/');

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->extractArchiveSelection($server['uuid'], $root, $file, $destination, $entries);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                if (strpos(strtolower($error), 'timeout') !== false || strpos(strtolower($error), 'timed out') !== false) {
                    return ApiResponse::error(
                        'Archive extraction timed out. Try a smaller selection or extract the full archive instead.',
                        'ARCHIVE_TIMEOUT',
                        $response->getStatusCode()
                    );
                }

                return ApiResponse::error('Failed to extract from archive: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'archive_selection_extracted', [
                'root' => $root,
                'file' => $file,
                'destination' => $destination,
                'entry_count' => count($entries),
            ], $user);

            return ApiResponse::success($response->getData(), 'Archive selection extracted successfully');
        } catch (\App\Services\Wings\Exceptions\WingsConnectionException $e) {
            $errorMessage = $e->getMessage();
            if (strpos(strtolower($errorMessage), 'timeout') !== false || strpos(strtolower($errorMessage), 'timed out') !== false) {
                return ApiResponse::error(
                    'Archive extraction timed out. Try a smaller selection or extract the full archive instead.',
                    'ARCHIVE_TIMEOUT',
                    504
                );
            }

            return $this->handleWingsError($e, 'extract archive selection');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'extract archive selection');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/change-permissions',
        summary: 'Change file permissions',
        description: 'Change permissions for multiple files or folders on the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FileOperationRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File permissions changed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to change permissions'),
        ]
    )]
    public function changeFilePermissions(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.update permission (changing permissions is updating)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_UPDATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['files', 'root']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->changeFilePermissions($server['uuid'], $data['root'], $data['files']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to change file permissions: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'file_permissions_changed', [
                'root' => $data['root'],
                'files' => $data['files'],

                'file_count' => count($data['files']),
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFilePermissionsChanged(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $data['root'],
                        'permissions' => ['*'],
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'File permissions changed successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'change file permissions');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/pull-file',
        summary: 'Pull file from URL',
        description: 'Download a file from a URL to the server. Can run in foreground or background.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PullFileRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File pull initiated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to pull file'),
        ]
    )]
    public function pullFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.create permission (pulling files creates them)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_CREATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $data = $this->validateJsonBody($request, ['url', 'root']);

            $fileName = $data['fileName'] ?? null;
            $foreground = $data['foreground'] ?? false;
            $useHeader = $data['useHeader'] ?? true;

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->pullFile(
                $server['uuid'],
                $data['url'],
                $data['root'],
                $fileName,
                $foreground,
                $useHeader
            );

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to pull file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'file_pulled', [
                'url' => $data['url'],
                'root' => $data['root'],
                'file_name' => $fileName,
                'foreground' => $foreground,
                'use_header' => $useHeader,

            ], $user);

            return ApiResponse::success($response->getData(), 'File pull initiated successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'pull file');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/downloads-list',
        summary: 'Get downloads list',
        description: 'Retrieve the list of active download processes for the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Downloads list retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/DownloadProcess')
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to get downloads list'),
        ]
    )]
    public function getDownloadsList(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.read permission (viewing downloads list)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getDownloadsList($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to get downloads list: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'downloads_list_viewed', [

            ], $user);

            return ApiResponse::success($response->getData(), 'Downloads list retrieved successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'get downloads list');
        }
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/delete-pull-process/{pullId}',
        summary: 'Delete pull process',
        description: 'Cancel and delete an active download process.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'pullId',
                in: 'path',
                description: 'Pull process ID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Pull process deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or pull process not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete pull process'),
        ]
    )]
    public function deletePullProcess(Request $request, string $serverUuid, string $pullId): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.read permission (managing downloads)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deletePullProcess($server['uuid'], $pullId);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to delete pull process: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'pull_process_deleted', [
                'pull_id' => $pullId,

            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerPullProcessDeleted(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'pull_id' => $pullId,
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'Pull process deleted successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'delete pull process');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/share-file',
        summary: 'Share a server file via temp uploads',
        description: 'Uploads a server file from Wings as a temp upload (multipart) and returns a public share URL and delete key. Large files may return a background job identifier; poll share-jobs until complete.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['file', 'ttl_days'],
                properties: [
                    new OA\Property(property: 'file', type: 'string', description: 'Path to the file on the server'),
                    new OA\Property(property: 'ttl_days', type: 'integer', enum: [1, 5], description: 'How long the share remains available'),
                    new OA\Property(property: 'password', type: 'string', nullable: true, description: 'Optional download password (min 4 chars)'),
                    new OA\Property(property: 'delete_key', type: 'string', nullable: true, description: 'Optional custom delete key (min 8 chars)'),
                    new OA\Property(property: 'background', type: 'boolean', nullable: true, description: 'Force background upload even for small files'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'File shared successfully'),
            new OA\Response(response: 202, description: 'Background share started'),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Not found'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function shareFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $config = App::getInstance(true)->getConfig();
            if (($config->getSetting(ConfigInterface::TEMP_FILES_ENABLED, 'true') ?? 'true') !== 'true') {
                return ApiResponse::error('Temp uploads sharing is disabled', 'TEMP_FILES_DISABLED', 403);
            }

            $data = json_decode($request->getContent(), true);
            if (!is_array($data)) {
                return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
            }

            $file = trim((string) ($data['file'] ?? ''));
            if ($file === '') {
                return ApiResponse::error('File path is required', 'MISSING_FILE', 400);
            }

            $ttlDays = (int) ($data['ttl_days'] ?? 0);
            if (!in_array($ttlDays, [1, 5], true)) {
                return ApiResponse::error('ttl_days must be 1 or 5', 'INVALID_TTL', 400);
            }

            $password = isset($data['password']) ? (string) $data['password'] : '';
            if ($password !== '' && strlen($password) < 4) {
                return ApiResponse::error('password must be at least 4 characters', 'INVALID_PASSWORD', 400);
            }

            $deleteKey = isset($data['delete_key']) ? (string) $data['delete_key'] : '';
            if ($deleteKey !== '' && strlen($deleteKey) < 8) {
                return ApiResponse::error('delete_key must be at least 8 characters', 'INVALID_DELETE_KEY', 400);
            }

            $token = trim((string) ($config->getSetting(ConfigInterface::TEMP_FILES_API_TOKEN, '') ?? ''));

            $payload = [
                'file' => ltrim($file, '/'),
                'ttl_days' => $ttlDays,
            ];
            if ($password !== '') {
                $payload['password'] = $password;
            }
            if ($deleteKey !== '') {
                $payload['delete_key'] = $deleteKey;
            }
            if ($token !== '') {
                $payload['token'] = $token;
            }
            if (!empty($data['background'])) {
                $payload['background'] = true;
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->shareFile($server['uuid'], $payload);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to share file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $result = $response->getData();
            if (!is_array($result)) {
                $result = [];
            }

            $isBackground = $response->getStatusCode() === 202 || (isset($result['identifier']) && !isset($result['public_id']));

            if ($isBackground) {
                $this->logActivity($server, $node, 'file_share_started', [
                    'path' => $file,
                    'ttl_days' => $ttlDays,
                    'identifier' => $result['identifier'] ?? null,
                    'password_protected' => $password !== '',
                ], $user);

                return ApiResponse::success([
                    'identifier' => $result['identifier'] ?? null,
                    'background' => true,
                ], 'File share started', 202);
            }

            $this->logActivity($server, $node, 'file_shared', [
                'path' => $file,
                'ttl_days' => $ttlDays,
                'public_id' => $result['public_id'] ?? null,
                'url' => $result['url'] ?? null,
                'password_protected' => !empty($result['password_protected']) || $password !== '',
            ], $user);

            return ApiResponse::success([
                'public_id' => $result['public_id'] ?? null,
                'url' => $result['url'] ?? null,
                'delete_key' => $result['delete_key'] ?? null,
                'expires_at' => $result['expires_at'] ?? null,
                'password_protected' => !empty($result['password_protected']),
                'size' => $result['size'] ?? null,
                'filename' => $result['filename'] ?? basename($file),
                'background' => false,
            ], 'File shared successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'share file');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/share-jobs',
        summary: 'List temp upload share jobs',
        description: 'Retrieve active temp upload share jobs for the server.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Share jobs retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getShareJobs(Request $request, string $serverUuid): Response
    {
        try {
            $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getShareJobs($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to get share jobs: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            return ApiResponse::success($response->getData(), 'Share jobs retrieved successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'get share jobs');
        }
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/share-jobs/{shareId}',
        summary: 'Cancel a temp upload share job',
        description: 'Cancels an in-progress temp upload share job.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'shareId',
                in: 'path',
                description: 'Share job identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Share job cancelled'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function deleteShareJob(Request $request, string $serverUuid, string $shareId): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deleteShareJob($server['uuid'], $shareId);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to cancel share job: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            $this->logActivity($server, $node, 'file_share_cancelled', [
                'identifier' => $shareId,
            ], $user);

            return ApiResponse::success([], 'Share job cancelled');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'cancel share job');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/upload-file',
        summary: 'Upload file',
        description: 'Upload a file to the server. Content-Type must not be application/json.',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'Destination directory path',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'filename',
                in: 'query',
                description: 'Filename for the uploaded file',
                required: false,
                schema: new OA\Schema(type: 'string', default: 'uploaded_file')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/octet-stream',
                schema: new OA\Schema(type: 'string', format: 'binary', description: 'Raw file content')
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, empty content, or invalid content type'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or node not found'),
            new OA\Response(response: 415, description: 'Unsupported media type - JSON content type not allowed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to upload file'),
        ]
    )]
    public function uploadFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);
            $node = $this->validateNode($server['node_id']);

            // Check file.create permission (uploading creates files)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_CREATE);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            // Get the file path from query parameters
            $path = $this->getPathFromQuery();

            // Reject JSON bodies – file uploads must be raw text/binary
            $contentType = $request->headers->get('Content-Type', '');
            if (stripos($contentType, 'application/json') !== false) {
                return ApiResponse::error('JSON body not allowed for file uploads. Send raw text/binary.', 'INVALID_CONTENT_TYPE', 415);
            }

            // Get the file content from the request body
            $fileContent = $request->getContent();
            if (empty($fileContent)) {
                return ApiResponse::error('Request body is empty', 'EMPTY_CONTENT', 400);
            }

            // Get the filename from query parameters or use a default
            $filename = $_GET['filename'] ?? 'uploaded_file';

            // Combine path and filename
            $fullPath = rtrim($path, '/') . '/' . $filename;

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->writeFile($server['uuid'], $fullPath, $fileContent);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to upload file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'file_uploaded', [
                'path' => $path,
                'filename' => $filename,
                'full_path' => $fullPath,

                'file_size' => strlen($fileContent),
            ], $user);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerFilesEvent::onServerFileUploaded(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $path,
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'File uploaded successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'upload file');
        }
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/download-file',
        summary: 'Get file download URL',
        description: 'Generate a secure one-time Wings download URL for a server file with JWT token authentication (same pattern as backup downloads).',
        tags: ['User - Server Files'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'File path to download',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Download URL generated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'download_url', type: 'string', description: 'Signed Wings file download URL'),
                        new OA\Property(property: 'expires_in', type: 'integer', description: 'Token lifetime in seconds', example: 300),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or file path'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to generate download URL'),
        ]
    )]
    public function downloadFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);

            // Check file.read-content permission (downloading files)
            $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::FILE_READ_CONTENT);
            if ($permissionCheck !== null) {
                return $permissionCheck;
            }

            // Get the file path from query parameters
            $path = $this->getPathFromQuery();
            if (empty($path)) {
                return ApiResponse::error('File path is required', 'MISSING_PATH', 400);
            }

            $node = $this->validateNode($server['node_id']);
            $filename = basename($path);

            $token = $node['daemon_token'];
            $wingsBaseUrl = WingsUrlHelper::buildFromNode($node);

            $jwtService = new JwtService(
                $token,
                AppUrlHelper::wingsRemoteUrl(),
                $wingsBaseUrl
            );

            $jwtToken = $jwtService->generateFileDownloadToken($server['uuid'], $path);
            $baseUrl = rtrim($wingsBaseUrl, '/');
            $encodedFilePath = urlencode($path);
            $downloadUrl = "{$baseUrl}/download/file?token={$jwtToken}&server={$server['uuid']}&file={$encodedFilePath}";

            $this->logActivity($server, $node, 'file_downloaded', [
                'path' => $path,
                'filename' => $filename,
            ], $user);

            return ApiResponse::success([
                'download_url' => $downloadUrl,
                'expires_in' => 300,
            ]);
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'download file');
        }
    }

    /**
     * Helper method to validate user authentication.
     */
    private function validateUser(Request $request): array
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            throw new \Exception('User not authenticated', 401);
        }

        return $user;
    }

    /**
     * Helper method to get and validate server.
     */
    private function validateServer(string $serverUuid): array
    {
        $server = Server::getServerByUuidShort($serverUuid);
        if (!$server) {
            throw new \Exception('Server not found', 404);
        }

        return $server;
    }

    /**
     * Helper method to get and validate node.
     */
    private function validateNode(int $nodeId): array
    {
        $node = \App\Chat\Node::getNodeById($nodeId);
        if (!$node) {
            throw new \Exception('Node not found', 404);
        }

        return $node;
    }

    /**
     * Helper method to create Wings connection.
     */
    /**
     * Create a Wings connection with configurable timeout.
     *
     * @param array $node The node configuration array
     * @param int $timeout Timeout in seconds (default: 30 seconds)
     *
     * @return Wings The Wings connection instance
     */
    private function createWingsConnection(array $node, int $timeout = 30): Wings
    {
        return Wings::fromNode($node, $timeout);
    }

    /**
     * Helper method to handle Wings API errors.
     */
    private function handleWingsError(\Exception $e, string $operation): Response
    {
        $error = $e->getMessage();
        $statusCode = $e->getCode() ?: 500;

        // Surface a clear, user-friendly message when Wings cannot be reached.
        if ($e instanceof \App\Services\Wings\Exceptions\WingsConnectionException) {
            $message = 'Wings Connection Unavailable. Please contact the support team. Technical details: ' . $error;

            App::getInstance(true)->getLogger()->error("Wings connection unavailable during {$operation}: {$error}");

            return ApiResponse::error($message, 'WINGS_CONNECTION_UNAVAILABLE', 503);
        }

        // Map Wings error codes to user-friendly messages
        $errorMap = [
            400 => 'Invalid server configuration',
            401 => 'Unauthorized access to Wings daemon',
            403 => 'Forbidden access to Wings daemon',
            404 => 'Resource not found',
            409 => 'Resource already exists',
            422 => 'Invalid server data',
            500 => 'Wings daemon error',
        ];

        $baseMessage = $errorMap[$statusCode] ?? 'Wings operation failed';
        $message = $baseMessage . ': ' . $error;

        App::getInstance(true)->getLogger()->error("Failed to {$operation}: {$error}");

        return ApiResponse::error($message, strtoupper($operation) . '_FAILED', $statusCode);
    }

    /**
     * Detect connection-level Wings failures even when wrapped in response payloads.
     */
    private function isWingsConnectionUnavailableError(string $error): bool
    {
        $needle = strtolower($error);

        return str_contains($needle, 'connection failed')
            || str_contains($needle, 'could not connect to server')
            || str_contains($needle, 'curl error 7')
            || str_contains($needle, 'timed out')
            || str_contains($needle, 'curl error 28');
    }

    /**
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }

    /**
     * Helper method to get path from query parameters.
     */
    private function getPathFromQuery(string $default = '/'): string
    {
        return $_GET['path'] ?? $default;
    }

    /**
     * Helper method to validate JSON request body.
     */
    private function validateJsonBody(Request $request, array $requiredFields): array
    {
        $content = $request->getContent();
        if (empty($content)) {
            throw new \Exception('Request body is empty', 400);
        }

        $data = json_decode($content, true);
        if (!$data) {
            throw new \Exception('Invalid JSON in request body', 400);
        }

        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                throw new \Exception("Missing required field: {$field}", 400);
            }
        }

        return $data;
    }

    /**
     * Helper method to execute Wings operation with error handling.
     */
    private function executeWingsOperation(callable $operation, string $operationName): Response
    {
        try {
            $result = $operation();

            return $result;
        } catch (\Exception $e) {
            return $this->handleWingsError($e, $operationName);
        }
    }

    /**
     * Normalize a filesystem path to an absolute path.
     */
    private function normalizeAbsolutePath(string $path): string
    {
        $path = preg_replace('#/+#', '/', trim($path));
        if ($path === '' || $path === null) {
            return '/';
        }
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }

        return $path;
    }

    /**
     * Normalize directory path and drop trailing slash except for root.
     */
    private function normalizeDirectoryPath(string $path): string
    {
        $normalized = $this->normalizeAbsolutePath($path);
        if ($normalized === '/') {
            return '/';
        }

        return rtrim($normalized, '/');
    }

    /**
     * Helper method to get MIME type based on file extension.
     */
    private function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mimeTypes = [
            // Web files
            'html' => 'text/html',
            'htm' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'jsx' => 'text/jsx',
            'ts' => 'text/typescript',
            'tsx' => 'text/tsx',

            // Data formats
            'json' => 'application/json',
            'xml' => 'application/xml',
            'yaml' => 'application/x-yaml',
            'yml' => 'application/x-yaml',
            'toml' => 'application/toml',
            'ini' => 'text/plain',
            'conf' => 'text/plain',
            'config' => 'text/plain',
            'cfg' => 'text/plain',

            // Programming languages
            'php' => 'text/plain',
            'py' => 'text/x-python',
            'rb' => 'text/x-ruby',
            'go' => 'text/x-go',
            'java' => 'text/x-java',
            'c' => 'text/x-c',
            'cpp' => 'text/x-c++',
            'h' => 'text/x-c',
            'hpp' => 'text/x-c++',
            'cs' => 'text/x-csharp',
            'rs' => 'text/x-rust',
            'kt' => 'text/x-kotlin',
            'swift' => 'text/x-swift',
            'scala' => 'text/x-scala',
            'pl' => 'text/x-perl',
            'sh' => 'text/x-shellscript',
            'bash' => 'text/x-shellscript',
            'zsh' => 'text/x-shellscript',
            'fish' => 'text/x-shellscript',
            'ps1' => 'text/x-powershell',
            'bat' => 'text/x-batch',
            'cmd' => 'text/x-batch',

            // Markup and documentation
            'md' => 'text/markdown',
            'markdown' => 'text/markdown',
            'rst' => 'text/x-rst',
            'tex' => 'text/x-latex',
            'txt' => 'text/plain',
            'log' => 'text/plain',
            'csv' => 'text/csv',
            'tsv' => 'text/tab-separated-values',

            // Server/Game specific
            'properties' => 'text/plain',
            'mcmeta' => 'application/json',
            'lang' => 'text/plain',
            'nbt' => 'application/octet-stream',
            'dat' => 'application/octet-stream',
            'sk' => 'text/plain',

            // Archives
            'zip' => 'application/zip',
            'tar' => 'application/x-tar',
            'gz' => 'application/gzip',
            '7z' => 'application/x-7z-compressed',
            'rar' => 'application/x-rar-compressed',

            // Images
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',

            // Documents
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

            // Audio/Video
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'mp4' => 'video/mp4',
            'avi' => 'video/x-msvideo',
            'mov' => 'video/quicktime',
            'wmv' => 'video/x-ms-wmv',
            'flv' => 'video/x-flv',
            'webm' => 'video/webm',
        ];

        return $mimeTypes[$extension] ?? 'text/plain';
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
     * @return array<string, mixed>
     */
    private function buildTrashDeleteOptions(bool $permanent): array
    {
        if ($permanent || !$this->isFileTrashEnabled()) {
            return ['permanent' => true];
        }

        $limits = $this->getTrashLimits();

        return [
            'use_trash' => true,
            'permanent' => false,
            'trash' => $limits,
        ];
    }
}
