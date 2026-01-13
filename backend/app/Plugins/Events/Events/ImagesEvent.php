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

class ImagesEvent implements PluginEvent
{
    // Images Management Events
    /**
     * Callback: array images list.
     */
    public static function onImagesRetrieved(): string
    {
        return 'featherpanel:admin:images:retrieved';
    }

    /**
     * Callback: int image id, array image data.
     */
    public static function onImageRetrieved(): string
    {
        return 'featherpanel:admin:images:image:retrieved';
    }

    /**
     * Callback: array image data.
     */
    public static function onImageCreated(): string
    {
        return 'featherpanel:admin:images:image:created';
    }

    /**
     * Callback: int image id, array old data, array new data.
     */
    public static function onImageUpdated(): string
    {
        return 'featherpanel:admin:images:image:updated';
    }

    /**
     * Callback: int image id, array image data.
     */
    public static function onImageDeleted(): string
    {
        return 'featherpanel:admin:images:image:deleted';
    }

    // Images Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onImagesError(): string
    {
        return 'featherpanel:admin:images:error';
    }

    /**
     * Callback: int image id, string error message.
     */
    public static function onImageNotFound(): string
    {
        return 'featherpanel:admin:images:image:not:found';
    }
}
