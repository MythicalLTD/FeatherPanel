<?php

namespace App\Controllers\User\Auth;

use App\CloudFlare\CloudFlareRealIP;
use App\Config\ConfigInterface;
use App\Hooks\MythicalSystems\CloudFlare\CloudFlareTurnstile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;
use App\App;
use App\Config\PublicConfig;
use App\Chat\User;
use App\Helpers\UUIDUtils;

class RegisterController
{
	/**
	 * Register a new user
	 * 
	 * @param Request $request
	 * 
	 * @return Response
	 */
	public function put(Request $request): Response
	{
		$app = App::getInstance(true);
		$config = $app->getConfig();
		$data = json_decode($request->getContent(), true);

		if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, "false") == "true") {
			$turnstileKeyPublic = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PUB, "NULL");
			$turnstileKeySecret = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PRIV, "NULL");
			if ($turnstileKeyPublic == "NULL" || $turnstileKeySecret == "NULL") {
				return ApiResponse::error('Turnstile keys are not set', "TURNSTILE_KEYS_NOT_SET");
			}
			if (!isset($data['turnstile_token']) || trim($data['turnstile_token']) === '') {
				return ApiResponse::error('Turnstile token is required', "TURNSTILE_TOKEN_REQUIRED");
			}
			if (!CloudFlareTurnstile::validate($data['turnstile_token'], CloudFlareRealIP::getRealIP(), $turnstileKeySecret)) {
				return ApiResponse::error('Turnstile validation failed', "TURNSTILE_VALIDATION_FAILED");
			}
		}

		// Validate required fields
		$requiredFields = ['username', 'email', 'password', 'first_name', 'last_name'];
		$missingFields = [];
		foreach ($requiredFields as $field) {
			if (!isset($data[$field]) || trim($data[$field]) === '') {
				$missingFields[] = $field;
			}
		}
		if (!empty($missingFields)) {
			return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), "MISSING_REQUIRED_FIELDS");
		}

		// Validate data types and format
		foreach (['username', 'email', 'first_name', 'last_name', 'password'] as $field) {
			if (!is_string($data[$field])) {
				return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', "INVALID_DATA_TYPE");
			}
			$data[$field] = trim($data[$field]);
		}

		// Validate data length
		$lengthRules = [
			'username' => [3, 64],
			'email' => [3, 255],
			'first_name' => [3, 64],
			'last_name' => [3, 64],
			'password' => [8, 255],
		];
		foreach ($lengthRules as $field => [$min, $max]) {
			$len = strlen($data[$field]);
			if ($len < $min) {
				return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", "INVALID_DATA_LENGTH");
			}
			if ($len > $max) {
				return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", "INVALID_DATA_LENGTH");
			}
		}

		// Validate email format
		if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
			return ApiResponse::error('Invalid email address', "INVALID_EMAIL_ADDRESS");
		}

		// Validate username format (optional: only allow alphanumeric and underscores)
		if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['username'])) {
			return ApiResponse::error('Username can only contain letters, numbers, and underscores', "INVALID_USERNAME_FORMAT");
		}

		// Validate uniqueness
		if (User::getUserByUsername($data['username']) !== null) {
			return ApiResponse::error('Username already exists', "USERNAME_ALREADY_EXISTS");
		}
		if (User::getUserByEmail($data['email']) !== null) {
			return ApiResponse::error('Email already exists', "EMAIL_ALREADY_EXISTS");
		}

		// Create user
		$userInfo = [
			'username' => $data['username'],
			'email' => $data['email'],
			'password' => password_hash($data['password'], PASSWORD_BCRYPT),
			'first_name' => $data['first_name'],
			'last_name' => $data['last_name'],
			'uuid' => UUIDUtils::generateV4(),
			'remember_token' => bin2hex(random_bytes(16)),
			'first_ip' => CloudFlareRealIP::getRealIP(),
			'last_ip' => CloudFlareRealIP::getRealIP(),
		];
		$user = User::createUser($userInfo);
		// If user creation fails, return an error
		if ($user == false) {
			return ApiResponse::error('Failed to create user', "FAILED_TO_CREATE_USER");
		}
		// If user creation succeeds, return the user info
		return ApiResponse::success($userInfo, 'User registered successfully', 200);
	}
}