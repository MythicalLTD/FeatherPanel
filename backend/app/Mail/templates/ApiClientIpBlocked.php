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
use App\Mail\MailTemplateRenderer;

class ApiClientIpBlocked
{
    /**
     * Subject from the `api_client_ip_blocked` mail template row.
     */
    public static function getSubject(array $data): string
    {
        $row = MailTemplate::getByName('api_client_ip_blocked');
        if ($row === null || ($row['subject'] ?? '') === '') {
            return '';
        }

        return str_replace('{app_name}', $data['app_name'], $row['subject']);
    }

    /**
     * HTML body from template `api_client_ip_blocked` with placeholders replaced.
     */
    public static function getTemplate(array $data): string
    {
        if (
            !isset($data['app_name'], $data['app_url'], $data['first_name'], $data['last_name'], $data['email'], $data['username'], $data['app_support_url'])
            || !isset($data['api_client_name'], $data['api_client_id'], $data['blocked_ip'])
        ) {
            return '';
        }

        $row = MailTemplate::getByName('api_client_ip_blocked');
        if ($row === null || ($row['body'] ?? '') === '') {
            return '';
        }

        return self::parseTemplate($row['body'], [
            'app_name' => $data['app_name'],
            'app_url' => $data['app_url'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'username' => $data['username'],
            'dashboard_url' => $data['app_url'] . '/dashboard',
            'support_url' => $data['app_support_url'],
            'api_client_name' => $data['api_client_name'],
            'api_client_id' => (string) $data['api_client_id'],
            'blocked_ip' => $data['blocked_ip'],
        ]);
    }

    public static function parseTemplate(string $template, array $data): string
    {
        return MailTemplateRenderer::renderHtml($template, $data);
    }

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
            || !isset($data['api_client_name'])
            || !isset($data['api_client_id'])
            || !isset($data['blocked_ip'])
        ) {
            return;
        }

        if ($data['enabled'] == 'false') {
            return;
        }

        if ($data['blocked_ip'] === '' || $data['api_client_name'] === '') {
            return;
        }

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

        $mailID = MailList::create([
            'queue_id' => $id,
            'user_uuid' => $data['uuid'],
        ]);
        if ($mailID == false) {
            return;
        }
    }
}
