<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to compress files into an archive.
 */
class CompressFilesTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        // If no identifier provided, try to get server from pageContext
        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

        // Resolve server if identifier provided
        if ($serverIdentifier && !$server) {
            $server = Server::getServerByUuid($serverIdentifier);

            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            if (!$server) {
                $servers = Server::searchServers(
                    page: 1,
                    limit: 10,
                    search: $serverIdentifier,
                    ownerId: $user['id']
                );
                if (!empty($servers)) {
                    $server = $servers[0];
                }
            }
        }

        if (!$server) {
            return [
                'success' => false,
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'action_type' => 'compress_files',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'compress_files',
            ];
        }

        // Get files and root path
        $files = $params['files'] ?? null;
        $root = $params['root'] ?? '/';
        $name = $params['name'] ?? '';
        $extension = $params['extension'] ?? 'tar.gz';

        if (!$files) {
            return [
                'success' => false,
                'error' => 'Files array is required',
                'action_type' => 'compress_files',
            ];
        }

        if (!is_array($files) || empty($files)) {
            return [
                'success' => false,
                'error' => 'Files must be a non-empty array',
                'action_type' => 'compress_files',
            ];
        }

        // Validate extension
        $validExtensions = ['zip', 'tar.gz', 'tgz', 'tar.bz2', 'tbz2', 'tar.xz', 'txz'];
        if (!in_array($extension, $validExtensions, true)) {
            return [
                'success' => false,
                'error' => 'Invalid extension. Valid extensions: ' . implode(', ', $validExtensions),
                'action_type' => 'compress_files',
            ];
        }

        // Get node
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return [
                'success' => false,
                'error' => 'Node not found',
                'action_type' => 'compress_files',
            ];
        }

        // Compress files via Wings
        // ServerService handles the timeout per-request (15 minutes like pelican)
        // Large archives over 4GB can take significant time to compress
        try {
            $wings = new Wings(
                $node['fqdn'],
                $node['daemonListen'],
                $node['scheme'],
                $node['daemon_token']
            );

            $response = $wings->getServer()->compressFiles($server['uuid'], $root, $files, $name, $extension);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $errorMessage = 'Failed to compress files: ' . $error;

                // Provide more helpful error message for timeout/large file issues
                if (strpos(strtolower($error), 'timeout') !== false || strpos(strtolower($error), 'timed out') !== false) {
                    $errorMessage = 'Archive creation timed out. This may occur with very large archives (>4GB). Please try compressing smaller sets of files.';
                }

                return [
                    'success' => false,
                    'error' => $errorMessage,
                    'action_type' => 'compress_files',
                ];
            }

            // Log activity
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'files_compressed',
                'metadata' => json_encode([
                    'root' => $root,
                    'files' => $files,
                    'name' => $name,
                    'extension' => $extension,
                    'file_count' => count($files),
                ]),
            ]);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerFileCompressed(),
                    [
                        'user_uuid' => $user['uuid'],
                        'server_uuid' => $server['uuid'],
                        'file_path' => $root,
                    ]
                );
            }

            return [
                'success' => true,
                'action_type' => 'compress_files',
                'server_name' => $server['name'],
                'root' => $root,
                'files' => $files,
                'name' => $name,
                'extension' => $extension,
                'file_count' => count($files),
                'message' => 'Compressed ' . count($files) . " file(s) into archive on server '{$server['name']}'",
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('CompressFilesTool error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to compress files: ' . $e->getMessage(),
                'action_type' => 'compress_files',
            ];
        }
    }

    public function getDescription(): string
    {
        return 'Compress files or directories into an archive. Supports zip, tar.gz, tar.bz2, tar.xz formats.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'files' => 'Array of file/directory paths to compress (required)',
            'root' => 'Root directory path (optional, default: /)',
            'name' => 'Archive name (optional, auto-generated if not provided)',
            'extension' => 'Archive type: zip, tar.gz, tgz, tar.bz2, tbz2, tar.xz, txz (optional, default: tar.gz)',
        ];
    }
}
