<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class MailTemplatesEvent implements PluginEvent
{
    // Mail Templates Management Events
    /**
     * Callback: array templates list.
     */
    public static function onMailTemplatesRetrieved(): string
    {
        return 'featherpanel:admin:mail_templates:retrieved';
    }

    /**
     * Callback: int template id, array template data.
     */
    public static function onMailTemplateRetrieved(): string
    {
        return 'featherpanel:admin:mail_templates:template:retrieved';
    }

    /**
     * Callback: array template data.
     */
    public static function onMailTemplateCreated(): string
    {
        return 'featherpanel:admin:mail_templates:template:created';
    }

    /**
     * Callback: int template id, array old data, array new data.
     */
    public static function onMailTemplateUpdated(): string
    {
        return 'featherpanel:admin:mail_templates:template:updated';
    }

    /**
     * Callback: int template id, array template data.
     */
    public static function onMailTemplateDeleted(): string
    {
        return 'featherpanel:admin:mail_templates:template:deleted';
    }

    // Mail Templates Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onMailTemplatesError(): string
    {
        return 'featherpanel:admin:mail_templates:error';
    }

    /**
     * Callback: int template id, string error message.
     */
    public static function onMailTemplateNotFound(): string
    {
        return 'featherpanel:admin:mail_templates:template:not:found';
    }
}
