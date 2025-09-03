<?php

namespace App\Helpers;

use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\User;
use App\Helpers\PermissionHelper;
use App\Permissions;

class ServerGateway
{
	public static function canUserAccessServer(string $userUuid, string $serverUuid): bool
	{
		// Admin-level permissions short-circuit
		if (
			PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_VIEW)
			|| PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_EDIT)
			|| PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_SERVERS_DELETE)
		) {
			return true;
		}

		// Fetch user and server once to avoid duplicate queries and null dereferences
		$user = User::getUserByUuid($userUuid);
		$server = Server::getServerByUuid($serverUuid);

		if (!$user || !$server) {
			return false;
		}

		// Owner check
		if ((int) $server['owner_id'] === (int) $user['id']) {
			return true;
		}

		// Subuser membership check
		$subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $server['id']);
		if ($subuser !== null) {
			return true;
		}

		return false;

	}
}