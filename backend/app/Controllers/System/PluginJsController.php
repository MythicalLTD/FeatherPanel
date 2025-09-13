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

class PluginJsController
{
	public function index(Request $request): Response
	{
		$jsContent = "// Plugin JavaScript\n";

		// Append plugin JS
		$pluginDir = __DIR__ . '/../../../storage/addons';
		if (is_dir($pluginDir)) {
			$plugins = array_diff(scandir($pluginDir), ['.', '..']);
			foreach ($plugins as $plugin) {
				$jsPath = $pluginDir . "/$plugin/Frontend/index.js";
				if (file_exists($jsPath)) {
					$jsContent .= "\n// Plugin: $plugin\n";
					$jsContent .= "(function() {\n";
					$jsContent .= "  // Plugin scope: $plugin\n";
					$jsContent .= file_get_contents($jsPath) . "\n";
					$jsContent .= "})();\n";
				}
			}
		}

		return new Response($jsContent, 200, [
			'Content-Type' => 'application/javascript',
			'Cache-Control' => 'public, max-age=3600' // Cache for 1 hour
		]);
	}
}
