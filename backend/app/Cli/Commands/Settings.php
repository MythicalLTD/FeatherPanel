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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\Database;
use App\Cli\CommandBuilder;
use App\Config\ConfigFactory;

class Settings extends App implements CommandBuilder
{
    private static $cliApp;
    private static $config;
    private static $settings = [];
    private static $currentIndex = 0;
    private static $pageSize = 10;
    private static $currentPage = 0;

    public static function execute(array $args): void
    {
        self::$cliApp = App::getInstance();

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            self::$cliApp->send('&7The application is not setup!');
            exit;
        }

        \App\App::getInstance(true)->loadEnv();

        try {
            $db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);
            self::$config = new ConfigFactory($db->getPdo());
            self::$settings = array_values(self::$config->getConfigurableSettings());

            self::showMainMenu();
        } catch (\Exception $e) {
            self::$cliApp->send('&cAn error occurred while connecting to the database: ' . $e->getMessage());
            exit;
        }
    }

    public static function getDescription(): string
    {
        return 'Interactive settings configuration with a beautiful UI!';
    }

    public static function getSubCommands(): array
    {
        return [];
    }

    private static function showMainMenu(): void
    {
        while (true) {
            self::clearScreen();
            self::showHeader();
            self::showSettingsList();
            self::showFooter();

            $input = self::getUserInput();

            if ($input === 'q' || $input === 'quit') {
                self::$cliApp->send('&aGoodbye!');
                exit;
            } elseif ($input === 'n' || $input === 'next') {
                self::nextPage();
            } elseif ($input === 'p' || $input === 'prev') {
                self::prevPage();
            } elseif (is_numeric($input)) {
                $index = (int) $input - 1;
                if ($index >= 0 && $index < count(self::$settings)) {
                    self::editSetting($index);
                } else {
                    self::$cliApp->send('&cInvalid selection. Press any key to continue...');
                    self::waitForInput();
                }
            } else {
                self::$cliApp->send('&cInvalid input. Press any key to continue...');
                self::waitForInput();
            }
        }
    }

    private static function showHeader(): void
    {
        self::$cliApp->send('=== FeatherPanel Settings ===');
        self::$cliApp->send('Total Settings: ' . count(self::$settings) . ' | Page: ' . (self::$currentPage + 1) . '/' . max(1, ceil(count(self::$settings) / max(1, self::$pageSize))));
        self::$cliApp->send('');
    }

    private static function showSettingsList(): void
    {
        $startIndex = self::$currentPage * self::$pageSize;
        $endIndex = min($startIndex + self::$pageSize, count(self::$settings));

        for ($i = $startIndex; $i < $endIndex; ++$i) {
            $setting = self::$settings[$i];
            $currentValue = self::$config->getSetting($setting, 'DEFAULT');
            $displayValue = strlen($currentValue) > 30 ? substr($currentValue, 0, 27) . '...' : $currentValue;

            $number = $i + 1;
            $line = sprintf('&7%2d. &e%-25s &7→ &a%s', $number, $setting, $displayValue);
            self::$cliApp->send($line);
        }

        self::$cliApp->send('');
    }

    private static function showFooter(): void
    {
        self::$cliApp->send('Commands: [number]=edit | n/next | p/prev | q/quit');
        self::$cliApp->send('Enter your choice: ');
    }

    private static function editSetting(int $index): void
    {
        $setting = self::$settings[$index];
        $currentValue = self::$config->getSetting($setting, 'DEFAULT');

        while (true) {
            self::clearScreen();
            self::$cliApp->send('&3&lEdit Setting');
            self::$cliApp->send("&bSetting: &e$setting");
            self::$cliApp->send('&7Current Value: &a' . (strlen($currentValue) > 65 ? substr($currentValue, 0, 62) . '...' : $currentValue));
            self::$cliApp->send('');
            self::$cliApp->send('&6Enter new value &8(&cq&6 to cancel&8)&7: ');
            $newValue = trim(fgets(STDIN));

            if ($newValue === 'q' || $newValue === 'quit') {
                break;
            }

            if (empty($newValue)) {
                self::$cliApp->send('&cValue cannot be empty. Press any key to continue...');
                self::waitForInput();
                continue;
            }

            try {
                $result = self::$config->setSetting($setting, $newValue);
                if ($result) {
                    self::$cliApp->send('&a✓ Setting updated successfully!');
                    self::$cliApp->send('&7Press any key to continue...');
                    self::waitForInput();
                    break;
                }
                self::$cliApp->send('&c✗ Failed to update setting. Press any key to continue...');
                self::waitForInput();

            } catch (\Exception $e) {
                self::$cliApp->send('&c✗ Error updating setting: ' . $e->getMessage());
                self::$cliApp->send('&7Press any key to continue...');
                self::waitForInput();
            }
        }
    }

    private static function nextPage(): void
    {
        $maxPage = ceil(count(self::$settings) / self::$pageSize) - 1;
        if (self::$currentPage < $maxPage) {
            ++self::$currentPage;
        }
    }

    private static function prevPage(): void
    {
        if (self::$currentPage > 0) {
            --self::$currentPage;
        }
    }

    private static function clearScreen(): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            system('cls');
        } else {
            system('clear');
        }
    }

    private static function getUserInput(): string
    {
        $handle = fopen('php://stdin', 'r');
        $input = trim(fgets($handle));
        fclose($handle);

        return strtolower($input);
    }

    private static function waitForInput(): void
    {
        $handle = fopen('php://stdin', 'r');
        fgets($handle);
        fclose($handle);
    }
}
