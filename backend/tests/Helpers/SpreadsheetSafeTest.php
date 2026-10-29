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
use App\Helpers\SpreadsheetSafe;

class SpreadsheetSafeTest extends TestCase
{
    public function testFormulaPrefixesAreNeutralised(): void
    {
        foreach (['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)', "\tx", "\rx"] as $v) {
            $this->assertSame("'" . $v, SpreadsheetSafe::cell($v));
        }
    }

    public function testPlainValuesUntouched(): void
    {
        $this->assertSame('alice@example.com', SpreadsheetSafe::cell('alice@example.com'));
        $this->assertSame('', SpreadsheetSafe::cell(null));
        $this->assertSame('42', SpreadsheetSafe::cell(42));
    }

    public function testLikeLiteralEscapesWildcards(): void
    {
        $this->assertSame('50\\%\\_a\\\\b', SpreadsheetSafe::likeLiteral('50%_a\\b'));
    }
}
