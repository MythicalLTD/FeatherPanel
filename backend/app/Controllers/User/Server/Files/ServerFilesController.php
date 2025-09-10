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
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerFilesController
{
	public function getFiles(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}
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

	public function getFile(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

	public function writeFile(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}
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
			$eventManager->emit(
				ServerEvent::onServerFileWritten(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_path' => $path]
			);

			return ApiResponse::success($response->getData(), 'File written successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'write file');
		}
	}

	public function renameFileOrFolder(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
				'user_id' => $user['id'] ?? null,
			]);

			// Emit event
			global $eventManager;
			$eventManager->emit(
				ServerEvent::onServerFileRenamed(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'old_path' => $data['path'], 'new_path' => $data['new_name']]
			);

			return ApiResponse::success($response->getData(), 'File renamed successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'rename files');
		}
	}

	public function deleteFiles(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}

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
			$eventManager->emit(
				ServerEvent::onServerFilesDeleted(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid']]
			);

			return ApiResponse::success($response->getData(), 'Files deleted successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'delete files');
		}
	}

	public function copyFiles(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}

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
			$eventManager->emit(
				ServerEvent::onServerFilesCopied(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_paths' => $data['files']]
			);

			return ApiResponse::success($response->getData(), 'Files copied successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'copy files');
		}
	}

	public function createDirectory(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
				'user_id' => $user['id'] ?? null,
				'full_path' => rtrim($data['path'], '/') . '/' . $data['name'],
			]);

			// Emit event
			global $eventManager;
			$eventManager->emit(
				ServerEvent::onServerDirectoryCreated(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'directory_path' => rtrim($data['path'], '/') . '/' . $data['name']]
			);

			return ApiResponse::success($response->getData(), 'Directory created successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'create directory');
		}
	}

	public function compressFiles(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}

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
			$eventManager->emit(
				ServerEvent::onServerFileCompressed(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_path' => $data['root']]
			);

			return ApiResponse::success($response->getData(), 'Files compressed successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'compress files');
		}
	}

	public function decompressArchive(Request $request, string $serverUuid): Response
	{
		try {
			$user = $this->validateUser($request);
			$server = $this->validateServer($serverUuid);
			$node = $this->validateNode($server['node_id']);
			if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
				return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
			}

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
			$eventManager->emit(
				ServerEvent::onServerFileDecompressed(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_path' => $data['root']]
			);

			return ApiResponse::success($response->getData(), 'Archive decompressed successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'decompress archive');
		}
	}

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
			$eventManager->emit(
				ServerEvent::onServerFilePermissionsChanged(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_path' => $data['root'], 'permissions' => ['*']]
			);

			return ApiResponse::success($response->getData(), 'File permissions changed successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'change file permissions');
		}
	}

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
			$eventManager->emit(
				ServerEvent::onServerPullProcessDeleted(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'pull_id' => $pullId]
			);

			return ApiResponse::success($response->getData(), 'Pull process deleted successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'delete pull process');
		}
	}

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
			$eventManager->emit(
				ServerEvent::onServerFileUploaded(),
				['user_uuid' => $user['uuid'], 'server_uuid' => $server['uuid'], 'file_path' => $path]
			);

			return ApiResponse::success($response->getData(), 'File uploaded successfully');
		} catch (\Exception $e) {
			return $this->handleWingsError($e, 'upload file');
		}
	}

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
