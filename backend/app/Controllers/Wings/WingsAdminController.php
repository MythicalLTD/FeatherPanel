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

namespace App\Controllers\Wings;

use App\Chat\Node;
use App\Helpers\ApiResponse;
use App\Services\Wings\Wings;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsAdminController
{
    public function index(Request $request): Response
    {
        return ApiResponse::success(null, 'Welcome to the Wings Admin route!');
    }

    public function utilization(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $utilization = $wings->getSystem()->getSystemUtilization();

        return ApiResponse::success(['node' => $node, 'utilization' => $utilization], 'Node utilization', 200);
    }

    public function getDockerDiskUsage(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        $dockerDiskUsage = $wings->getDocker()->getDockerDiskUsage();

        return ApiResponse::success(['node' => $node, 'dockerDiskUsage' => $dockerDiskUsage], 'Node docker disk usage', 200);
    }

    public function getDockerPrune(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        $dockerPrune = $wings->getDocker()->pruneDockerImages();

        return ApiResponse::success(['node' => $node, 'dockerPrune' => $dockerPrune], 'Node docker prune', 200);
    }

    public function getIps(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $ips = $wings->getSystem()->getSystemIPs();

        return ApiResponse::success(['node' => $node, 'ips' => $ips], 'Node IPs', 200);
    }

    public function system(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $node = Node::getNodeById($id);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        $scheme = $node['scheme'];
        $host = $node['fqdn'];
        $port = $node['daemonListen'];
        $token = $node['daemon_token'];

        $timeout = (int) 30;

        $wings = new Wings(
            $host,
            $port,
            $scheme,
            $token,
            $timeout
        );

        if (APP_DEBUG) {
            $wings->testConnection();
        } else {
            try {
                if (!$wings->testConnection()) {
                    return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
                }
            } catch (\Exception $e) {
                return ApiResponse::error('Failed to connect to Wings', 'WINGS_CONNECTION_FAILED', 500);
            }
        }

        $system = $wings->getSystem()->getDetailedSystemInfo();

        return ApiResponse::success(['node' => $node, 'wings' => $system], 'Node system information', 200);
    }
}
