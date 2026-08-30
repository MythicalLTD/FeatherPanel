<?php

namespace App\Controllers\User\WebSpaces;

use App\Helpers\ApiResponse;
use App\WebSpaceSubuserPermissions;
use App\Helpers\WebSpaceGateway;
use App\Helpers\CheckWebSpacePermission;
use App\Controllers\Admin\WebSpaceDnsController as AdminWebSpaceDnsController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceDnsController
{
    public function listZones(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->listZones($request, (string) $resolved['space']['uuid']);
    }

    public function linkZone(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_MANAGE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->linkZone($request, (string) $resolved['space']['uuid']);
    }

    public function unlinkZone(Request $request, string $uuidShort, int $zoneId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_MANAGE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->unlinkZone($request, (string) $resolved['space']['uuid'], $zoneId);
    }

    public function listRecords(Request $request, string $uuidShort, int $zoneId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->listRecords($request, (string) $resolved['space']['uuid'], $zoneId);
    }

    public function createRecord(Request $request, string $uuidShort, int $zoneId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_MANAGE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->createRecord($request, (string) $resolved['space']['uuid'], $zoneId);
    }

    public function updateRecord(Request $request, string $uuidShort, int $zoneId, string $recordId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_MANAGE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->updateRecord($request, (string) $resolved['space']['uuid'], $zoneId, $recordId);
    }

    public function deleteRecord(Request $request, string $uuidShort, int $zoneId, string $recordId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_MANAGE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->deleteRecord($request, (string) $resolved['space']['uuid'], $zoneId, $recordId);
    }

    public function listDnsHosts(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::DNS_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        return (new AdminWebSpaceDnsController())->listDnsHosts($request, (string) $resolved['space']['uuid']);
    }

    /**
     * @return array{space: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array|Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied instanceof Response) {
            return $denied;
        }

        return ['user' => $user, 'space' => $space];
    }
}
