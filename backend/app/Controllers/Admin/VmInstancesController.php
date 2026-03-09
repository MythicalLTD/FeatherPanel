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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Chat\Database;
use App\Chat\VmCreationPending;
use App\Chat\VmInstance;
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\VmTemplate;
use App\CloudFlare\CloudFlareRealIP;
use App\Config\ConfigInterface;
use App\Helpers\ApiResponse;
use App\Services\Proxmox\Proxmox;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class VmInstancesController
{
    /**
     * List VM instances with pagination and optional search.
     */
    public function index(Request $request): Response
    {
        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', null);

        $instances    = VmInstance::getAll($page, $limit, $search);
        $total        = VmInstance::countAll($search);
        $totalPages   = (int) ceil($total / $limit);
        $statusCounts = VmInstance::countByStatus();

        return ApiResponse::success([
            'instances'     => $instances,
            'status_counts' => $statusCounts,
            'pagination'    => [
                'current_page'  => $page,
                'per_page'      => $limit,
                'total_records' => $total,
                'total_pages'   => $totalPages,
                'has_next'      => $page < $totalPages,
                'has_prev'      => $page > 1,
            ],
        ], 'VM instances fetched successfully', 200);
    }

    /**
     * Create a new VM instance (server) on a Proxmox node. Like normal servers: choose node, template, IP, and resources.
     * Requires vm_node_id, template_id, memory, cpus, cores, disk. Optional: storage, bridge, on_boot, vm_ip_id, hostname, user_uuid, notes.
     */
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $vmNodeId = isset($data['vm_node_id']) ? (int) $data['vm_node_id'] : 0;
        if ($vmNodeId <= 0) {
            return ApiResponse::error('vm_node_id is required and must be a positive integer', 'VALIDATION_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById($vmNodeId);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        $templateId = isset($data['template_id']) ? (int) $data['template_id'] : 0;
        if ($templateId <= 0) {
            return ApiResponse::error('template_id is required', 'TEMPLATE_REQUIRED', 400);
        }

        $template = VmTemplate::getById($templateId);
        if (!$template) {
            return ApiResponse::error('Template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $vmType = ($template['guest_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $templateFile = $template['template_file'] ?? '';
        if ($templateFile === '' || !ctype_digit($templateFile)) {
            return ApiResponse::error('Template must have a valid template VMID (template_file)', 'INVALID_TEMPLATE', 400);
        }
        $templateVmid = (int) $templateFile;

        $memory = isset($data['memory']) ? (int) $data['memory'] : 512;
        $cpus = isset($data['cpus']) ? (int) $data['cpus'] : 1;
        $cores = isset($data['cores']) ? (int) $data['cores'] : 1;
        $disk = isset($data['disk']) ? (int) $data['disk'] : 10;
        if ($memory < 128) {
            $memory = 128;
        }
        if ($cpus < 1) {
            $cpus = 1;
        }
        if ($cores < 1) {
            $cores = 1;
        }
        if ($disk < 1) {
            $disk = 1;
        }

        $storage = isset($data['storage']) && is_string($data['storage']) && $data['storage'] !== '' ? trim($data['storage']) : 'local';
        $bridge = isset($data['bridge']) && is_string($data['bridge']) && $data['bridge'] !== '' ? trim($data['bridge']) : 'vmbr0';
        $onBoot = isset($data['on_boot']) ? (int) (bool) $data['on_boot'] : 1;

        $hostnameRaw = isset($data['hostname']) && is_string($data['hostname']) ? trim($data['hostname']) : null;
        $hostname = self::sanitizeHostnameForProxmox($hostnameRaw);

        $vmIpId = isset($data['vm_ip_id']) ? (int) $data['vm_ip_id'] : null;
        $freeIps = VmIp::getFreeIpsForNode($vmNodeId);
        if (empty($freeIps)) {
            return ApiResponse::error('No free IP addresses available for this node. Add IPs in VM Node IPs.', 'NO_FREE_IP', 400);
        }
        if ($vmIpId !== null && $vmIpId > 0) {
            $found = null;
            foreach ($freeIps as $f) {
                if ((int) $f['id'] === $vmIpId) {
                    $found = $f;
                    break;
                }
            }
            if ($found === null) {
                return ApiResponse::error('Invalid vm_ip_id or IP is already assigned to another instance', 'INVALID_VM_IP', 400);
            }
            $ip = $found;
        } else {
            $ip = $freeIps[0];
            $vmIpId = (int) $ip['id'];
        }

        $userUuid = isset($data['user_uuid']) && is_string($data['user_uuid']) ? trim($data['user_uuid']) : null;
        $notes = isset($data['notes']) && is_string($data['notes']) ? trim($data['notes']) : null;

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $nodesResult = $client->getNodes();
        if (!$nodesResult['ok'] || empty($nodesResult['nodes'])) {
            return ApiResponse::error(
                'Could not get Proxmox nodes: ' . ($nodesResult['error'] ?? 'unknown'),
                'PROXMOX_ERROR',
                500
            );
        }
        $targetNode = (string) $nodesResult['nodes'][0]['node'];

        $nextResult = $client->getNextVmid(100);
        if (!$nextResult['ok'] || $nextResult['vmid'] === null) {
            return ApiResponse::error(
                'Could not get next VMID: ' . ($nextResult['error'] ?? 'unknown'),
                'PROXMOX_ERROR',
                500
            );
        }
        $vmid = $nextResult['vmid'];

        $findNode = $client->findNodeByVmid($templateVmid);
        $templateNode = $findNode['ok'] ? $findNode['node'] : $targetNode;
        if ($vmType === 'qemu') {
            $cloneResult = $client->cloneQemu($templateNode, $templateVmid, $vmid, $hostname, $targetNode);
        } else {
            $cloneResult = $client->cloneLxc($templateNode, $templateVmid, $vmid, $hostname, $targetNode, $storage);
        }
        if (!$cloneResult['ok']) {
            return ApiResponse::error(
                'Clone failed: ' . ($cloneResult['error'] ?? 'unknown'),
                'CLONE_FAILED',
                500
            );
        }

        $creationId = bin2hex(random_bytes(16));
        $saved = VmCreationPending::create([
            'creation_id'  => $creationId,
            'upid'         => $cloneResult['upid'],
            'target_node'  => $targetNode,
            'vmid'         => $vmid,
            'hostname'     => $hostname,
            'vm_node_id'   => $vmNodeId,
            'plan_id'      => null,
            'template_id'  => $templateId,
            'vm_ip_id'     => $vmIpId,
            'user_uuid'    => $userUuid,
            'notes'        => $notes,
            'vm_type'      => $vmType,
            'memory'       => $memory,
            'cpus'         => $cpus,
            'cores'        => $cores,
            'disk'         => $disk,
            'storage'      => $storage,
            'bridge'       => $bridge,
            'on_boot'      => $onBoot,
        ]);
        if (!$saved) {
            return ApiResponse::error('Failed to save creation pending record', 'DB_ERROR', 500);
        }

        return ApiResponse::success([
            'creation_id' => $creationId,
            'message'    => 'VM clone started. Poll creation-status until active or failed.',
        ], 'VM creation started', 202);
    }

    /**
     * Poll status of an async VM creation. When clone is done, runs config + start + DB insert in one go.
     * Returns { status: 'cloning' | 'active' | 'failed', instance?, error? }.
     */
    public function creationStatus(Request $request, string $creationId): Response
    {
        $creationId = trim($creationId);
        if ($creationId === '') {
            return ApiResponse::error('Missing creation_id', 'INVALID_ID', 400);
        }

        $pending = VmCreationPending::getByCreationId($creationId);
        if (!$pending) {
            return ApiResponse::error('Creation not found or already completed', 'NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $pending['vm_node_id']);
        if (!$vmNode) {
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::error('VM node not found', 'NODE_NOT_FOUND', 500);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $taskResult = $client->getTaskStatus($pending['target_node'], $pending['upid']);
        if (!$taskResult['ok']) {
            return ApiResponse::success([
                'status' => 'cloning',
                'message' => 'Checking clone progress…',
            ], 'Checking clone progress…', 200);
        }

        if ($taskResult['status'] !== 'stopped') {
            return ApiResponse::success([
                'status' => 'cloning',
                'message' => 'Clone in progress…',
            ], 'Clone in progress…', 200);
        }

        if (($taskResult['exitstatus'] ?? '') !== 'OK') {
            $errMsg = $taskResult['error'] ?? ('Exit status: ' . ($taskResult['exitstatus'] ?? 'unknown'));
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => $errMsg,
            ], 'Clone failed', 200);
        }

        $ip = $pending['vm_ip_id'] ? VmIp::getById((int) $pending['vm_ip_id']) : null;
        if (!$ip) {
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu');
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => 'IP no longer available',
            ], 'IP no longer available', 200);
        }

        $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
        $gateway = $ip['gateway'] ?? '';
        $bridge = !empty($pending['bridge']) ? (string) $pending['bridge'] : 'vmbr0';
        $vmType = $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu';
        $memory = (int) ($pending['memory'] ?? 512);
        $cpus = (int) ($pending['cpus'] ?? 1);
        $cores = (int) ($pending['cores'] ?? 1);
        $onBoot = !empty($pending['on_boot']);

        if ($vmType === 'lxc') {
            // Purge any network config from the clone (template IP), then set our own in two steps so LXC gets the right IP
            $deleteNetKeys = [];
            $getConfig = $client->getVmConfig($pending['target_node'], (int) $pending['vmid'], 'lxc');
            if ($getConfig['ok'] && is_array($getConfig['config'])) {
                foreach (array_keys($getConfig['config']) as $key) {
                    if (preg_match('/^net\d+$/', $key)) {
                        $deleteNetKeys[] = $key;
                    }
                }
            }
            if (!empty($deleteNetKeys)) {
                $delResult = $client->setVmConfig(
                    $pending['target_node'],
                    (int) $pending['vmid'],
                    'lxc',
                    [],
                    $deleteNetKeys,
                );
                if (!$delResult['ok']) {
                    App::getInstance(true)->getLogger()->warning('LXC network purge failed: ' . ($delResult['error'] ?? ''));
                }
            }
            $net0 = 'name=eth0,bridge=' . $bridge . ',ip=' . $ip['ip'] . '/' . $cidr;
            if ($gateway !== '') {
                $net0 .= ',gw=' . $gateway;
            }
            $config = [
                'memory' => $memory,
                'cores' => $cpus * $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'net0' => $net0,
                'onboot' => $onBoot ? 1 : 0,
            ];
            $configResult = $client->setVmConfig(
                $pending['target_node'],
                (int) $pending['vmid'],
                'lxc',
                $config,
                [],
            );
            if (!$configResult['ok']) {
                App::getInstance(true)->getLogger()->warning('LXC config update failed (continuing): ' . ($configResult['error'] ?? ''));
            }
        } else {
            $ipconfig0 = 'ip=' . $ip['ip'] . '/' . $cidr;
            if ($gateway !== '') {
                $ipconfig0 .= ',gw=' . $gateway;
            }
            $config = [
                'memory' => $memory,
                'sockets' => $cpus,
                'cores' => $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'ipconfig0' => $ipconfig0,
                'onboot' => $onBoot ? 1 : 0,
            ];
            $configResult = $client->setVmConfig($pending['target_node'], (int) $pending['vmid'], 'qemu', $config);
            if (!$configResult['ok']) {
                App::getInstance(true)->getLogger()->warning('VM config update failed (continuing): ' . ($configResult['error'] ?? ''));
            }
        }

        $pdo = Database::getPdoConnection();
        $pdo->beginTransaction();
        try {
            $instanceData = [
                'vmid' => (int) $pending['vmid'],
                'vm_node_id' => (int) $pending['vm_node_id'],
                'user_uuid' => $pending['user_uuid'],
                'pve_node' => $pending['target_node'],
                'plan_id' => isset($pending['plan_id']) && $pending['plan_id'] > 0 ? (int) $pending['plan_id'] : null,
                'template_id' => $pending['template_id'] ? (int) $pending['template_id'] : null,
                'vm_type' => $vmType,
                'hostname' => $pending['hostname'],
                'status' => 'stopped',
                'ip_address' => $ip['ip'],
                'subnet_mask' => null,
                'gateway' => $ip['gateway'] ?? null,
                'vm_ip_id' => $pending['vm_ip_id'] ? (int) $pending['vm_ip_id'] : null,
                'notes' => $pending['notes'],
            ];
            $instance = VmInstance::create($instanceData, $pdo);
            if (!$instance) {
                $pdo->rollBack();
                $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $vmType);
                VmCreationPending::deleteByCreationId($creationId);

                return ApiResponse::success([
                    'status' => 'failed',
                    'error'  => 'Failed to save VM instance record',
                ], 'Failed to save VM instance record', 200);
            }
            if ($onBoot) {
                $startResult = $client->startVm($pending['target_node'], (int) $pending['vmid'], $vmType);
                if ($startResult['ok']) {
                    VmInstance::updateStatus((int) $instance['id'], 'running', $pdo);
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('VM creation finish failed: ' . $e->getMessage());
            $client->deleteVm($pending['target_node'], (int) $pending['vmid'], $vmType);
            VmCreationPending::deleteByCreationId($creationId);

            return ApiResponse::success([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ], 'Creation failed', 200);
        }

        VmCreationPending::deleteByCreationId($creationId);

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_create',
            'context' => 'Created VM instance: ' . $pending['hostname'] . ' (vmid ' . $pending['vmid'] . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $instance = VmInstance::getById((int) $instance['id']);

        return ApiResponse::success([
            'status'   => 'active',
            'instance' => $instance,
        ], 'VM instance created successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['instance' => $instance], 'VM instance fetched successfully', 200);
    }

    /**
     * Update instance: hostname, notes, user_uuid, vm_ip_id (DB), and optionally memory, cpus, cores, on_boot (Proxmox).
     * When vm_ip_id is changed, Proxmox net0/ipconfig0 is updated to the new IP.
     */
    public function update(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $dbKeys = ['hostname', 'notes', 'user_uuid', 'vm_ip_id'];
        $dbUpdate = array_intersect_key($data, array_flip($dbKeys));
        $proxmoxKeys = ['memory', 'cpus', 'cores', 'on_boot', 'vm_ip_id'];
        $proxmoxUpdate = array_intersect_key($data, array_flip($proxmoxKeys));
        $networks = isset($data['networks']) && is_array($data['networks']) ? $data['networks'] : null;
        if ($networks !== null && !empty($networks)) {
            $first = reset($networks);
            $firstIpId = isset($first['vm_ip_id']) ? (int) $first['vm_ip_id'] : null;
            $dbUpdate['vm_ip_id'] = $firstIpId;
        }
        $vmTypeCheck = ($instance['vm_type'] ?? 'qemu') === 'lxc';
        $dnsUpdate = $vmTypeCheck && (
            array_key_exists('nameserver', $data) || array_key_exists('searchdomain', $data)
        );
        $hasProxmox = !empty($proxmoxUpdate) || $networks !== null || $dnsUpdate;

        if (empty($dbUpdate) && !$hasProxmox) {
            return ApiResponse::success(['instance' => VmInstance::getById($id)], 'No changes to apply', 200);
        }

        if (!empty($dbUpdate)) {
            $ok = VmInstance::update($id, $dbUpdate);
            if (!$ok) {
                return ApiResponse::error('Failed to update VM instance', 'UPDATE_FAILED', 500);
            }
            $instance = VmInstance::getById($id);
        }

        if ($hasProxmox) {
            $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
            if (!$vmNode) {
                return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
            }
            try {
                $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
                $client = new Proxmox(
                    $vmNode['fqdn'],
                    (int) $vmNode['port'],
                    $vmNode['scheme'],
                    $vmNode['user'],
                    $vmNode['token_id'],
                    $vmNode['secret'],
                    $tlsNoVerify,
                    (int) ($vmNode['timeout'] ?? 60),
                );
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());
                return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
            }

            $node = $instance['pve_node'] ?? '';
            if ($node === '') {
                $find = $client->findNodeByVmid((int) $instance['vmid']);
                $node = $find['ok'] ? $find['node'] : null;
            }
            if ($node === null || $node === '') {
                return ApiResponse::error('Could not determine Proxmox node for this VM', 'NODE_UNKNOWN', 500);
            }

            $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
            $memory = array_key_exists('memory', $proxmoxUpdate) ? (int) $proxmoxUpdate['memory'] : null;
            $cpus = array_key_exists('cpus', $proxmoxUpdate) ? (int) $proxmoxUpdate['cpus'] : null;
            $cores = array_key_exists('cores', $proxmoxUpdate) ? (int) $proxmoxUpdate['cores'] : null;
            $onBoot = array_key_exists('on_boot', $proxmoxUpdate) ? (bool) $proxmoxUpdate['on_boot'] : null;
            $ipChange = array_key_exists('vm_ip_id', $proxmoxUpdate) && $networks === null;

            $ip = null;
            if ($ipChange && isset($instance['vm_ip_id']) && (int) $instance['vm_ip_id'] > 0) {
                $ip = VmIp::getById((int) $instance['vm_ip_id']);
            }
            if ($ipChange && (!$ip || !$ip['ip'])) {
                $ip = null;
            }

            $config = [];
            $deleteKeys = [];

            if ($vmType === 'lxc' && $networks !== null) {
                $curCfg = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
                $curConfig = $curCfg['ok'] && is_array($curCfg['config'] ?? null) ? $curCfg['config'] : [];
                $currentNetKeys = array_values(array_filter(array_keys($curConfig), static function ($k) {
                    return preg_match('/^net\d+$/', (string) $k);
                }));
                if (empty($networks)) {
                    $deleteKeys = $currentNetKeys;
                }
            }

            if ($vmType === 'lxc' && $networks !== null && !empty($networks)) {
                $newKeys = array_values(array_map(static function ($n) {
                    return isset($n['key']) ? (string) $n['key'] : '';
                }, $networks));
                $newKeys = array_values(array_filter($newKeys, static function ($k) {
                    return preg_match('/^net\d+$/', $k);
                }));
                foreach ($currentNetKeys as $k) {
                    if (!in_array($k, $newKeys, true)) {
                        $deleteKeys[] = $k;
                    }
                }
                $bridge = 'vmbr0';
                if (!empty($curConfig['net0']) && preg_match('/bridge=([^,\s]+)/', (string) $curConfig['net0'], $m)) {
                    $bridge = $m[1];
                }
                foreach ($networks as $n) {
                    $key = isset($n['key']) ? (string) $n['key'] : '';
                    if (!preg_match('/^net\d+$/', $key)) {
                        continue;
                    }
                    $vmIpId = isset($n['vm_ip_id']) ? (int) $n['vm_ip_id'] : 0;
                    $ipRow = $vmIpId > 0 ? VmIp::getById($vmIpId) : null;
                    if (!$ipRow || empty($ipRow['ip'])) {
                        continue;
                    }
                    $netBridge = isset($n['bridge']) && (string) $n['bridge'] !== '' ? (string) $n['bridge'] : $bridge;
                    $cidr = isset($ipRow['cidr']) && $ipRow['cidr'] !== null ? (int) $ipRow['cidr'] : 24;
                    $gateway = trim((string) ($ipRow['gateway'] ?? ''));
                    $ethName = isset($n['name']) ? (string) $n['name'] : ('eth' . (int) preg_replace('/\D/', '', $key));
                    $ipStr = str_replace([',', '='], '', (string) $ipRow['ip']);
                    $netStr = 'name=' . $ethName . ',bridge=' . $netBridge . ',ip=' . $ipStr . '/' . $cidr;
                    if ($gateway !== '') {
                        $netStr .= ',gw=' . str_replace([',', '='], '', $gateway);
                    }
                    $config[$key] = $netStr;
                }
            }

            if ($vmType === 'lxc') {
                if (array_key_exists('nameserver', $data)) {
                    $config['nameserver'] = trim((string) $data['nameserver']);
                }
                if (array_key_exists('searchdomain', $data)) {
                    $config['searchdomain'] = trim((string) $data['searchdomain']);
                }
            }
            if ($memory !== null && $memory >= 128) {
                $config['memory'] = $memory;
            }
            if ($onBoot !== null) {
                $config['onboot'] = $onBoot ? 1 : 0;
            }
            if ($vmType === 'lxc' && $networks === null) {
                if ($cpus !== null && $cores !== null) {
                    $config['cores'] = $cpus * $cores;
                } elseif ($cores !== null) {
                    $config['cores'] = $cores;
                }
                if ($ip) {
                    $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
                    $gateway = trim((string) ($ip['gateway'] ?? ''));
                    $bridge = 'vmbr0';
                    $curCfg = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
                    if ($curCfg['ok'] && !empty($curCfg['config']['net0'])) {
                        if (preg_match('/bridge=([^,\s]+)/', (string) $curCfg['config']['net0'], $m)) {
                            $bridge = $m[1];
                        }
                    }
                    $ipStr = str_replace([',', '='], '', (string) $ip['ip']);
                    $net0 = 'name=eth0,bridge=' . $bridge . ',ip=' . $ipStr . '/' . $cidr;
                    if ($gateway !== '') {
                        $net0 .= ',gw=' . str_replace([',', '='], '', $gateway);
                    }
                    $config['net0'] = $net0;
                }
            } elseif ($vmType === 'qemu') {
                if ($cpus !== null) {
                    $config['sockets'] = $cpus;
                }
                if ($cores !== null) {
                    $config['cores'] = $cores;
                }
                if ($ip) {
                    $cidr = isset($ip['cidr']) && $ip['cidr'] !== null ? (int) $ip['cidr'] : 24;
                    $gateway = $ip['gateway'] ?? '';
                    $ipconfig0 = 'ip=' . $ip['ip'] . '/' . $cidr;
                    if ($gateway !== '') {
                        $ipconfig0 .= ',gw=' . $gateway;
                    }
                    $config['ipconfig0'] = $ipconfig0;
                }
            } elseif ($vmType === 'lxc') {
                if ($cpus !== null && $cores !== null) {
                    $config['cores'] = $cpus * $cores;
                } elseif ($cores !== null) {
                    $config['cores'] = $cores;
                }
            }

            if (!empty($config) || !empty($deleteKeys)) {
                $res = $client->setVmConfig($node, (int) $instance['vmid'], $vmType, $config, $deleteKeys);
                if (!$res['ok']) {
                    return ApiResponse::error('Proxmox config update failed: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
                }
            }
        }

        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_update',
            'context' => 'Updated VM instance: ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['instance' => VmInstance::getById($id)], 'VM instance updated successfully', 200);
    }

    /**
     * GET Proxmox config for this instance (memory, cores, net0, rootfs, onboot, etc.).
     */
    public function getConfig(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmConfig($node, (int) $instance['vmid'], $vmType);
        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch Proxmox config: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['config' => $result['config'] ?? []], 'Config fetched', 200);
    }

    /**
     * GET current VM/container status and resource usage (CPU, memory, disk, network) from Proxmox.
     */
    public function getStatus(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $result = $client->getVmStatusCurrent($node, (int) $instance['vmid'], $vmType);
        if (!$result['ok']) {
            return ApiResponse::error('Failed to fetch status: ' . ($result['error'] ?? ''), 'PROXMOX_ERROR', 502);
        }

        return ApiResponse::success(['status' => $result['status'] ?? []], 'Status fetched', 200);
    }

    /**
     * GET VNC console ticket for QEMU VMs and LXC containers. Returns ticket and connection info for noVNC.
     * Ticket expires in ~40 seconds; open the console page immediately after calling this.
     */
    public function vncTicket(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $vnc = $client->createVncProxy($node, (int) $instance['vmid'], $vmType);
        if (!$vnc['ok'] || $vnc['ticket'] === null || $vnc['port'] === null) {
            return ApiResponse::error('VNC proxy failed: ' . ($vnc['error'] ?? 'unknown'), 'VNC_PROXY_FAILED', 502);
        }
        $wssPath = sprintf('/api2/json/nodes/%s/%s/%d/vncwebsocket', $node, $vmType, (int) $instance['vmid']);
        $wssQuery = 'port=' . $vnc['port'] . '&vncticket=' . rawurlencode($vnc['ticket']);
        $host = $vmNode['fqdn'] ?? '';
        $portApi = (int) ($vmNode['port'] ?? 8006);

        $config = App::getInstance(true)->getConfig();
        $usePanelProxy = $config->getSetting(ConfigInterface::VNC_PROXY_VIA_PANEL, 'false') === 'true';
        if ($usePanelProxy) {
            $appUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, ''), '/');
            if ($appUrl !== '') {
                $panelScheme = (str_starts_with($appUrl, 'https:')) ? 'wss' : 'ws';
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
            'vmid' => (int) $instance['vmid'],
            'host' => $host,
            'port_api' => $portApi,
            'wss_url' => $wssUrl,
        ];

        // Always try Proxmox noVNC redirect (temp user + ticket) so the popup opens on the Proxmox host, not the panel.
        // If createUser/ACL/ticket fails (e.g. permissions), we fall back to wss_url (panel vnc_lite.html).
        $tempUser = 'fp-console-' . $id . '-' . bin2hex(random_bytes(4)) . '@pve';
        $tempPass = bin2hex(random_bytes(16));
        $expire = time() + 300; // 5 minutes
        $cr = $client->createUser($tempUser, $tempPass, $expire);
        if ($cr['ok']) {
            // Proxmox valid ACL path for VMs/containers is /vms/{vmid} (not /nodes/.../qemu|lcx/...).
            $aclPath = '/vms/' . (int) $instance['vmid'];
            $ar = $client->addAcl($aclPath, 'PVEVMUser', $tempUser);
            if ($ar['ok']) {
                $ticketResult = $client->getTicketWithPassword($tempUser, $tempPass);
                if ($ticketResult['ok'] && $ticketResult['ticket'] !== null) {
                    $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'https' : 'http';
                    $pvePort = $portApi > 0 ? $portApi : 8006;
                    $consoleType = $vmType === 'qemu' ? 'kvm' : 'lxc';
                    $payload['pve_redirect_url'] = $scheme . '://' . $host . ':' . $pvePort . '/novnc/mgnovnc.html?novnc=1&token=' . rawurlencode($ticketResult['ticket'])
                        . '&vmid=' . (int) $instance['vmid'] . '&node=' . rawurlencode($node) . '&console=' . $consoleType;
                    // Do not delete the user here: Proxmox validates the ticket against the user when noVNC loads, so deleting causes 401. User has expire=5min so Proxmox will purge them.
                }
            }
        }

        return ApiResponse::success($payload, 'VNC ticket created (valid ~40s)', 200);
    }

    /**
     * GET activity/task history for this VM instance (create, update, delete events).
     */
    public function activities(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $hostname = trim((string) ($instance['hostname'] ?? ''));
        if ($hostname === '') {
            return ApiResponse::success(['activities' => []], 'No hostname to match', 200);
        }
        $limit = min(100, max(1, (int) ($request->query->get('limit') ?? 50)));
        $activities = Activity::getActivitiesByContextLikeAndNameIn(
            '%' . $hostname . '%',
            ['vm_instance_create', 'vm_instance_update', 'vm_instance_delete'],
            $limit,
        );

        return ApiResponse::success(['activities' => $activities], 'Activities fetched', 200);
    }

    /**
     * POST resize LXC disk. Body: { "disk": "rootfs"|"mp0"|..., "size": "+5G"|"20G" }.
     */
    public function resizeDisk(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Disk resize is only supported for LXC containers', 'NOT_LXC', 400);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['disk']) || empty($data['size'])) {
            return ApiResponse::error('Request body must include "disk" and "size" (e.g. disk: "rootfs", size: "+5G")', 'VALIDATION_FAILED', 400);
        }
        $disk = (string) $data['disk'];
        $size = (string) $data['size'];
        if (!preg_match('/^(rootfs|mp\d+)$/', $disk)) {
            return ApiResponse::error('Invalid disk. Use rootfs or mp0, mp1, ...', 'INVALID_DISK', 400);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }
        $res = $client->resizeContainerDisk($node, (int) $instance['vmid'], $disk, $size);
        if (!$res['ok']) {
            return ApiResponse::error('Resize failed: ' . ($res['error'] ?? 'unknown'), 'RESIZE_FAILED', 502);
        }

        return ApiResponse::success(['message' => 'Disk resized'], 'Disk resized successfully', 200);
    }

    /**
     * POST add LXC mount point. Body: { "storage": "local-lvm", "size_gb": 10, "path": "/mnt/data" }.
     */
    public function createDisk(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Add disk is only supported for LXC containers', 'NOT_LXC', 400);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['storage']) || !isset($data['size_gb'])) {
            return ApiResponse::error('Request body must include "storage" and "size_gb"', 'VALIDATION_FAILED', 400);
        }
        $storage = (string) $data['storage'];
        $sizeGb = (int) $data['size_gb'];
        $path = isset($data['path']) ? trim((string) $data['path']) : '';
        if ($sizeGb < 1) {
            return ApiResponse::error('size_gb must be at least 1', 'VALIDATION_FAILED', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $result = $client->getVmConfig($node, (int) $instance['vmid'], 'lxc');
        if (!$result['ok'] || !is_array($result['config'] ?? null)) {
            return ApiResponse::error('Failed to fetch config', 'PROXMOX_ERROR', 502);
        }
        $curConfig = $result['config'];
        $mpIndex = -1;
        foreach (array_keys($curConfig) as $k) {
            if (preg_match('/^mp(\d+)$/', (string) $k, $m)) {
                $idx = (int) $m[1];
                if ($idx > $mpIndex) {
                    $mpIndex = $idx;
                }
            }
        }
        $nextKey = 'mp' . ($mpIndex + 1);
        $mpValue = $storage . ':' . $sizeGb;
        if ($path !== '') {
            $mpValue .= ',mp=' . $path;
        }
        $res = $client->setVmConfig($node, (int) $instance['vmid'], 'lxc', [$nextKey => $mpValue], []);
        if (!$res['ok']) {
            return ApiResponse::error('Failed to add disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success(['disk' => $nextKey, 'config_key' => $nextKey], 'Disk added successfully', 200);
    }

    /**
     * DELETE LXC mount point. Path: .../disks/{key} e.g. disks/mp1.
     */
    public function deleteDisk(Request $request, int $id, string $key): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (($instance['vm_type'] ?? 'qemu') !== 'lxc') {
            return ApiResponse::error('Delete disk is only supported for LXC containers', 'NOT_LXC', 400);
        }
        if ($key === 'rootfs' || !preg_match('/^mp\d+$/', $key)) {
            return ApiResponse::error('Invalid disk key. Use mp0, mp1, ... (rootfs cannot be deleted)', 'INVALID_DISK', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        $res = $client->setVmConfig($node, (int) $instance['vmid'], 'lxc', [], [$key]);
        if (!$res['ok']) {
            return ApiResponse::error('Failed to remove disk: ' . ($res['error'] ?? 'unknown'), 'PROXMOX_UPDATE_FAILED', 502);
        }

        return ApiResponse::success(['deleted' => $key], 'Disk removed successfully', 200);
    }

    /**
     * Power action: start | stop | reboot.
     */
    public function power(Request $request, int $id): Response
    {
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $action = $request->request->get('action') ?? $request->query->get('action');
        if ($action === null || $action === '') {
            $body = json_decode($request->getContent(), true);
            $action = is_array($body) && isset($body['action']) ? $body['action'] : null;
        }
        if (!in_array($action, ['start', 'stop', 'reboot'], true)) {
            return ApiResponse::error('Invalid action. Use start, stop, or reboot.', 'INVALID_ACTION', 400);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            if (!$find['ok']) {
                return ApiResponse::error('Could not determine Proxmox node for this VM', 'NODE_UNKNOWN', 500);
            }
            $node = $find['node'];
        }

        $vmid = (int) $instance['vmid'];
        $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';

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

        $instance = VmInstance::getById($id);

        return ApiResponse::success(['instance' => $instance], 'Power action completed', 200);
    }

    /**
     * Delete VM instance: stop on Proxmox (if running), delete from Proxmox, then remove from DB.
     */
    public function delete(Request $request, int $id): Response
    {
        $admin = $request->get('user');
        $instance = VmInstance::getById($id);
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            VmInstance::delete($id);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance record (node gone): ' . ($instance['hostname'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([], 'VM instance deleted', 200);
        }

        try {
            $tlsNoVerify = ($vmNode['tls_no_verify'] ?? 'false') === 'true';
            $client = new Proxmox(
                $vmNode['fqdn'],
                (int) $vmNode['port'],
                $vmNode['scheme'],
                $vmNode['user'],
                $vmNode['token_id'],
                $vmNode['secret'],
                $tlsNoVerify,
                (int) ($vmNode['timeout'] ?? 60),
            );
        } catch (\Throwable $e) {
            VmInstance::delete($id);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance (Proxmox unreachable): ' . ($instance['hostname'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success([], 'VM instance deleted from panel', 200);
        }

        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $instance['vmid']);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node !== null && $node !== '') {
            $vmType = in_array($instance['vm_type'] ?? 'qemu', ['qemu', 'lxc'], true) ? $instance['vm_type'] : 'qemu';
            $client->stopVm($node, (int) $instance['vmid'], $vmType);
            sleep(2);
            $client->deleteVm($node, (int) $instance['vmid'], $vmType);
        }

        VmInstance::delete($id);
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'vm_instance_delete',
            'context' => 'Deleted VM instance: ' . ($instance['hostname'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'VM instance deleted successfully', 200);
    }

    /**
     * Sanitize a hostname for Proxmox (valid DNS label: a-z, 0-9, hyphen; max 63 chars).
     * Proxmox returns 400 "invalid format - value does not look like a valid DNS name" otherwise.
     */
    private static function sanitizeHostnameForProxmox(?string $value): string
    {
        if ($value === null || $value === '') {
            return 'vm-' . time();
        }
        $s = strtolower(trim($value));
        $s = preg_replace('/[^a-z0-9\-]/', '-', $s);
        $s = preg_replace('/-+/', '-', $s);
        $s = trim($s, '-');
        if ($s === '') {
            return 'vm-' . time();
        }
        if (strlen($s) > 63) {
            $s = substr($s, 0, 63);
            $s = rtrim($s, '-');
        }
        return $s !== '' ? $s : 'vm-' . time();
    }
}
