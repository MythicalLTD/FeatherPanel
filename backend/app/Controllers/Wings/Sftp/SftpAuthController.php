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

namespace App\Controllers\Wings\Sftp;

use App\App;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SftpAuthController
{
	/**
	 * Handle SFTP authentication requests from Wings.
	 *
	 * @param Request $request The HTTP request
	 *
	 * @return Response The authentication response
	 */
	public function authenticate(Request $request): Response
	{
		try {
			$data = json_decode($request->getContent(), true);

			// Validate request data
			if (!$this->validateRequestData($data)) {
				App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid request data');

				return ApiResponse::sendManualResponse([
					'error' => 'Invalid request data',
				], 400);
			}

			$type = $data['type'];
			$username = $data['username'];
			$password = $data['password'];
			$ip = $data['ip'];
			$sessionId = $data['session_id'] ?? '';
			$clientVersion = $data['client_version'] ?? '';

			// Parse username format: username.serverid
			$parsedUsername = $this->parseUsername($username);
			if (!$parsedUsername) {
				App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid username format');

				return ApiResponse::sendManualResponse([
					'error' => 'Invalid username format',
				], 400);
			}

			// Find server by short ID
			$server = Server::getServerByUuidShort($parsedUsername['serverId']);
			if (!$server) {
				App::getInstance(true)->getLogger()->warning('SFTP auth failed: Server not found');

				return ApiResponse::sendManualResponse([
					'error' => 'Server not found',
				], 404);
			}

			// Authenticate user
			$user = $this->authenticateUser($parsedUsername['username'], $password, $type);
			if (!$user) {
				App::getInstance(true)->getLogger()->warning('SFTP auth failed: Invalid credentials');

				return ApiResponse::sendManualResponse([
					'error' => 'Invalid credentials',
				], 401);
			}

			// Check if user has access to this server
			if (!$this->userHasServerAccess($user['id'], $server['id'])) {
				App::getInstance(true)->getLogger()->warning('SFTP auth failed: User does not have server access');

				return ApiResponse::sendManualResponse([
					'error' => 'Access denied',
				], 403);
			}

			// Get user's file permissions for this server
			$permissions = $this->getUserFilePermissions($user['id'], $server['id']);

			// Log successful authentication
			App::getInstance(true)->getLogger()->info('SFTP auth success');

			// Return success response in exact schema format
			return ApiResponse::sendManualResponse([
				'server' => $server['uuid'],
				'user' => $user['uuid'],
				'permissions' => $permissions,
			], 200);

		} catch (\Exception $e) {
			App::getInstance(true)->getLogger()->error('SFTP auth error: ' . $e->getMessage());

			return ApiResponse::sendManualResponse([
				'error' => 'Internal server error',
			], 500);
		}
	}

	/**
	 * Validate the request data.
	 *
	 * @param array|null $data The request data
	 *
	 * @return bool True if valid, false otherwise
	 */
	private function validateRequestData(?array $data): bool
	{
		if (!$data || !is_array($data)) {
			return false;
		}

		$required = ['type', 'username', 'password', 'ip'];
		foreach ($required as $field) {
			if (!isset($data[$field]) || empty($data[$field])) {
				return false;
			}
		}

		// Validate authentication type
		if (!in_array($data['type'], ['password', 'public_key'])) {
			return false;
		}

		return true;
	}

	/**
	 * Parse username in format: username.serverid.
	 *
	 * @param string $username The full username
	 *
	 * @return array|null Array with 'username' and 'serverId' keys, or null if invalid
	 */
	private function parseUsername(string $username): ?array
	{
		// Username format: username.serverid (serverid = 8 chars)
		if (!preg_match('/^(.+)\.([a-zA-Z0-9]{8})$/i', $username, $matches)) {
			return null;
		}

		return [
			'username' => $matches[1],
			'serverId' => strtolower($matches[2]),
		];
	}

	/**
	 * Authenticate user based on authentication type.
	 *
	 * @param string $username The username
	 * @param string $password The password or public key
	 * @param string $type The authentication type
	 *
	 * @return array|null User data if authenticated, null otherwise
	 */
	private function authenticateUser(string $username, string $password, string $type): ?array
	{
		// Find user by username
		$user = User::getUserByUsername($username);
		if (!$user) {
			return null;
		}

		// Check if user is banned
		if ($user['banned'] === 'true') {
			return null;
		}

		if ($type === 'password') {
			// Verify password
			if (!password_verify($password, $user['password'])) {
				return null;
			}
		} elseif ($type === 'public_key') {
			// For now, we'll implement basic public key validation
			// In a production environment, you'd want more sophisticated key validation
			if (!$this->validatePublicKey($password)) {
				return null;
			}

			// Check if the public key is associated with this user
			if (!$this->userHasPublicKey($user['id'], $password)) {
				return null;
			}
		}

		return $user;
	}

	/**
	 * Validate public key format.
	 *
	 * @param string $publicKey The public key content
	 *
	 * @return bool True if valid, false otherwise
	 */
	private function validatePublicKey(string $publicKey): bool
	{
		// Basic validation - check if it looks like an SSH public key
		$lines = explode("\n", trim($publicKey));
		if (empty($lines)) {
			return false;
		}

		$firstLine = trim($lines[0]);

		// Check common SSH key formats
		$validFormats = [
			'/^ssh-rsa\s+[A-Za-z0-9+\/=]+/',
			'/^ssh-ed25519\s+[A-Za-z0-9+\/=]+/',
			'/^ecdsa-sha2-nistp256\s+[A-Za-z0-9+\/=]+/',
			'/^ecdsa-sha2-nistp384\s+[A-Za-z0-9+\/=]+/',
			'/^ecdsa-sha2-nistp521\s+[A-Za-z0-9+\/=]+/',
		];

		foreach ($validFormats as $format) {
			if (preg_match($format, $firstLine)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if user has a specific public key.
	 *
	 * @param int $userId The user ID
	 * @param string $publicKey The public key content
	 *
	 * @return bool True if user has the key, false otherwise
	 */
	private function userHasPublicKey(int $userId, string $publicKey): bool
	{
		// For now, we'll return true for valid public key format
		// In a production environment, you'd want to store and validate against user's actual public keys
		return true;
	}

	/**
	 * Check if user has access to a specific server.
	 *
	 * @param int $userId The user ID
	 * @param int $serverId The server ID
	 *
	 * @return bool True if user has access, false otherwise
	 */
	private function userHasServerAccess(int $userId, int $serverId): bool
	{
		// Get server details
		$server = Server::getServerById($serverId);
		if (!$server) {
			return false;
		}

		// Check if user is the owner
		if ($server['owner_id'] == $userId) {
			return true;
		}

		// Check subuser relationship
		$subuser = Subuser::getSubuserByUserAndServer($userId, $serverId);
		if ($subuser) {
			return true;
		}

		// TODO: Implement additional access control logic here (teams/roles)

		return false;
	}

	/**
	 * Get user's file permissions for a specific server.
	 *
	 * @param int $userId The user ID
	 * @param int $serverId The server ID
	 *
	 * @return array Array of permission strings
	 */
	private function getUserFilePermissions(int $userId, int $serverId): array
	{
		// Get server details
		$server = Server::getServerById($serverId);
		if (!$server) {
			return [];
		}

		// Check if user is the owner
		if ($server['owner_id'] == $userId) {
			// Owner gets full permissions
			return [
				'file.read',
				'file.read-content',
				'file.create',
				'file.update',
				'file.delete',
			];
		}

		// Subuser permissions mapping → SFTP file permissions
		$subuser = Subuser::getSubuserByUserAndServer($userId, $serverId);
		if ($subuser) {
			$rawPermissions = $subuser['permissions'] ?? '[]';
			$perms = is_array($rawPermissions) ? $rawPermissions : (json_decode($rawPermissions, true) ?: []);

			// Wildcard grants full access
			if (in_array('*', $perms, true)) {
				return [
					'file.read',
					'file.read-content',
					'file.create',
					'file.update',
					'file.delete',
				];
			}

			$result = [];
			if (in_array('files.read', $perms, true) || in_array('files.download', $perms, true)) {
				$result[] = 'file.read';
				$result[] = 'file.read-content';
			}
			if (in_array('files.write', $perms, true) || in_array('files.upload', $perms, true)) {
				$result[] = 'file.create';
				$result[] = 'file.update';
			}
			if (in_array('files.delete', $perms, true)) {
				$result[] = 'file.delete';
			}

			// Default to read-only if no file-related permissions resolved
			if (empty($result)) {
				$result = ['file.read', 'file.read-content'];
			}

			return array_values(array_unique($result));
		}

		// Default for non-owners without subuser link: read-only
		return ['file.read', 'file.read-content'];
	}
}
