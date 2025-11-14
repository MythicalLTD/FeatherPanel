<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Mail\templates;

use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\MailTemplate;

class ServerUnbanned
{
    /**
     * Get the account deleted email template.
     */
    public static function getTemplate(array $data): string
    {
        if (isset($data['app_name']) && isset($data['app_url']) && isset($data['first_name']) && isset($data['last_name']) && isset($data['email']) && isset($data['username']) && isset($data['app_support_url'])) {
            return self::parseTemplate(MailTemplate::getByName('server_unsuspended')['body'] ?? '', [
                'app_name' => $data['app_name'],
                'app_url' => $data['app_url'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'dashboard_url' => $data['app_url'] . '/dashboard',
                'support_url' => $data['app_support_url'],
                'server_name' => $data['server_name'],
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
        ) {
            return;
        }

        if ($data['server_name'] == '') {
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
