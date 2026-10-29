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

namespace App\Helpers;

/**
 * Neutralises spreadsheet formula injection (CSV injection) in exported cells.
 *
 * Excel, LibreOffice and Google Sheets run a cell as a formula when it starts with
 * = + - @ (or a tab / carriage return). Prefixing a single quote makes them show the text instead.
 */
class SpreadsheetSafe
{
    public static function cell(mixed $value): string
    {
        $value = (string) ($value ?? '');

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'" . $value : $value;
    }

    /**
     * Escape LIKE wildcards so user search text is matched literally.
     */
    public static function likeLiteral(string $value): string
    {
        return addcslashes($value, '%_\\');
    }
}
