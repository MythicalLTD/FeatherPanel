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

namespace Tests\Helpers;

use PHPUnit\Framework\TestCase;
use App\Helpers\DatabaseGrantRepair;
use App\Helpers\RemoteDatabaseProvisioner as P;

final class DatabaseGrantNamesTest extends TestCase
{
    public function testNamePartOnlyAllowsLettersNumbersAndUnderscores(): void
    {
        $this->assertNull(P::validateDatabaseName('my_db1', 's5_my_db1'));
        foreach (['%', 'a%', 'db-name', 'db name', 'db`x', 'x\\y', 'ü', ''] as $bad) {
            $this->assertNotNull(P::validateDatabaseName($bad, 's5_' . $bad), $bad);
        }
    }

    public function testNameMustFitOnceEscaped(): void
    {
        // s5\_ plus 60 characters is exactly 64 once escaped.
        $this->assertNull(P::validateDatabaseName(str_repeat('a', 60), 's5_' . str_repeat('a', 60)));
        $this->assertNotNull(P::validateDatabaseName(str_repeat('a', 61), 's5_' . str_repeat('a', 61)));
        // 31 underscores double to 62 characters once escaped (66 with the s5\_ prefix).
        $this->assertNotNull(P::validateDatabaseName(str_repeat('_', 31), 's5_' . str_repeat('_', 31)));
    }

    public function testGrantNameEscapesPatternCharacters(): void
    {
        $this->assertSame('s5\\_my\\_db', P::escapeMySQLGrantPattern('s5_my_db'));
        $this->assertSame('s5\\_\\%', P::escapeMySQLGrantPattern('s5_%'));
        $this->assertSame('a\\\\b', P::escapeMySQLGrantPattern('a\\b'));
        $this->assertSame('`s5\\_db`', P::buildMySQLGrantTarget('s5_db', false));
        $this->assertSame('`s5_db`', P::buildMySQLGrantTarget('s5_db', true));
    }

    public function testGrantTargetNeverFallsBackToTheRawName(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        P::buildMySQLGrantTarget('s5_' . str_repeat('_', 40), false);
    }

    public function testGrantTargetFollowsPartialRevokes(): void
    {
        $this->assertSame('`s5\\_db`', P::mysqlGrantTarget($this->pdo([])->pdo, 's5_db'));
        $this->assertSame('`s5_db`', P::mysqlGrantTarget($this->pdo(['Variable_name' => 'partial_revokes', 'Value' => 'ON'])->pdo, 's5_db'));
    }

    public function testRevokeCoversBothFormsAndIgnoresMissingGrants(): void
    {
        $fake = $this->pdo([], missingGrantOn: '`s5_db`');
        P::revokeMySQLDatabaseGrants($fake->pdo, 's5_db', '`u5_x`', "'%'");
        $this->assertSame([
            "REVOKE ALL PRIVILEGES ON `s5_db`.* FROM `u5_x`@'%'",
            "REVOKE ALL PRIVILEGES ON `s5\\_db`.* FROM `u5_x`@'%'",
        ], $fake->statements->getArrayCopy());
    }

    public function testReissueGrantsTheEscapedNameBeforeRevokingTheOldOne(): void
    {
        $fake = $this->pdo([]);
        $this->assertTrue(P::reissueMySQLGrant($fake->pdo, 's5_db', 'u5_x', '%'));
        $this->assertSame([
            "GRANT ALL PRIVILEGES ON `s5\\_db`.* TO `u5_x`@'%'",
            "REVOKE ALL PRIVILEGES ON `s5_db`.* FROM `u5_x`@'%'",
            'FLUSH PRIVILEGES',
        ], $fake->statements->getArrayCopy());
    }

    public function testReissueNeverCreatesMissingUsers(): void
    {
        $fake = $this->pdo([], userExists: false);
        $this->assertFalse(P::reissueMySQLGrant($fake->pdo, 's5_db', 'u5_x', '%'));
        $this->assertSame([], $fake->statements->getArrayCopy());
    }

    public function testRepairSkipsUnreachableHostsAndStaysPending(): void
    {
        $fake = $this->pdo([]);
        $lines = [];
        $result = DatabaseGrantRepair::run(
            [
                ['id' => 1, 'name' => 'up', 'database_type' => 'mysql'],
                ['id' => 2, 'name' => 'down', 'database_type' => 'mariadb'],
                ['id' => 3, 'name' => 'pg', 'database_type' => 'postgresql'],
            ],
            [
                ['database_host_id' => 1, 'database' => 's5_db', 'username' => 'u5_a', 'remote' => '%'],
                ['database_host_id' => 2, 'database' => 's6_db', 'username' => 'u6_a', 'remote' => '%'],
                ['database_host_id' => 3, 'database' => 's7_db', 'username' => 'u7_a', 'remote' => '%'],
            ],
            function (array $host) use ($fake): \PDO {
                if ($host['id'] === 2) {
                    throw new \PDOException('Connection refused');
                }

                return $fake->pdo;
            },
            function (string $line) use (&$lines): void {
                $lines[] = $line;
            },
        );

        $this->assertSame(1, $result['updated']);
        $this->assertSame(1, $result['skipped']);
        $this->assertFalse($result['complete']);
        $this->assertCount(1, $lines);
        $this->assertStringContainsString('#2', $lines[0]);
    }

    public function testRepairCompletesWhenEveryHostWasHandled(): void
    {
        $fake = $this->pdo([]);
        $result = DatabaseGrantRepair::run(
            [['id' => 1, 'name' => 'up', 'database_type' => 'mysql']],
            [
                ['database_host_id' => 1, 'database' => 's5_db', 'username' => 'u5_a'],
                ['database_host_id' => 1, 'database' => 's5_' . str_repeat('_', 40), 'username' => 'u5_b'],
            ],
            fn (): \PDO => $fake->pdo,
            function (): void {
            },
        );

        $this->assertSame(1, $result['updated']);
        $this->assertSame(1, $result['too_long']);
        $this->assertTrue($result['complete']);
    }

    public function testCreateAndDeletePathsUseTheEscapedGrant(): void
    {
        $root = dirname(__DIR__, 2);
        $server = (string) file_get_contents($root . '/app/Controllers/User/Server/ServerDatabaseController.php');
        $this->assertStringContainsString('RemoteDatabaseProvisioner::validateDatabaseName(', $server);
        $this->assertStringContainsString('GRANT ALL PRIVILEGES ON {$grantTarget}.*', $server);
        $this->assertStringNotContainsString('GRANT ALL PRIVILEGES ON {$safeDbName}.*', $server);

        $provisioner = (string) file_get_contents($root . '/app/Helpers/RemoteDatabaseProvisioner.php');
        $this->assertStringNotContainsString('GRANT ALL PRIVILEGES ON {$safeDbName}.*', $provisioner);

        foreach (['app/Controllers/Admin/ServersController.php', 'app/Controllers/User/Server/ServerUserController.php', 'app/Controllers/User/Server/ServerDatabaseController.php'] as $file) {
            $src = (string) file_get_contents($root . '/' . $file);
            $this->assertStringNotContainsString('REVOKE ALL PRIVILEGES ON {$safeDbName}.*', $src, $file);
        }

        $migrate = (string) file_get_contents($root . '/app/Cli/Commands/Migrate.php');
        $this->assertStringContainsString('DatabaseGrantRepair::runForPanel(', $migrate);
    }

    /**
     * A PDO stand-in that records statements.
     *
     * @param array<string, string> $partialRevokes row returned for SHOW GLOBAL VARIABLES
     *
     * @return object{pdo: \PDO, statements: \ArrayObject<int, string>}
     */
    private function pdo(array $partialRevokes, ?string $missingGrantOn = null, bool $userExists = true): object
    {
        $statements = new \ArrayObject();

        $variables = $this->createMock(\PDOStatement::class);
        $variables->method('fetch')->willReturn($partialRevokes === [] ? false : $partialRevokes);

        $userLookup = $this->createMock(\PDOStatement::class);
        $userLookup->method('execute')->willReturn(true);
        $userLookup->method('fetchColumn')->willReturn($userExists ? 1 : false);

        $pdo = $this->createMock(\PDO::class);
        $pdo->method('query')->willReturn($variables);
        $pdo->method('prepare')->willReturn($userLookup);
        $pdo->method('exec')->willReturnCallback(function (string $sql) use ($statements, $missingGrantOn) {
            $statements[] = $sql;
            if ($missingGrantOn !== null && str_starts_with($sql, 'REVOKE') && str_contains($sql, ' ON ' . $missingGrantOn . '.*')) {
                $e = new \PDOException('There is no such grant defined');
                $e->errorInfo = ['42000', 1141, 'There is no such grant defined'];
                throw $e;
            }

            return 0;
        });

        return (object) ['pdo' => $pdo, 'statements' => $statements];
    }
}
