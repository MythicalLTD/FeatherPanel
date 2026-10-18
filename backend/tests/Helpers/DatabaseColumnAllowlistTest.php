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

use App\Chat\Database;
use PHPUnit\Framework\TestCase;

class DatabaseColumnAllowlistTest extends TestCase
{
    private const TABLE = 'featherpanel_allowlist_test';

    protected function setUp(): void
    {
        // Prime the per-process column cache so no database connection is needed.
        $cache = new ReflectionProperty(Database::class, 'columnCache');
        $cache->setValue(null, [self::TABLE => ['id', 'name', 'subject', 'body']]);
    }

    protected function tearDown(): void
    {
        $cache = new ReflectionProperty(Database::class, 'columnCache');
        $cache->setValue(null, []);
    }

    public function testFilterColumnsKeepsOnlyKnownColumns(): void
    {
        $filtered = Database::filterColumns(self::TABLE, [
            'name' => 'a',
            'subject' => 'b',
            'user' => 'c',
            'subject = 1, body' => 'd',
        ]);

        $this->assertSame(['name' => 'a', 'subject' => 'b'], $filtered);
    }

    public function testFilterColumnsCanReturnEmptyArray(): void
    {
        $this->assertSame([], Database::filterColumns(self::TABLE, ['bogus' => 1]));
    }

    public function testUnknownColumnsListsEveryUnknownKey(): void
    {
        $this->assertSame(
            ['user', 'x` = 1'],
            Database::unknownColumns(self::TABLE, ['name' => 'a', 'user' => 'b', 'x` = 1' => 'c'])
        );
        $this->assertSame([], Database::unknownColumns(self::TABLE, ['id' => 1, 'body' => 'x']));
    }

    public function testUnknownColumnsHandlesIntegerKeys(): void
    {
        $this->assertSame(['0'], Database::unknownColumns(self::TABLE, ['value']));
    }

    public function testQuoteIdentifierWrapsAndEscapesBackticks(): void
    {
        $this->assertSame('`name`', Database::quoteIdentifier('name'));
        $this->assertSame('`a``b`', Database::quoteIdentifier('a`b'));
    }

    public function testTableColumnCountRejectsUnknownWhereKeys(): void
    {
        $this->assertSame(0, Database::getTableColumnCount(self::TABLE, ['name = 1 OR 1' => 1], true));
    }

    public function testTableColumnCountRejectsUnknownOperators(): void
    {
        $this->assertSame(0, Database::getTableColumnCount(self::TABLE, [['id', 'OR 1=1 --', 1]], true));
        $this->assertSame(0, Database::getTableColumnCount(self::TABLE, [['bogus', '=', 1]], true));
    }
}
