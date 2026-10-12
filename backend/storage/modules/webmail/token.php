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

$token = (string) ($_GET['token'] ?? '');
if ($token === '' || !str_contains($token, '.')) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Missing or invalid token\n";
    exit;
}

// Secret lives under storage/config (outside the web root), never beside this script.
$secretFile = '';
foreach ([
    // Deployed at public/webmail/token.php
    __DIR__ . '/../../storage/config/webmail.sso.secret',
    // Source copy at storage/modules/webmail/token.php
    __DIR__ . '/../../config/webmail.sso.secret',
] as $candidate) {
    $resolved = realpath($candidate);
    if (is_string($resolved) && is_readable($resolved)) {
        $secretFile = $resolved;
        break;
    }
}
if ($secretFile === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Webmail SSO is not configured\n";
    exit;
}

$secret = trim((string) file_get_contents($secretFile));
if ($secret === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Webmail SSO secret missing\n";
    exit;
}

[$payloadB64, $sigB64] = explode('.', $token, 2);
$payloadRaw = feather_webmail_b64url_decode($payloadB64);
$sigRaw = feather_webmail_b64url_decode($sigB64);
if ($payloadRaw === null || $sigRaw === null) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Malformed token\n";
    exit;
}

$expected = hash_hmac('sha256', $payloadB64, $secret, true);
if (!hash_equals($expected, $sigRaw)) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Invalid token signature\n";
    exit;
}

$data = json_decode($payloadRaw, true);
if (!is_array($data)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Invalid token payload\n";
    exit;
}

$exp = (int) ($data['exp'] ?? 0);
if ($exp < time()) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Token expired\n";
    exit;
}

$user = (string) ($data['u'] ?? '');
$passEnc = (string) ($data['p'] ?? '');
$host = (string) ($data['h'] ?? '');
$port = (int) ($data['o'] ?? 993);
$enc = strtolower((string) ($data['e'] ?? 'ssl'));

$pass = feather_webmail_decrypt_pass($passEnc, $secret);
if ($user === '' || $pass === null || $host === '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Token missing credentials\n";
    exit;
}

$imapHost = match ($enc) {
    'ssl' => 'ssl://' . $host,
    'tls', 'starttls' => 'tls://' . $host,
    default => $host,
};

define('INSTALL_PATH', realpath(__DIR__) . '/');

if (!file_exists(__DIR__ . '/program/include/iniset.php')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Roundcube is not installed\n";
    exit;
}

require_once __DIR__ . '/program/include/iniset.php';

$rcmail = rcmail::get_instance();
$rcmail->config->set('default_host', $imapHost);
$rcmail->config->set('default_port', $port > 0 ? $port : 993);

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

function feather_webmail_b64url_decode(string $data): ?string
{
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    $raw = base64_decode(strtr($data, '-_', '+/'), true);

    return $raw === false ? null : $raw;
}

function feather_webmail_decrypt_pass(string $blob, string $secret): ?string
{
    $raw = feather_webmail_b64url_decode($blob);
    if ($raw === null || strlen($raw) < 29) {
        return null;
    }
    $iv = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $cipher = substr($raw, 28);
    $key = hash('sha256', $secret, true);
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

    return $plain === false ? null : $plain;
}
