<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\User\Server\Files;

use App\App;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerFilesEvent;

#[OA\Schema(
    schema: 'FileItem',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'File or directory name'),
        new OA\Property(property: 'type', type: 'string', enum: ['file', 'directory'], description: 'Item type'),
        new OA\Property(property: 'size', type: 'integer', nullable: true, description: 'File size in bytes'),
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
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'contents', type: 'array', items: new OA\Items(ref: '#/components/schemas/FileItem')),
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

            $path = $this->getPathFromQuery();

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->listDirectory($server['uuid'], $path);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to fetch files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_listed', [
                'path' => $path,
                'user_id' => $user['id'] ?? null,
            ]);

            return ApiResponse::success(['contents' => $response->getData()], 'Files fetched successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'fetch files');
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

            $path = $this->getPathFromQuery();

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getFileContentsRaw($server['uuid'], $path, false);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to fetch file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Get the raw file content
            $fileContent = $response->getRawBody();

            // Check if file content is empty
            if (empty($fileContent)) {
                if (is_array($response->getData()) && isset($response->getData()['error'])) {
                    return ApiResponse::error('File content error: ' . $response->getData()['error'], 'FILE_CONTENT_ERROR', 500);
                }

                return ApiResponse::error('File content is empty or could not be retrieved', 'EMPTY_FILE_CONTENT', 500);
            }

            // Determine content type based on file extension
            $contentType = $this->getMimeType($path);

            // Log activity
            $this->logActivity($server, $node, 'file_viewed', [
                'path' => $path,
                'user_id' => $user['id'] ?? null,
                'file_size' => strlen($fileContent),
                'content_type' => $contentType,
            ]);

            // Return file content with appropriate content type
            return new Response($fileContent, 200, ['Content-Type' => $contentType]);
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'fetch file');
        }
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/write-file',
        summary: 'Write file content',
        description: 'Write raw content to a file on the server. Content-Type must not be application/json.',
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
            new OA\Response(response: 400, description: 'Bad request - Missing UUID, empty content, or invalid content type'),
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

            $path = $this->getPathFromQuery();

            // Reject JSON bodies – file saves must be raw text/binary
            $contentType = $request->headers->get('Content-Type', '');
            if (stripos($contentType, 'application/json') !== false) {
                return ApiResponse::error('JSON body not allowed for file writes. Send raw text/binary.', 'INVALID_CONTENT_TYPE', 415);
            }

            $content = $request->getContent();
            if (empty($content)) {
                return ApiResponse::error('Request body is empty', 'EMPTY_CONTENT', 400);
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
                'user_id' => $user['id'] ?? null,
                'content_length' => strlen($content),
                'file_exists' => file_exists($path),
            ]);

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
                'user_id' => $user['id'] ?? null,
            ]);

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

            $data = $this->validateJsonBody($request, ['files', 'root']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deleteFiles($server['uuid'], $data['root'], $data['files']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to delete files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_deleted', [
                'root' => $data['root'],
                'files' => $data['files'],
                'user_id' => $user['id'] ?? null,
                'file_count' => count($data['files']),
            ]);

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

            return ApiResponse::success($response->getData(), 'Files deleted successfully');
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'delete files');
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

            $data = $this->validateJsonBody($request, ['files', 'location']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->copyFiles($server['uuid'], $data['location'], $data['files']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to copy files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_copied', [
                'location' => $data['location'],
                'files' => $data['files'],
                'user_id' => $user['id'] ?? null,
                'file_count' => count($data['files']),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFilesCopied(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_paths' => $data['files'],
                    ]
                );
            }

            return ApiResponse::success($response->getData(), 'Files copied successfully');
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
                'user_id' => $user['id'] ?? null,
                'full_path' => rtrim($data['path'], '/') . '/' . $data['name'],
            ]);

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
            content: new OA\JsonContent(ref: '#/components/schemas/FileOperationRequest')
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

            $data = $this->validateJsonBody($request, ['files', 'root']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->compressFiles($server['uuid'], $data['root'], $data['files']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to compress files: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'files_compressed', [
                'root' => $data['root'],
                'files' => $data['files'],
                'user_id' => $user['id'] ?? null,
                'file_count' => count($data['files']),
            ]);

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

            return ApiResponse::success($response->getData(), 'Files compressed successfully');
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

            $data = $this->validateJsonBody($request, ['file', 'root']);

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->decompressArchive($server['uuid'], $data['file'], $data['root']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to decompress archive: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'archive_decompressed', [
                'file' => $data['file'],
                'root' => $data['root'],
                'user_id' => $user['id'] ?? null,
            ]);

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
        } catch (\Exception $e) {
            return $this->handleWingsError($e, 'decompress archive');
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
                'user_id' => $user['id'] ?? null,
                'file_count' => count($data['files']),
            ]);

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
                'user_id' => $user['id'] ?? null,
            ]);

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

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->getDownloadsList($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to get downloads list: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'downloads_list_viewed', [
                'user_id' => $user['id'] ?? null,
            ]);

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

            $wings = $this->createWingsConnection($node);
            $response = $wings->getServer()->deletePullProcess($server['uuid'], $pullId);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to delete pull process: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Log activity
            $this->logActivity($server, $node, 'pull_process_deleted', [
                'pull_id' => $pullId,
                'user_id' => $user['id'] ?? null,
            ]);

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
                'user_id' => $user['id'] ?? null,
                'file_size' => strlen($fileContent),
            ]);

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
        summary: 'Download file',
        description: 'Download a file from the server with appropriate headers for file download.',
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
                description: 'File downloaded successfully',
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
                    new OA\Header(
                        header: 'Content-Disposition',
                        description: 'Download attachment header',
                        schema: new OA\Schema(type: 'string', example: 'attachment; filename="file.txt"')
                    ),
                    new OA\Header(
                        header: 'Content-Length',
                        description: 'File size in bytes',
                        schema: new OA\Schema(type: 'string', example: '1024')
                    ),
                    new OA\Header(
                        header: 'Cache-Control',
                        description: 'Cache control header',
                        schema: new OA\Schema(type: 'string', example: 'no-cache, no-store, must-revalidate')
                    ),
                ]
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing UUID or file path'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, node, or file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to download file'),
        ]
    )]
    public function downloadFile(Request $request, string $serverUuid): Response
    {
        try {
            $user = $this->validateUser($request);
            $server = $this->validateServer($serverUuid);

            // Get the file path from query parameters
            $path = $this->getPathFromQuery();
            if (empty($path)) {
                return ApiResponse::error('File path is required', 'MISSING_PATH', 400);
            }

            $node = $this->validateNode($server['node_id']);

            $wings = $this->createWingsConnection($node);

            // Use the download method to get raw file content
            $response = $wings->getServer()->downloadFile($server['uuid'], $path);

            if (!$response->isSuccessful()) {
                $error = $response->getError();

                return ApiResponse::error('Failed to download file: ' . $error, 'WINGS_ERROR', $response->getStatusCode());
            }

            // Get the raw file content
            $fileContent = $response->getRawBody();

            // Check if file content is empty
            if (empty($fileContent)) {
                return ApiResponse::error('File content is empty or could not be retrieved', 'EMPTY_FILE_CONTENT', 500);
            }

            // Get filename from path
            $filename = basename($path);

            // Determine content type based on file extension
            $contentType = $this->getMimeType($path);

            // Log activity
            $this->logActivity($server, $node, 'file_downloaded', [
                'path' => $path,
                'filename' => $filename,
                'user_id' => $user['id'] ?? null,
                'file_size' => strlen($fileContent),
                'content_type' => $contentType,
            ]);

            // Return file content with download headers
            return new Response($fileContent, 200, [
                'Content-Type' => $contentType,
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Content-Length' => strlen($fileContent),
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
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
        $user = $request->get('user');
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
    private function createWingsConnection(array $node): Wings
    {
        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];
        $timeout = 30;

        return new Wings($host, $port, $scheme, $token, $timeout);
    }

    /**
     * Helper method to handle Wings API errors.
     */
    private function handleWingsError(\Exception $e, string $operation): Response
    {
        $error = $e->getMessage();
        $statusCode = $e->getCode() ?: 500;

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
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
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
}
