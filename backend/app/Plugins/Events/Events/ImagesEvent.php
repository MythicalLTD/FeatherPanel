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
