<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Cli\Commands;

use App\Cli\App;
use App\Helpers\XChaCha20;
use App\Cli\CommandBuilder;

class Setup extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();

        self::createDBConnection($app);
    }

    public static function getDescription(): string
    {
        return 'Setup the database and the application!';
    }

    public static function getSubCommands(): array
    {
        return [];
    }

    public static function createDBConnection(App $cliApp): void
    {
        $defultEncryption = 'xchacha20';
        $defultDBName = 'featherpanel';
        $defultDBHost = '127.0.0.1';
        $defultDBPort = '3306';
        $defultDBUser = 'featherpanel';
        $defultDBPassword = '';

        $cliApp->send('&7Please enter the database encryption &8[' . $cliApp->color3 . $defultEncryption . '&8]&7');
        $dbEncryption = readline('> ') ?: $defultEncryption;
        $allowedEncryptions = ['xchacha20'];
        if (!in_array($dbEncryption, $allowedEncryptions)) {
            $cliApp->send('&cInvalid database encryption.');
            exit;
        }

        $cliApp->send('&7Please enter the database name &8[' . $cliApp->color3 . $defultDBName . '&8]&7');
        $defultDBName = readline('> ') ?: $defultDBName;

        $cliApp->send('&7Please enter the database host &8[' . $cliApp->color3 . $defultDBHost . '&8]&7');
        $defultDBHost = readline('> ') ?: $defultDBHost;

        $cliApp->send('&7Please enter the database port &8[' . $cliApp->color3 . $defultDBPort . '&8]&7');
        $defultDBPort = readline('> ') ?: $defultDBPort;

        $cliApp->send('&7Please enter the database user &8[' . $cliApp->color3 . $defultDBUser . '&8]&7');
        $defultDBUser = readline('> ') ?: $defultDBUser;

        $cliApp->send('&7Please enter the database password &8[' . $cliApp->color3 . $defultDBPassword . '&8]&7');
        $defultDBPassword = readline('> ') ?: $defultDBPassword;

        try {
            $dsn = "mysql:host=$defultDBHost;port=$defultDBPort;dbname=$defultDBName";
            $pdo = new \PDO($dsn, $defultDBUser, $defultDBPassword);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $cliApp->send('&aSuccessfully connected to the MySQL database.');
        } catch (\PDOException $e) {
            $cliApp->send('&cFailed to connect to the MySQL database: ' . $e->getMessage());
            exit;
        }

        $envTemplate = 'DATABASE_HOST=' . $defultDBHost . '
DATABASE_PORT=' . $defultDBPort . '
DATABASE_USER=' . $defultDBUser . '
DATABASE_PASSWORD=' . $defultDBPassword . '
DATABASE_DATABASE=' . $defultDBName . '
DATABASE_ENCRYPTION=' . $dbEncryption . '
DATABASE_ENCRYPTION_KEY=' . XChaCha20::generateStrongKey(true) . '
REDIS_PASSWORD=eufefwefwefw
REDIS_HOST=127.0.0.1';

        $cliApp->send('&aEnvironment file created successfully.');
        $cliApp->send('&aEncryption key generated successfully.');

        $envFile = fopen(__DIR__ . '/../../../storage/config/.env', 'w');
        fwrite($envFile, $envTemplate);
        fclose($envFile);

        $cliApp->send('&aEnvironment file created successfully.');
    }
}
