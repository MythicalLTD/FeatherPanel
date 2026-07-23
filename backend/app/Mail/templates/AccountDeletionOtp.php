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

class AccountDeletionOtp
{
    public static function getTemplate(array $data): string
    {
        if (
            array_key_exists('app_name', $data)
            && array_key_exists('app_url', $data)
            && array_key_exists('first_name', $data)
            && array_key_exists('last_name', $data)
            && array_key_exists('email', $data)
            && array_key_exists('username', $data)
            && array_key_exists('app_support_url', $data)
            && array_key_exists('otp_code', $data)
        ) {
            $row = MailTemplate::getByName('account_deletion_otp');
            $bodyTemplate = ($row !== null && isset($row['body'])) ? (string) $row['body'] : '';

            return self::parseTemplate($bodyTemplate, [
                'app_name' => $data['app_name'],
                'app_url' => $data['app_url'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'dashboard_url' => $data['app_url'] . '/dashboard',
                'support_url' => $data['app_support_url'],
                'otp_code' => $data['otp_code'],
                'expires_minutes' => $data['expires_minutes'] ?? 10,
            ]);
        }

        return '';
    }

    public static function parseTemplate(string $template, array $data): string
    {
        foreach (
            [
                'app_name',
                'app_url',
                'first_name',
                'last_name',
                'email',
                'username',
                'dashboard_url',
                'support_url',
                'otp_code',
            ] as $key
        ) {
            $template = str_replace('{' . $key . '}', (string) ($data[$key] ?? ''), $template);
        }
        $template = str_replace('{expires_minutes}', (string) ($data['expires_minutes'] ?? 10), $template);

        return $template;
    }

    public static function send(array $data): void
    {
        $requiredKeys = ['uuid', 'enabled', 'app_name', 'app_url', 'email', 'username', 'otp_code'];
        foreach ($requiredKeys as $key) {
            if (!array_key_exists($key, $data)) {
                return;
            }
        }

        if ($data['enabled'] === 'false') {
            return;
        }

        $data['first_name'] = (string) ($data['first_name'] ?? '');
        $data['last_name'] = (string) ($data['last_name'] ?? '');
        $data['app_support_url'] = (string) ($data['app_support_url'] ?? '');

        $subject = self::getSubject($data);
        $body = self::getTemplate($data);
        if ($subject === '' || $body === '') {
            return;
        }

        $id = MailQueue::create([
            'user_uuid' => $data['uuid'],
            'subject' => $subject,
            'body' => $body,
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
        $row = MailTemplate::getByName('account_deletion_otp');
        $subjectTemplate = ($row !== null && isset($row['subject'])) ? (string) $row['subject'] : '';
        if ($subjectTemplate === '') {
            return 'Your account deletion code for ' . $data['app_name'];
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
            'otp_code' => $data['otp_code'],
            'expires_minutes' => $data['expires_minutes'] ?? 10,
        ]);
    }
}
