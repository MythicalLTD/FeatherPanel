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

class UserWarning
{
    /**
     * Get the user warning email body.
     */
    public static function getTemplate(array $data): string
    {
        if (
            isset($data['app_name'])
            && isset($data['app_url'])
            && isset($data['first_name'])
            && isset($data['last_name'])
            && isset($data['email'])
            && isset($data['username'])
            && isset($data['app_support_url'])
            && isset($data['warning_title'])
            && isset($data['warning_message'])
        ) {
            return self::parseTemplate(MailTemplate::getByName('user_warning')['body'] ?? '', [
                'app_name' => $data['app_name'],
                'app_url' => $data['app_url'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'dashboard_url' => $data['app_url'] . '/dashboard',
                'support_url' => $data['app_support_url'],
                'action_url' => $data['action_url'] ?? ($data['app_url'] . '/dashboard'),
                'warning_title' => $data['warning_title'],
                'warning_message' => $data['warning_message'],
                'server_name' => $data['server_name'] ?? '',
                'server_name_clause' => !empty($data['server_name'])
                    ? ' / server <b>' . htmlspecialchars((string) $data['server_name'], ENT_QUOTES, 'UTF-8') . '</b>'
                    : '',
            ]);
        }

        return '';
    }

    /**
     * Parse placeholders in the template.
     */
    public static function parseTemplate(string $template, array $data): string
    {
        $template = str_replace('{app_name}', $data['app_name'], $template);
        $template = str_replace('{app_url}', $data['app_url'], $template);
        $template = str_replace('{first_name}', $data['first_name'], $template);
        $template = str_replace('{last_name}', $data['last_name'], $template);
        $template = str_replace('{email}', $data['email'], $template);
        $template = str_replace('{username}', $data['username'], $template);
        $template = str_replace('{dashboard_url}', $data['dashboard_url'], $template);
        $template = str_replace('{support_url}', $data['support_url'], $template);
        $template = str_replace('{action_url}', $data['action_url'], $template);
        $template = str_replace('{warning_title}', $data['warning_title'], $template);
        $template = str_replace('{warning_message}', $data['warning_message'], $template);
        $template = str_replace('{server_name}', $data['server_name'] ?? '', $template);
        $template = str_replace('{server_name_clause}', $data['server_name_clause'] ?? '', $template);

        return $template;
    }

    /**
     * Queue the user warning email.
     */
    public static function send(array $data): void
    {
        if (
            !isset($data['email'])
            || !isset($data['app_name'])
            || !isset($data['app_url'])
            || !isset($data['first_name'])
            || !isset($data['last_name'])
            || !isset($data['username'])
            || !isset($data['app_support_url'])
            || !isset($data['uuid'])
            || !isset($data['enabled'])
            || !isset($data['warning_title'])
            || !isset($data['warning_message'])
        ) {
            return;
        }

        if ($data['enabled'] == 'false') {
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

        $mailID = MailList::create([
            'queue_id' => $id,
            'user_uuid' => $data['uuid'],
        ]);
        if ($mailID == false) {
            return;
        }
    }

    private static function getSubject(array $data): string
    {
        $row = MailTemplate::getByName('user_warning');
        $subjectTemplate = $row['subject'] ?? '';
        if ($subjectTemplate === '') {
            return $data['subject'] ?? '';
        }

        return self::parseTemplate($subjectTemplate, [
            'app_name' => $data['app_name'],
            'app_url' => $data['app_url'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'username' => $data['username'],
            'dashboard_url' => $data['app_url'] . '/dashboard',
            'support_url' => $data['app_support_url'],
            'action_url' => $data['action_url'] ?? ($data['app_url'] . '/dashboard'),
            'warning_title' => $data['warning_title'],
            'warning_message' => $data['warning_message'],
            'server_name' => $data['server_name'] ?? '',
            'server_name_clause' => '',
        ]);
    }
}
