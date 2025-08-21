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

use App\App;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Server\ServerUserController;
use App\Controllers\User\Server\ServerActivityController;
use App\Controllers\User\Server\Logs\ServerLogsController;
use App\Controllers\User\Server\Power\ServerPowerController;
use App\Controllers\User\Server\ServerBackupController;

return function (RouteCollection $routes): void {

	App::getInstance(true)->registerAuthRoute(
		$routes,
		'session-servers',
		'/api/user/servers',
		function (Request $request) {
			return (new ServerUserController())->getUserServers($request);
		},
		['GET']
	);

	// User server activities (paginated across all user's servers)
	App::getInstance(true)->registerAuthRoute(
		$routes,
		'session-server-activities-user',
		'/api/user/server-activities',
		function (Request $request) {
			return (new ServerActivityController())->getUserServerActivities($request);
		},
		['GET']
	);

	// User recent server activities (last 10)
	App::getInstance(true)->registerAuthRoute(
		$routes,
		'session-server-activities-recent',
		'/api/user/server-activities/recent',
		function (Request $request) {
			return (new ServerActivityController())->getRecentServerActivities($request);
		},
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-get',
		'/api/user/servers/{uuidShort}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			return (new ServerUserController())->getServer($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-jwt',
		'/api/user/servers/{uuidShort}/jwt',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			return (new ServerUserController())->generateServerJwt($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-update',
		'/api/user/servers/{uuidShort}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			return (new ServerUserController())->updateServer($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['PUT']
	);

	// Activities for a specific server owned by the user
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-activities-by-server',
		'/api/user/servers/{uuidShort}/activities',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerActivityController())->getServerActivities($request, (int) $server['id']);
		},
		'uuidShort',
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-reinstall',
		'/api/user/servers/{uuidShort}/reinstall',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;

			return (new ServerUserController())->reinstallServer($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-power',
		'/api/user/servers/{uuidShort}/power/{action}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$action = $args['action'] ?? null;
			if (!$uuidShort || !$action) {
				return ApiResponse::error('Missing or invalid UUID short or action', 'INVALID_UUID_SHORT_OR_ACTION', 400);
			}

			return (new ServerPowerController())->sendPowerAction($request, $uuidShort, $action);
		},
		'uuidShort', // Pass the server UUID for middleware
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-logs',
		'/api/user/servers/{uuidShort}/logs',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;

			return (new ServerLogsController())->getLogs($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-install-logs',
		'/api/user/servers/{uuidShort}/install-logs',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;

			return (new ServerLogsController())->getInstallLogs($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['GET']
	);

	// Server allocations
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-allocations',
		'/api/user/servers/{uuidShort}/allocations',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new \App\Controllers\User\Server\ServerAllocationController())->getServerAllocations($request, (int) $server['id']);
		},
		'uuidShort',
		['GET']
	);

	// Delete allocation from server
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-delete-allocation',
		'/api/user/servers/{uuidShort}/allocations/{allocationId}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$allocationId = $args['allocationId'] ?? null;
			if (!$uuidShort || !$allocationId) {
				return ApiResponse::error('Missing or invalid UUID short or allocation ID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new \App\Controllers\User\Server\ServerAllocationController())->deleteAllocation($request, (int) $server['id'], (int) $allocationId);
		},
		'uuidShort',
		['DELETE']
	);

	// Set allocation as primary
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-set-primary-allocation',
		'/api/user/servers/{uuidShort}/allocations/{allocationId}/primary',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$allocationId = $args['allocationId'] ?? null;
			if (!$uuidShort || !$allocationId) {
				return ApiResponse::error('Missing or invalid UUID short or allocation ID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new \App\Controllers\User\Server\ServerAllocationController())->setPrimaryAllocation($request, (int) $server['id'], (int) $allocationId);
		},
		'uuidShort',
		['POST']
	);

	// Auto-allocate free allocations to server
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-auto-allocate',
		'/api/user/servers/{uuidShort}/allocations/auto',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new \App\Controllers\User\Server\ServerAllocationController())->autoAllocate($request, (int) $server['id']);
		},
		'uuidShort',
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-delete',
		'/api/user/servers/{uuidShort}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;

			return (new ServerUserController())->deleteServer($request, $uuidShort);
		},
		'uuidShort', // Pass the server UUID for middleware
		['DELETE']
	);

	// Backup-related routes
	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-backups',
		'/api/user/servers/{uuidShort}/backups',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->getBackups($request, $server['uuid']);
		},
		'uuidShort',
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-create-backup',
		'/api/user/servers/{uuidShort}/backups',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			if (!$uuidShort) {
				return ApiResponse::error('Missing or invalid UUID short', 'INVALID_UUID_SHORT', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->createBackup($request, $server['uuid']);
		},
		'uuidShort',
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-get-backup',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->getBackup($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-restore-backup',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}/restore',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->restoreBackup($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-delete-backup',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->deleteBackup($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['DELETE']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-backup-download',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}/download',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->getBackupDownloadUrl($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['GET']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-backup-lock',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}/lock',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->lockBackup($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['POST']
	);

	App::getInstance(true)->registerServerRoute(
		$routes,
		'session-server-backup-unlock',
		'/api/user/servers/{uuidShort}/backups/{backupUuid}/unlock',
		function (Request $request, array $args) {
			$uuidShort = $args['uuidShort'] ?? null;
			$backupUuid = $args['backupUuid'] ?? null;
			if (!$uuidShort || !$backupUuid) {
				return ApiResponse::error('Missing or invalid UUID short or backup UUID', 'INVALID_PARAMETERS', 400);
			}

			$server = \App\Chat\Server::getServerByUuidShort($uuidShort);
			if (!$server) {
				return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
			}

			return (new ServerBackupController())->unlockBackup($request, $server['uuid'], $backupUuid);
		},
		'uuidShort',
		['POST']
	);
};
