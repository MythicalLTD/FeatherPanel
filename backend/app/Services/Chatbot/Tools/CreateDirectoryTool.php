<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerFilesEvent;
use App\Services\Wings\Wings;

/**
 * Tool to create a directory on the server.
 */
class CreateDirectoryTool implements ToolInterface
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
				'action_type' => 'create_directory',
			];
		}

		// Verify user has access
		if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
			return [
				'success' => false,
				'error' => 'Access denied to server',
				'action_type' => 'create_directory',
			];
		}

		// Get directory name and path
		$name = $params['name'] ?? null;
		$path = $params['path'] ?? '/';

		if (!$name || trim($name) === '') {
			return [
				'success' => false,
				'error' => 'Directory name is required',
				'action_type' => 'create_directory',
			];
		}

		// Get node
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			return [
				'success' => false,
				'error' => 'Node not found',
				'action_type' => 'create_directory',
			];
		}

		// Create directory via Wings
		try {
			$wings = new Wings(
				$node['fqdn'],
				$node['daemonListen'],
				$node['scheme'],
				$node['daemon_token'],
				30
			);

			$response = $wings->getServer()->createDirectory($server['uuid'], trim($name), $path);

			if (!$response->isSuccessful()) {
				return [
					'success' => false,
					'error' => 'Failed to create directory: ' . $response->getError(),
					'action_type' => 'create_directory',
				];
			}

			$fullPath = rtrim($path, '/') . '/' . trim($name);

			// Log activity
			ServerActivity::createActivity([
				'server_id' => $server['id'],
				'node_id' => $server['node_id'],
				'user_id' => $user['id'],
				'event' => 'directory_created',
				'metadata' => json_encode([
					'name' => $name,
					'path' => $path,
					'full_path' => $fullPath,
				]),
			]);

			// Emit event
			global $eventManager;
			if (isset($eventManager) && $eventManager !== null) {
				$eventManager->emit(
					ServerFilesEvent::onServerDirectoryCreated(),
					[
						'user_uuid' => $user['uuid'],
						'server_uuid' => $server['uuid'],
						'directory_path' => $fullPath,
					]
				);
			}

			return [
				'success' => true,
				'action_type' => 'create_directory',
				'server_name' => $server['name'],
				'directory_name' => $name,
				'path' => $path,
				'full_path' => $fullPath,
				'message' => "Directory '{$name}' created successfully at '{$path}' on server '{$server['name']}'",
			];
		} catch (\Exception $e) {
			$this->app->getLogger()->error("CreateDirectoryTool error: " . $e->getMessage());
			return [
				'success' => false,
				'error' => 'Failed to create directory: ' . $e->getMessage(),
				'action_type' => 'create_directory',
			];
		}
	}

	public function getDescription(): string
	{
		return 'Create a new directory on the server. Requires directory name and parent path.';
	}

	public function getParameters(): array
	{
		return [
			'server_uuid' => 'Server UUID (optional, can use server_name instead)',
			'server_name' => 'Server name (optional, can use server_uuid instead)',
			'name' => 'Directory name (required)',
			'path' => 'Parent directory path (optional, default: /)',
		];
	}
}

