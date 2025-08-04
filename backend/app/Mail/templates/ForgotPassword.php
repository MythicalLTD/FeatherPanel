<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Mail\templates;

use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\MailTemplate;

class ForgotPassword
{
    /**
     * Get the welcome email template.
     */
    public static function getTemplate(array $data): string
    {
        if (isset($data['app_name']) && isset($data['app_url']) && isset($data['first_name']) && isset($data['last_name']) && isset($data['email']) && isset($data['username']) && isset($data['app_support_url']) && isset($data['reset_url'])) {
            return self::parseTemplate(MailTemplate::getByName('forgot_password')['body'] ?? '', [
                'app_name' => $data['app_name'],
                'app_url' => 'https://' . $data['app_url'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'dashboard_url' => 'https://' . $data['app_url'] . '/dashboard',
                'support_url' => $data['app_support_url'],
                'reset_url' => $data['reset_url'],
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
        if (isset($data['reset_url'])) {
            $template = str_replace('{reset_url}', $data['reset_url'], $template);
        }

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
            || !isset($data['reset_url'])
        ) {
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
