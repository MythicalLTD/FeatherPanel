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

class FeatherZeroTrustEvent implements PluginEvent
{
    // FeatherZeroTrust Configuration Events
    /**
     * Callback: array config data.
     */
    public static function onFeatherZeroTrustConfigRetrieved(): string
    {
        return 'featherpanel:admin:featherzerotrust:config:retrieved';
    }

    /**
     * Callback: array old config, array new config.
     */
    public static function onFeatherZeroTrustConfigUpdated(): string
    {
        return 'featherpanel:admin:featherzerotrust:config:updated';
    }

    // FeatherZeroTrust Scan Events
    /**
     * Callback: string server uuid, array scan data.
     */
    public static function onFeatherZeroTrustScanStarted(): string
    {
        return 'featherpanel:admin:featherzerotrust:scan:started';
    }

    /**
     * Callback: string server uuid, array scan results.
     */
    public static function onFeatherZeroTrustScanCompleted(): string
    {
        return 'featherpanel:admin:featherzerotrust:scan:completed';
    }

    /**
     * Callback: array logs data.
     */
    public static function onFeatherZeroTrustLogsRetrieved(): string
    {
        return 'featherpanel:admin:featherzerotrust:logs:retrieved';
    }

    // FeatherZeroTrust Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onFeatherZeroTrustError(): string
    {
        return 'featherpanel:admin:featherzerotrust:error';
    }

    /**
     * Callback: string server uuid, string error message.
     */
    public static function onFeatherZeroTrustScanError(): string
    {
        return 'featherpanel:admin:featherzerotrust:scan:error';
    }
}
