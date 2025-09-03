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

namespace App\Controllers\Admin;

use App\Chat\User;
use App\Chat\Node;
use App\Chat\Spell;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DashboardController
{
	public function index(Request $request): Response
	{
		try {
			// Get counts for dashboard statistics
			$userCount = User::getCount();
			$nodeCount = Node::getNodesCount();
			$spellCount = Spell::getSpellsCount();
			$serverCount = Server::getCount();

			$dashboardData = [
				'count'=> [
					'users' => $userCount,
					'nodes' => $nodeCount,
					'spells' => $spellCount,
					'servers' => $serverCount,
				]
			];

			return ApiResponse::success($dashboardData, 'Successfully fetched dashboard statistics', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to fetch dashboard statistics: ' . $e->getMessage(), 500);
		}
	}
}
