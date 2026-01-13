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

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class TicketEvent implements PluginEvent
{
    /**
     * Callback: array ticket data, int ticket id, string user uuid.
     */
    public static function onTicketCreated(): string
    {
        return 'featherpanel:ticket:created';
    }

    /**
     * Callback: array ticket data, array updated data, string user uuid.
     */
    public static function onTicketUpdated(): string
    {
        return 'featherpanel:ticket:updated';
    }

    /**
     * Callback: array ticket data, string user uuid.
     */
    public static function onTicketDeleted(): string
    {
        return 'featherpanel:ticket:deleted';
    }

    /**
     * Callback: array ticket data, array message data, int message id, string user uuid.
     */
    public static function onTicketMessageCreated(): string
    {
        return 'featherpanel:ticket:message:created';
    }

    /**
     * Callback: array ticket data, int message id, string user uuid.
     */
    public static function onTicketMessageDeleted(): string
    {
        return 'featherpanel:ticket:message:deleted';
    }

    /**
     * Callback: array ticket data, array attachment data, int attachment id, string user uuid.
     */
    public static function onTicketAttachmentCreated(): string
    {
        return 'featherpanel:ticket:attachment:created';
    }

    /**
     * Callback: array ticket data, int attachment id, string user uuid.
     */
    public static function onTicketAttachmentDeleted(): string
    {
        return 'featherpanel:ticket:attachment:deleted';
    }

    /**
     * Callback: array ticket data, string old status, string new status, string user uuid.
     */
    public static function onTicketStatusChanged(): string
    {
        return 'featherpanel:ticket:status:changed';
    }

    /**
     * Callback: array ticket data, string user uuid.
     */
    public static function onTicketClosed(): string
    {
        return 'featherpanel:ticket:closed';
    }

    /**
     * Callback: array ticket data, string user uuid.
     */
    public static function onTicketReopened(): string
    {
        return 'featherpanel:ticket:reopened';
    }

    /**
     * Callback: array category data, int category id, string user uuid.
     */
    public static function onTicketCategoryCreated(): string
    {
        return 'featherpanel:ticket:category:created';
    }

    /**
     * Callback: array category data, array updated data, int category id, string user uuid.
     */
    public static function onTicketCategoryUpdated(): string
    {
        return 'featherpanel:ticket:category:updated';
    }

    /**
     * Callback: array category data, int category id, string user uuid.
     */
    public static function onTicketCategoryDeleted(): string
    {
        return 'featherpanel:ticket:category:deleted';
    }

    /**
     * Callback: array status data, int status id, string user uuid.
     */
    public static function onTicketStatusCreated(): string
    {
        return 'featherpanel:ticket:status:created';
    }

    /**
     * Callback: array status data, array updated data, int status id, string user uuid.
     */
    public static function onTicketStatusUpdated(): string
    {
        return 'featherpanel:ticket:status:updated';
    }

    /**
     * Callback: array status data, int status id, string user uuid.
     */
    public static function onTicketStatusDeleted(): string
    {
        return 'featherpanel:ticket:status:deleted';
    }

    /**
     * Callback: array priority data, int priority id, string user uuid.
     */
    public static function onTicketPriorityCreated(): string
    {
        return 'featherpanel:ticket:priority:created';
    }

    /**
     * Callback: array priority data, array updated data, int priority id, string user uuid.
     */
    public static function onTicketPriorityUpdated(): string
    {
        return 'featherpanel:ticket:priority:updated';
    }

    /**
     * Callback: array priority data, int priority id, string user uuid.
     */
    public static function onTicketPriorityDeleted(): string
    {
        return 'featherpanel:ticket:priority:deleted';
    }

    /**
     * Callback: array ticket data, array message data, array updated data, int message id, string user uuid.
     */
    public static function onTicketMessageUpdated(): string
    {
        return 'featherpanel:ticket:message:updated';
    }

    /**
     * Callback: array ticket data, array attachment data, array updated data, int attachment id, string user uuid.
     */
    public static function onTicketAttachmentUpdated(): string
    {
        return 'featherpanel:ticket:attachment:updated';
    }
}
