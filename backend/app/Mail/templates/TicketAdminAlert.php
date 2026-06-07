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

namespace App\Mail\templates;

use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\MailTemplate;

class TicketAdminAlert
{
    public static function getTemplate(array $data): string
    {
        $required = [
            'app_name', 'app_url', 'first_name', 'last_name', 'email', 'username',
            'app_support_url', 'ticket_title', 'ticket_url', 'ticket_owner', 'event', 'open_tickets_count',
        ];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return '';
            }
        }

        $row = MailTemplate::getByName('ticket_admin_alert');
        if ($row === null || ($row['body'] ?? '') === '') {
            return '';
        }

        return self::parseTemplate($row['body'], self::placeholderData($data));
    }

    public static function parseTemplate(string $template, array $data): string
    {
        foreach ($data as $key => $value) {
            $template = str_replace('{' . $key . '}', (string) $value, $template);
        }

        return $template;
    }

    public static function send(array $data): void
    {
        $required = [
            'email', 'app_name', 'app_url', 'first_name', 'last_name', 'username',
            'app_support_url', 'uuid', 'enabled', 'ticket_title', 'ticket_url', 'ticket_owner', 'event',
        ];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                return;
            }
        }

        if ($data['enabled'] !== 'true') {
            return;
        }

        $template = self::getTemplate($data);
        $subject = self::getSubject($data);
        if ($template === '' || $subject === '') {
            return;
        }

        $id = MailQueue::create([
            'user_uuid' => $data['uuid'],
            'subject' => $subject,
            'body' => $template,
        ]);

        if ($id === false || $id === true) {
            return;
        }

        MailList::create([
            'queue_id' => $id,
            'user_uuid' => $data['uuid'],
        ]);
    }

    private static function getSubject(array $data): string
    {
        $row = MailTemplate::getByName('ticket_admin_alert');
        $subjectTemplate = $row['subject'] ?? '';
        if ($subjectTemplate === '') {
            return $data['event'] === 'user_reply'
                ? '[' . $data['app_name'] . '] New reply on support ticket'
                : '[' . $data['app_name'] . '] New support ticket';
        }

        return self::parseTemplate($subjectTemplate, self::placeholderData($data));
    }

    /**
     * @return array<string, string>
     */
    private static function placeholderData(array $data): array
    {
        $eventLabel = ($data['event'] ?? '') === 'user_reply'
            ? 'A user replied to a support ticket'
            : 'A new support ticket was opened';

        return [
            'app_name' => $data['app_name'],
            'app_url' => $data['app_url'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'username' => $data['username'],
            'dashboard_url' => $data['app_url'] . '/dashboard',
            'support_url' => $data['app_support_url'],
            'ticket_title' => htmlspecialchars((string) $data['ticket_title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            'ticket_url' => htmlspecialchars((string) $data['ticket_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            'ticket_owner' => htmlspecialchars((string) $data['ticket_owner'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            'event_label' => $eventLabel,
            'open_tickets_count' => htmlspecialchars((string) ($data['open_tickets_count'] ?? '0'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
        ];
    }
}
