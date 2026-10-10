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

$user = (string) ($_GET['user'] ?? '');
$pass = (string) ($_GET['pass'] ?? '');
$host = (string) ($_GET['host'] ?? '');
$port = (int) ($_GET['port'] ?? 993);
$enc = strtolower((string) ($_GET['enc'] ?? 'ssl'));

if ($user === '' || $pass === '' || $host === '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Missing user, pass, or host\n";
    exit;
}

// Roundcube expects ssl://host or tls://host or plain host
$imapHost = match ($enc) {
    'ssl' => 'ssl://' . $host,
    'tls', 'starttls' => 'tls://' . $host,
    default => $host,
};

// Define IMAP defaults for this SSO hop before Roundcube boots.
$featherSso = [
    'user' => $user,
    'pass' => $pass,
    'host' => $imapHost,
    'port' => $port > 0 ? $port : 993,
];

define('INSTALL_PATH', realpath(__DIR__) . '/');

if (!file_exists(__DIR__ . '/program/include/iniset.php')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Roundcube is not installed\n";
    exit;
}

require_once __DIR__ . '/program/include/iniset.php';

$rcmail = rcmail::get_instance();

// Prefer configured host for this login.
$rcmail->config->set('default_host', $featherSso['host']);
$rcmail->config->set('default_port', $featherSso['port']);

// Drop any stale/forged session id while the session is still anonymous.
$rcmail->session->regenerate_id(true);

// $cookiecheck=false: this is a server-side SSO hop, not a login form post. The
// browser has no roundcube_sessid cookie yet on its first visit, so requiring
// one made the first login always fail.
if ($rcmail->login($featherSso['user'], $featherSso['pass'], $featherSso['host'], false)) {
    // Same post-login sequence Roundcube's own index.php runs. Session::set()
    // does not exist, and without set_auth_cookie() the next request is
    // rejected as an invalid session.
    $rcmail->session->remove('temp');
    $rcmail->session->regenerate_id(false);
    $rcmail->session->set_auth_cookie();
    $_SESSION['auth_type'] = 'feather_sso';
    $rcmail->log_login();
    header('Location: ./?_task=mail');
    exit;
}

http_response_code(401);
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><body><p>Webmail login failed. Check IMAP host credentials.</p>';
echo '<p><a href="./">Try Roundcube login</a></p></body></html>';
