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

$session_name = 'TokenSession';
session_name($session_name);
@session_start();
session_unset();
session_destroy();

$pmaPageMode = 'logout';
$pmaErrorMessage = null;
$pmaRedirectUrl = null;
$pmaRedirectDelay = 500;
$pmaPostLoadScript = 'setTimeout(function() { window.close(); }, 1000);';

require __DIR__ . '/auth-page.php';
