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

use App\Services\Mail\NodeMailProvisioner;

/**
 * Provisions mailboxes on external mail hosts.
 *
 * Modes:
 * - inventory: panel is source of truth (no remote call)
 * - webhook: POST JSON actions to provision_url with Bearer API key
 * - node: FeatherQuilld docker-mailserver on the linked web node
 */
class RemoteMailProvisioner
{
    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string, password: string, quota_mb?: int, enabled?: bool} $mailbox
     */
    public static function create(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'create', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string} $mailbox
     */
    public static function delete(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'delete', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string, password: string} $mailbox
     */
    public static function resetPassword(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'reset_password', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string, enabled: bool} $mailbox
     */
    public static function setEnabled(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'set_enabled', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{source: string, destination: string, enabled?: bool} $forwarder
     */
    public static function setForward(array $mailHost, array $forwarder): void
    {
        self::dispatch($mailHost, 'set_forward', $forwarder);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{source: string, destination: string} $forwarder
     */
    public static function deleteForward(array $mailHost, array $forwarder): void
    {
        self::dispatch($mailHost, 'delete_forward', $forwarder);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string, enabled: bool, subject?: string, body?: string} $mailbox
     */
    public static function setAutorespond(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'set_autorespond', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{email: string, enabled: bool} $mailbox
     */
    public static function setSpamFilter(array $mailHost, array $mailbox): void
    {
        self::dispatch($mailHost, 'set_spam_filter', $mailbox);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{address: string, members: list<string>} $list
     */
    public static function createMailingList(array $mailHost, array $list): void
    {
        self::dispatch($mailHost, 'create_list', $list);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{address: string} $list
     */
    public static function deleteMailingList(array $mailHost, array $list): void
    {
        self::dispatch($mailHost, 'delete_list', $list);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array{address: string, member: string, add: bool} $payload
     */
    public static function setMailingListMember(array $mailHost, array $payload): void
    {
        self::dispatch($mailHost, 'set_list_member', $payload);
    }

    public static function generateRandomString(int $length): string
    {
        return RemoteDatabaseProvisioner::generateRandomString($length);
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param array<string, mixed> $mailbox
     */
    private static function dispatch(array $mailHost, string $action, array $mailbox): void
    {
        $mode = strtolower(trim((string) ($mailHost['provision_mode'] ?? 'inventory')));
        if ($mode === 'inventory' || $mode === '') {
            return;
        }

        if ($mode === 'node') {
            NodeMailProvisioner::dispatch($mailHost, $action, $mailbox);

            return;
        }

        if ($mode !== 'webhook') {
            throw new \InvalidArgumentException('Unsupported mail provision mode: ' . $mode);
        }

        $url = trim((string) ($mailHost['provision_url'] ?? ''));
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            throw new \RuntimeException('Mail host provision_url is missing or invalid');
        }

        $payload = array_merge(['action' => $action], $mailbox);
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: FeatherPanel-MailProvisioner/1.0',
        ];
        $apiKey = trim((string) ($mailHost['provision_api_key'] ?? ''));
        if ($apiKey !== '') {
            $headers[] = 'Authorization: Bearer ' . $apiKey;
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to initialize mail provision request');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            throw new \RuntimeException('Mail provision request failed: ' . $error);
        }

        if ($status < 200 || $status >= 300) {
            $snippet = is_string($response) ? substr(trim($response), 0, 200) : '';
            throw new \RuntimeException('Mail provision webhook returned HTTP ' . $status . ($snippet !== '' ? ': ' . $snippet : ''));
        }
    }
}
