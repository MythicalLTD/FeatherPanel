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

class ServerCreated
{
    /**
     * Get the account deleted email template.
     */
    public static function getTemplate(array $data): string
    {
        if (isset($data['app_name']) && isset($data['app_url']) && isset($data['first_name']) && isset($data['last_name']) && isset($data['email']) && isset($data['username']) && isset($data['app_support_url'])) {
            return self::parseTemplate(MailTemplate::getByName('server_created')['body'] ?? '', [
                'app_name' => $data['app_name'],
                'app_url' => $data['app_url'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'dashboard_url' => $data['app_url'] . '/dashboard',
                'support_url' => $data['app_support_url'],
                'server_name' => $data['server_name'],
                'server_ip' => $data['server_ip'],
                'panel_url' => $data['app_url'] . '/dashboard',
            ]);
        }

        return '';
    }

    /**
     * Parse the welcome email template.
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
        $template = str_replace('{server_name}', $data['server_name'], $template);
        $template = str_replace('{server_ip}', $data['server_ip'], $template);
        $template = str_replace('{panel_url}', $data['panel_url'], $template);

        return $template;
    }

    /**
     * Send the welcome email.
     */
    public static function send(array $data): void
    {
        if (
            !isset($data['email'])
            || !isset($data['subject'])
            || !isset($data['app_name'])
            || !isset($data['app_url'])
            || !isset($data['first_name'])
            || !isset($data['last_name'])
            || !isset($data['username'])
            || !isset($data['app_support_url'])
            || !isset($data['uuid'])
            || !isset($data['enabled'])
            || !isset($data['server_name'])
            || !isset($data['server_ip'])
            || !isset($data['panel_url'])
        ) {
            return;
        }

        if ($data['server_name'] == '' || $data['server_ip'] == '' || $data['panel_url'] == '') {
            return;
        }

        if ($data['enabled'] == 'false') {
            return;
        }

        $template = self::getTemplate($data);

        $id = MailQueue::create([
            'user_uuid' => $data['uuid'],
            'subject' => $data['subject'],
            'body' => $template,
        ]);

        if ($id == false) {
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
}
