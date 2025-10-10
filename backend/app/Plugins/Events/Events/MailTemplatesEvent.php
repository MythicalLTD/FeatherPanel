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
