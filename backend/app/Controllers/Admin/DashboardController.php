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

use App\Chat\Node;
use App\Chat\User;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\TimedTask;
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

			// Recent cron/timed task heartbeats
			$recentCronsRaw = TimedTask::getAll(null, 10, 0);
			$now = time();
			$expectedMap = [
				'server-schedule-processor' => 60, // seconds
				'mail-sender' => 60,
				'update-env' => 3600,
			];
			$recentCrons = array_map(function ($row) use ($now, $expectedMap) {
				$name = $row['task_name'] ?? '';
				$lastRunAt = isset($row['last_run_at']) && $row['last_run_at'] !== null ? strtotime($row['last_run_at']) : null;
				$expected = $expectedMap[$name] ?? 300; // default 5 minutes if unknown
				$late = $lastRunAt ? (($now - $lastRunAt) > ($expected * 2)) : true; // late if never ran or >2x expected

				return [
					'id' => (int) ($row['id'] ?? 0),
					'task_name' => $name,
					'last_run_at' => $row['last_run_at'] ?? null,
					'last_run_success' => (int) ($row['last_run_success'] ?? 0) === 1,
					'last_run_message' => $row['last_run_message'] ?? null,
					'expected_interval_seconds' => $expected,
					'late' => $late,
				];
			}, $recentCronsRaw);

			$dashboardData = [
				'count' => [
					'users' => $userCount,
					'nodes' => $nodeCount,
					'spells' => $spellCount,
					'servers' => $serverCount,
				],
				'cron' => [
					'recent' => $recentCrons,
					'summary' => empty($recentCrons) ? 'Cron tasks have not run yet.' : null,
				],
				'changelog' => [

				],
			];

			return ApiResponse::success($dashboardData, 'Successfully fetched dashboard statistics', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to fetch dashboard statistics: ' . $e->getMessage(), 500);
		}
	}
}
