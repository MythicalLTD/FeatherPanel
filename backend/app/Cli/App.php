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

namespace App\Cli;

use App\Cli\Commands\Help;

class App extends Utils\MinecraftColorCodeSupport
{
    // FeatherPanel CLI prefix - using bold golden yellow for "Feather", aqua for "Panel", then a stylish gold/gray divider
    // FeatherPanel CLI Colors: refined, professional palette
    public $prefix = '&8[&3&lFeather&b&lPanel&8] &3❱ &f';
    public $color1 = '&3'; // deep blue accent (primary brand)
    public $color2 = '&b'; // aqua highlight (secondary/active)
    public $color3 = '&7'; // soft gray (subtle details and prompts)
    public $bars   = '&8&m---------------------------------------------------------------&r'; // dark elegant bar
    public static App $instance;
    public static bool $isColorEnabled = true;
    public static bool $isCleanOutputEnabled = false;
    public static bool $noPrefix = false;

    public function __construct(string $commandName, array $args)
    {

        self::$instance = $this;

        // Check for the --skip-path-check flag and skip path validation if present
        $skipPathCheck = in_array('--skip-path-check', $args, true);
        if ($skipPathCheck) {
            // Remove --skip-path-check from $args so it's not passed to the command handlers
            $args = array_values(array_diff($args, ['--skip-path-check']));
        }

        // Only validate path if --skip-path-check is not set
        if (!$skipPathCheck) {
            $cwd = getcwd();
            $validDirs = [
                '/var/www/featherpanel',
                '/var/www/html',
                '/var/www/featherpanel/backend',
            ];
            if (!in_array($cwd, $validDirs, true)) {
                exit('We detected that you are not running this command from the root directory of App. Please run this command from the root directory.');
            }
        }

        // Check for the --no-colors flag and set color output accordingly
        if (in_array('--no-colors', $args, true)) {
            self::$isColorEnabled = false;
            // Remove --no-colors from $args so it's not passed to the command handlers
            $args = array_values(array_diff($args, ['--no-colors']));
        }

        if (in_array('--clean-output', $args, true)) {
            self::$isCleanOutputEnabled = true;
            // Remove --clean-output from $args so it's not passed to the command handlers
            $args = array_values(array_diff($args, ['--clean-output']));
        }

        if (in_array('--no-prefix', $args, true)) {
            self::$noPrefix = true;
            // Remove --no-prefix from $args so it's not passed to the command handlers
            $args = array_values(array_diff($args, ['--no-prefix']));
        }

        // Try plugin commands first, then fall back to built-in commands
        if ($this->registerPluginCommands($commandName, $args)) {
            return;
        }

        $this->registerBuiltInCommands($commandName, $args);
    }

    /**
     * Register a built-in command.
     *
     * @param string $commandName the name of the command to register
     * @param array $args The command arguments
     */
    public function registerBuiltInCommands(string $commandName, array $args): void
    {
        $commandName = ucfirst($commandName);
        $commandFile = __DIR__ . "/Commands/$commandName.php";

        if (!file_exists($commandFile)) {
            Help::execute([]);

            return;
        }

        require_once $commandFile;

        $commandClass = "App\\Cli\\Commands\\$commandName";

        if (!class_exists($commandClass)) {
            $this->send('&cCommand not found.');

            return;
        }

        $commandClass::execute($args);
    }

    /**
     * Register and execute plugin commands.
     *
     * @param string $commandName the name of the command to register
     * @param array $args The command arguments
     *
     * @return bool WhethregisterBuiltInCommandser a plugin command was found and executed
     */
    public function registerPluginCommands(string $commandName, array $args): bool
    {
        $pluginDirectory = getcwd() . '/backend/storage/addons';

        if (!is_dir($pluginDirectory)) {
            return false;
        }

        $plugins = array_diff(scandir($pluginDirectory), ['.', '..']);

        foreach ($plugins as $plugin) {
            $pluginPath = $pluginDirectory . '/' . $plugin;
            if (!is_dir($pluginPath)) {
                continue;
            }

            // Check if the plugin has a commands folder
            $commandsFolder = $pluginPath . '/Commands';
            if (!is_dir($commandsFolder)) {
                continue;
            }

            $commandFiles = array_diff(scandir($commandsFolder), ['.', '..']);

            foreach ($commandFiles as $commandFile) {
                if (!str_ends_with($commandFile, '.php')) {
                    continue;
                }

                require_once $commandsFolder . '/' . $commandFile;

                $className = pathinfo($commandFile, PATHINFO_FILENAME);
                $commandClass = "App\\Addons\\$plugin\\Commands\\$className";

                if (!class_exists($commandClass)) {
                    continue;
                }

                if (strtolower($className) === strtolower($commandName)) {
                    $commandClass::execute($args);

                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Send a message to the console.
     *
     * @param string $message the message to send
     */
    public function send(string $message): void
    {
        if (self::$noPrefix) {
            self::sendOutputWithNewLine($message, !self::$isColorEnabled, self::$isCleanOutputEnabled);
        } else {
            self::sendOutputWithNewLine($this->prefix . $message, !self::$isColorEnabled, self::$isCleanOutputEnabled);
        }
    }

    /**
     * Get the instance of the App.
     */
    public static function getInstance(): App
    {
        return self::$instance;
    }

    public function processOutput(string $output): void
    {
        // Skip Vue DevTools and help messages
        if (
            strpos($output, 'Vue DevTools:') !== false
            || strpos($output, 'press h + enter') !== false
        ) {
            return;
        }

        // Strip timestamp and replace vite/VITE with App
        $output = preg_replace('/\d{1,2}:\d{2}:\d{2}\s[AP]M\s\[vite\]\s/', '[App] ', $output);
        $output = str_replace(['vite', 'VITE'], ['mythicalcompiler', 'MythicalCompiler'], $output);

        // Handle different log levels with colors
        if (stripos($output, '[DEBUG]') !== false || stripos($output, 'debug') !== false) {
            $this->sendOutput($this->prefix . "\e[34m" . $output . "\e[0m"); // Blue for DEBUG
        } elseif (stripos($output, '[INFO]') !== false || stripos($output, 'info') !== false) {
            $this->sendOutput($this->prefix . "\e[32m" . $output . "\e[0m"); // Green for INFO
        } elseif (stripos($output, '[WARNING]') !== false || stripos($output, 'warning') !== false) {
            $this->sendOutput($this->prefix . "\e[33m" . $output . "\e[0m"); // Yellow for WARNING
        } elseif (stripos($output, '[ERROR]') !== false || stripos($output, 'error') !== false) {
            $this->sendOutput($this->prefix . "\e[31m" . $output . "\e[0m"); // Red for ERROR
        } elseif (stripos($output, '[CRITICAL]') !== false) {
            $this->sendOutput($this->prefix . "\e[35m" . $output . "\e[0m"); // Magenta for CRITICAL
        } else {
            $this->sendOutput($this->prefix . $output);
        }
    }
}
