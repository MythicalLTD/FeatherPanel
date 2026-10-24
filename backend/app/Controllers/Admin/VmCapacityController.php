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
use App\Chat\VmNode;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Chat\VmInstanceActivity;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VDS node capacity overview (allocated vs. physical resources, recommended node for placement)
 * and live migration between Proxmox nodes of the same cluster (setting vds_migration_enabled).
 */
class VmCapacityController
{
    public const STRATEGIES = ['most_free_memory', 'most_free_disk', 'fewest_instances'];

    public function capacity(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        $strategy = (string) $config->getSetting(ConfigInterface::VDS_PLACEMENT_STRATEGY, 'most_free_memory');
        if (!in_array($strategy, self::STRATEGIES, true)) {
            $strategy = 'most_free_memory';
        }
        $overcommit = max(50, min(1000, (int) $config->getSetting(ConfigInterface::VDS_PLACEMENT_OVERCOMMIT_PERCENT, '100')));

        $alloc = [];
        $stmt = Database::getPdoConnection()->query('SELECT vm_node_id, COUNT(*) AS instances, COALESCE(SUM(memory), 0) AS memory_mb,
            COALESCE(SUM(cpus * cores), 0) AS vcpus, COALESCE(SUM(disk_gb), 0) AS disk_gb, SUM(suspended = 1) AS suspended
            FROM featherpanel_vm_instances GROUP BY vm_node_id');
        foreach ($stmt ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [] as $row) {
            $alloc[(int) $row['vm_node_id']] = $row;
        }

        $nodes = [];
        foreach (VmNode::getAllVmNodes() as $node) {
            $id = (int) $node['id'];
            $a = $alloc[$id] ?? ['instances' => 0, 'memory_mb' => 0, 'vcpus' => 0, 'disk_gb' => 0, 'suspended' => 0];
            $entry = [
                'id' => $id,
                'name' => $node['name'],
                'location_id' => isset($node['location_id']) ? (int) $node['location_id'] : null,
                'online' => false,
                'error' => null,
                'instances' => (int) $a['instances'],
                'suspended' => (int) $a['suspended'],
                'allocated' => ['memory_mb' => (int) $a['memory_mb'], 'vcpus' => (int) $a['vcpus'], 'disk_gb' => (int) $a['disk_gb']],
                'physical' => null,
                'pve_nodes' => [],
                'memory_percent' => null,
                'free_memory_mb' => null,
                'full' => false,
            ];
            try {
                $res = VmInstanceUtil::buildProxmoxClientForNode($node)->apiGet('/api2/json/cluster/resources', ['type' => 'node']);
                if (!$res['ok'] || !is_array($res['data'] ?? null)) {
                    throw new \RuntimeException((string) ($res['error'] ?? 'Proxmox API error'));
                }
                $mem = $cpu = $disk = $diskUsed = $memUsed = 0;
                foreach ($res['data'] as $pn) {
                    if (($pn['type'] ?? 'node') !== 'node') {
                        continue;
                    }
                    $online = ($pn['status'] ?? '') === 'online';
                    $entry['pve_nodes'][] = [
                        'node' => (string) ($pn['node'] ?? ''),
                        'online' => $online,
                        'cpu' => round((float) ($pn['cpu'] ?? 0) * 100, 1),
                        'maxcpu' => (int) ($pn['maxcpu'] ?? 0),
                        'mem' => (int) ($pn['mem'] ?? 0),
                        'maxmem' => (int) ($pn['maxmem'] ?? 0),
                    ];
                    if ($online) {
                        $mem += (int) ($pn['maxmem'] ?? 0);
                        $memUsed += (int) ($pn['mem'] ?? 0);
                        $cpu += (int) ($pn['maxcpu'] ?? 0);
                        $disk += (int) ($pn['maxdisk'] ?? 0);
                        $diskUsed += (int) ($pn['disk'] ?? 0);
                    }
                }
                $entry['online'] = $mem > 0;
                $entry['physical'] = [
                    'memory_mb' => intdiv($mem, 1048576),
                    'memory_used_mb' => intdiv($memUsed, 1048576),
                    'cpus' => $cpu,
                    'disk_gb' => intdiv($disk, 1073741824),
                    'disk_used_gb' => intdiv($diskUsed, 1073741824),
                ];
                $capacityMb = intdiv($mem, 1048576) * $overcommit / 100;
                $entry['free_memory_mb'] = (int) ($capacityMb - (int) $a['memory_mb']);
                $entry['memory_percent'] = $capacityMb > 0 ? (int) round(((int) $a['memory_mb']) * 100 / $capacityMb) : null;
                $entry['full'] = $entry['free_memory_mb'] <= 0;
            } catch (\Throwable $e) {
                $entry['error'] = mb_substr($e->getMessage(), 0, 200);
            }
            $nodes[] = $entry;
        }

        $candidates = array_values(array_filter($nodes, static fn (array $n): bool => $n['online'] && !$n['full']));
        usort($candidates, static function (array $x, array $y) use ($strategy): int {
            return match ($strategy) {
                'fewest_instances' => [$x['instances'], -$x['free_memory_mb']] <=> [$y['instances'], -$y['free_memory_mb']],
                'most_free_disk' => (($y['physical']['disk_gb'] ?? 0) - ($y['physical']['disk_used_gb'] ?? 0)) <=> (($x['physical']['disk_gb'] ?? 0) - ($x['physical']['disk_used_gb'] ?? 0)),
                default => $y['free_memory_mb'] <=> $x['free_memory_mb'],
            };
        });

        return ApiResponse::success([
            'nodes' => $nodes,
            'strategy' => $strategy,
            'overcommit_percent' => $overcommit,
            'recommended_node_id' => $candidates[0]['id'] ?? null,
            'migration_enabled' => $config->getSetting(ConfigInterface::VDS_MIGRATION_ENABLED, 'false') === 'true',
        ], 'Capacity fetched', 200);
    }

    /** Start a live (qemu) or restart (lxc) migration to another node in the same Proxmox cluster. */
    public function migrate(Request $request, int $id): Response
    {
        $ctx = $this->migrationContext($id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        [$instance, $vmNode, $client] = $ctx;
        $body = json_decode($request->getContent(), true);
        $target = is_array($body) ? trim((string) ($body['target'] ?? '')) : '';
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,62}$/', $target)) {
            return ApiResponse::error('Choose a target node', 'INVALID_TARGET', 400);
        }
        $source = (string) $instance['pve_node'];
        if ($target === $source) {
            return ApiResponse::error('The VDS already runs on that node', 'INVALID_TARGET', 400);
        }
        $res = $client->apiGet('/api2/json/cluster/resources', ['type' => 'node']);
        $online = [];
        foreach ($res['ok'] && is_array($res['data'] ?? null) ? $res['data'] : [] as $pn) {
            if (($pn['status'] ?? '') === 'online') {
                $online[] = (string) ($pn['node'] ?? '');
            }
        }
        if (!in_array($target, $online, true)) {
            return ApiResponse::error('Target node is not an online member of this cluster', 'INVALID_TARGET', 400);
        }

        $type = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $vmid = (int) $instance['vmid'];
        $params = $type === 'qemu'
            ? ['target' => $target, 'online' => 1, 'with-local-disks' => 1]
            : ['target' => $target, 'restart' => 1];
        $result = $client->apiPost('/api2/json/nodes/' . rawurlencode($source) . '/' . $type . '/' . $vmid . '/migrate', $params);
        if (!$result['ok']) {
            return ApiResponse::error('Proxmox refused the migration: ' . mb_substr((string) ($result['error'] ?? 'unknown error'), 0, 300), 'MIGRATION_FAILED', 502);
        }
        $upid = is_string($result['data'] ?? null) ? $result['data'] : '';
        $this->activity($request, $instance, 'vm:migrate.started', ['from' => $source, 'to' => $target, 'upid' => $upid]);

        return ApiResponse::success(['upid' => $upid, 'from' => $source, 'to' => $target], 'Migration started', 202);
    }

    /** Poll a migration task; once Proxmox reports the VM on a new node the panel record follows. */
    public function migrationStatus(Request $request, int $id): Response
    {
        $ctx = $this->migrationContext($id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        [$instance, , $client] = $ctx;
        $upid = (string) $request->query->get('upid', '');
        $source = (string) $request->query->get('from', (string) $instance['pve_node']);
        if (!preg_match('/^UPID:[A-Za-z0-9:._@\-]+$/', $upid) || !preg_match('/^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,62}$/', $source)) {
            return ApiResponse::error('Invalid task', 'INVALID_TASK', 400);
        }
        $task = $client->apiGet('/api2/json/nodes/' . rawurlencode($source) . '/tasks/' . rawurlencode($upid) . '/status');
        $status = (string) ($task['data']['status'] ?? 'unknown');
        $exit = (string) ($task['data']['exitstatus'] ?? '');
        $node = (string) $instance['pve_node'];
        if ($status === 'stopped') {
            $res = $client->apiGet('/api2/json/cluster/resources', ['type' => 'vm']);
            foreach ($res['ok'] && is_array($res['data'] ?? null) ? $res['data'] : [] as $vm) {
                if ((int) ($vm['vmid'] ?? 0) === (int) $instance['vmid'] && !empty($vm['node'])) {
                    $node = (string) $vm['node'];
                    break;
                }
            }
            if ($node !== (string) $instance['pve_node']) {
                Database::getPdoConnection()->prepare('UPDATE featherpanel_vm_instances SET pve_node = :n WHERE id = :id')
                    ->execute(['n' => $node, 'id' => $id]);
                $this->activity($request, $instance, 'vm:migrate.completed', ['from' => $instance['pve_node'], 'to' => $node]);
            } elseif ($exit !== 'OK') {
                $this->activity($request, $instance, 'vm:migrate.failed', ['error' => mb_substr($exit, 0, 200)]);
            }
        }

        return ApiResponse::success([
            'status' => $status === 'stopped' ? ($exit === 'OK' ? 'completed' : 'failed') : 'running',
            'error' => $status === 'stopped' && $exit !== 'OK' ? $exit : null,
            'pve_node' => $node,
        ], 'Migration status', 200);
    }

    /** @return array{0: array, 1: array, 2: \App\Services\Proxmox\Proxmox}|Response */
    private function migrationContext(int $id): array | Response
    {
        if (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::VDS_MIGRATION_ENABLED, 'false') !== 'true') {
            return ApiResponse::error('Live migration is disabled in the VDS settings', 'FEATURE_DISABLED', 403);
        }
        $instance = VmInstance::getById($id);
        if (!$instance || empty($instance['pve_node'])) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ApiResponse::error('VDS node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Proxmox connection failed', 'PROXMOX_UNAVAILABLE', 502);
        }

        return [$instance, $vmNode, $client];
    }

    private function activity(Request $request, array $instance, string $event, array $meta): void
    {
        $admin = $request->attributes->get('user');
        VmInstanceActivity::createActivity([
            'vm_instance_id' => (int) $instance['id'],
            'vm_node_id' => (int) ($instance['vm_node_id'] ?? 0),
            'user_id' => isset($admin['id']) ? (int) $admin['id'] : null,
            'event' => $event,
            'metadata' => array_merge(['hostname' => $instance['hostname'] ?? null], $meta),
            'ip' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
