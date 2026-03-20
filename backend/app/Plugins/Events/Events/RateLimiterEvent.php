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

class RateLimiterEvent implements PluginEvent
{
	/**
	 * Callback: string|null user uuid, bool enabled.
	 */
	public static function onRateLimiterGlobalUpdated(): string
	{
		return 'featherpanel:rate-limiter:global:update';
	}

	/**
	 * Callback: string|null user uuid, string route name, array config.
	 */
	public static function onRateLimiterUpdated(): string
	{
		return 'featherpanel:rate-limiter:update';
	}

	/**
	 * Callback: string|null user uuid, string route name.
	 */
	public static function onRateLimiterDeleted(): string
	{
		return 'featherpanel:rate-limiter:delete';
	}

	/**
	 * Callback: string|null user uuid, array updated routes, array errors.
	 */
	public static function onRateLimiterBulkUpdated(): string
	{
		return 'featherpanel:rate-limiter:bulk:update';
	}
}
