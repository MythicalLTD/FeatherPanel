<?php

namespace App\Controllers\System;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\ApiResponse;
use App\App;
use App\Config\PublicConfig;

class SettingsController
{
	public function index(Request $request): Response
	{
		$appInstance = App::getInstance(true);
		$settingsPublic = PublicConfig::getPublicSettingsWithDefaults();
		$settings = $appInstance->getConfig()->getSettings(array_keys($settingsPublic));
		// Fill in any missing settings with defaults
		foreach ($settingsPublic as $key => $defaultValue) {
			if (!isset($settings[$key])) {
				$settings[$key] = $defaultValue;
			}
		}
		return ApiResponse::success(['settings' => $settings], 'Providing settings', 200);
	}

}