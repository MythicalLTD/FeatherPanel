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
use App\Permissions;
use App\Chat\Permission;
use App\Config\ConfigInterface;
use App\Mail\templates\TicketAdminAlert;

class TicketAdminNotifier
{
    /**
     * Notify staff with ticket view permission about a new ticket or user reply.
     *
     * @param array $ticket Enriched or raw ticket row
     * @param string $event Either `new_ticket` or `user_reply`
     * @param string $actorUuid UUID of the user who triggered the event (excluded from recipients)
     */
    public static function notify(array $ticket, string $event, string $actorUuid = ''): void
    {
        if (!in_array($event, ['new_ticket', 'user_reply'], true)) {
            return;
        }

        $app = App::getInstance(true);
        $config = $app->getConfig();
        $smtpEnabled = $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false');
        if ($smtpEnabled !== 'true') {
            return;
        }

        $appName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $appUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'), '/');
        $supportUrl = $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems');

        $roleIds = Permission::getRoleIdsWithPermission(Permissions::ADMIN_TICKETS_VIEW);
        if ($roleIds === []) {
            return;
        }

        $admins = User::getActiveUsersByRoleIds($roleIds);
        if ($admins === []) {
            return;
        }

        $ticketTitle = (string) ($ticket['title'] ?? 'Support ticket');
        $ticketUuid = (string) ($ticket['uuid'] ?? '');
        $ticketUrl = $appUrl . '/admin/tickets/' . $ticketUuid;

        $ticketOwner = null;
        if (!empty($ticket['user_uuid'])) {
            $ticketOwner = User::getUserByUuid((string) $ticket['user_uuid']);
        }

        $ownerLabel = $ticketOwner
            ? trim(($ticketOwner['username'] ?? '') . ' (' . ($ticketOwner['email'] ?? '') . ')')
            : 'Unknown user';

        foreach ($admins as $admin) {
            if ($actorUuid !== '' && ($admin['uuid'] ?? '') === $actorUuid) {
                continue;
            }

            TicketAdminAlert::send([
                'uuid' => $admin['uuid'],
                'email' => $admin['email'],
                'first_name' => $admin['first_name'],
                'last_name' => $admin['last_name'],
                'username' => $admin['username'],
                'app_name' => $appName,
                'app_url' => $appUrl,
                'app_support_url' => $supportUrl,
                'enabled' => $smtpEnabled,
                'event' => $event,
                'ticket_title' => $ticketTitle,
                'ticket_uuid' => $ticketUuid,
                'ticket_url' => $ticketUrl,
                'ticket_owner' => $ownerLabel,
                'open_tickets_count' => (string) \App\Chat\Ticket::getGlobalOpenTicketsCount(),
            ]);
        }
    }
}
