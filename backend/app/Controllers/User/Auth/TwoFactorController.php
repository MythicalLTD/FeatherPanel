<?php

namespace App\Controllers\User\Auth;

use App\CloudFlare\CloudFlareRealIP;
use App\Config\ConfigInterface;
use App\Hooks\MythicalSystems\CloudFlare\CloudFlareTurnstile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;
use App\App;
use App\Chat\User;
use PragmaRX\Google2FA\Google2FA;


class TwoFactorController
{
	/**
	 * Two Factor Authentication
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
		$requiredFields = ['code', 'secret'];
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
		foreach (['code', 'secret'] as $field) {
			if (!is_string($data[$field])) {
				return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', "INVALID_DATA_TYPE");
			}
			$data[$field] = trim($data[$field]);
		}

		// Validate data length
		$lengthRules = [
			'code' => [6, 6],
			'secret' => [16,16],
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

		$userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);

		// Verify code
		$google2fa = new Google2FA();
		if (!$google2fa->verifyKey($data['secret'], $data['code'])) {
			return ApiResponse::error('Invalid code', "INVALID_CODE");
		}

		User::updateUser($userInfo['uuid'], ['last_ip' => CloudFlareRealIP::getRealIP(), '2fa_enabled' => 'true', '2fa_key' => $data['secret']]);
		return ApiResponse::success($userInfo, 'Two factor authentication enabled', 200);
	}
	public function get(Request $request): Response
	{
		$app = App::getInstance(true);
		$config = $app->getConfig();
		$data = json_decode($request->getContent(), true);
		$userInfo = User::getUserByRememberToken($_COOKIE['remember_token']);

		if ($userInfo['2fa_enabled'] == "true") {
			return ApiResponse::error('Two factor authentication is enabled', "TWO_FACTOR_AUTH_ENABLED");
		}

		$google2fa = new Google2FA();
		$secret = $google2fa->generateSecretKey();
		$qrCodeUrl = $google2fa->getQRCodeUrl(
			$config->getSetting(ConfigInterface::APP_NAME, "MythicalPanel"),
			$userInfo['email'],
			$secret
		);

		return ApiResponse::success([
			'qr_code_url' => $qrCodeUrl,
			'secret' => $secret,
		], 'Here is your two factor authentication secret', 200);
	}
}