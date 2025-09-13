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

namespace App\Controllers\System;

use App\App;
use App\Config\PublicConfig;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginCssController
{
	public function index(Request $request): Response
	{
		$cssContent = "/* Plugin CSS */\n";

		// Append plugin CSS
		$pluginDir = __DIR__ . '/../../../storage/addons';
		if (is_dir($pluginDir)) {
			$plugins = array_diff(scandir($pluginDir), ['.', '..']);
			foreach ($plugins as $plugin) {
				$cssPath = $pluginDir . "/$plugin/Frontend/index.css";
				if (file_exists($cssPath)) {
					$cssContent .= "\n/* Plugin: $plugin */\n";
					$cssContent .= file_get_contents($cssPath) . "\n";
				}
			}
		}

		return new Response($cssContent, 200, [
			'Content-Type' => 'text/css',
			'Cache-Control' => 'public, max-age=3600' // Cache for 1 hour
		]);
	}
}
