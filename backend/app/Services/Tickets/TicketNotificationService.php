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

namespace App\Services\Tickets;

use App\App;
use App\Chat\User;
use App\Config\ConfigInterface;
use App\Mail\templates\TicketClosed;
use App\Mail\templates\TicketReopened;
use App\Mail\templates\TicketReplied;

class TicketNotificationService
{
    public static function notifyReply(array $ticket, array $message, ?string $replierUuid = null): void
    {
        if ((int) ($message['is_internal'] ?? 0) === 1) {
            return;
        }

        $ticketOwnerUuid = (string) ($ticket['user_uuid'] ?? '');
        if ($ticketOwnerUuid === '') {
            return;
        }

        if ($replierUuid !== null && $replierUuid === $ticketOwnerUuid) {
            return;
        }

        $owner = User::getUserByUuid($ticketOwnerUuid);
        if ($owner === null) {
            return;
        }

        $replier = $replierUuid !== null ? User::getUserByUuid($replierUuid) : null;
        $data = self::buildBaseMailData($owner, $ticket);
        $data['reply_preview'] = self::buildMessagePreview((string) ($message['message'] ?? ''));
        $data['replier_name'] = self::formatReplierName($replier);
        $data['subject'] = 'New reply on your ticket: ' . ($ticket['title'] ?? 'Support Ticket');

        try {
            TicketReplied::send($data);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to queue ticket reply email: ' . $e->getMessage());
        }
    }

    public static function notifyClosed(array $ticket): void
    {
        $owner = self::getTicketOwner($ticket);
        if ($owner === null) {
            return;
        }

        $data = self::buildBaseMailData($owner, $ticket);
        $data['subject'] = 'Your ticket has been closed: ' . ($ticket['title'] ?? 'Support Ticket');

        try {
            TicketClosed::send($data);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to queue ticket closed email: ' . $e->getMessage());
        }
    }

    public static function notifyReopened(array $ticket): void
    {
        $owner = self::getTicketOwner($ticket);
        if ($owner === null) {
            return;
        }

        $data = self::buildBaseMailData($owner, $ticket);
        $data['subject'] = 'Your ticket has been reopened: ' . ($ticket['title'] ?? 'Support Ticket');

        try {
            TicketReopened::send($data);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to queue ticket reopened email: ' . $e->getMessage());
        }
    }

    private static function getTicketOwner(array $ticket): ?array
    {
        $ticketOwnerUuid = (string) ($ticket['user_uuid'] ?? '');
        if ($ticketOwnerUuid === '') {
            return null;
        }

        return User::getUserByUuid($ticketOwnerUuid);
    }

    /**
     * @return array<string, string>
     */
    private static function buildBaseMailData(array $owner, array $ticket): array
    {
        $app = App::getInstance(false, true);
        $config = $app->getConfig();
        $appUrl = (string) $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        if (!preg_match('#^https?://#i', $appUrl)) {
            $appUrl = 'https://' . ltrim($appUrl, '/');
        }
        $appUrl = rtrim($appUrl, '/');

        return [
            'email' => (string) $owner['email'],
            'uuid' => (string) $owner['uuid'],
            'first_name' => (string) $owner['first_name'],
            'last_name' => (string) $owner['last_name'],
            'username' => (string) $owner['username'],
            'app_name' => (string) $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $appUrl,
            'app_support_url' => (string) $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
            'enabled' => (string) $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
            'ticket_title' => (string) ($ticket['title'] ?? 'Support Ticket'),
            'ticket_url' => $appUrl . '/dashboard/tickets/' . ($ticket['uuid'] ?? ''),
            'dashboard_url' => $appUrl . '/dashboard',
            'support_url' => (string) $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
        ];
    }

    private static function formatReplierName(?array $replier): string
    {
        if ($replier === null) {
            return 'Support Team';
        }

        $firstName = trim((string) ($replier['first_name'] ?? ''));
        $lastName = trim((string) ($replier['last_name'] ?? ''));
        $fullName = trim($firstName . ' ' . $lastName);
        if ($fullName !== '') {
            return $fullName;
        }

        $username = trim((string) ($replier['username'] ?? ''));
        if ($username !== '') {
            return $username;
        }

        return 'Support Team';
    }

    private static function buildMessagePreview(string $message): string
    {
        $message = trim($message);
        if ($message === '') {
            return '';
        }

        $signaturePos = strpos($message, "\n\n---\n");
        if ($signaturePos !== false) {
            $message = trim(substr($message, 0, $signaturePos));
        }

        if (strlen($message) > 500) {
            $message = substr($message, 0, 497) . '...';
        }

        return nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    }
}
