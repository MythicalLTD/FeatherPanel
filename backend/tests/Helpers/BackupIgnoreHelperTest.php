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

namespace App\Tests\Helpers;

use PHPUnit\Framework\TestCase;
use App\Helpers\BackupIgnoreHelper;
use PHPUnit\Framework\Attributes\DataProvider;

class BackupIgnoreHelperTest extends TestCase
{
    /**
     * @return array<string, array{0: mixed, 1: list<string>}>
     */
    public static function parseProvider(): array
    {
        return [
            'null' => [null, []],
            'empty string' => ['', []],
            'whitespace only' => ["  \n ", []],
            'empty json array' => ['[]', []],
            'empty json array with spaces' => ['  []  ', []],
            'json array' => ['["*.log","cache/"]', ['*.log', 'cache/']],
            'json array trims and drops empty and non-strings' => ['[" *.log ","",5,null,"tmp/"]', ['*.log', 'tmp/']],
            'php array' => [['*.log', 'cache/'], ['*.log', 'cache/']],
            'php array drops non-strings' => [['*.log', 123, null, true, ['x'], 'tmp/'], ['*.log', 'tmp/']],
            'php array trims and drops empty' => [['  a  ', '', '   ', 'b'], ['a', 'b']],
            'LF separated' => ["*.log\ncache/", ['*.log', 'cache/']],
            'CRLF separated' => ["*.log\r\ncache/\r\n", ['*.log', 'cache/']],
            'comma separated' => ['*.log,cache/, tmp/', ['*.log', 'cache/', 'tmp/']],
            'mixed separators and blank lines' => ["a\n\n,b\r\n , c", ['a', 'b', 'c']],
            'single pattern' => ['  node_modules/  ', ['node_modules/']],
            'integer scalar' => [123, []],
            'float scalar' => [1.5, []],
            'bool scalar' => [true, []],
            'json object is treated as an array' => ['{"a":"x.log"}', ['x.log']],
        ];
    }

    #[DataProvider('parseProvider')]
    public function testParsePatterns(mixed $input, array $expected): void
    {
        $this->assertSame($expected, BackupIgnoreHelper::parsePatterns($input));
    }

    public function testParsePatternsReturnsAList(): void
    {
        $this->assertTrue(array_is_list(BackupIgnoreHelper::parsePatterns(['', 'a', '', 'b'])));
    }

    public function testNormalizeForStorage(): void
    {
        $this->assertSame('["*.log","cache\/"]', BackupIgnoreHelper::normalizeForStorage("*.log\r\ncache/"));
        $this->assertSame('[]', BackupIgnoreHelper::normalizeForStorage(null));
        $this->assertSame('[]', BackupIgnoreHelper::normalizeForStorage(123));
    }

    public function testNormalizeForStorageRoundTrips(): void
    {
        $stored = BackupIgnoreHelper::normalizeForStorage('a, b');
        $this->assertSame($stored, BackupIgnoreHelper::normalizeForStorage($stored));
    }

    public function testFormatForWings(): void
    {
        $this->assertSame("*.log\ncache/", BackupIgnoreHelper::formatForWings('["*.log"," cache/ "]'));
        $this->assertSame("a\nb", BackupIgnoreHelper::formatForWings("a\r\nb"));
        $this->assertSame('', BackupIgnoreHelper::formatForWings(null));
    }
}
