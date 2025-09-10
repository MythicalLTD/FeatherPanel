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

namespace App\Controllers\Admin;

use App\Chat\Node;
use App\Chat\User;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\TimedTask;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Plugins\PluginConfig;
use App\Plugins\PluginSettings;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginsController
{
	public function index(Request $request): Response
	{
		try {
			global $pluginManager;
			$plugins = $pluginManager->getLoadedMemoryPlugins();
			$pluginsList = [];
			foreach ($plugins as $plugin) {
				$info = PluginConfig::getConfig($plugin);
				$pluginsList[$plugin] = $info;
			}
			return ApiResponse::success(['plugins' => $pluginsList], 'Successfully fetched plugins statistics', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to fetch plugins statistics: ' . $e->getMessage(), 500);
		}
	}

	public function getConfig(Request $request, string $identifier): Response
	{
		try {
			global $pluginManager;
			$plugins = $pluginManager->getLoadedMemoryPlugins();

			if (!in_array($identifier, $plugins)) {
				return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404, [
					'identifier' => $identifier,
					'plugins' => $plugins
				]);
			}

			$info = PluginConfig::getConfig($identifier);
			$settings = PluginSettings::getSettings($identifier);
			$settingsList = [];
			foreach ($settings as $setting) {
				$settingsList[$setting['key']] = $setting['value'];
			}

			return ApiResponse::success([
				'config' => $info,
				'plugin' => $info,
				'settings' => $settingsList
			], 'Plugin config fetched successfully', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to fetch plugin config: ' . $e->getMessage(), 500);
		}
	}

	public function setSettings(Request $request, string $identifier): Response
	{
		try {
			global $pluginManager;
			$plugins = $pluginManager->getLoadedMemoryPlugins();

			if (!in_array($identifier, $plugins)) {
				return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404);
			}

			$data = json_decode($request->getContent(), true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
			}

			if (!isset($data['key']) || empty($data['key'])) {
				return ApiResponse::error('Missing key parameter', 'MISSING_KEY', 400);
			}

			if (!isset($data['value']) || empty($data['value'])) {
				return ApiResponse::error('Missing value parameter', 'MISSING_VALUE', 400);
			}

			$key = $data['key'];
			$value = $data['value'];

			PluginSettings::setSettings($identifier, $key, ['value' => $value]);

			// Log activity
			$admin = $request->get('user');
			Activity::createActivity([
				'user_uuid' => $admin['uuid'] ?? null,
				'name' => 'plugin_setting_update',
				'context' => "Updated setting $key for plugin $identifier",
				'ip_address' => CloudFlareRealIP::getRealIP(),
			]);

			// Emit event if event manager is available
			if (isset($GLOBALS['eventManager'])) {
				$GLOBALS['eventManager']->emit('PluginsSettingsEvent::onPluginSettingUpdate', [
					'identifier' => $identifier,
					'key' => $key,
					'value' => $value,
				]);
			}

			return ApiResponse::success([
				'identifier' => $identifier,
				'key' => $key,
				'value' => $value,
			], 'Setting updated successfully', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to update setting: ' . $e->getMessage(), 'SETTING_UPDATE_FAILED', 500);
		}
	}

	public function removeSettings(Request $request, string $identifier): Response
	{
		try {
			global $pluginManager;
			$plugins = $pluginManager->getLoadedMemoryPlugins();

			if (!in_array($identifier, $plugins)) {
				return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404);
			}

			$data = json_decode($request->getContent(), true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
			}

			if (!isset($data['key']) || empty($data['key'])) {
				return ApiResponse::error('Missing key parameter', 'MISSING_KEY', 400);
			}

			$key = $data['key'];

			// Log activity
			$admin = $request->get('user');
			Activity::createActivity([
				'user_uuid' => $admin['uuid'] ?? null,
				'name' => 'plugin_setting_delete',
				'context' => "Removed setting $key from plugin $identifier",
				'ip_address' => CloudFlareRealIP::getRealIP(),
			]);

			// Emit event if event manager is available
			if (isset($GLOBALS['eventManager'])) {
				$GLOBALS['eventManager']->emit('PluginsSettingsEvent::onPluginSettingDelete', [
					'identifier' => $identifier,
					'key' => $key,
				]);
			}

			PluginSettings::deleteSettings($identifier, $key);

			return ApiResponse::success([
				'identifier' => $identifier,
				'key' => $key,
			], 'Setting removed successfully', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to remove setting: ' . $e->getMessage(), 'SETTING_REMOVE_FAILED', 500);
		}
	}
}
