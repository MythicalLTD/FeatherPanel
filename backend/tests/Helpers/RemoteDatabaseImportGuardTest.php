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

use PHPUnit\Framework\TestCase;
use App\Helpers\RemoteDatabaseProvisioner;
use PHPUnit\Framework\Attributes\DataProvider;

class RemoteDatabaseImportGuardTest extends TestCase
{
    public static function allowedMysqlStatements(): array
    {
        return [
            ['SET NAMES utf8mb4'],
            ['SET FOREIGN_KEY_CHECKS=0'],
            ['DROP TABLE IF EXISTS `users`'],
            ["CREATE TABLE `users` (`id` int NOT NULL, `name` varchar(50) DEFAULT 'grant') ENGINE=InnoDB"],
            ["INSERT INTO `users` (`id`, `name`) VALUES (1, 'GRANT ALL ON *.* TO x; DROP DATABASE y')"],
            ["INSERT INTO `t` (`a`) VALUES ('it''s \\' quoted')"],
            ['/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE */'],
            ['LOCK TABLES `users` WRITE'],
            ["-- a comment about GRANT\nINSERT INTO `t` VALUES (1)"],
            ['SELECT * FROM `t` USE INDEX (idx)'],
        ];
    }

    public static function rejectedMysqlStatements(): array
    {
        return [
            ['USE other_db'],
            ['SET NAMES utf8mb4; USE `other_db`'],
            ["CREATE USER 'x'@'%' IDENTIFIED BY 'y'"],
            ["DROP USER 'x'@'%'"],
            ["ALTER USER 'root'@'%' IDENTIFIED BY 'y'"],
            ['GRANT ALL PRIVILEGES ON *.* TO x'],
            ['REVOKE ALL PRIVILEGES ON *.* FROM x'],
            ['CREATE DATABASE evil'],
            ['DROP DATABASE `other`'],
            ['DROP SCHEMA other'],
            ["SELECT 1 INTO OUTFILE '/tmp/x'"],
            ["SELECT 1 INTO DUMPFILE '/tmp/x'"],
            ["LOAD DATA INFILE '/etc/passwd' INTO TABLE t"],
            ["SELECT LOAD_FILE('/etc/passwd')"],
            ['SET GLOBAL general_log = 1'],
            ['SET @@GLOBAL.general_log = 1'],
            ['/*!50000 GRANT ALL ON *.* TO x */'],
            ['/*M!100000 CREATE USER x */'],
            ['CREATE/**/USER x'],
            ["SELECT '\\' ; GRANT ALL ON *.* TO x; SELECT '"],
            ["SELECT `'`; GRANT ALL ON *.* TO x; SELECT `'`"],
            ["SELECT 1 /* ' */; GRANT ALL ON *.* TO x; /* ' */"],
            ["SELECT 1--'\n; GRANT ALL ON *.* TO x"],
        ];
    }

    #[DataProvider('allowedMysqlStatements')]
    public function testAllowsOrdinaryMysqlDumpStatements(string $statement): void
    {
        RemoteDatabaseProvisioner::assertImportStatementAllowed($statement, 'mysql');
        $this->addToAssertionCount(1);
    }

    #[DataProvider('rejectedMysqlStatements')]
    public function testRejectsDangerousMysqlStatements(string $statement): void
    {
        $this->expectException(InvalidArgumentException::class);
        RemoteDatabaseProvisioner::assertImportStatementAllowed($statement, 'mariadb');
    }

    public function testAllowsOrdinaryPostgresDumpStatements(): void
    {
        foreach ([
            'DROP TABLE IF EXISTS "users" CASCADE',
            'CREATE TABLE "users" ("id" integer, "name" text)',
            "INSERT INTO \"users\" (\"id\", \"name\") VALUES (1, 'COPY x TO PROGRAM ''id''')",
            'COPY "users" FROM STDIN',
        ] as $statement) {
            RemoteDatabaseProvisioner::assertImportStatementAllowed($statement, 'postgresql');
        }
        $this->addToAssertionCount(1);
    }

    public function testRejectsDangerousPostgresStatements(): void
    {
        foreach ([
            '\\connect other_db',
            "COPY t TO PROGRAM 'id'",
            "COPY t FROM '/etc/passwd'",
            'ALTER SYSTEM SET log_statement = all',
            'CREATE ROLE evil SUPERUSER',
            'ALTER ROLE tenant SUPERUSER',
            'GRANT ALL ON DATABASE other TO tenant',
            'CREATE DATABASE evil',
            'SET SESSION AUTHORIZATION postgres',
            'CREATE EXTENSION dblink',
            "SELECT pg_read_file('/etc/passwd')",
        ] as $statement) {
            try {
                RemoteDatabaseProvisioner::assertImportStatementAllowed($statement, 'postgresql');
                $this->fail('Statement was not rejected: ' . $statement);
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testImportRequiresTenantCredentials(): void
    {
        $this->expectException(InvalidArgumentException::class);
        RemoteDatabaseProvisioner::importDatabase(
            ['database_type' => 'mysql', 'database_host' => '127.0.0.1', 'database_port' => 3306],
            'tenant_db',
            'SELECT 1;',
            '',
            ''
        );
    }

    public function testImportRejectsDangerousStatementBeforeConnecting(): void
    {
        // Host is unreachable on purpose: the dump must be rejected before any connection is opened.
        $this->expectException(InvalidArgumentException::class);
        RemoteDatabaseProvisioner::importDatabase(
            ['database_type' => 'mysql', 'database_host' => '192.0.2.1', 'database_port' => 1],
            'tenant_db',
            "USE `tenant_db`;\nINSERT INTO t VALUES (1);\nGRANT ALL ON *.* TO x;\n",
            'tenant_user',
            'secret'
        );
    }
}
