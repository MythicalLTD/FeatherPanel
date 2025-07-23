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

class LoginController
{
	/**
	 * Login a user
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
		$requiredFields = ['email', 'password'];
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
		foreach (['email', 'password'] as $field) {
			if (!is_string($data[$field])) {
				return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', "INVALID_DATA_TYPE");
			}
			$data[$field] = trim($data[$field]);
		}

		// Validate data length
		$lengthRules = [
			'email' => [3, 255],
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

		// Login user
		$userInfo = User::getUserByEmail($data['email']);
		if ($userInfo == null) {
			return ApiResponse::error('Email does not exist', "EMAIL_DOES_NOT_EXIST");
		}
		if (!password_verify($data['password'], $userInfo['password'])) {
			return ApiResponse::error('Invalid password', "INVALID_PASSWORD");
		}
		if (isset($userInfo['remember_token'])) {
			$token = $userInfo['remember_token'];
			setcookie('remember_token', $token, time() + 60 * 60 * 24 * 30, '/');
			return ApiResponse::success($userInfo, 'User logged in successfully', 200);

		} else {
			return ApiResponse::error('Remember token not set', "REMEMBER_TOKEN_NOT_SET");
		}

	}
}