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

class Listsettings extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $cliApp = App::getInstance();
        if (!file_exists(__DIR__ . '/../../../storage/.env')) {
            $cliApp->send('&7The application is not setup!');
            exit;
        }

        \App\App::getInstance(true)->loadEnv();

        try {
            $db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);
            $config = new ConfigFactory($db->getPdo());
            $settings = $config->getConfigurableSettings();
            foreach ($settings as $setting) {
                $cliApp->send('&7Name: &e' . $setting . ' &7- &e' . $config->getSetting($setting, 'DEFAULT'));
            }
        } catch (\Exception $e) {
            $cliApp->send('&cAn error occurred while connecting to the database: ' . $e->getMessage());
            exit;
        }

    }

    public static function getDescription(): string
    {
        return 'Get a setting!';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
