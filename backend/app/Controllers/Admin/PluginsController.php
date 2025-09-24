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

use App\Chat\Activity;
use App\Chat\Database;
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
                    'plugins' => $plugins,
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
                'settings' => $settingsList,
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

    public function onlineList(Request $request): Response
    {
        try {
            // New official packages API
            $base = 'https://api.featherpanel.com/packages';
            $q = trim((string) ($request->query->get('q') ?? ''));
            $page = (int) ($request->query->get('page') ?? 1);
            $perPage = (int) ($request->query->get('per_page') ?? 20);
            $query = [];
            if ($q !== '') {
                $query['search'] = $q;
            }
            if ($page > 0) {
                $query['page'] = (string) $page;
            }
            if ($perPage > 0) {
                $query['per_page'] = (string) $perPage;
            }
            $url = $base . (!empty($query) ? ('?' . http_build_query($query)) : '');
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch online addon list', 'ONLINE_LIST_FETCH_FAILED', 502);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['packages']) || !is_array($data['data']['packages'])) {
                return ApiResponse::error('Invalid response from online addon list', 'ONLINE_LIST_INVALID', 502);
            }

            $packages = $data['data']['packages'];
            $addons = array_map(static function (array $pkg): array {
                $latest = $pkg['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;

                $iconUrl = $pkg['icon_url'];
                // If iconUrl is set and not empty, ensure it is https
                if (!empty($iconUrl) && is_string($iconUrl)) {
                    if (strpos($iconUrl, 'http://') === 0) {
                        $iconUrl = 'https://' . substr($iconUrl, 7);
                    }
                }

                return [
                    // Basic identity
                    'id' => $pkg['id'] ?? null,
                    'identifier' => $pkg['name'] ?? '',
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $pkg['website'] ?? null,
                    // Authors/maintainers
                    'author' => $pkg['author'] ?? null,
                    'author_email' => $pkg['author_email'] ?? null,
                    'maintainers' => $pkg['maintainers'] ?? [],
                    // Meta
                    'tags' => $pkg['tags'] ?? [],
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'downloads' => $pkg['downloads'] ?? 0,
                    'created_at' => $pkg['created_at'] ?? null,
                    'updated_at' => $pkg['updated_at'] ?? null,
                    // Latest version
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $packages);

            $pagination = $data['data']['pagination'] ?? null;

            return ApiResponse::success([
                'addons' => $addons,
                'pagination' => $pagination,
            ], 'Online addons fetched', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch online addons: ' . $e->getMessage(), 500);
        }
    }

    public function onlineInstall(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $identifier = $body['identifier'] ?? null;
            if (!$identifier || !preg_match('/^[a-zA-Z0-9_\-]+$/', (string) $identifier)) {
                return ApiResponse::error('Invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }

            // Ensure addons dir exists
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Fetch package metadata to get download URL from the new API
            $metaUrl = 'https://api.featherpanel.com/packages';
            $context = stream_context_create([
                'http' => [
                    'timeout' => 15,
                    'ignore_errors' => true,
                ],
            ]);
            $metaResp = @file_get_contents($metaUrl, false, $context);
            if ($metaResp === false) {
                return ApiResponse::error('Failed to query packages API', 'PACKAGES_API_FAILED', 502);
            }
            $meta = json_decode($metaResp, true);
            $packages = is_array($meta) && isset($meta['data']['packages']) && is_array($meta['data']['packages']) ? $meta['data']['packages'] : [];
            $match = null;
            foreach ($packages as $pkg) {
                if (($pkg['name'] ?? '') === $identifier) {
                    $match = $pkg;
                    break;
                }
            }
            if (!$match || !isset($match['latest_version']['download_url'])) {
                return ApiResponse::error('Package not found in registry', 'PACKAGE_NOT_FOUND', 404);
            }
            $downloadUrl = 'https://api.featherpanel.com' . $match['latest_version']['download_url'];
            $fileContent = @file_get_contents($downloadUrl, false, $context);
            if ($fileContent === false) {
                return ApiResponse::error('Failed to download addon package', 'ADDON_DOWNLOAD_FAILED', 502);
            }

            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            // Extract
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = 'featherpanel_development_kit_2025_addon_password';
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, $identifier);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install addon: ' . $e->getMessage(), 500);
        }
    }

    public function uninstall(Request $request, string $identifier): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (!file_exists($pluginDir)) {
                return ApiResponse::error('Addon not found', 'ADDON_NOT_FOUND', 404);
            }

            $phpFiles = glob($pluginDir . '/*.php') ?: [];
            if (!empty($phpFiles)) {
                require_once $phpFiles[0];
                $className = basename($phpFiles[0], '.php');
                $namespace = 'App\\Addons\\' . $identifier;
                $full = $namespace . '\\' . $className;
                if (class_exists($full) && method_exists($full, 'pluginUninstall')) {
                    $full::pluginUninstall();
                }
            }

            @exec('rm -rf ' . escapeshellarg($pluginDir));

            // Remove exposed public assets link/dir at public/addons/{identifier}
            $publicAddonsBase = dirname(__DIR__, 3) . '/public/addons';
            $linkPath = $publicAddonsBase . '/' . $identifier;
            @exec('rm -rf ' . escapeshellarg($linkPath));

            return ApiResponse::success([], 'Addon uninstalled successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to uninstall addon: ' . $e->getMessage(), 500);
        }
    }

    public function export(Request $request, string $identifier): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (!file_exists($pluginDir)) {
                return ApiResponse::error('Addon not found', 'ADDON_NOT_FOUND', 404);
            }

            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $exportFile = $tempDir . '/' . $identifier . '.fpa';
            $pwd = 'featherpanel_development_kit_2025_addon_password';
            $zipCmd = sprintf(
                'cd %s && zip -r -P %s %s *',
                escapeshellarg($pluginDir),
                escapeshellarg($pwd),
                escapeshellarg($exportFile)
            );
            exec($zipCmd, $out, $code);
            if ($code !== 0 || !file_exists($exportFile)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to create export file', 'ADDON_EXPORT_FAILED', 500);
            }

            $content = file_get_contents($exportFile);
            @exec('rm -rf ' . escapeshellarg($tempDir));
            if ($content === false) {
                return ApiResponse::error('Failed to read export file', 'ADDON_EXPORT_READ_FAILED', 500);
            }

            return new Response(
                $content,
                200,
                [
                    'Content-Type' => 'application/zip',
                    'Content-Disposition' => 'attachment; filename="' . $identifier . '.fpa"',
                ]
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to export addon: ' . $e->getMessage(), 500);
        }
    }

    public function uploadInstall(Request $request): Response
    {
        try {
            $files = $request->files->all();
            if (empty($files) || !isset($files['file'])) {
                return ApiResponse::error('No file uploaded', 'NO_FILE_UPLOADED', 400);
            }

            $file = $files['file'];
            if ($file->getError() !== UPLOAD_ERR_OK) {
                return ApiResponse::error('File upload error', 'FILE_UPLOAD_ERROR', 400);
            }

            $originalName = (string) $file->getClientOriginalName();
            if (!preg_match('/\.fpa$/i', $originalName)) {
                return ApiResponse::error('Invalid file type, expected .fpa', 'INVALID_FILE_TYPE', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Move to a temp file
            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            $file->move(dirname($tempFile), basename($tempFile));

            // Extract
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = 'featherpanel_development_kit_2025_addon_password';
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, null);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to upload install addon: ' . $e->getMessage(), 500);
        }
    }

    public function uploadInstallFromUrl(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $url = $body['url'] ?? null;
            if (!$url || !is_string($url) || !preg_match('/^https?:\/\//i', $url)) {
                return ApiResponse::error('Invalid URL', 'INVALID_URL', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            $context = stream_context_create([
                'http' => [
                    'timeout' => 30,
                    'ignore_errors' => true,
                ],
            ]);
            $fileContent = @file_get_contents($url, false, $context);
            if ($fileContent === false) {
                return ApiResponse::error('Failed to download file from URL', 'DOWNLOAD_FAILED', 502);
            }
            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = 'featherpanel_development_kit_2025_addon_password';
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, null);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install from URL: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Execute addon-provided SQL migrations from the addon's Migrations directory.
     * Each script will be recorded in featherpanel_migrations with a unique key
     * in the form addon:{identifier}:{filename} to avoid collisions.
     *
     * @return array{executed:int,skipped:int,failed:int,lines:string[]}
     */
    private function runAddonMigrations(string $identifier, string $pluginDir): array
    {
        $lines = [];
        $executed = 0;
        $skipped = 0;
        $failed = 0;

        try {
            $dir = rtrim($pluginDir, '/') . '/Migrations';
            if (!is_dir($dir)) {
                $lines[] = 'No migrations directory for addon: ' . $identifier;

                return compact('executed', 'skipped', 'failed', 'lines');
            }

            // Connect to database using env loaded by kernel
            $db = new Database(
                $_ENV['DATABASE_HOST'] ?? '127.0.0.1',
                $_ENV['DATABASE_DATABASE'] ?? '',
                $_ENV['DATABASE_USER'] ?? '',
                $_ENV['DATABASE_PASSWORD'] ?? '',
                (int) ($_ENV['DATABASE_PORT'] ?? 3306)
            );
            $pdo = $db->getPdo();

            // Ensure migrations table exists
            $migrationsSql = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
				`id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
				`script` TEXT NOT NULL COMMENT 'The script to be migrated!',
				`migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
				`date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
				PRIMARY KEY (`id`)
			) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
            $pdo->exec($migrationsSql);

            $files = scandir($dir) ?: [];
            $migrationFiles = array_values(array_filter($files, static function ($file) use ($dir) {
                return $file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'sql' && is_file($dir . '/' . $file);
            }));

            foreach ($migrationFiles as $file) {
                $path = $dir . '/' . $file;
                $sql = @file_get_contents($path);
                $scriptKey = 'addon:' . $identifier . ':' . $file;
                if ($sql === false) {
                    $lines[] = '⏭️  Skipped (unreadable): ' . $file;
                    ++$skipped;
                    continue;
                }
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
                $stmt->execute(['script' => $scriptKey]);
                if ((int) $stmt->fetchColumn() > 0) {
                    $lines[] = '⏭️  Skipped (already executed): ' . $file;
                    ++$skipped;
                    continue;
                }
                try {
                    $pdo->exec($sql);
                    $ins = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                    $ins->execute(['script' => $scriptKey, 'migrated' => 'true']);
                    $lines[] = '✅ Executed: ' . $file;
                    ++$executed;
                } catch (\Exception $ex) {
                    $lines[] = '❌ Failed: ' . $file . ' -> ' . $ex->getMessage();
                    ++$failed;
                }
            }
        } catch (\Exception $e) {
            $lines[] = '❌ Migration error: ' . $e->getMessage();
            ++$failed;
        }

        return compact('executed', 'skipped', 'failed', 'lines');
    }

    /**
     * Perform the common installation routine given an extracted addon temp directory.
     * Handles identifier resolution (from conf.yml if not provided), copying files,
     * exposing public assets, running migrations, and calling the install hook.
     */
    private function performAddonInstall(string $tempDir, ?string $identifier = null): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            $configFile = rtrim($tempDir, '/') . '/conf.yml';
            if (!file_exists($configFile)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon: missing conf.yml', 'ADDON_INVALID', 422);
            }

            if ($identifier === null) {
                try {
                    $conf = \Symfony\Component\Yaml\Yaml::parseFile($configFile);
                    $identifier = $conf['plugin']['identifier'] ?? null;
                } catch (\Throwable $t) {
                    @exec('rm -rf ' . escapeshellarg($tempDir));

                    return ApiResponse::error('Failed to parse conf.yml', 'ADDON_CONF_PARSE_FAILED', 422);
                }
            }

            if (!$identifier || !preg_match('/^[a-z0-9_\-]+$/', (string) $identifier)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon identifier in conf.yml', 'ADDON_IDENTIFIER_INVALID', 422);
            }

            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (file_exists($pluginDir)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Addon already installed', 'ADDON_EXISTS', 409);
            }
            if (!@mkdir($pluginDir, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to create addon directory', 'ADDON_DIR_FAILED', 500);
            }

            $copyCmd = sprintf('cp -r %s/* %s', escapeshellarg($tempDir), escapeshellarg($pluginDir));
            exec($copyCmd);
            @exec('rm -rf ' . escapeshellarg($tempDir));

            // Expose public assets at public/addons/{identifier} using ln -s (fallback to copy)
            $pluginPublic = $pluginDir . '/Public';
            $publicAddonsBase = dirname(__DIR__, 3) . '/public/addons';
            if (is_dir($pluginPublic)) {
                if (!is_dir($publicAddonsBase)) {
                    @mkdir($publicAddonsBase, 0755, true);
                }
                $linkPath = $publicAddonsBase . '/' . $identifier;
                @exec('rm -rf ' . escapeshellarg($linkPath));
                $lnCmd = 'ln -s ' . escapeshellarg($pluginPublic) . ' ' . escapeshellarg($linkPath);
                exec($lnCmd, $lnOut, $lnCode);
                if ($lnCode !== 0) {
                    @mkdir($linkPath, 0755, true);
                    $copyPubCmd = sprintf('cp -r %s/* %s', escapeshellarg($pluginPublic), escapeshellarg($linkPath));
                    exec($copyPubCmd);
                }
            }

            // Run migrations
            $migrationResult = $this->runAddonMigrations($identifier, $pluginDir);
            if ($migrationResult['failed'] > 0) {
                return ApiResponse::error('Addon migrations failed', 'ADDON_MIGRATION_FAILED', 422, [
                    'output' => implode("\n", $migrationResult['lines'] ?? []),
                ]);
            }

            // Optional: call plugin install hook if present
            $phpFiles = glob($pluginDir . '/*.php') ?: [];
            if (!empty($phpFiles)) {
                require_once $phpFiles[0];
                $className = basename($phpFiles[0], '.php');
                $namespace = 'App\\Addons\\' . $identifier;
                $full = $namespace . '\\' . $className;
                if (class_exists($full) && method_exists($full, 'pluginInstall')) {
                    $full::pluginInstall();
                }
            }

            return ApiResponse::success(['identifier' => $identifier], 'Addon installed successfully', 201);
        } catch (\Exception $e) {
            @exec('rm -rf ' . escapeshellarg($tempDir));

            return ApiResponse::error('Failed to finalize addon install: ' . $e->getMessage(), 500);
        }
    }
}
