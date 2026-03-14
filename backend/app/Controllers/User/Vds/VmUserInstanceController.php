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

namespace App\Controllers\User\Vds;


use App\App;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Chat\VmInstanceActivity;
use App\Chat\VmInstanceBackup;
use App\Chat\VmCreationPending;
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\VmSubuser;
use App\Chat\VmTemplate;
use App\CloudFlare\CloudFlareRealIP;
use App\Config\ConfigInterface;
use App\Helpers\ApiResponse;
use App\Helpers\VmGateway;
use App\Services\Proxmox\Proxmox;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VmUserInstanceController - User-facing VM instance core operations (list, detail, status, power, VNC).
 * Activities and subusers are in VmUserActivityController and VmUserSubuserController (like Server vs ServerActivity vs SubuserController).
 */
#[OA\Tag(name: 'User - VM Instances', description: 'User VM instance list, detail, status, power, console')]
class VmUserInstanceController
{
    #[OA\Get(
        path: '/api/user/vm-instances',
        summary: 'List user VM instances',
        description: 'Get VM instances owned by or accessible to the authenticated user. Supports optional pagination and search.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1), description: 'Page number'),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 25), description: 'Records per page'),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Search by hostname or IP'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instances retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instances', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'pagination', type: 'object', properties: [
                            new OA\Property(property: 'current_page', type: 'integer'),
                            new OA\Property(property: 'per_page', type: 'integer'),
                            new OA\Property(property: 'total_records', type: 'integer'),
                            new OA\Property(property: 'total_pages', type: 'integer'),
                            new OA\Property(property: 'has_next', type: 'boolean'),
                            new OA\Property(property: 'has_prev', type: 'boolean'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function getUserVmInstances(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $userUuid = $user['uuid'];
        $userId = (int) $user['id'];
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', '');
        $search = is_string($search) ? trim($search) : '';

        // Get instances owned by user
        $ownedInstances = $this->getVmInstancesByUserUuid($userUuid);

        // Get instances where user is a subuser
        $subuserInstanceIds = VmSubuser::getVmInstancesByUser($userId);
        $subuserInstances = [];
        foreach ($subuserInstanceIds as $instanceId) {
            $instance = VmInstance::getById($instanceId);
            if ($instance) {
                $instance['is_subuser'] = true;
                $subuserInstances[] = $instance;
            }
        }

        // Merge and deduplicate
        $allInstances = array_merge($ownedInstances, $subuserInstances);
        $uniqueInstances = [];
        $seenIds = [];
        foreach ($allInstances as $instance) {
            if (!in_array($instance['id'], $seenIds, true)) {
                $seenIds[] = $instance['id'];
                $uniqueInstances[] = $instance;
            }
        }

        // Optional search filter (hostname or ip_address)
        if ($search !== '') {
            $searchLower = strtolower($search);
            $uniqueInstances = array_values(array_filter($uniqueInstances, static function (array $i) use ($searchLower): bool {
                $host = strtolower((string) ($i['hostname'] ?? ''));
                $ip = strtolower((string) ($i['ip_address'] ?? ''));

                return str_contains($host, $searchLower) || str_contains($ip, $searchLower);
            }));
        }

        $total = count($uniqueInstances);
        $totalPages = $limit > 0 ? (int) ceil($total / $limit) : 1;
        $offset = ($page - 1) * $limit;
        $instancesPage = array_slice($uniqueInstances, $offset, $limit);

        return ApiResponse::success([
            'instances' => $instancesPage,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ], 'VM instances retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}',
        summary: 'Get VM instance details',
        description: 'Get detailed information about a specific VM instance.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VM instance retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
        ]
    )]
    public function getVmInstance(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Add subuser flag if applicable
        $vmInstance['is_owner'] = isset($vmInstance['user_uuid']) && $vmInstance['user_uuid'] === $user['uuid'];
        $vmInstance['is_subuser'] = !$vmInstance['is_owner'];

        return ApiResponse::success([
            'instance' => $vmInstance,
        ], 'VM instance retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/status',
        summary: 'Get VM instance status',
        description: 'Get current status and resource usage from Proxmox.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Status retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Proxmox error'),
        ]
    )]
    public function getVmInstanceStatus(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }

        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmStatusCurrent($node, (int) $vmInstance['vmid'], $vmType);

        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch status: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['status' => $result['status'] ?? []], 'Status fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/power',
        summary: 'VM power action',
        description: 'Perform power action: start, stop, or reboot.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'action', type: 'string', enum: ['start', 'stop', 'reboot']),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Power action completed',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'instance', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'Power action failed'),
        ]
    )]
    public function powerAction(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Check permission
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'power')) {
            return ApiResponse::error('You do not have permission to control power for this VM', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        $action = $data['action'] ?? null;

        if (!in_array($action, ['start', 'stop', 'reboot'], true)) {
            return ApiResponse::error('Invalid action. Use start, stop, or reboot.', 'INVALID_ACTION', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            if (!$find['ok']) {
                return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
            }
            $node = $find['node'];
        }

        $vmid = (int) $vmInstance['vmid'];
        $vmType = in_array($vmInstance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $vmInstance['vm_type'] : 'qemu';

        if ($action === 'start') {
            $result = $client->startVm($node, $vmid, $vmType);
            if ($result['ok']) {
                VmInstance::updateStatus($id, 'running');
            } else {
                return ApiResponse::error('Start failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
        } elseif ($action === 'stop') {
            $result = $client->stopVm($node, $vmid, $vmType);
            if ($result['ok']) {
                VmInstance::updateStatus($id, 'stopped');
            } else {
                return ApiResponse::error('Stop failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
        } else {
            $result = $client->stopVm($node, $vmid, $vmType);
            if (!$result['ok']) {
                return ApiResponse::error('Reboot (stop) failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
            sleep(3);
            $result = $client->startVm($node, $vmid, $vmType);
            if (!$result['ok']) {
                VmInstance::updateStatus($id, 'stopped');
                return ApiResponse::error('Reboot (start) failed: ' . ($result['error'] ?? 'unknown'), 'POWER_FAILED', 500);
            }
            VmInstance::updateStatus($id, 'running');
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id' => (int) $vmInstance['vm_node_id'],
            'user_id' => (int) $user['id'],
            'event' => 'vm:power.' . $action,
            'metadata' => ['hostname' => $vmInstance['hostname'] ?? null],
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById($id);
        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/vnc-ticket',
        summary: 'Get VNC console ticket',
        description: 'Get VNC console access ticket. Returns wss_url (and optionally pve_redirect_url when panel can create a short-lived PVE user).',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'VNC ticket created',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ticket', type: 'string'),
                        new OA\Property(property: 'port', type: 'integer'),
                        new OA\Property(property: 'node', type: 'string'),
                        new OA\Property(property: 'vmid', type: 'integer'),
                        new OA\Property(property: 'host', type: 'string'),
                        new OA\Property(property: 'port_api', type: 'integer'),
                        new OA\Property(property: 'wss_url', type: 'string'),
                        new OA\Property(property: 'pve_redirect_url', type: 'string', nullable: true, description: 'Proxmox noVNC URL when available'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'VM instance not found'),
            new OA\Response(response: 500, description: 'VNC proxy failed'),
        ]
    )]
    public function getVncTicket(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');

        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        // Check permission
        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'console')) {
            return ApiResponse::error('You do not have permission to access console for this VM', 'PERMISSION_DENIED', 403);
        }

        $vmType = ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $vmNode = VmNode::getVmNodeById((int) $vmInstance['vm_node_id']);
        
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $vmInstance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }

        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $vnc = $client->createVncProxy($node, (int) $vmInstance['vmid'], $vmType);
        if (!$vnc['ok'] || $vnc['ticket'] === null || $vnc['port'] === null) {
            return ApiResponse::error('VNC proxy failed: ' . ($vnc['error'] ?? 'unknown'), 'VNC_PROXY_FAILED', 502);
        }

        $host = $vmNode['fqdn'] ?? '';
        $wssPath = sprintf('/api2/json/nodes/%s/%s/%d/vncwebsocket', $node, $vmType, (int) $vmInstance['vmid']);
        $wssQuery = 'port=' . $vnc['port'] . '&vncticket=' . rawurlencode($vnc['ticket']);
        $portApi = (int) ($vmNode['port'] ?? 8006);

        $config = App::getInstance(true)->getConfig();
        $usePanelProxy = $config->getSetting(ConfigInterface::VNC_PROXY_VIA_PANEL, 'false') === 'true';
        if ($usePanelProxy) {
            $appUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, ''), '/');
            if ($appUrl !== '') {
                $panelScheme = str_starts_with($appUrl, 'https:') ? 'wss' : 'ws';
                $panelHost = parse_url($appUrl, PHP_URL_HOST);
                $panelPort = parse_url($appUrl, PHP_URL_PORT);
                $wssUrl = $panelScheme . '://' . $panelHost . ($panelPort ? ':' . $panelPort : '') . '/vnc-proxy' . $wssPath . '?' . $wssQuery;
            } else {
                $usePanelProxy = false;
            }
        }
        if (!$usePanelProxy) {
            $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'wss' : 'ws';
            $wssPort = $portApi > 0 ? $portApi : 8006;
            $wssUrl = $scheme . '://' . $host . ':' . $wssPort . $wssPath . '?' . $wssQuery;
        }

        $payload = [
            'ticket' => $vnc['ticket'],
            'port' => $vnc['port'],
            'node' => $node,
            'vmid' => (int) $vmInstance['vmid'],
            'host' => $host,
            'port_api' => $portApi,
            'wss_url' => $wssUrl,
        ];
        $tempUser = 'fp-console-' . $id . '-' . bin2hex(random_bytes(4)) . '@pve';
        $tempPass = bin2hex(random_bytes(16));
        $expire = time() + 300;
        $cr = $client->createUser($tempUser, $tempPass, $expire);
        if ($cr['ok']) {
            $aclPath = '/vms/' . (int) $vmInstance['vmid'];
            $ar = $client->addAcl($aclPath, 'PVEVMUser', $tempUser);
            if ($ar['ok']) {
                $ticketResult = $client->getTicketWithPassword($tempUser, $tempPass);
                if ($ticketResult['ok'] && $ticketResult['ticket'] !== null) {
                    $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'https' : 'http';
                    $pvePort = $portApi > 0 ? $portApi : 8006;
                    $consoleType = $vmType === 'qemu' ? 'kvm' : 'lxc';
                    $payload['pve_redirect_url'] = $scheme . '://' . $host . ':' . $pvePort . '/novnc/mgnovnc.html?novnc=1&token=' . rawurlencode($ticketResult['ticket'])
                        . '&vmid=' . (int) $vmInstance['vmid'] . '&node=' . rawurlencode($node) . '&console=' . $consoleType;
                }
            }
        }

        return ApiResponse::success($payload, 'VNC ticket created', 200);
    }

    /**
     * Start async VM reinstall (same flow as admin). Returns 202 with reinstall_id; poll reinstall-status until active or failed.
     */
    public function reinstall(Request $request, int $id): Response
    {
        $user = $request->attributes->get('user');
        $instance = $request->attributes->get('vmInstance');

        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        if (!VmGateway::hasVmPermission($user['uuid'], $id, 'power')) {
            return ApiResponse::error('You do not have permission to reinstall this VM', 'PERMISSION_DENIED', 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = [];
        }

        if (empty($instance['template_id'])) {
            return ApiResponse::error('Cannot reinstall: instance has no template_id', 'NO_TEMPLATE', 400);
        }
        $template = VmTemplate::getById((int) $instance['template_id']);
        if (!$template) {
            return ApiResponse::error('Template not found for this instance', 'TEMPLATE_NOT_FOUND', 404);
        }
        $templateFile = $template['template_file'] ?? '';
        if ($templateFile === '' || !ctype_digit((string) $templateFile)) {
            return ApiResponse::error('Template must have a valid template VMID (template_file)', 'INVALID_TEMPLATE', 400);
        }
        $templateVmid = (int) $templateFile;

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';

        $ciUser = null;
        $ciPassword = null;
        if ($vmType === 'qemu') {
            $ciUser = isset($data['ci_user']) && is_string($data['ci_user']) ? trim($data['ci_user']) : null;
            $ciPassword = isset($data['ci_password']) && is_string($data['ci_password']) ? trim($data['ci_password']) : null;
            if ($ciUser === null || $ciUser === '' || $ciPassword === null || $ciPassword === '') {
                return ApiResponse::error(
                    'Cloud-init username and password (ci_user, ci_password) are required to reinstall KVM/QEMU VMs',
                    'VALIDATION_FAILED',
                    400
                );
            }
        }

        $oldVmid = (int) $instance['vmid'];

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid($oldVmid);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node for this VM', 'NODE_UNKNOWN', 500);
        }

        $findTemplate = $client->findNodeByVmid($templateVmid);
        $templateNode = $findTemplate['ok'] ? $findTemplate['node'] : $node;

        $savedMemory = 512;
        $savedCpus   = 1;
        $savedCores  = 1;
        $savedDiskGb = 0;
        $rootDiskKey = null;
        $savedMemory = (int) ($instance['memory'] ?? $savedMemory);
        $savedCpus   = (int) ($instance['cpus'] ?? $savedCpus);
        $savedCores  = (int) ($instance['cores'] ?? $savedCores);
        $savedDiskGb = (int) ($instance['disk_gb'] ?? $savedDiskGb);

        if ($savedMemory <= 0 || $savedCpus <= 0 || $savedCores <= 0 || $savedDiskGb <= 0) {
            $currentCfg  = $client->getVmConfig($node, $oldVmid, $vmType);
            if ($currentCfg['ok'] && is_array($currentCfg['config'])) {
                $cfg = $currentCfg['config'];
                if ($savedMemory <= 0 && isset($cfg['memory']) && is_numeric($cfg['memory'])) {
                    $savedMemory = (int) $cfg['memory'];
                }
                if ($vmType === 'qemu') {
                    if ($savedCpus <= 0 && isset($cfg['sockets']) && is_numeric($cfg['sockets'])) {
                        $savedCpus = (int) $cfg['sockets'];
                    }
                    if ($savedCores <= 0 && isset($cfg['cores']) && is_numeric($cfg['cores'])) {
                        $savedCores = (int) $cfg['cores'];
                    }
                    foreach (['scsi0', 'virtio0', 'sata0', 'ide0'] as $candidate) {
                        if (isset($cfg[$candidate]) && is_string($cfg[$candidate])) {
                            $rootDiskKey = $candidate;
                            break;
                        }
                    }
                    if ($savedDiskGb <= 0 && $rootDiskKey !== null && isset($cfg[$rootDiskKey]) && is_string($cfg[$rootDiskKey])) {
                        foreach (explode(',', $cfg[$rootDiskKey]) as $part) {
                            $part = trim($part);
                            if (str_starts_with($part, 'size=')) {
                                $sizeVal = substr($part, 5);
                                if (preg_match('/^(\d+)([GgMmTt])?$/', $sizeVal, $m)) {
                                    $num  = (int) $m[1];
                                    $unit = strtolower($m[2] ?? 'g');
                                    $savedDiskGb = match ($unit) {
                                        'm' => (int) ceil($num / 1024),
                                        't' => $num * 1024,
                                        default => $num,
                                    };
                                }
                                break;
                            }
                        }
                    }
                } else {
                    if (($savedCores <= 0 || $savedCpus <= 0) && isset($cfg['cores']) && is_numeric($cfg['cores'])) {
                        $savedCores = (int) $cfg['cores'];
                        $savedCpus  = $savedCores;
                    }
                    if ($savedDiskGb <= 0 && isset($cfg['rootfs']) && is_string($cfg['rootfs'])) {
                        foreach (explode(',', $cfg['rootfs']) as $part) {
                            $part = trim($part);
                            if (str_starts_with($part, 'size=')) {
                                $sizeVal = substr($part, 5);
                                if (preg_match('/^(\d+)([GgMmTt])?$/', $sizeVal, $m)) {
                                    $num  = (int) $m[1];
                                    $unit = strtolower($m[2] ?? 'g');
                                    $savedDiskGb = match ($unit) {
                                        'm' => (int) ceil($num / 1024),
                                        't' => $num * 1024,
                                        default => $num,
                                    };
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }

        $nextResult = $client->getNextVmid(100);
        if (!$nextResult['ok'] || $nextResult['vmid'] === null) {
            return ApiResponse::error(
                'Could not get next VMID: ' . ($nextResult['error'] ?? 'unknown'),
                'PROXMOX_ERROR',
                500
            );
        }
        $newVmid = $nextResult['vmid'];

        if ($vmType === 'qemu') {
            $clone = $client->cloneQemu($templateNode, $templateVmid, $newVmid, (string) ($instance['hostname'] ?? 'vm-' . $newVmid), $node);
        } else {
            $clone = $client->cloneLxc($templateNode, $templateVmid, $newVmid, (string) ($instance['hostname'] ?? 'ct-' . $newVmid), $node, (string) ($vmNode['default_storage'] ?? 'local'));
        }
        if (!$clone['ok'] || empty($clone['upid'])) {
            return ApiResponse::error('Clone failed: ' . ($clone['error'] ?? 'unknown'), 'CLONE_FAILED', 500);
        }

        $ipId = !empty($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : null;
        $ip = $ipId ? VmIp::getById($ipId) : null;

        $reinstallMeta = json_encode([
            'type'        => 'reinstall',
            'old_vmid'    => $oldVmid,
            'instance_id' => $id,
            'ci_user'     => $ciUser,
            'ci_password' => $ciPassword,
            'ip_address'  => $ip['ip'] ?? ($instance['ip_address'] ?? null),
            'ip_cidr'     => $ip ? (int) ($ip['cidr'] ?? 24) : 24,
            'gateway'     => $ip['gateway'] ?? ($instance['gateway'] ?? null),
            'memory'      => $savedMemory,
            'cpus'        => $savedCpus,
            'cores'       => $savedCores,
            'disk_gb'     => $savedDiskGb,
            'root_disk'   => $rootDiskKey,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $reinstallId = bin2hex(random_bytes(16));
        $saved = VmCreationPending::create([
            'creation_id' => $reinstallId,
            'upid'        => $clone['upid'],
            'target_node' => $node,
            'vmid'        => $newVmid,
            'hostname'    => $instance['hostname'] ?? 'vm-' . $newVmid,
            'vm_node_id'  => (int) $instance['vm_node_id'],
            'plan_id'     => null,
            'template_id' => $instance['template_id'] ? (int) $instance['template_id'] : null,
            'vm_ip_id'    => $ipId,
            'user_uuid'   => $instance['user_uuid'] ?? null,
            'notes'       => $reinstallMeta,
            'vm_type'     => $vmType,
            'memory'      => 512,
            'cpus'        => 1,
            'cores'       => 1,
            'disk'        => 10,
            'storage'     => 'local',
            'bridge'      => 'vmbr0',
            'on_boot'     => 0,
        ]);
        if (!$saved) {
            $client->deleteVm($node, $newVmid, $vmType);

            return ApiResponse::error('Failed to save reinstall pending record', 'DB_ERROR', 500);
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $id,
            'vm_node_id'     => (int) $instance['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:reinstall.start',
            'metadata'       => ['hostname' => $instance['hostname'] ?? null, 'old_vmid' => $oldVmid, 'new_vmid' => $newVmid],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'reinstall_id' => $reinstallId,
            'message'      => 'Reinstall clone started. Poll reinstall-status until active or failed.',
        ], 'VM reinstall started', 202);
    }

    /**
     * Poll reinstall status by reinstall_id. User must have access to the VM instance tied to this reinstall.
     */
    public function reinstallStatus(Request $request, string $reinstallId): Response
    {
        $reinstallId = trim($reinstallId);
        if ($reinstallId === '') {
            return ApiResponse::error('Missing reinstall_id', 'INVALID_ID', 400);
        }

        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $pending = VmCreationPending::getByCreationId($reinstallId);
        if (!$pending) {
            return ApiResponse::error('Reinstall not found or already completed', 'NOT_FOUND', 404);
        }

        $rawNotes = $pending['notes'] ?? null;
        $reinstallMeta = [];
        if (is_string($rawNotes) && $rawNotes !== '' && $rawNotes[0] === '{') {
            $decoded = json_decode($rawNotes, true);
            if (is_array($decoded) && ($decoded['type'] ?? '') === 'reinstall') {
                $reinstallMeta = $decoded;
            }
        }
        if (empty($reinstallMeta)) {
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::error('Invalid reinstall pending record', 'INVALID_RECORD', 500);
        }

        $instanceId = (int) ($reinstallMeta['instance_id'] ?? 0);
        if ($instanceId <= 0 || !VmGateway::canUserAccessVmInstance($user['uuid'], $instanceId)) {
            return ApiResponse::error('Reinstall not found or access denied', 'NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $pending['vm_node_id']);
        if (!$vmNode) {
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::error('VM node not found', 'NODE_NOT_FOUND', 500);
        }

        try {
            $client = $this->buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed in reinstallStatus: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $taskResult = $client->getTaskStatus($pending['target_node'], $pending['upid']);
        if (!$taskResult['ok'] || $taskResult['status'] !== 'stopped') {
            return ApiResponse::success([
                'status'  => 'cloning',
                'message' => 'Clone in progress…',
            ], 'Clone in progress', 200);
        }

        if (($taskResult['exitstatus'] ?? '') !== 'OK') {
            $errMsg = $taskResult['error'] ?? ('Exit status: ' . ($taskResult['exitstatus'] ?? 'unknown'));
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($reinstallId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => 'Clone failed: ' . $errMsg,
            ], 'Reinstall clone failed', 200);
        }

        $vmType    = $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu';
        $newVmid   = (int) $pending['vmid'];
        $node      = $pending['target_node'];
        $oldVmid   = (int) ($reinstallMeta['old_vmid'] ?? 0);
        $ciUser     = $reinstallMeta['ci_user'] ?? null;
        $ciPassword = $reinstallMeta['ci_password'] ?? null;
        $ipAddress  = $reinstallMeta['ip_address'] ?? null;
        $ipCidr     = (int) ($reinstallMeta['ip_cidr'] ?? 24);
        $gateway    = trim((string) ($reinstallMeta['gateway'] ?? ''));
        $memory     = (int) ($reinstallMeta['memory'] ?? 512);
        $cpus       = (int) ($reinstallMeta['cpus'] ?? 1);
        $cores      = (int) ($reinstallMeta['cores'] ?? 1);
        $diskGb     = (int) ($reinstallMeta['disk_gb'] ?? 0);
        $rootDisk   = is_string($reinstallMeta['root_disk'] ?? null) ? (string) $reinstallMeta['root_disk'] : null;

        if ($vmType === 'lxc') {
            $deleteNetKeys = [];
            $getConfig = $client->getVmConfig($node, $newVmid, 'lxc');
            if ($getConfig['ok'] && is_array($getConfig['config'] ?? null)) {
                foreach (array_keys((array) $getConfig['config']) as $k) {
                    if (preg_match('/^net\d+$/', (string) $k)) {
                        $deleteNetKeys[] = (string) $k;
                    }
                }
            }
            if (!empty($deleteNetKeys)) {
                $client->setVmConfig($node, $newVmid, 'lxc', [], $deleteNetKeys);
            }
            $net0 = 'name=eth0,bridge=vmbr0,ip=' . $ipAddress . '/' . $ipCidr;
            if ($gateway !== '') {
                $net0 .= ',gw=' . $gateway;
            }
            $descParts = ['FeatherPanel Managed VM (Reinstalled)'];
            if (!empty($ipAddress)) {
                $descParts[] = 'IP: ' . $ipAddress;
            }
            if (!empty($pending['hostname'])) {
                $descParts[] = 'Hostname: ' . $pending['hostname'];
            }
            if (!empty($pending['user_uuid'])) {
                $descParts[] = 'User: ' . $pending['user_uuid'];
            }
            $descParts[] = 'Reinstalled: ' . date('Y-m-d H:i:s');
            $config = [
                'nameserver' => '1.1.1.1 8.8.8.8',
                'net0'       => $net0,
                'memory'     => $memory,
                'cores'      => $cores > 0 ? $cores : 1,
                'onboot'     => 0,
                'tags'       => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
            ];
            $client->setVmConfig($node, $newVmid, 'lxc', $config, []);
            if ($diskGb > 0) {
                $cfgAfter = $client->getVmConfig($node, $newVmid, 'lxc');
                $templateDiskGb = 0;
                if ($cfgAfter['ok'] && isset($cfgAfter['config']['rootfs']) && is_string($cfgAfter['config']['rootfs'])) {
                    foreach (explode(',', $cfgAfter['config']['rootfs']) as $part) {
                        $part = trim($part);
                        if (str_starts_with($part, 'size=')) {
                            $sv = substr($part, 5);
                            if (preg_match('/^(\d+)([GgMmTt])?$/', $sv, $m)) {
                                $n = (int) $m[1];
                                $u = strtolower($m[2] ?? 'g');
                                $templateDiskGb = match ($u) {
                                    'm' => (int) ceil($n / 1024), 't' => $n * 1024, default => $n,
                                };
                            }
                            break;
                        }
                    }
                }
                if ($diskGb > $templateDiskGb) {
                    $resizeRes = $client->resizeContainerDisk($node, $newVmid, 'rootfs', $diskGb . 'G');
                    if (!$resizeRes['ok']) {
                        App::getInstance(true)->getLogger()->warning('Reinstall LXC rootfs resize failed: ' . ($resizeRes['error'] ?? 'unknown'));
                    } elseif (is_string($resizeRes['upid'] ?? null) && $resizeRes['upid'] !== '') {
                        $wait = $client->waitTask($node, (string) $resizeRes['upid'], 600, 5);
                        if (!$wait['ok']) {
                            App::getInstance(true)->getLogger()->warning('Reinstall LXC rootfs resize task failed: ' . ($wait['error'] ?? 'unknown'));
                        }
                    }
                }
            }
        } else {
            $ipconfig0 = 'ip=' . $ipAddress . '/' . $ipCidr;
            if ($gateway !== '') {
                $ipconfig0 .= ',gw=' . $gateway;
            }
            $bootDiskKey = $rootDisk ?? 'scsi0';
            $bootOrder = 'order=' . $bootDiskKey;
            $descParts = ['FeatherPanel Managed VM (Reinstalled)'];
            if (!empty($ipAddress)) {
                $descParts[] = 'IP: ' . $ipAddress;
            }
            if (!empty($pending['hostname'])) {
                $descParts[] = 'Hostname: ' . $pending['hostname'];
            }
            if (!empty($pending['user_uuid'])) {
                $descParts[] = 'User: ' . $pending['user_uuid'];
            }
            $descParts[] = 'Reinstalled: ' . date('Y-m-d H:i:s');
            $client->setVmConfig($node, $newVmid, 'qemu', [
                'nameserver' => '1.1.1.1 8.8.8.8',
                'ipconfig0'  => $ipconfig0,
                'boot'       => $bootOrder,
                'memory'     => $memory,
                'sockets'    => $cpus > 0 ? $cpus : 1,
                'cores'      => $cores > 0 ? $cores : 1,
                'ciuser'     => $ciUser ?? 'debian',
                'cipassword' => $ciPassword ?? bin2hex(random_bytes(6)),
                'tags'       => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
            ], []);
            if ($diskGb > 0) {
                $cfgAfter = $client->getVmConfig($node, $newVmid, 'qemu');
                $templateDiskGb = 0;
                $diskKey = $bootDiskKey;
                if ($cfgAfter['ok'] && isset($cfgAfter['config'][$diskKey]) && is_string($cfgAfter['config'][$diskKey])) {
                    foreach (explode(',', $cfgAfter['config'][$diskKey]) as $part) {
                        $part = trim($part);
                        if (str_starts_with($part, 'size=')) {
                            $sv = substr($part, 5);
                            if (preg_match('/^(\d+)([GgMmTt])?$/', $sv, $m)) {
                                $n = (int) $m[1];
                                $u = strtolower($m[2] ?? 'g');
                                $templateDiskGb = match ($u) {
                                    'm' => (int) ceil($n / 1024), 't' => $n * 1024, default => $n,
                                };
                            }
                            break;
                        }
                    }
                }
                if ($diskGb > $templateDiskGb) {
                    $resizeRes = $client->resizeQemuDisk($node, $newVmid, $diskKey, $diskGb . 'G');
                    if (!$resizeRes['ok']) {
                        App::getInstance(true)->getLogger()->warning('Reinstall QEMU disk resize failed: ' . ($resizeRes['error'] ?? 'unknown'));
                    } elseif (is_string($resizeRes['upid'] ?? null) && $resizeRes['upid'] !== '') {
                        $wait = $client->waitTask($node, (string) $resizeRes['upid'], 600, 5);
                        if (!$wait['ok']) {
                            App::getInstance(true)->getLogger()->warning('Reinstall QEMU disk resize task failed: ' . ($wait['error'] ?? 'unknown'));
                        }
                    }
                }
            }
        }

        if ($instanceId > 0) {
            $instanceForBackups = VmInstance::getById($instanceId);
            if ($instanceForBackups) {
                App::getInstance(true)->getLogger()->info(
                    'Reinstall: Deleting all backups for instance ID ' . $instanceId . ' (vmid ' . $oldVmid . ')'
                );
                $this->deleteInstanceBackups($instanceForBackups, $client);
            }
        }

        if ($oldVmid > 0) {
            $client->stopVm($node, $oldVmid, $vmType);
            sleep(2);
            $client->deleteVm($node, $oldVmid, $vmType);
        }

        sleep(2);
        $startResult = $client->startVm($node, $newVmid, $vmType);
        $finalStatus = $startResult['ok'] ? 'running' : 'stopped';
        if (!$startResult['ok']) {
            App::getInstance(true)->getLogger()->warning(
                'Reinstall: failed to start new VM ' . $newVmid . ': ' . ($startResult['error'] ?? 'unknown')
            );
        }

        $instance = null;
        if ($instanceId > 0) {
            try {
                $pdo = Database::getPdoConnection();
                $stmt = $pdo->prepare(
                    'UPDATE featherpanel_vm_instances SET vmid = :vmid, pve_node = :node, status = :status WHERE id = :id'
                );
                $stmt->execute([
                    'vmid'   => $newVmid,
                    'node'   => $node,
                    'status' => $finalStatus,
                    'id'     => $instanceId,
                ]);
                $instance = VmInstance::getById($instanceId);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error(
                    'Failed to update VM instance DB after reinstall: ' . $e->getMessage()
                );
            }
        }

        VmCreationPending::deleteByCreationId($reinstallId);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id'     => (int) $pending['vm_node_id'],
            'user_id'        => isset($user['id']) && (int) $user['id'] > 0 ? (int) $user['id'] : null,
            'event'          => 'vm:reinstall.complete',
            'metadata'       => ['new_vmid' => $newVmid],
            'ip'             => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $instance,
        ], 'VM reinstalled successfully', 200);
    }

    /**
     * Delete all tracked backups for a VM instance (used during reinstall).
     *
     * @param array<string, mixed> $instance
     */
    private function deleteInstanceBackups(array $instance, ?Proxmox $client = null): void
    {
        $instanceId = (int) ($instance['id'] ?? 0);
        if ($instanceId <= 0) {
            return;
        }

        $backups = VmInstanceBackup::getBackupsByInstanceId($instanceId);
        if (empty($backups)) {
            return;
        }

        $node = (string) ($instance['pve_node'] ?? '');

        foreach ($backups as $backup) {
            $volid = (string) ($backup['volid'] ?? '');
            $storage = (string) ($backup['storage'] ?? '');

            if ($client !== null && $node !== '' && $volid !== '' && $storage !== '') {
                $res = $client->deleteBackupVolume($node, $storage, $volid);
                if (!$res['ok']) {
                    App::getInstance(true)->getLogger()->warning(
                        'Failed to delete Proxmox backup volume for VM instance ' . $instanceId .
                        ' volid=' . $volid . ' storage=' . $storage . ': ' . ($res['error'] ?? 'unknown')
                    );
                }
            }

            if (isset($backup['id']) && (int) $backup['id'] > 0) {
                VmInstanceBackup::deleteById((int) $backup['id']);
            }
        }
    }

    /**
     * Get VM instances by user UUID (owned by user).
     */
    private function getVmInstancesByUserUuid(string $userUuid): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT i.*, n.name AS node_name, n.fqdn AS node_fqdn
            FROM featherpanel_vm_instances i
            LEFT JOIN featherpanel_vm_nodes n ON n.id = i.vm_node_id
            WHERE i.user_uuid = :user_uuid
            ORDER BY i.created_at DESC
        ');
        $stmt->execute(['user_uuid' => $userUuid]);

        $instances = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        
        foreach ($instances as &$instance) {
            $instance['is_owner'] = true;
            $instance['is_subuser'] = false;
        }

        return $instances;
    }

    // ==================== HELPER METHODS ====================

    private function buildProxmoxClientForNode(array $vmNode): Proxmox
    {
        $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
        $extraHeaders = [];
        $extraParams = [];

        if (!empty($vmNode['addional_headers']) && is_string($vmNode['addional_headers'])) {
            $decoded = json_decode($vmNode['addional_headers'], true);
            if (is_array($decoded)) {
                foreach ($decoded as $key => $value) {
                    if (is_string($key) && (is_string($value) || is_numeric($value))) {
                        $extraHeaders[$key] = (string) $value;
                    }
                }
            }
        }

        if (!empty($vmNode['additional_params']) && is_string($vmNode['additional_params'])) {
            $decoded = json_decode($vmNode['additional_params'], true);
            if (is_array($decoded)) {
                foreach ($decoded as $key => $value) {
                    if (is_string($key) && (is_string($value) || is_numeric($value))) {
                        $extraParams[$key] = $value;
                    }
                }
            }
        }

        return new Proxmox(
            $vmNode['fqdn'],
            (int) $vmNode['port'],
            $vmNode['scheme'],
            $vmNode['user'],
            $vmNode['token_id'],
            $vmNode['secret'],
            $tlsNoVerify,
            (int) ($vmNode['timeout'] ?? 60),
            $extraHeaders,
            $extraParams,
        );
    }
}