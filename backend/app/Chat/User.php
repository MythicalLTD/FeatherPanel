<?php

namespace App\Chat;

use PDO;

/**
 * User service/model for CRUD operations on the mythicalpanel_users table.
 */
class User
{
	/**
	 * @var string The users table name
	 */
	private static string $table = 'mythicalpanel_users';

	/**
	 * Create a new user.
	 *
	 * @param array $data Associative array of user fields (must include required fields)
	 * @return int|false The new user's ID or false on failure
	 */
	public static function createUser(array $data): int|false
	{
		// Required fields for user creation
		$required = [
			'username',
			'first_name',
			'last_name',
			'email',
			'password',
			'uuid',
		];
		foreach ($required as $field) {
			if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
				return false;
			}
		}
		// Email validation
		if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
			return false;
		}
		// UUID validation (basic)
		if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
			return false;
		}

		$pdo = Database::getPdoConnection();
		$fields = array_keys($data);
		$placeholders = array_map(fn($f) => ':' . $f, $fields);
		$sql = 'INSERT INTO ' . self::$table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')';
		$stmt = $pdo->prepare($sql);
		if ($stmt->execute($data)) {
			return (int) $pdo->lastInsertId();
		}
		return false;
	}

	/**
	 * Fetch a user by ID.
	 *
	 * @param int $id
	 * @return array|null
	 */
	public static function getUserById(int $id): ?array
	{
		if ($id <= 0)
			return null;
		$pdo = Database::getPdoConnection();
		$stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
		$stmt->execute(['id' => $id]);
		return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
	}

	/**
	 * Fetch a user by email.
	 *
	 * @param string $email
	 * @return array|null
	 */
	public static function getUserByEmail(string $email): ?array
	{
		if (!filter_var($email, FILTER_VALIDATE_EMAIL))
			return null;
		$pdo = Database::getPdoConnection();
		$stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE email = :email LIMIT 1');
		$stmt->execute(['email' => $email]);
		return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
	}

	/**
	 * Get all users (optionally including deleted).
	 *
	 * @param bool $includeDeleted
	 * @return array
	 */
	public static function getAllUsers(bool $includeDeleted = false): array
	{
		$pdo = Database::getPdoConnection();
		$sql = 'SELECT * FROM ' . self::$table;
		if (!$includeDeleted) {
			$sql .= " WHERE deleted = 'false'";
		}
		$stmt = $pdo->query($sql);
		return $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

	/**
	 * Update a user by ID.
	 *
	 * @param string $uuid
	 * @param array $data
	 * @return bool
	 */
	public static function updateUser(string $uuid, array $data): bool
	{
		if (empty($data))
			return false;
		// Prevent updating primary key/id
		if (isset($data['uuid']))
			unset($data['uuid']);
		if (isset($data['id']))
			unset($data['id']);
		// Validate email if present
		if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
			return false;
		}
		$pdo = Database::getPdoConnection();
		$fields = array_keys($data);
		if (empty($fields))
			return false;
		$set = implode(', ', array_map(fn($f) => "$f = :$f", $fields));
		$sql = 'UPDATE ' . self::$table . ' SET ' . $set . ' WHERE uuid = :uuid';
		$stmt = $pdo->prepare($sql);
		$data['uuid'] = $uuid;
		return $stmt->execute($data);
	}

	/**
	 * Soft-delete a user (mark as deleted).
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function softDeleteUser(int $id): bool
	{
		if ($id <= 0)
			return false;
		$pdo = Database::getPdoConnection();
		$sql = "UPDATE " . self::$table . " SET deleted = 'true' WHERE id = :id";
		$stmt = $pdo->prepare($sql);
		return $stmt->execute(['id' => $id]);
	}

	/**
	 * Hard-delete a user (permanently remove).
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function hardDeleteUser(int $id): bool
	{
		if ($id <= 0)
			return false;
		$pdo = Database::getPdoConnection();
		$sql = 'DELETE FROM ' . self::$table . ' WHERE id = :id';
		$stmt = $pdo->prepare($sql);
		return $stmt->execute(['id' => $id]);
	}

	/**
	 * Restore a soft-deleted user.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function restoreUser(int $id): bool
	{
		if ($id <= 0)
			return false;
		$pdo = Database::getPdoConnection();
		$sql = "UPDATE " . self::$table . " SET deleted = 'false' WHERE id = :id";
		$stmt = $pdo->prepare($sql);
		return $stmt->execute(['id' => $id]);
	}
	/**
	 * Get a user by its username
	 * 
	 * @param string $username
	 * 
	 * @return array|null
	 */
	public static function getUserByUsername(string $username): ?array
	{
		$pdo = Database::getPdoConnection();
		$stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE username = :username LIMIT 1');
		$stmt->execute(['username' => $username]);
		return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
	}

	/**
	 * Get a user by its uuid
	 * 
	 * @param string $uuid
	 * 
	 * @return array|null
	 */
	public static function getUserByUuid(string $uuid): ?array
	{
		$pdo = Database::getPdoConnection();
		$stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
		$stmt->execute(['uuid' => $uuid]);
		return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
	}

	/**
	 * Get a user by its mail verify
	 * 
	 * @param string $mailVerify
	 * 
	 * @return array|null
	 */
	public static function getUserByMailVerify(string $mailVerify): ?array
	{
		$pdo = Database::getPdoConnection();
		$stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE mail_verify = :mail_verify LIMIT 1');
		$stmt->execute(['mail_verify' => $mailVerify]);
		return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
	}
}