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

class ServerProxyEvent implements PluginEvent
{
	/**
	 * Callback: string user uuid, string server uuid, int|null proxy id, string domain, int port.
	 */
	public static function onServerProxyCreated(): string
	{
		return 'featherpanel:server:proxy:create';
	}

	/**
	 * Callback: string user uuid, string server uuid, int|null proxy id, string domain, int port.
	 */
	public static function onServerProxyDeleted(): string
	{
		return 'featherpanel:server:proxy:delete';
	}
}
