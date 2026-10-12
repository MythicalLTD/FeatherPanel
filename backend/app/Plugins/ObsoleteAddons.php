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

namespace App\Plugins;

/**
 * Addons that were folded into core (or retired) and must not be loaded at runtime.
 *
 * Leftover directories (especially after a partial delete) can still expose Routes/
 * and cause Class not found 500s. Migrate removes these trees; boot skips them.
 */
final class ObsoleteAddons
{
    /**
     * @var list<string>
     */
    public const IDENTIFIERS = [
        'yetanotherbadupdate',
        'whitelabel',
        'navlayout',
        'notsofeatherai',
    ];

    public static function isObsolete(string $identifier): bool
    {
        return in_array($identifier, self::IDENTIFIERS, true);
    }

    /**
     * @return list<string>
     */
    public static function identifiers(): array
    {
        return self::IDENTIFIERS;
    }
}
