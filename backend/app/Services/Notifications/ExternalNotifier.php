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

namespace App\Services\Notifications;

use App\App;
use App\Chat\MailList;
use App\Chat\MailQueue;
use GuzzleHttp\Client;
use App\Chat\UserPreference;
use App\Chat\UserNotification;
use App\Config\ConfigInterface;

/**
 * Delivers server event notifications outside the panel: email and a personal Discord webhook.
 * Both channels are on by default (opt-out). Each user stores their choices in the
 * user preferences table under PREF_KEY. Failures are logged and never reach the caller.
 */
class ExternalNotifier
{
    public const PREF_KEY = 'server_notifications';

    /** Events a user can opt out of, mapped to the inbox kinds they cover. */
    public const EVENTS = [
        'server_crashed' => [UserNotification::KIND_SERVER_CRASHED],
        'backup_completed' => [UserNotification::KIND_BACKUP_COMPLETED],
        'backup_failed' => [UserNotification::KIND_BACKUP_FAILED],
        'file_transfer' => [UserNotification::KIND_FILE_TRANSFER_COMPLETED, UserNotification::KIND_FILE_TRANSFER_FAILED],
        'resource_limit' => [UserNotification::KIND_RESOURCE_LIMIT],
        'transfer_power' => [UserNotification::KIND_TRANSFER_POWER_FAILED],
        'vds_down' => [UserNotification::KIND_VDS_DOWN],
        'vds_high_cpu' => [UserNotification::KIND_VDS_HIGH_CPU],
        'vds_backup_failed' => [UserNotification::KIND_VDS_BACKUP_FAILED],
        'vds_bandwidth' => [UserNotification::KIND_VDS_BANDWIDTH],
        'vds_expiring' => [UserNotification::KIND_VDS_EXPIRING],
    ];

    private const TITLES = [
        UserNotification::KIND_SERVER_CRASHED => 'Server crashed',
        UserNotification::KIND_BACKUP_COMPLETED => 'Backup completed',
        UserNotification::KIND_BACKUP_FAILED => 'Backup failed',
        UserNotification::KIND_FILE_TRANSFER_COMPLETED => 'File transfer completed',
        UserNotification::KIND_FILE_TRANSFER_FAILED => 'File transfer failed',
        UserNotification::KIND_RESOURCE_LIMIT => 'Server near its resource limit',
        UserNotification::KIND_TRANSFER_POWER_FAILED => 'Server could not be started after transfer',
        UserNotification::KIND_VDS_DOWN => 'VDS went down',
        UserNotification::KIND_VDS_HIGH_CPU => 'VDS CPU usage is high',
        UserNotification::KIND_VDS_BACKUP_FAILED => 'VDS backup failed',
        UserNotification::KIND_VDS_BANDWIDTH => 'VDS traffic limit',
        UserNotification::KIND_VDS_EXPIRING => 'VDS expires soon',
    ];

    private const COLORS = [
        UserNotification::KIND_SERVER_CRASHED => 0xEF4444,
        UserNotification::KIND_BACKUP_FAILED => 0xEF4444,
        UserNotification::KIND_FILE_TRANSFER_FAILED => 0xEF4444,
        UserNotification::KIND_RESOURCE_LIMIT => 0xF59E0B,
        UserNotification::KIND_TRANSFER_POWER_FAILED => 0xEF4444,
        UserNotification::KIND_VDS_DOWN => 0xEF4444,
        UserNotification::KIND_VDS_HIGH_CPU => 0xF59E0B,
        UserNotification::KIND_VDS_BACKUP_FAILED => 0xEF4444,
        UserNotification::KIND_VDS_BANDWIDTH => 0xF59E0B,
        UserNotification::KIND_VDS_EXPIRING => 0xF97316,
    ];

    /** Stored preferences merged over the defaults. */
    public static function getPreferences(string $userUuid): array
    {
        $stored = UserPreference::getPreferences($userUuid)[self::PREF_KEY] ?? [];

        return self::normalize(is_array($stored) ? $stored : []);
    }

    /** Validates and fills a preferences document. */
    public static function normalize(array $input): array
    {
        $events = [];
        foreach (array_keys(self::EVENTS) as $event) {
            $events[$event] = !isset($input['events'][$event]) || (bool) $input['events'][$event];
        }
        $webhook = trim((string) ($input['discord_webhook_url'] ?? ''));

        return [
            'email_enabled' => !array_key_exists('email_enabled', $input) || (bool) $input['email_enabled'],
            'discord_enabled' => !array_key_exists('discord_enabled', $input) || (bool) $input['discord_enabled'],
            'discord_webhook_url' => $webhook,
            'events' => $events,
        ];
    }

    public static function isValidWebhook(string $url): bool
    {
        return $url === '' || (bool) preg_match('#^https://(?:(?:ptb|canary)\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$#', $url);
    }

    /** Called for every inbox notification; sends the matching external copies. */
    public static function deliver(array $user, string $kind, array $data, string $link): void
    {
        try {
            $event = self::eventFor($kind);
            $uuid = (string) ($user['uuid'] ?? '');
            if ($event === null || $uuid === '') {
                return;
            }
            $prefs = self::getPreferences($uuid);
            if (!$prefs['events'][$event]) {
                return;
            }
            $config = App::getInstance(true)->getConfig();
            $appName = (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
            $url = rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/') . $link;
            $title = self::TITLES[$kind] ?? 'Server event';
            $lines = self::describe($kind, $data);

            if ($prefs['email_enabled'] && !empty($user['email'])) {
                self::email($uuid, $appName, $title, $lines, $url);
            }
            if ($prefs['discord_enabled'] && $prefs['discord_webhook_url'] !== '' && self::isValidWebhook($prefs['discord_webhook_url'])) {
                self::discord($prefs['discord_webhook_url'], $appName, $kind, $title, $lines, $url);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('External notification failed: ' . $e->getMessage());
        }
    }

    /** Sends a test message to a webhook; returns null on success or an error message. */
    public static function testDiscord(string $webhook, string $appName): ?string
    {
        try {
            self::discord($webhook, $appName, 'test', 'Test notification', ['Discord notifications are working.'], '');

            return null;
        } catch (\Throwable $e) {
            return 'Discord rejected the webhook';
        }
    }

    private static function eventFor(string $kind): ?string
    {
        foreach (self::EVENTS as $event => $kinds) {
            if (in_array($kind, $kinds, true)) {
                return $event;
            }
        }

        return null;
    }

    /** @return string[] */
    private static function describe(string $kind, array $data): array
    {
        $lines = [];
        if (!empty($data['server_name'])) {
            $lines[] = 'Server: ' . $data['server_name'];
        }
        if (!empty($data['vds_name'])) {
            $lines[] = 'VDS: ' . $data['vds_name'];
        }
        if ($kind === UserNotification::KIND_VDS_DOWN) {
            $lines[] = 'The VDS stopped without a power action from the panel.';
        }
        if ($kind === UserNotification::KIND_VDS_HIGH_CPU && isset($data['percent'], $data['minutes'])) {
            $lines[] = 'CPU: ' . $data['percent'] . '% for at least ' . $data['minutes'] . ' minutes';
        }
        if ($kind === UserNotification::KIND_VDS_EXPIRING && isset($data['expires_at'])) {
            $lines[] = 'Expires: ' . $data['expires_at'] . ' UTC';
        }
        if ($kind === UserNotification::KIND_VDS_BANDWIDTH && isset($data['percent'], $data['used_gb'], $data['limit_gb'])) {
            $lines[] = 'Traffic this month: ' . $data['used_gb'] . ' GB of ' . $data['limit_gb'] . ' GB (' . $data['percent'] . '%)';
            if (!empty($data['action_label'])) {
                $lines[] = $data['action_label'];
            }
        }
        if ($kind === UserNotification::KIND_VDS_BACKUP_FAILED && !empty($data['error'])) {
            $lines[] = 'Error: ' . $data['error'];
        }
        if (!empty($data['backup_name'])) {
            $lines[] = 'Backup: ' . $data['backup_name'];
        }
        if (!empty($data['metric']) && isset($data['percent'])) {
            $labels = ['cpu' => 'CPU', 'memory' => 'Memory', 'disk' => 'Disk'];
            $lines[] = ($labels[$data['metric']] ?? $data['metric']) . ': ' . $data['percent'] . '% of the limit';
        }
        if (!empty($data['target_name'])) {
            $lines[] = 'Target: ' . $data['target_name'] . ' (' . ($data['count'] ?? '0') . ' items)';
        }
        if ($kind === UserNotification::KIND_TRANSFER_POWER_FAILED) {
            $lines[] = 'The server was running before its transfer but could not be started on the new node. Start it manually.';
        }

        return $lines;
    }

    private static function email(string $uuid, string $appName, string $title, array $lines, string $url): void
    {
        $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $body = '<h2>' . $esc($title) . '</h2>';
        foreach ($lines as $line) {
            $body .= '<p>' . $esc($line) . '</p>';
        }
        $body .= '<p><a href="' . $esc($url) . '">Open in ' . $esc($appName) . '</a></p>'
            . '<p style="color:#888;font-size:12px">You can turn these emails off under Account, Notifications.</p>';

        $id = MailQueue::create(['user_uuid' => $uuid, 'subject' => $appName . ': ' . $title, 'body' => $body]);
        if ($id === false || $id === true) {
            return;
        }
        MailList::create(['queue_id' => $id, 'user_uuid' => $uuid]);
    }

    private static function discord(string $webhook, string $appName, string $kind, string $title, array $lines, string $url): void
    {
        $embed = [
            'title' => mb_substr($title, 0, 200),
            'description' => mb_substr(implode("\n", $lines), 0, 1800),
            'color' => self::COLORS[$kind] ?? 0x8B5CF6,
            'footer' => ['text' => mb_substr($appName, 0, 80)],
            'timestamp' => gmdate('c'),
        ];
        if ($url !== '' && filter_var($url, FILTER_VALIDATE_URL)) {
            $embed['url'] = $url;
        }
        (new Client(['timeout' => 5, 'connect_timeout' => 3]))->post($webhook, [
            'json' => ['username' => mb_substr($appName, 0, 80), 'embeds' => [$embed]],
        ]);
    }
}
