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
use App\Chat\PushSubscription;
use App\Config\ConfigInterface;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;

/**
 * Delivers inbox events as Web Push notifications to browsers that opted in.
 * Failures are logged and never reach the caller. Gone/expired endpoints are removed.
 */
class WebPushNotifier
{
    public const PREF_KEY = ExternalNotifier::PREF_KEY;

    /** @return array{publicKey: string, privateKey: string}|null */
    public static function ensureVapidKeys(): ?array
    {
        $config = App::getInstance(true)->getConfig();
        $public = trim((string) $config->getSetting(ConfigInterface::APP_PWA_VAPID_PUBLIC, ''));
        $private = trim((string) $config->getSetting(ConfigInterface::APP_PWA_VAPID_PRIVATE, ''));

        if ($public !== '' && $private !== '') {
            return ['publicKey' => $public, 'privateKey' => $private];
        }

        try {
            $keys = VAPID::createVapidKeys();
            $config->setSetting(ConfigInterface::APP_PWA_VAPID_PUBLIC, $keys['publicKey']);
            $config->setSetting(ConfigInterface::APP_PWA_VAPID_PRIVATE, $keys['privateKey']);

            return ['publicKey' => $keys['publicKey'], 'privateKey' => $keys['privateKey']];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to generate VAPID keys: ' . $e->getMessage());

            return null;
        }
    }

    public static function isEnabled(): bool
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::APP_PWA_ENABLED, 'false') !== 'true') {
            return false;
        }
        if ($config->getSetting(ConfigInterface::APP_PWA_PUSH_ENABLED, 'false') !== 'true') {
            return false;
        }
        $keys = self::ensureVapidKeys();

        return $keys !== null;
    }

    public static function publicKey(): ?string
    {
        if (!self::isEnabled()) {
            return null;
        }
        $keys = self::ensureVapidKeys();

        return $keys['publicKey'] ?? null;
    }

    /** Best-effort push for one inbox notification. */
    public static function deliver(array $user, string $kind, array $data, string $link): void
    {
        try {
            if (!self::isEnabled()) {
                return;
            }
            $userId = (int) ($user['id'] ?? 0);
            $uuid = (string) ($user['uuid'] ?? '');
            if ($userId <= 0 || $uuid === '') {
                return;
            }

            $prefs = ExternalNotifier::getPreferences($uuid);
            if (empty($prefs['push_enabled'])) {
                return;
            }

            $event = self::eventFor($kind);
            if ($event !== null && empty($prefs['events'][$event])) {
                return;
            }

            $subs = PushSubscription::listForUser($userId);
            if ($subs === []) {
                return;
            }

            $config = App::getInstance(true)->getConfig();
            $appName = (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
            $base = rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/');
            $url = $link !== '' ? ($base !== '' ? $base . $link : $link) : ($base !== '' ? $base . '/dashboard' : '/dashboard');
            $title = self::titleFor($kind, $appName);
            $body = self::bodyFor($kind, $data);

            self::sendToSubscriptions($subs, [
                'title' => $title,
                'body' => $body,
                'url' => $url,
                'tag' => 'fp-' . $kind,
                'kind' => $kind,
            ]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Web push failed: ' . $e->getMessage());
        }
    }

    /** Sends a one-off test notification to every subscription for the user. */
    public static function test(array $user): ?string
    {
        if (!self::isEnabled()) {
            return 'Web push is not enabled';
        }
        $userId = (int) ($user['id'] ?? 0);
        if ($userId <= 0) {
            return 'Invalid user';
        }
        $subs = PushSubscription::listForUser($userId);
        if ($subs === []) {
            return 'No push subscriptions on this account';
        }
        $config = App::getInstance(true)->getConfig();
        $appName = (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $base = rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/');

        self::sendToSubscriptions($subs, [
            'title' => $appName,
            'body' => 'Push notifications are working.',
            'url' => $base !== '' ? $base . '/dashboard/account?tab=notifications' : '/dashboard/account?tab=notifications',
            'tag' => 'fp-push-test',
            'kind' => 'test',
        ]);

        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $subs
     * @param array{title: string, body: string, url: string, tag: string, kind: string} $payload
     */
    private static function sendToSubscriptions(array $subs, array $payload): void
    {
        $keys = self::ensureVapidKeys();
        if ($keys === null) {
            return;
        }
        $config = App::getInstance(true)->getConfig();
        $subject = trim((string) $config->getSetting(ConfigInterface::APP_PWA_VAPID_SUBJECT, ''));
        if ($subject === '') {
            $appUrl = rtrim((string) $config->getSetting(ConfigInterface::APP_URL, ''), '/');
            $host = $appUrl !== '' ? (parse_url($appUrl, PHP_URL_HOST) ?: 'localhost') : 'localhost';
            $subject = 'mailto:noreply@' . $host;
        }

        $auth = [
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $keys['publicKey'],
                'privateKey' => $keys['privateKey'],
            ],
        ];

        $webPush = new WebPush($auth, ['TTL' => 60, 'urgency' => 'normal']);
        $webPush->setReuseVAPIDHeaders(true);
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            return;
        }

        foreach ($subs as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => (string) $sub['endpoint'],
                    'publicKey' => (string) $sub['p256dh'],
                    'authToken' => (string) $sub['auth'],
                    'contentEncoding' => (string) ($sub['content_encoding'] ?? 'aes128gcm'),
                ]);
                $webPush->queueNotification($subscription, $json);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning('Invalid push subscription skipped: ' . $e->getMessage());
                PushSubscription::deleteByEndpoint((string) $sub['endpoint']);
            }
        }

        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            if ($report->isSuccess()) {
                continue;
            }
            $code = $report->getResponse() ? $report->getResponse()->getStatusCode() : 0;
            // 404/410 mean the browser dropped the subscription.
            if (in_array($code, [404, 410], true)) {
                PushSubscription::deleteByEndpoint($endpoint);
            } else {
                App::getInstance(true)->getLogger()->warning(
                    'Web push delivery failed (' . $code . '): ' . $report->getReason()
                );
            }
        }
    }

    private static function eventFor(string $kind): ?string
    {
        foreach (ExternalNotifier::EVENTS as $event => $kinds) {
            if (in_array($kind, $kinds, true)) {
                return $event;
            }
        }

        return null;
    }

    private static function titleFor(string $kind, string $appName): string
    {
        $titles = [
            'ticket_reply' => 'Ticket reply',
            'backup_completed' => 'Backup completed',
            'backup_failed' => 'Backup failed',
            'server_crashed' => 'Server crashed',
            'file_transfer_completed' => 'File transfer completed',
            'file_transfer_failed' => 'File transfer failed',
            'resource_limit' => 'Resource limit',
            'transfer_power_failed' => 'Server not started',
            'vds_down' => 'VDS went down',
            'vds_high_cpu' => 'VDS high CPU',
            'vds_backup_failed' => 'VDS backup failed',
            'vds_bandwidth' => 'VDS traffic limit',
            'vds_expiring' => 'VDS expires soon',
            'storage_disconnected' => 'Backup storage disconnected',
            'node_alert' => 'Node alert',
            'server_inactive' => 'Inactive server',
            'webspace_installed' => 'Web hosting ready',
            'webspace_install_failed' => 'Web hosting install failed',
            'webspace_backup_completed' => 'Web hosting backup completed',
            'webspace_backup_failed' => 'Web hosting backup failed',
            'webspace_limit' => 'Web hosting near limit',
            'webspace_malware' => 'Malware found',
        ];

        return mb_substr(($titles[$kind] ?? 'Notification') . ' · ' . $appName, 0, 100);
    }

    private static function bodyFor(string $kind, array $data): string
    {
        $lines = ExternalNotifier::describe($kind, $data);
        if ($lines !== []) {
            return mb_substr(implode(' · ', $lines), 0, 180);
        }
        foreach (['server_name', 'webspace_name', 'vds_name', 'ticket_title', 'storage_name'] as $key) {
            if (!empty($data[$key])) {
                return mb_substr((string) $data[$key], 0, 180);
            }
        }

        return 'Open the panel for details.';
    }
}
