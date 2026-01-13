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
