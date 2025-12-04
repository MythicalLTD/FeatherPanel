<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Helpers;

use App\App;

class PhpMyAdmin
{
    public const PMA_VERSION = '5.2.3';
    public const PMA_DOWNLOAD_URL = 'https://files.phpmyadmin.net/phpMyAdmin/' . self::PMA_VERSION . '/phpMyAdmin-' . self::PMA_VERSION . '-all-languages.zip';

    /**
     * Theme download URLs.
     */
    private const THEMES = [
        'darkwolf' => 'https://files.phpmyadmin.net/themes/darkwolf/5.2/darkwolf-5.2.zip',
        'boodark' => 'https://files.phpmyadmin.net/themes/boodark/1.2.0/boodark-1.2.0.zip',
        'blueberry' => 'https://files.phpmyadmin.net/themes/blueberry/1.1.0/blueberry-1.1.0.zip',
    ];

    /**
     * Download and extract phpMyAdmin to the public directory.
     *
     * @throws \Exception If download or extraction fails
     */
    public static function downloadPhpMyAdmin(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $publicDir = dirname(__DIR__, 2) . '/public';
        $extractedFolderName = 'phpMyAdmin-' . self::PMA_VERSION . '-all-languages';
        $targetFolderName = 'pma';
        $targetPath = $publicDir . '/' . $targetFolderName;

        // Check if pma folder already exists
        if (is_dir($targetPath)) {
            $logger->info('phpMyAdmin already exists at ' . $targetPath);

            return;
        }

        // Create public directory if it doesn't exist
        if (!is_dir($publicDir) && !@mkdir($publicDir, 0755, true)) {
            throw new \Exception('Failed to create public directory: ' . $publicDir);
        }

        // Download the zip file
        $logger->info('Downloading phpMyAdmin ' . self::PMA_VERSION . ' from ' . self::PMA_DOWNLOAD_URL);
        $context = stream_context_create([
            'http' => [
                'timeout' => 300,
                'ignore_errors' => true,
            ],
        ]);

        $zipContent = @file_get_contents(self::PMA_DOWNLOAD_URL, false, $context);
        if ($zipContent === false) {
            throw new \Exception('Failed to download phpMyAdmin from ' . self::PMA_DOWNLOAD_URL);
        }

        // Save to temporary file
        $tempFile = sys_get_temp_dir() . '/' . uniqid('pma_', true) . '.zip';
        if (@file_put_contents($tempFile, $zipContent) === false) {
            throw new \Exception('Failed to save downloaded zip file to temporary location');
        }

        try {
            // Extract the zip file
            $logger->info('Extracting phpMyAdmin zip file');
            $zip = new \ZipArchive();
            $result = $zip->open($tempFile);

            if ($result !== true) {
                throw new \Exception('Failed to open zip file. Error code: ' . $result);
            }

            // Extract to public directory
            if (!$zip->extractTo($publicDir)) {
                $zip->close();
                throw new \Exception('Failed to extract zip file to ' . $publicDir);
            }

            $zip->close();

            // Rename the extracted folder
            $extractedPath = $publicDir . '/' . $extractedFolderName;
            if (!is_dir($extractedPath)) {
                throw new \Exception('Extracted folder not found: ' . $extractedPath);
            }

            if (!@rename($extractedPath, $targetPath)) {
                throw new \Exception('Failed to rename folder from ' . $extractedFolderName . ' to ' . $targetFolderName);
            }

            // Rename config.sample.inc.php to config.inc.php if it exists
            $configSamplePath = $targetPath . '/config.sample.inc.php';
            $configPath = $targetPath . '/config.inc.php';
            if (file_exists($configSamplePath) && !file_exists($configPath)) {
                if (!@rename($configSamplePath, $configPath)) {
                    $logger->warning('Failed to rename config.sample.inc.php to config.inc.php');
                } else {
                    $logger->info('Renamed config.sample.inc.php to config.inc.php');
                }
            }

            // Configure config.inc.php
            self::configurePhpMyAdmin($targetPath, $logger);

            // Download and install themes
            self::installThemes($targetPath, $logger);

            // Copy token authentication files
            self::copyTokenFiles($targetPath, $logger);

            $logger->info('phpMyAdmin successfully downloaded and extracted to ' . $targetPath);
        } finally {
            // Clean up temporary file
            if (file_exists($tempFile)) {
                @unlink($tempFile);
            }
        }
    }

    /**
     * Check if phpMyAdmin is installed.
     *
     * @return bool True if phpMyAdmin is installed, false otherwise
     */
    public static function isInstalled(): bool
    {
        $publicDir = dirname(__DIR__, 2) . '/public';
        $targetPath = $publicDir . '/pma';

        return is_dir($targetPath) && file_exists($targetPath . '/index.php');
    }

    /**
     * Delete phpMyAdmin installation.
     *
     * @throws \Exception If deletion fails
     */
    public static function deletePhpMyAdmin(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $publicDir = dirname(__DIR__, 2) . '/public';
        $targetPath = $publicDir . '/pma';

        // Check if phpMyAdmin is installed
        if (!is_dir($targetPath)) {
            $logger->info('phpMyAdmin is not installed, nothing to delete');

            return;
        }

        // Delete the directory recursively
        $logger->info('Deleting phpMyAdmin installation from ' . $targetPath);
        self::deleteDirectory($targetPath);
        $logger->info('phpMyAdmin successfully deleted');
    }

    /**
     * Generate a secure blowfish secret (32 characters).
     */
    private static function generateBlowfishSecret(): string
    {
        $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        $secret = '';
        $length = 32;

        for ($i = 0; $i < $length; ++$i) {
            $secret .= $characters[random_int(0, strlen($characters) - 1)];
        }

        return $secret;
    }

    /**
     * Configure phpMyAdmin config.inc.php file.
     */
    private static function configurePhpMyAdmin(string $pmaPath, $logger): void
    {
        $configPath = $pmaPath . '/config.inc.php';

        if (!file_exists($configPath)) {
            $logger->warning('config.inc.php not found, skipping configuration');

            return;
        }

        // Read the config file
        $configContent = file_get_contents($configPath);
        if ($configContent === false) {
            $logger->warning('Failed to read config.inc.php');

            return;
        }

        // Generate blowfish secret
        $blowfishSecret = self::generateBlowfishSecret();

        // Replace or add blowfish_secret
        if (preg_match("/\\\$cfg\\['blowfish_secret'\\]\\s*=\\s*['\"].*?['\"];?/", $configContent)) {
            $configContent = preg_replace(
                "/\\\$cfg\\['blowfish_secret'\\]\\s*=\\s*['\"].*?['\"];?/",
                "\$cfg['blowfish_secret'] = '" . addslashes($blowfishSecret) . "';",
                $configContent
            );
        } else {
            // Add blowfish_secret if not found
            $configContent = "\$cfg['blowfish_secret'] = '" . addslashes($blowfishSecret) . "';\n" . $configContent;
        }

        // Set ThemeDefault to darkwolf
        if (preg_match("/\\\$cfg\\['ThemeDefault'\\]\\s*=\\s*['\"].*?['\"];?/", $configContent)) {
            $configContent = preg_replace(
                "/\\\$cfg\\['ThemeDefault'\\]\\s*=\\s*['\"].*?['\"];?/",
                "\$cfg['ThemeDefault'] = 'darkwolf';",
                $configContent
            );
        } else {
            $configContent .= "\n\$cfg['ThemeDefault'] = 'darkwolf';\n";
        }

        // Set AllowArbitraryServer to true
        if (preg_match("/\\\$cfg\\['AllowArbitraryServer'\\]\\s*=\\s*(true|false);?/", $configContent)) {
            $configContent = preg_replace(
                "/\\\$cfg\\['AllowArbitraryServer'\\]\\s*=\\s*(true|false);?/",
                "\$cfg['AllowArbitraryServer'] = true;",
                $configContent
            );
        } else {
            $configContent .= "\n\$cfg['AllowArbitraryServer'] = true;\n";
        }

        // Configure signon authentication for servers
        // Check if Servers array exists
        if (preg_match("/\\\$cfg\\['Servers'\\]/", $configContent)) {
            // Find the first server index (usually $i = 1)
            // Replace or add auth_type
            if (preg_match("/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['auth_type'\\]\\s*=\\s*['\"].*?['\"];?/", $configContent)) {
                $configContent = preg_replace(
                    "/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['auth_type'\\]\\s*=\\s*['\"].*?['\"];?/",
                    "\$cfg['Servers'][\$i]['auth_type'] = 'signon';",
                    $configContent,
                    1
                );
            } else {
                // Add auth_type if not found - find where to insert (after Servers array declaration)
                if (preg_match("/(\\\$cfg\\['Servers'\\]\\[.*?\\]\\[.*?\\]\\s*=.*?;)/", $configContent, $matches)) {
                    $configContent = str_replace(
                        $matches[0],
                        $matches[0] . "\n\$cfg['Servers'][\$i]['auth_type'] = 'signon';",
                        $configContent
                    );
                } else {
                    $configContent .= "\n\$cfg['Servers'][\$i]['auth_type'] = 'signon';\n";
                }
            }

            // Add SignonSession
            if (!preg_match("/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['SignonSession'\\]/", $configContent)) {
                $configContent .= "\$cfg['Servers'][\$i]['SignonSession'] = 'TokenSession';\n";
            } else {
                $configContent = preg_replace(
                    "/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['SignonSession'\\]\\s*=\\s*['\"].*?['\"];?/",
                    "\$cfg['Servers'][\$i]['SignonSession'] = 'TokenSession';",
                    $configContent
                );
            }

            // Add SignonURL
            if (!preg_match("/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['SignonURL'\\]/", $configContent)) {
                $configContent .= "\$cfg['Servers'][\$i]['SignonURL'] = 'token.php';\n";
            } else {
                $configContent = preg_replace(
                    "/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['SignonURL'\\]\\s*=\\s*['\"].*?['\"];?/",
                    "\$cfg['Servers'][\$i]['SignonURL'] = 'token.php';",
                    $configContent
                );
            }

            // Add LogoutURL
            if (!preg_match("/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['LogoutURL'\\]/", $configContent)) {
                $configContent .= "\$cfg['Servers'][\$i]['LogoutURL'] = 'token-logout.php';\n";
            } else {
                $configContent = preg_replace(
                    "/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['LogoutURL'\\]\\s*=\\s*['\"].*?['\"];?/",
                    "\$cfg['Servers'][\$i]['LogoutURL'] = 'token-logout.php';",
                    $configContent
                );
            }

            // Configure host to use from session (for AllowArbitraryServer)
            // This allows phpMyAdmin to connect to the database host specified in the session
            if (preg_match("/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['host'\\]\\s*=\\s*['\"].*?['\"];?/", $configContent)) {
                // Replace existing host with dynamic session-based host
                $configContent = preg_replace(
                    "/\\\$cfg\\['Servers'\\]\\[.*?\\]\\['host'\\]\\s*=\\s*['\"].*?['\"];?/",
                    "\$cfg['Servers'][\$i]['host'] = isset(\$_SESSION['PMA_single_signon_host']) ? \$_SESSION['PMA_single_signon_host'] : 'localhost';",
                    $configContent,
                    1
                );
            } else {
                // Add host configuration if not found
                $configContent .= "\$cfg['Servers'][\$i]['host'] = isset(\$_SESSION['PMA_single_signon_host']) ? \$_SESSION['PMA_single_signon_host'] : 'localhost';\n";
            }
        } else {
            // Servers array doesn't exist, add it
            $signonConfig = "\n\n// Signon authentication configuration\n";
            $signonConfig .= "\$cfg['Servers'][\$i]['auth_type'] = 'signon';\n";
            $signonConfig .= "\$cfg['Servers'][\$i]['SignonSession'] = 'TokenSession';\n";
            $signonConfig .= "\$cfg['Servers'][\$i]['SignonURL'] = 'token.php';\n";
            $signonConfig .= "\$cfg['Servers'][\$i]['LogoutURL'] = 'token-logout.php';\n";
            $configContent .= $signonConfig;
        }

        // Write the updated config
        if (file_put_contents($configPath, $configContent) === false) {
            $logger->warning('Failed to write updated config.inc.php');
        } else {
            $logger->info('Configured phpMyAdmin config.inc.php with blowfish_secret, ThemeDefault, AllowArbitraryServer, and signon authentication');
        }
    }

    /**
     * Download and install phpMyAdmin themes.
     */
    private static function installThemes(string $pmaPath, $logger): void
    {
        $themesDir = $pmaPath . '/themes';

        if (!is_dir($themesDir)) {
            $logger->warning('Themes directory not found: ' . $themesDir);

            return;
        }

        $context = stream_context_create([
            'http' => [
                'timeout' => 300,
                'ignore_errors' => true,
            ],
        ]);

        foreach (self::THEMES as $themeName => $themeUrl) {
            $themePath = $themesDir . '/' . $themeName;

            // Skip if theme already exists
            if (is_dir($themePath)) {
                $logger->info("Theme '{$themeName}' already exists, skipping download");
                continue;
            }

            $logger->info("Downloading theme '{$themeName}' from {$themeUrl}");

            // Download theme zip
            $zipContent = @file_get_contents($themeUrl, false, $context);
            if ($zipContent === false) {
                $logger->warning("Failed to download theme '{$themeName}' from {$themeUrl}");
                continue;
            }

            // Save to temporary file
            $tempFile = sys_get_temp_dir() . '/' . uniqid('pma_theme_' . $themeName . '_', true) . '.zip';
            if (@file_put_contents($tempFile, $zipContent) === false) {
                $logger->warning("Failed to save theme zip file for '{$themeName}'");
                continue;
            }

            try {
                // Extract theme zip
                $zip = new \ZipArchive();
                $result = $zip->open($tempFile);

                if ($result !== true) {
                    $logger->warning("Failed to open theme zip file for '{$themeName}'. Error code: {$result}");
                    continue;
                }

                // Extract to themes directory
                if (!$zip->extractTo($themesDir)) {
                    $zip->close();
                    $logger->warning("Failed to extract theme '{$themeName}' to {$themesDir}");
                    continue;
                }

                $zip->close();

                // Check if extraction created a subdirectory with theme name
                $extractedThemePath = $themesDir . '/' . $themeName;
                if (!is_dir($extractedThemePath)) {
                    // Check if there's a folder inside (some themes extract with a folder name)
                    $files = scandir($themesDir);
                    $foundTheme = false;
                    foreach ($files as $file) {
                        if ($file !== '.' && $file !== '..' && is_dir($themesDir . '/' . $file)) {
                            // Check if this looks like our theme (contains theme files)
                            $potentialThemePath = $themesDir . '/' . $file;
                            if (file_exists($potentialThemePath . '/theme.json') || file_exists($potentialThemePath . '/css/theme.css') || file_exists($potentialThemePath . '/theme.scss')) {
                                // Rename to expected theme name
                                if ($file !== $themeName) {
                                    if (@rename($potentialThemePath, $extractedThemePath)) {
                                        $foundTheme = true;
                                        break;
                                    }
                                } else {
                                    $foundTheme = true;
                                    break;
                                }
                            }
                        }
                    }

                    // If still not found, check for nested structure (e.g., darkwolf/darkwolf/)
                    if (!$foundTheme) {
                        foreach ($files as $file) {
                            if ($file !== '.' && $file !== '..' && is_dir($themesDir . '/' . $file)) {
                                $nestedPath = $themesDir . '/' . $file . '/' . $themeName;
                                if (is_dir($nestedPath)) {
                                    // Move nested theme to correct location
                                    if (@rename($nestedPath, $extractedThemePath)) {
                                        // Remove parent directory if empty
                                        @rmdir($themesDir . '/' . $file);
                                        $foundTheme = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    $foundTheme = true;
                }

                if ($foundTheme || is_dir($extractedThemePath)) {
                    $logger->info("Successfully installed theme '{$themeName}'");
                } else {
                    $logger->warning("Theme '{$themeName}' extracted but could not be located in expected structure");
                }
            } finally {
                // Clean up temporary file
                if (file_exists($tempFile)) {
                    @unlink($tempFile);
                }
            }
        }
    }

    /**
     * Copy token authentication files to phpMyAdmin directory.
     */
    private static function copyTokenFiles(string $pmaPath, $logger): void
    {
        $sourceDir = dirname(__DIR__, 2) . '/storage/modules/pma';
        $tokenFiles = ['token.php', 'token-logout.php'];

        // Check if source directory exists
        if (!is_dir($sourceDir)) {
            $logger->warning("Token files source directory not found: {$sourceDir}");
            $logger->info('Skipping token files copy - source directory does not exist');

            return;
        }

        // Copy each token file
        foreach ($tokenFiles as $file) {
            $sourceFile = $sourceDir . '/' . $file;
            $targetFile = $pmaPath . '/' . $file;

            if (!file_exists($sourceFile)) {
                $logger->warning("Token file not found: {$sourceFile}");
                continue;
            }

            if (!@copy($sourceFile, $targetFile)) {
                $logger->warning("Failed to copy token file '{$file}' to phpMyAdmin directory");
            } else {
                $logger->info("Copied token file '{$file}' to phpMyAdmin directory");
            }
        }
    }

    /**
     * Recursively delete a directory and its contents.
     *
     * @param string $dir The directory to delete
     *
     * @throws \Exception If deletion fails
     */
    private static function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir) ?: [], ['.', '..']);

        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                self::deleteDirectory($path);
            } else {
                if (!@unlink($path)) {
                    throw new \Exception("Failed to delete file: {$path}");
                }
            }
        }

        if (!@rmdir($dir)) {
            throw new \Exception("Failed to delete directory: {$dir}");
        }
    }
}
