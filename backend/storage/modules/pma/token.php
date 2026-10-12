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

/**
 * Exchange a panel-issued single-use token for signon credentials.
 * Never accept raw db/host/user/pass from the request.
 *
 * When deployed, this file lives at public/pma/token.php, so
 * dirname(__DIR__, 2) resolves to the backend root.
 */
if (isset($_GET['token']) && preg_match('/^[a-f0-9]{64}$/D', (string) $_GET['token'])) {
    $token = (string) $_GET['token'];
    $tokenDir = dirname(__DIR__, 2) . '/storage/db_signon_tokens';
    $tokenFile = $tokenDir . '/' . $token . '.json';
    $consumed = $tokenDir . '/' . $token . '.used.' . getmypid();

    $data = null;
    // Atomic consume: only the process that successfully renames wins.
    if (is_file($tokenFile) && @rename($tokenFile, $consumed)) {
        $raw = @file_get_contents($consumed);
        @unlink($consumed);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)
                && isset($decoded['db'], $decoded['host'], $decoded['user'], $decoded['pass'], $decoded['expires'])
                && (int) $decoded['expires'] >= time()) {
                $data = $decoded;
            }
        }
    }

    if ($data !== null) {
        $_SESSION['PMA_single_signon_user'] = (string) $data['user'];
        $_SESSION['PMA_single_signon_password'] = (string) $data['pass'];
        $_SESSION['PMA_single_signon_host'] = (string) $data['host'];
        $_SESSION['PMA_single_signon_port'] = (string) ($data['port'] ?? 3306);
        $_SESSION['PMA_single_signon_HMAC_secret'] = hash('sha1', uniqid(strval(random_int(0, mt_getrandmax())), true));
        $_SESSION['PMA_single_signon_database'] = (string) $data['db'];

        @session_write_close();

        $pmaPageMode = 'connect';
        $pmaErrorMessage = null;
        $pmaRedirectUrl = 'index.php?server=1&db=' . urlencode((string) $data['db']);
        $pmaRedirectDelay = 500;
        $pmaPostLoadScript = '';

        header('Content-Type: text/html; charset=utf-8');
        require __DIR__ . '/auth-page.php';
        exit;
    }

    $pmaPageMode = 'error';
    $pmaErrorMessage = 'This phpMyAdmin link is invalid or has expired. Open phpMyAdmin again from the panel.';
    $pmaRedirectUrl = null;
    $pmaRedirectDelay = 500;
    $pmaPostLoadScript = '';

    header('Content-Type: text/html; charset=utf-8');
    http_response_code(403);
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
