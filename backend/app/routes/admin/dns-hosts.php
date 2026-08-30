<?php

use App\App;
use App\Permissions;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\DnsHostsController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts',
        '/api/admin/dns-hosts',
        function (Request $request) {
            return (new DnsHostsController())->index($request);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts-show',
        '/api/admin/dns-hosts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DnsHostsController())->show($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts-create',
        '/api/admin/dns-hosts',
        function (Request $request) {
            return (new DnsHostsController())->create($request);
        },
        Permissions::ADMIN_WEBSPACES_CREATE,
        ['PUT']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts-update',
        '/api/admin/dns-hosts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DnsHostsController())->update($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_EDIT,
        ['PATCH']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts-delete',
        '/api/admin/dns-hosts/{id}',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DnsHostsController())->delete($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_DELETE,
        ['DELETE']
    );

    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-dns-hosts-test',
        '/api/admin/dns-hosts/{id}/test',
        function (Request $request, array $args) {
            $id = $args['id'] ?? null;
            if (!$id || !is_numeric($id)) {
                return ApiResponse::error('Missing or invalid ID', 'INVALID_ID', 400);
            }

            return (new DnsHostsController())->test($request, (int) $id);
        },
        Permissions::ADMIN_WEBSPACES_VIEW,
        ['POST']
    );
};
