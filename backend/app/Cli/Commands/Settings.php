<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
        self::$cliApp->send(self::$cliApp->color1 . '=== FeatherPanel Settings ===');
        self::$cliApp->send('&7Total Settings: &f' . count(self::$settings) . ' &7| Page: &f' . (self::$currentPage + 1) . '/' . max(1, ceil(count(self::$settings) / max(1, self::$pageSize))));
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
            $line = sprintf('&7%2d. ' . self::$cliApp->color3 . '%-25s &7→ ' . self::$cliApp->color2 . '%s', $number, $setting, $displayValue);
            self::$cliApp->send($line);
        }

        self::$cliApp->send('');
    }

    private static function showFooter(): void
    {
        self::$cliApp->send(self::$cliApp->color3 . 'Commands: &f[number]&7=edit | &fn&7/&fnext | &fp&7/&fprev | &fq&7/&fquit');
        self::$cliApp->send(self::$cliApp->color2 . 'Enter your choice: ');
    }

    private static function editSetting(int $index): void
    {
        $setting = self::$settings[$index];
        $currentValue = self::$config->getSetting($setting, 'DEFAULT');

        while (true) {
            self::clearScreen();
            self::$cliApp->send(self::$cliApp->color1 . '&lEdit Setting');
            self::$cliApp->send(self::$cliApp->color2 . 'Setting: ' . self::$cliApp->color3 . $setting);
            self::$cliApp->send('&7Current Value: ' . self::$cliApp->color2 . (strlen($currentValue) > 65 ? substr($currentValue, 0, 62) . '...' : $currentValue));
            self::$cliApp->send('');
            self::$cliApp->send(self::$cliApp->color3 . 'Enter new value &8(&cq' . self::$cliApp->color3 . ' to cancel&8)&7: ');
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
