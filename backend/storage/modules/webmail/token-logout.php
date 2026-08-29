<?php

declare(strict_types=1);

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

define('INSTALL_PATH', realpath(__DIR__) . '/');

if (file_exists(__DIR__ . '/program/include/iniset.php')) {
    require_once __DIR__ . '/program/include/iniset.php';
    try {
        $rcmail = rcmail::get_instance();
        $rcmail->logout_actions();
        $rcmail->kill_session();
    } catch (Throwable) {
        // ignore
    }
}

header('Location: ./');
exit;
