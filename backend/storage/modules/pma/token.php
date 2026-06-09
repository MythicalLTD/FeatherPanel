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

ini_set('session.use_cookies', 'true');

/* Change this to false if using phpMyAdmin over http */
$secure_cookie = true;

session_set_cookie_params(0, '/', '', $secure_cookie, true);
$session_name = 'TokenSession';
session_name($session_name);
@session_start();

// Check if database credentials are provided as query parameters (for automatic login from panel)
if (isset($_GET['db']) && isset($_GET['host']) && isset($_GET['user']) && isset($_GET['pass'])) {
    // Set phpMyAdmin signon session variables with database connection details directly from query parameters
    $_SESSION['PMA_single_signon_user'] = $_GET['user'];
    $_SESSION['PMA_single_signon_password'] = $_GET['pass'];
    $_SESSION['PMA_single_signon_host'] = $_GET['host'];
    $_SESSION['PMA_single_signon_port'] = isset($_GET['port']) ? (string) $_GET['port'] : '3306';
    $_SESSION['PMA_single_signon_HMAC_secret'] = hash('sha1', uniqid(strval(random_int(0, mt_getrandmax())), true));

    // Set database name
    $_SESSION['PMA_single_signon_database'] = $_GET['db'];

    @session_write_close();

    $pmaPageMode = 'connect';
    $pmaErrorMessage = null;
    $pmaRedirectUrl = 'index.php?server=1&db=' . urlencode($_GET['db']);
    $pmaRedirectDelay = 500;
    $pmaPostLoadScript = '';

    header('Content-Type: text/html; charset=utf-8');
    require __DIR__ . '/auth-page.php';
    exit;
}

$pmaPageMode = isset($_SESSION['PMA_single_signon_error_message']) ? 'error' : 'connect';
$pmaErrorMessage = isset($_SESSION['PMA_single_signon_error_message'])
    ? htmlspecialchars($_SESSION['PMA_single_signon_error_message'])
    : null;
$pmaRedirectUrl = null;
$pmaRedirectDelay = 500;
$pmaPostLoadScript = '';

header('Content-Type: text/html; charset=utf-8');
require __DIR__ . '/auth-page.php';
