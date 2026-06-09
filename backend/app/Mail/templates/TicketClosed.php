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

class TicketClosed
{
    public static function getTemplate(array $data): string
    {
        if (!self::hasRequiredFields($data)) {
            return '';
        }

        return self::parseTemplate(MailTemplate::getByName('ticket_closed')['body'] ?? '', self::templateData($data));
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
        if (!self::hasRequiredFields($data)) {
            return;
        }

        if ($data['enabled'] === 'false') {
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
        $row = MailTemplate::getByName('ticket_closed');
        $subjectTemplate = $row['subject'] ?? '';
        if ($subjectTemplate === '') {
            return $data['subject'] ?? '';
        }

        return self::parseTemplate($subjectTemplate, self::templateData($data));
    }

    /**
     * @return array<string, string>
     */
    private static function templateData(array $data): array
    {
        return [
            'app_name' => $data['app_name'],
            'app_url' => $data['app_url'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'username' => $data['username'],
            'dashboard_url' => $data['dashboard_url'] ?? ($data['app_url'] . '/dashboard'),
            'support_url' => $data['support_url'] ?? $data['app_support_url'],
            'ticket_title' => $data['ticket_title'],
            'ticket_url' => $data['ticket_url'],
        ];
    }

    private static function hasRequiredFields(array $data): bool
    {
        $required = [
            'email',
            'app_name',
            'app_url',
            'first_name',
            'last_name',
            'username',
            'app_support_url',
            'uuid',
            'enabled',
            'ticket_title',
            'ticket_url',
        ];

        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return false;
            }
        }

        return true;
    }
}
