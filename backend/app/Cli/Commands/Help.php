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
use App\Cli\CommandBuilder;

class Help extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $cmd = self::getInstance();

        // Use simple ASCII bars and basic MC color codes (ampersand codes, as above)
        $cmd->send('&8' . str_repeat('-', 60));
        $cmd->send($cmd->color1 . '&lFeatherPanel &7Help Menu');
        $cmd->send('');

        $commands = scandir(__DIR__);

        foreach ($commands as $command) {
            if ($command === '.' || $command === '..' || $command === 'Command.php') {
                continue;
            }

            $commandName = str_replace('.php', '', $command);
            $commandClass = "App\\Cli\\Commands\\$commandName";
            $commandFile = __DIR__ . "/$commandName.php";

            require_once $commandFile;

            if (!class_exists($commandClass)) {
                continue;
            }

            $desc = $commandClass::getDescription();
            $cmdKey = lcfirst($commandName);
            $subCommands = $commandClass::getSubCommands();

            // FeatherPanel style: primary = aqua (&b), accent = gold (&6), secondary = gray (&7), desc = white (&f)
            $cmd->send($cmd->color1 . '/' . $cmd->color2 . $cmdKey . $cmd->color3 . ': &f' . $desc);

            if (!empty($subCommands)) {
                foreach ($subCommands as $subCommand => $subDesc) {
                    $cmd->send('     ' . $cmd->color2 . '-' . $cmd->color3 . " &a{$cmdKey} &e{$subCommand}&7: &f{$subDesc}");
                }
            }
        }

        $cmd->send('');
        $cmd->send($cmd->color1 . 'Plugins:');
        $pluginDir = getcwd() . '/backend/storage/addons';
        if (is_dir($pluginDir)) {
            $plugins = array_diff(scandir($pluginDir), ['.', '..']);
            foreach ($plugins as $plugin) {
                $commandsFolder = $pluginDir . "/$plugin/Commands";
                if (!is_dir($commandsFolder)) {
                    continue;
                }
                $commandFiles = array_diff(scandir($commandsFolder), ['.', '..']);
                foreach ($commandFiles as $commandFile) {
                    if (!str_ends_with($commandFile, '.php')) {
                        continue;
                    }
                    $className = pathinfo($commandFile, PATHINFO_FILENAME);
                    $commandClass = "App\\Addons\\$plugin\\Commands\\$className";
                    $commandFilePath = $commandsFolder . "/$commandFile";
                    require_once $commandFilePath;
                    if (!class_exists($commandClass)) {
                        continue;
                    }
                    $desc = $commandClass::getDescription();
                    $cmdKey = lcfirst($className);
                    $subCommands = $commandClass::getSubCommands();
                    $cmd->send($cmd->color3 . '[' . $plugin . '] ' . $cmd->color1 . '/' . $cmd->color2 . $cmdKey . $cmd->color3 . ': &f' . $desc);
                    if (!empty($subCommands)) {
                        foreach ($subCommands as $subCommand => $subDesc) {
                            $cmd->send('     ' . $cmd->color2 . '-' . $cmd->color3 . " {$cmdKey} {$subCommand}&7: &f{$subDesc}");
                        }
                    }
                }
            }
        }
        $cmd->send('');
        $cmd->send($cmd->color2 . str_repeat('-', 60));
    }

    public static function getDescription(): string
    {
        return 'Get help for all commands';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
