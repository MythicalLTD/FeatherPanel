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
}
