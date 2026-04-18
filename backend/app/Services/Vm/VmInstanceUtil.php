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

namespace App\Services\Vm;

// Dear developer,
//
// Once you are done trying to ‘optimize’ this routine,
// and you have realized what a terrible mistake that was,
// please increment the following counter as a warning
// to the next guy.
//
// total_hours_wasted_here = 15

use App\App;
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Chat\VmTemplate;
use App\Chat\VmInstanceIp;
use App\Chat\VmInstanceBackup;
use App\Config\ConfigInterface;
use App\Chat\VmInstanceActivity;
use App\Services\Proxmox\Proxmox;
use App\Services\Backup\BackupFifoEviction;

final class VmInstanceUtil
{
    /**
     * Build a Proxmox client for the given VM node (shared by admin and user controllers).
     *
     * @param array<string, mixed> $vmNode
     *
     * Magic. Do not touch.
     */
    public static function buildProxmoxClientForNode(array $vmNode): Proxmox
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
            } else {
                App::getInstance(true)->getLogger()->warning(
                    'VM node additional headers JSON is invalid for ID ' . ($vmNode['id'] ?? 'unknown')
                );
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
            } else {
                App::getInstance(true)->getLogger()->warning(
                    'VM node additional params JSON is invalid for ID ' . ($vmNode['id'] ?? 'unknown')
                );
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

    /**
     * @param array<string, mixed> $instance
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getInstanceNetworkAssignments(array $instance): array
    {
        $instanceId = isset($instance['id']) ? (int) $instance['id'] : 0;
        if ($instanceId > 0) {
            $rows = VmInstanceIp::getByInstanceId($instanceId);
            if (!empty($rows)) {
                return array_values(array_map(static function (array $row): array {
                    return [
                        'vm_ip_id' => isset($row['vm_ip_id']) ? (int) $row['vm_ip_id'] : 0,
                        'network_key' => isset($row['network_key']) && is_string($row['network_key']) ? $row['network_key'] : 'net0',
                        'bridge' => isset($row['bridge']) && is_string($row['bridge']) ? $row['bridge'] : null,
                        'interface_name' => isset($row['interface_name']) && is_string($row['interface_name']) ? $row['interface_name'] : null,
                        'is_primary' => !empty($row['is_primary']),
                        'sort_order' => isset($row['sort_order']) ? (int) $row['sort_order'] : 0,
                        'ip' => $row['ip'] ?? null,
                        'cidr' => isset($row['cidr']) ? (int) $row['cidr'] : null,
                        'gateway' => $row['gateway'] ?? null,
                    ];
                }, $rows));
            }
        }

        $vmIpId = isset($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : 0;
        if ($vmIpId <= 0) {
            return [];
        }

        $ip = VmIp::getById($vmIpId);
        if (!$ip) {
            return [];
        }

        return [
            [
                'vm_ip_id' => $vmIpId,
                'network_key' => 'net0',
                'bridge' => null,
                'interface_name' => 'eth0',
                'is_primary' => true,
                'sort_order' => 0,
                'ip' => $ip['ip'] ?? ($instance['ip_address'] ?? null),
                'cidr' => isset($ip['cidr']) ? (int) $ip['cidr'] : 24,
                'gateway' => $ip['gateway'] ?? ($instance['gateway'] ?? null),
            ],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $assignments
     * @param array<string, mixed> $currentConfig
     *
     * @return array{config: array<string, mixed>, deleteKeys: array<int, string>}
     */
    public static function buildNetworkConfig(string $vmType, array $assignments, array $currentConfig = []): array
    {
        usort($assignments, static function (array $a, array $b): int {
            $keyA = isset($a['network_key']) ? (string) $a['network_key'] : 'net999';
            $keyB = isset($b['network_key']) ? (string) $b['network_key'] : 'net999';

            return strnatcmp($keyA, $keyB);
        });

        $normalized = [];
        foreach (array_values($assignments) as $index => $assignment) {
            $ip = $assignment['ip'] ?? null;
            if (!is_string($ip) || trim($ip) === '') {
                continue;
            }

            $networkKey = isset($assignment['network_key']) && is_string($assignment['network_key']) && preg_match('/^net\d+$/', $assignment['network_key'])
                ? $assignment['network_key']
                : ('net' . $index);

            $normalized[] = [
                'network_key' => $networkKey,
                'ip' => trim($ip),
                'cidr' => isset($assignment['cidr']) ? (int) $assignment['cidr'] : 24,
                'gateway' => isset($assignment['gateway']) && is_string($assignment['gateway']) ? trim($assignment['gateway']) : '',
                'bridge' => isset($assignment['bridge']) && is_string($assignment['bridge']) ? trim($assignment['bridge']) : '',
                'interface_name' => isset($assignment['interface_name']) && is_string($assignment['interface_name']) ? trim($assignment['interface_name']) : '',
                'is_primary' => $index === 0 || !empty($assignment['is_primary']),
            ];
        }

        $config = [];
        $deleteKeys = [];

        if ($vmType === 'qemu') {
            $currentNetKeys = array_values(array_filter(array_keys($currentConfig), static function ($key) {
                return preg_match('/^net\d+$/', (string) $key);
            }));
            $currentIpconfigKeys = array_values(array_filter(array_keys($currentConfig), static function ($key) {
                return preg_match('/^ipconfig\d+$/', (string) $key);
            }));
            $desiredNetKeys = [];
            $desiredIpconfigKeys = [];

            foreach ($normalized as $index => $assignment) {
                $networkKey = $assignment['network_key'];
                $networkIndex = (int) preg_replace('/\D/', '', $networkKey);
                $desiredNetKeys[] = $networkKey;
                $desiredIpconfigKeys[] = 'ipconfig' . $networkIndex;

                $bridge = $assignment['bridge'] !== '' ? $assignment['bridge'] : 'vmbr0';
                $existingNet = isset($currentConfig[$networkKey]) && is_string($currentConfig[$networkKey])
                    ? (string) $currentConfig[$networkKey]
                    : '';
                if ($existingNet !== '') {
                    if (preg_match('/(^|,)bridge=[^,]*/', $existingNet) === 1) {
                        $existingNet = preg_replace('/(^|,)bridge=[^,]*/', '$1bridge=' . $bridge, $existingNet) ?? $existingNet;
                    } else {
                        $existingNet .= ',bridge=' . $bridge;
                    }
                    $config[$networkKey] = trim($existingNet, ',');
                } else {
                    $config[$networkKey] = 'virtio,bridge=' . $bridge;
                }

                $ipconfig = 'ip=' . $assignment['ip'] . '/' . max(1, $assignment['cidr']);
                if ($index === 0 && $assignment['gateway'] !== '') {
                    $ipconfig .= ',gw=' . $assignment['gateway'];
                }
                $config['ipconfig' . $networkIndex] = $ipconfig;
            }

            foreach ($currentNetKeys as $key) {
                if (!in_array($key, $desiredNetKeys, true)) {
                    $deleteKeys[] = (string) $key;
                }
            }
            foreach ($currentIpconfigKeys as $key) {
                if (!in_array($key, $desiredIpconfigKeys, true)) {
                    $deleteKeys[] = (string) $key;
                }
            }
        } else {
            $currentNetKeys = array_values(array_filter(array_keys($currentConfig), static function ($key) {
                return preg_match('/^net\d+$/', (string) $key);
            }));
            $desiredNetKeys = [];

            foreach ($normalized as $index => $assignment) {
                $networkKey = $assignment['network_key'];
                $desiredNetKeys[] = $networkKey;

                $bridge = $assignment['bridge'] !== '' ? $assignment['bridge'] : 'vmbr0';
                $interfaceName = $assignment['interface_name'] !== '' ? $assignment['interface_name'] : ('eth' . $index);
                $net = 'name=' . $interfaceName . ',bridge=' . $bridge . ',ip=' . $assignment['ip'] . '/' . max(1, $assignment['cidr']);
                if ($index === 0 && $assignment['gateway'] !== '') {
                    $net .= ',gw=' . $assignment['gateway'];
                }
                $config[$networkKey] = $net;
            }

            foreach ($currentNetKeys as $key) {
                if (!in_array($key, $desiredNetKeys, true)) {
                    $deleteKeys[] = (string) $key;
                }
            }
        }

        return ['config' => $config, 'deleteKeys' => $deleteKeys];
    }

    /**
     * Delete all tracked backups for a VM instance (used during reinstall/delete).
     *
     * @param array<string, mixed> $instance
     */
    public static function deleteInstanceBackups(array $instance, ?Proxmox $client = null): void
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
     * Start async reinstall: validate, clone from template, save pending. Caller handles logging and HTTP response.
     *
     * @param array<string, mixed> $instance VM instance row (must have id, template_id, vm_node_id, vmid, etc.)
     * @param array<string, mixed> $requestData e.g. ['ci_user' => ..., 'ci_password' => ...] for QEMU
     *
     * @return array{ok: true, reinstall_id: string, message: string}|array{ok: false, error: string, code: string, http_status: int}
     */
    public static function startReinstall(array $instance, array $requestData): array
    {

        /*
         * You may think you know what the following code does.
         * But you dont. Trust me.
         * Fiddle with it, and youll spend many a sleepless
         * night cursing the moment you thought youd be clever
         * enough to "optimize" the code below.
         * Now close this file and go play with something else.
         */
        $instanceId = (int) ($instance['id'] ?? 0);
        if ($instanceId <= 0) {
            return ['ok' => false, 'error' => 'VM instance not found', 'code' => 'VM_INSTANCE_NOT_FOUND', 'http_status' => 404];
        }

        if (empty($instance['template_id'])) {
            return ['ok' => false, 'error' => 'Cannot reinstall: instance has no template_id', 'code' => 'NO_TEMPLATE', 'http_status' => 400];
        }

        $template = VmTemplate::getById((int) $instance['template_id']);
        if (!$template) {
            return ['ok' => false, 'error' => 'Template not found for this instance', 'code' => 'TEMPLATE_NOT_FOUND', 'http_status' => 404];
        }

        $templateFile = $template['template_file'] ?? '';
        if ($templateFile === '' || !ctype_digit((string) $templateFile)) {
            return ['ok' => false, 'error' => 'Template must have a valid template VMID (template_file)', 'code' => 'INVALID_TEMPLATE', 'http_status' => 400];
        }
        $templateVmid = (int) $templateFile;

        $vmNode = VmNode::getVmNodeById((int) $instance['vm_node_id']);
        if (!$vmNode) {
            return ['ok' => false, 'error' => 'VM node not found', 'code' => 'VM_NODE_NOT_FOUND', 'http_status' => 404];
        }

        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $ciUser = null;
        $ciPassword = null;
        if ($vmType === 'qemu') {
            $ciUser = isset($requestData['ci_user']) && is_string($requestData['ci_user']) ? trim($requestData['ci_user']) : null;
            $ciPassword = isset($requestData['ci_password']) && is_string($requestData['ci_password']) ? trim($requestData['ci_password']) : null;
            if ($ciUser === null || $ciUser === '' || $ciPassword === null || $ciPassword === '') {
                return [
                    'ok' => false,
                    'error' => 'Cloud-init username and password (ci_user, ci_password) are required to reinstall KVM/QEMU VMs',
                    'code' => 'VALIDATION_FAILED',
                    'http_status' => 400,
                ];
            }
        }

        try {
            $client = self::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed: ' . $e->getMessage());

            return ['ok' => false, 'error' => 'Failed to connect to Proxmox node', 'code' => 'PROXMOX_ERROR', 'http_status' => 500];
        }

        // Mark instance as reinstalling for frontend UX while clone/provision runs
        if ($instanceId > 0) {
            try {
                VmInstance::updateStatus($instanceId, 'reinstalling');
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'Failed to update VM status to reinstalling for instance ' . $instanceId . ': ' . $e->getMessage()
                );
            }
        }

        $oldVmid = (int) $instance['vmid'];
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid($oldVmid);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ['ok' => false, 'error' => 'Could not determine Proxmox node for this VM', 'code' => 'NODE_UNKNOWN', 'http_status' => 500];
        }

        $findTemplate = $client->findNodeByVmid($templateVmid);
        $templateNode = $findTemplate['ok'] ? $findTemplate['node'] : $node;

        $savedMemory = (int) ($instance['memory'] ?? 512);
        $savedCpus = (int) ($instance['cpus'] ?? 1);
        $savedCores = (int) ($instance['cores'] ?? 1);
        $savedDiskGb = (int) ($instance['disk_gb'] ?? 0);
        $rootDiskKey = null;

        if ($savedMemory <= 0 || $savedCpus <= 0 || $savedCores <= 0 || $savedDiskGb <= 0) {
            $currentCfg = $client->getVmConfig($node, $oldVmid, $vmType);
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
                                    $num = (int) $m[1];
                                    $unit = strtolower($m[2] ?? 'g');
                                    $savedDiskGb = match ($unit) {
                                        'm' => (int) ceil($num / 1024), 't' => $num * 1024, default => $num,
                                    };
                                }
                                break;
                            }
                        }
                    }
                } else {
                    if (($savedCores <= 0 || $savedCpus <= 0) && isset($cfg['cores']) && is_numeric($cfg['cores'])) {
                        $savedCores = (int) $cfg['cores'];
                        $savedCpus = $savedCores;
                    }
                    if ($savedDiskGb <= 0 && isset($cfg['rootfs']) && is_string($cfg['rootfs'])) {
                        foreach (explode(',', $cfg['rootfs']) as $part) {
                            $part = trim($part);
                            if (str_starts_with($part, 'size=')) {
                                $sizeVal = substr($part, 5);
                                if (preg_match('/^(\d+)([GgMmTt])?$/', $sizeVal, $m)) {
                                    $num = (int) $m[1];
                                    $unit = strtolower($m[2] ?? 'g');
                                    $savedDiskGb = match ($unit) {
                                        'm' => (int) ceil($num / 1024), 't' => $num * 1024, default => $num,
                                    };
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }

        $nextResult = $client->getNextVmid(5000);
        if (!$nextResult['ok'] || $nextResult['vmid'] === null) {
            return [
                'ok' => false,
                'error' => 'Could not get next VMID: ' . ($nextResult['error'] ?? 'unknown'),
                'code' => 'PROXMOX_ERROR',
                'http_status' => 500,
            ];
        }
        $newVmid = $nextResult['vmid'];

        $ipId = !empty($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : null;
        $ip = $ipId ? VmIp::getById($ipId) : null;

        $reinstallMeta = [
            'type' => 'reinstall',
            'old_vmid' => $oldVmid,
            'instance_id' => $instanceId,
            'ci_user' => $ciUser,
            'ci_password' => $ciPassword,
            'ip_address' => $ip['ip'] ?? ($instance['ip_address'] ?? null),
            'ip_cidr' => $ip ? (int) ($ip['cidr'] ?? 24) : 24,
            'gateway' => $ip['gateway'] ?? ($instance['gateway'] ?? null),
            'memory' => $savedMemory,
            'cpus' => $savedCpus,
            'cores' => $savedCores,
            'disk_gb' => $savedDiskGb,
            'root_disk' => $rootDiskKey,
            'vm_type' => $vmType,
            'hostname' => $instance['hostname'] ?? 'vm-' . $newVmid,
            'template_vmid' => $templateVmid,
            'template_node' => $templateNode,
            'storage' => (string) ($vmNode['default_storage'] ?? 'local'),
            'current_step' => 'initial',
        ];

        $reinstallId = bin2hex(random_bytes(16));
        $saved = VmTask::create([
            'task_id' => $reinstallId,
            'upid' => '', // empty UPID so runner initiates the clone
            'target_node' => $node,
            'vmid' => $newVmid,
            'task_type' => 'reinstall',
            'status' => 'pending',
            'instance_id' => $instanceId,
            'vm_node_id' => (int) $instance['vm_node_id'],
            'user_uuid' => $instance['user_uuid'] ?? null,
            'data' => $reinstallMeta,
        ]);

        if (!$saved) {
            return ['ok' => false, 'error' => 'Failed to create reinstall task in DB', 'code' => 'DB_ERROR', 'http_status' => 500];
        }

        return [
            'ok' => true,
            'reinstall_id' => $reinstallId,
            'message' => 'Reinstall scheduled successfully. The task is now in queue.',
        ];
    }

    /**
     * After clone task is done (status=stopped, exitstatus=OK): apply config, delete old VM, start new, update DB.
     * Deletes the pending record. Caller handles logging.
     *
     * @param array<string, mixed> $pending
     * @param array<string, mixed> $reinstallMeta decoded from pending notes
     *
     * @return array{instance: array|null, new_vmid: int}
     */
    public static function completeReinstallAfterClone(string $reinstallId, array $pending, array $reinstallMeta, Proxmox $client, bool $skipStart = false): array
    {
        $vmType = $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu';
        $newVmid = (int) $pending['vmid'];
        $node = $pending['target_node'];
        $oldVmid = (int) ($reinstallMeta['old_vmid'] ?? 0);
        $instanceId = (int) ($reinstallMeta['instance_id'] ?? 0);
        $ciUser = $reinstallMeta['ci_user'] ?? null;
        $ciPassword = $reinstallMeta['ci_password'] ?? null;
        $memory = (int) ($reinstallMeta['memory'] ?? 512);
        $cpus = (int) ($reinstallMeta['cpus'] ?? 1);
        $cores = (int) ($reinstallMeta['cores'] ?? 1);
        $diskGb = (int) ($reinstallMeta['disk_gb'] ?? 0);
        $rootDisk = is_string($reinstallMeta['root_disk'] ?? null) ? (string) $reinstallMeta['root_disk'] : null;
        $instance = VmInstance::getById($instanceId);
        $networkAssignments = $instance ? self::getInstanceNetworkAssignments($instance) : [];
        $primaryAssignment = $networkAssignments[0] ?? null;
        $ipAddress = is_array($primaryAssignment) && is_string($primaryAssignment['ip'] ?? null)
            ? $primaryAssignment['ip']
            : ($reinstallMeta['ip_address'] ?? null);

        if ($vmType === 'lxc') {
            $getConfig = $client->getVmConfig($node, $newVmid, 'lxc');
            $currentConfig = $getConfig['ok'] && is_array($getConfig['config'] ?? null) ? (array) $getConfig['config'] : [];
            $networkConfig = self::buildNetworkConfig('lxc', $networkAssignments, $currentConfig);
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
                'memory' => $memory,
                'cores' => $cores > 0 ? $cores : 1,
                'onboot' => 0,
                'tags' => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
            ];
            $client->setVmConfig($node, $newVmid, 'lxc', $config + $networkConfig['config'], $networkConfig['deleteKeys']);
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
                if ($diskGb > $templateDiskGb && !$skipStart) {
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
            $bootDiskKey = $rootDisk ?? 'scsi0';
            $bootOrder = 'order=' . $bootDiskKey;
            $curCfg = $client->getVmConfig($node, $newVmid, 'qemu');
            $currentConfig = $curCfg['ok'] && is_array($curCfg['config'] ?? null) ? (array) $curCfg['config'] : [];
            $networkConfig = self::buildNetworkConfig('qemu', $networkAssignments, $currentConfig);
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
                'boot' => $bootOrder,
                'memory' => $memory,
                'sockets' => $cpus > 0 ? $cpus : 1,
                'cores' => $cores > 0 ? $cores : 1,
                'ciuser' => $ciUser ?? 'debian',
                'cipassword' => $ciPassword ?? bin2hex(random_bytes(6)),
                'tags' => 'FeatherPanel-Managed',
                'description' => implode(' | ', $descParts),
            ] + $networkConfig['config'], $networkConfig['deleteKeys']);
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
                if ($diskGb > $templateDiskGb && !$skipStart) {
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
                self::deleteInstanceBackups($instanceForBackups, $client);
            }
        }

        if ($oldVmid > 0) {
            $client->stopVm($node, $oldVmid, $vmType);
            sleep(2);
            $client->deleteVm($node, $oldVmid, $vmType);
        }

        if (!$skipStart) {
            sleep(2);
            $startResult = $client->startVm($node, $newVmid, $vmType);
            $finalStatus = $startResult['ok'] ? 'running' : 'stopped';
            if (!$startResult['ok']) {
                App::getInstance(true)->getLogger()->warning(
                    'Reinstall: failed to start new VM ' . $newVmid . ': ' . ($startResult['error'] ?? 'unknown')
                );
            }
        } else {
            $finalStatus = 'stopped';
        }

        $instance = null;
        if ($instanceId > 0) {
            try {
                $pdo = Database::getPdoConnection();
                $stmt = $pdo->prepare(
                    'UPDATE featherpanel_vm_instances SET vmid = :vmid, pve_node = :node, status = :status WHERE id = :id'
                );
                $stmt->execute([
                    'vmid' => $newVmid,
                    'node' => $node,
                    'status' => $finalStatus,
                    'id' => $instanceId,
                ]);
                $instance = VmInstance::getById($instanceId);
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->error(
                    'Failed to update VM instance DB after reinstall: ' . $e->getMessage()
                );
            }
        }

        VmTask::update($reinstallId, ['status' => 'completed']);

        return ['instance' => $instance, 'new_vmid' => $newVmid];
    }

    /**
     * Create VNC console ticket and build payload (wss_url, pve_redirect_url when possible).
     * Shared by admin and user VNC ticket endpoints.
     *
     * @param array<string, mixed> $instance VM instance row (vmid, vm_node_id, pve_node, vm_type)
     * @param array<string, mixed> $vmNode VM node row (fqdn, port, scheme, ...)
     * @param int $instanceIdForLabel Used for temp PVE user name (e.g. fp-console-{id}-xxx)
     *
     * @return array{ok: true, payload: array}|array{ok: false, error: string, code: string, http_status: int}
     */
    public static function createVncTicketPayload(array $instance, array $vmNode, int $instanceIdForLabel): array
    {
        try {
            $client = self::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Proxmox client build failed (VNC): ' . $e->getMessage());

            return ['ok' => false, 'error' => 'Failed to connect to Proxmox node', 'code' => 'PROXMOX_ERROR', 'http_status' => 500];
        }

        $vmid = (int) $instance['vmid'];
        $vmType = ($instance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu';
        $node = $instance['pve_node'] ?? '';
        if ($node === '') {
            $find = $client->findNodeByVmid($vmid);
            $node = $find['ok'] ? $find['node'] : null;
        }
        if ($node === null || $node === '') {
            return ['ok' => false, 'error' => 'Could not determine Proxmox node', 'code' => 'NODE_UNKNOWN', 'http_status' => 500];
        }

        $vnc = $client->createVncProxy($node, $vmid, $vmType);
        if (!$vnc['ok'] || $vnc['ticket'] === null || $vnc['port'] === null) {
            return [
                'ok' => false,
                'error' => 'VNC proxy failed: ' . ($vnc['error'] ?? 'unknown'),
                'code' => 'VNC_PROXY_FAILED',
                'http_status' => 503,
            ];
        }

        $wssPath = sprintf('/api2/json/nodes/%s/%s/%d/vncwebsocket', $node, $vmType, $vmid);
        $wssQuery = 'port=' . $vnc['port'] . '&vncticket=' . rawurlencode($vnc['ticket']);
        $host = $vmNode['fqdn'] ?? '';
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
            'vmid' => $vmid,
            'host' => $host,
            'port_api' => $portApi,
            'wss_url' => $wssUrl,
        ];

        $tempUser = 'fp-console-' . $instanceIdForLabel . '-' . bin2hex(random_bytes(4)) . '@pve';
        $tempPass = bin2hex(random_bytes(16));
        $expire = time() + 300;
        $cr = $client->createUser($tempUser, $tempPass, $expire);
        if ($cr['ok']) {
            $aclPath = '/vms/' . $vmid;
            $ar = $client->addAcl($aclPath, 'PVEVMUser', $tempUser);
            if ($ar['ok']) {
                $ticketResult = $client->getTicketWithPassword($tempUser, $tempPass);
                if ($ticketResult['ok'] && $ticketResult['ticket'] !== null) {
                    $scheme = ($vmNode['scheme'] ?? 'https') === 'https' ? 'https' : 'http';
                    $pvePort = $portApi > 0 ? $portApi : 8006;
                    $consoleType = $vmType === 'qemu' ? 'kvm' : 'lxc';
                    $payload['pve_redirect_url'] = $scheme . '://' . $host . ':' . $pvePort . '/novnc/mgnovnc.html?novnc=1&token=' . rawurlencode($ticketResult['ticket'])
                        . '&vmid=' . $vmid . '&node=' . rawurlencode($node) . '&console=' . $consoleType;
                }
            }
        }

        return ['ok' => true, 'payload' => $payload];
    }

    /**
     * Create a background task record.
     */
    public static function createVmTask(array $instance, string $type, string $upid, array $meta = [], ?int $vmid = null, ?string $node = null): string
    {
        $taskId = bin2hex(random_bytes(16));
        VmTask::create([
            'task_id' => $taskId,
            'instance_id' => isset($instance['id']) ? (int) $instance['id'] : null,
            'vm_node_id' => isset($instance['vm_node_id']) ? (int) $instance['vm_node_id'] : null,
            'task_type' => $type,
            'status' => 'pending',
            'upid' => $upid,
            'target_node' => $node ?? $instance['pve_node'] ?? '',
            'vmid' => $vmid ?? (int) ($instance['vmid'] ?? 0),
            'data' => $meta,
            'user_uuid' => $instance['user_uuid'] ?? null,
        ]);

        return $taskId;
    }

    /**
     * Complete a task based on its type.
     */
    public static function completeTask(array $task, Proxmox $client, bool $skipStart = false): bool
    {
        $type = $task['task_type'];
        $meta = json_decode($task['data'] ?? '{}', true);
        $taskId = $task['task_id'];

        VmTask::update($taskId, ['status' => 'running']);

        try {
            switch ($type) {
                case 'create':
                    self::completeCreation($taskId, $task, $meta, $client, $skipStart);
                    break;
                case 'reinstall':
                    self::completeReinstallAfterClone($taskId, $task, $meta, $client, $skipStart);
                    break;
                case 'backup':
                    self::completeBackup($taskId, $task, $meta, $client);
                    break;
                case 'restore_backup':
                    self::completeRestore($taskId, $task, $meta, $client);
                    break;
                case 'delete':
                    self::completeDeletion($taskId, $task, $meta, $client);
                    break;
                case 'power':
                    self::completePowerAction($taskId, $task, $meta, $client);
                    break;
                default:
                    App::getInstance(true)->getLogger()->warning("Unknown task type: $type for task $taskId");
                    break;
            }

            if (!$skipStart) {
                VmTask::update($taskId, ['status' => 'completed']);
            }

            return true;
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error("Task $taskId failed: " . $e->getMessage());
            VmTask::update($taskId, ['status' => 'failed', 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * QEMU cdrom slots that reference a real ISO/import image (not the cloud-init seed).
     *
     * @param array<string, mixed> $config Proxmox qemu config key => value
     *
     * @return array<int, string> Full volids e.g. local:iso/my.iso
     */
    private static function qemuCdromIsoVolidsFromConfig(array $config): array
    {
        $out = [];
        foreach ($config as $key => $value) {
            if (!is_string($key) || !is_string($value) || $value === '') {
                continue;
            }
            if (!preg_match('/^(?:ide|sata|scsi)\d+$/i', $key)) {
                continue;
            }
            $lower = strtolower($value);
            if (!str_contains($lower, 'media=cdrom')) {
                continue;
            }
            if (str_contains($lower, 'cloudinit') || str_contains($lower, 'cloud-init')) {
                continue;
            }
            if (str_contains($lower, 'none')) {
                continue;
            }
            $first = trim(explode(',', $value, 2)[0]);
            if ($first === '' || !str_contains($first, ':')) {
                continue;
            }
            $out[] = $first;
        }

        return array_values(array_unique($out));
    }

    /**
     * Remove storage volumes after VM deletion. Purge removes VM-owned images but ISO/import
     * files on ISO-capable storages often remain unless deleted explicitly.
     *
     * @param array<int, string> $volids
     */
    private static function deleteProxmoxStorageVolidsBestEffort(Proxmox $client, string $node, array $volids): void
    {
        foreach ($volids as $volid) {
            $colon = strpos($volid, ':');
            if ($colon === false || $colon === 0) {
                continue;
            }
            $storage = substr($volid, 0, $colon);
            if ($storage === '') {
                continue;
            }
            $res = $client->deleteBackupVolume($node, $storage, $volid);
            if (!$res['ok']) {
                App::getInstance(true)->getLogger()->warning(
                    'Post-delete ISO/storage cleanup failed for volid=' . $volid . ': ' . ($res['error'] ?? 'unknown')
                );
            }
        }
    }

    private static function completeDeletion(string $taskId, array $task, array $meta, Proxmox $client): void
    {
        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $vmid = (int) ($task['vmid'] ?? 0);
        $node = $task['target_node'] ?? '';
        $vmType = $meta['vm_type'] ?? $task['vm_type'] ?? 'qemu';
        $instance = $instanceId > 0 ? VmInstance::getById($instanceId) : null;

        if ($node !== '' && $vmid > 0) {
            $cdromIsoVolids = [];
            if ($vmType === 'qemu') {
                $cfgSnap = $client->getVmConfig($node, $vmid, 'qemu');
                if ($cfgSnap['ok'] && is_array($cfgSnap['config'] ?? null)) {
                    $cdromIsoVolids = self::qemuCdromIsoVolidsFromConfig($cfgSnap['config']);
                }
            }

            // 1. Try to stop first
            $client->stopVm($node, $vmid, $vmType);
            sleep(2);

            // 2. Backups
            if ($instance) {
                self::deleteInstanceBackups($instance, $client);
            }

            // 3. Delete from Proxmox (purge volumes including cloud-init / main disks)
            $result = $client->deleteVm($node, $vmid, $vmType);
            if (!$result['ok']) {
                throw new \Exception('Failed to delete from Proxmox: ' . ($result['error'] ?? 'unknown'));
            }

            // 4. Drop mounted ISO/import files that purge often leaves on ISO storage
            if ($vmType === 'qemu' && $cdromIsoVolids !== []) {
                self::deleteProxmoxStorageVolidsBestEffort($client, $node, $cdromIsoVolids);
            }
        } else {
            if ($instance) {
                self::deleteInstanceBackups($instance, null);
            }
        }

        // 5. DB cleanup
        if ($instanceId > 0) {
            VmInstance::delete($instanceId);
            \App\Chat\Activity::createActivity([
                'user_uuid' => $task['user_uuid'] ?? null,
                'name' => 'vm_instance_delete',
                'context' => 'Deleted VM instance (async): ' . ($instance['hostname'] ?? $instanceId),
                'ip_address' => '127.0.0.1',
            ]);
        }
    }

    private static function completePowerAction(string $taskId, array $task, array $meta, Proxmox $client): void
    {
        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $vmid = (int) ($task['vmid'] ?? 0);
        $node = $task['target_node'] ?? '';
        $vmType = $meta['vm_type'] ?? 'qemu';
        $action = $meta['action'] ?? '';

        if ($node === '' || $vmid === 0 || !in_array($action, ['start', 'stop', 'reboot'], true)) {
            throw new \Exception('Invalid power task data: ' . ($action ?: 'unknown action'));
        }

        if ($action === 'start') {
            $client->startVm($node, $vmid, $vmType);
            VmInstance::updateStatus($instanceId, 'running');
        } elseif ($action === 'stop') {
            $client->stopVm($node, $vmid, $vmType);
            VmInstance::updateStatus($instanceId, 'stopped');
        } else {
            $client->stopVm($node, $vmid, $vmType);
            sleep(3);
            $client->startVm($node, $vmid, $vmType);
            VmInstance::updateStatus($instanceId, 'running');
        }
    }

    private static function completeCreation(string $taskId, array $task, array $meta, Proxmox $client, bool $skipStart = false): void
    {
        $vmid = (int) $task['vmid'];
        $node = $task['target_node'];
        $vmType = $meta['vm_type'] ?? 'qemu';
        $ipId = isset($meta['vm_ip_id']) ? (int) $meta['vm_ip_id'] : null;

        $bridge = $meta['bridge'] ?? 'vmbr0';
        $memory = (int) ($meta['memory'] ?? 512);
        $cpus = (int) ($meta['cpus'] ?? 1);
        $cores = (int) ($meta['cores'] ?? 1);
        $onBoot = !empty($meta['on_boot']);
        $hostname = $meta['hostname'] ?? 'vm-' . $vmid;
        $requestedNetworks = isset($meta['networks']) && is_array($meta['networks']) ? $meta['networks'] : [];
        $networkAssignments = [];

        foreach (array_values($requestedNetworks) as $index => $network) {
            if (!is_array($network)) {
                continue;
            }

            $key = isset($network['key']) && is_string($network['key']) ? trim($network['key']) : ('net' . $index);
            if (!preg_match('/^net\d+$/', $key)) {
                $key = 'net' . $index;
            }

            $networkVmIpId = isset($network['vm_ip_id']) ? (int) $network['vm_ip_id'] : 0;
            if ($networkVmIpId <= 0) {
                continue;
            }

            $ipRow = VmIp::getById($networkVmIpId);
            if (!$ipRow || empty($ipRow['ip'])) {
                continue;
            }

            $interfaceIndex = (int) preg_replace('/\D/', '', $key);
            $networkAssignments[] = [
                'vm_ip_id' => $networkVmIpId,
                'network_key' => $key,
                'bridge' => isset($network['bridge']) && is_string($network['bridge']) && trim($network['bridge']) !== ''
                    ? trim($network['bridge'])
                    : $bridge,
                'interface_name' => 'eth' . $interfaceIndex,
                'is_primary' => false,
                'sort_order' => $index,
                'ip' => $ipRow['ip'] ?? null,
                'cidr' => isset($ipRow['cidr']) ? (int) $ipRow['cidr'] : 24,
                'gateway' => $ipRow['gateway'] ?? null,
            ];
        }

        if (empty($networkAssignments)) {
            $ip = $ipId ? VmIp::getById($ipId) : null;
            if (!$ip) {
                throw new \Exception('IP no longer available');
            }

            $networkAssignments[] = [
                'vm_ip_id' => $ipId,
                'network_key' => 'net0',
                'bridge' => $bridge,
                'interface_name' => 'eth0',
                'is_primary' => true,
                'sort_order' => 0,
                'ip' => $ip['ip'] ?? null,
                'cidr' => isset($ip['cidr']) ? (int) $ip['cidr'] : 24,
                'gateway' => $ip['gateway'] ?? null,
            ];
        } else {
            $networkAssignments = array_values($networkAssignments);
            foreach ($networkAssignments as $index => &$assignment) {
                $assignment['is_primary'] = $index === 0;
                $assignment['sort_order'] = $index;
            }
            unset($assignment);
        }

        $primaryAssignment = $networkAssignments[0] ?? null;
        if (!$primaryAssignment || !is_string($primaryAssignment['ip'] ?? null) || trim((string) $primaryAssignment['ip']) === '') {
            throw new \Exception('Primary IP is required');
        }

        $primaryIpAddress = (string) $primaryAssignment['ip'];
        $primaryGateway = isset($primaryAssignment['gateway']) && is_string($primaryAssignment['gateway'])
            ? $primaryAssignment['gateway']
            : null;
        $primaryVmIpId = (int) $primaryAssignment['vm_ip_id'];

        if ($vmType === 'qemu') {
            $requestedDiskGb = (int) ($meta['disk'] ?? 0);
            if ($requestedDiskGb > 0 && !$skipStart) { // If skipStart is false, it means we are doing it all at once
                $client->resizeQemuDisk($node, $vmid, 'scsi0', $requestedDiskGb . 'G');
            }

            $networkConfig = self::buildNetworkConfig('qemu', $networkAssignments, []);
            $client->setVmConfig($node, $vmid, 'qemu', [
                'memory' => $memory,
                'sockets' => $cpus,
                'cores' => $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'onboot' => $onBoot ? 1 : 0,
                'boot' => 'order=scsi0',
                'ciuser' => $meta['ci_user'] ?? 'debian',
                'cipassword' => $meta['ci_password'] ?? bin2hex(random_bytes(6)),
                'tags' => 'FeatherPanel-Managed',
                'description' => "FeatherPanel Managed VM | IP: {$primaryIpAddress} | Hostname: $hostname | User: {$task['user_uuid']} | Created: " . date('Y-m-d H:i:s'),
            ] + $networkConfig['config']);
        } else {
            $networkConfig = self::buildNetworkConfig('lxc', $networkAssignments, []);
            $client->setVmConfig($node, $vmid, 'lxc', [
                'memory' => $memory,
                'cores' => $cpus * $cores,
                'nameserver' => '1.1.1.1 8.8.8.8',
                'onboot' => $onBoot ? 1 : 0,
                'tags' => 'FeatherPanel-Managed',
                'description' => "FeatherPanel Managed VM | IP: {$primaryIpAddress} | Hostname: $hostname | User: {$task['user_uuid']} | Created: " . date('Y-m-d H:i:s'),
            ] + $networkConfig['config']);

            $requestedDiskGb = (int) ($meta['disk'] ?? 0);
            if ($requestedDiskGb > 0 && !$skipStart) {
                $client->resizeContainerDisk($node, $vmid, 'rootfs', $requestedDiskGb . 'G');
            }
        }

        $pdo = Database::getPdoConnection();
        $instanceData = [
            'vmid' => $vmid,
            'vm_node_id' => (int) $task['vm_node_id'],
            'user_uuid' => $task['user_uuid'],
            'pve_node' => $node,
            'plan_id' => $meta['plan_id'] ?? null,
            'template_id' => $meta['template_id'] ?? null,
            'vm_type' => $vmType,
            'hostname' => $hostname,
            'status' => 'stopped',
            'ip_address' => $primaryIpAddress,
            'gateway' => $primaryGateway,
            'vm_ip_id' => $primaryVmIpId,
            'notes' => $meta['notes'] ?? null,
            'backup_limit' => (int) ($meta['backup_limit'] ?? 5),
            'memory' => $memory,
            'cpus' => $cpus,
            'cores' => $cores,
            'disk_gb' => (int) ($meta['disk'] ?? 10),
            'on_boot' => $onBoot ? 1 : 0,
        ];
        $brNorm = BackupFifoEviction::normalizeEntityOverride($meta['backup_retention_mode'] ?? null);
        if ($brNorm !== null) {
            $instanceData['backup_retention_mode'] = $brNorm;
        }

        $instance = VmInstance::create($instanceData, $pdo);

        if ($instance) {
            VmInstanceIp::syncForInstance((int) $instance['id'], $networkAssignments, $pdo);
        }

        if ($onBoot && $instance && !$skipStart) {
            $start = $client->startVm($node, $vmid, $vmType);
            if ($start['ok']) {
                VmInstance::updateStatus((int) $instance['id'], 'running', $pdo);
            }
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => (int) ($instance['id'] ?? 0),
            'vm_node_id' => (int) $task['vm_node_id'],
            'user_id' => null,
            'event' => 'vm:create',
            'metadata' => ['hostname' => $hostname, 'vmid' => $vmid],
            'ip' => '127.0.0.1',
        ]);
    }

    private static function completeBackup(string $taskId, array $task, array $meta, Proxmox $client): void
    {
        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $node = $task['target_node'];
        $vmid = (int) $task['vmid'];
        $storage = $meta['storage'] ?? '';

        $list = $client->listVmBackups($node, $vmid);
        if ($list['ok'] && !empty($list['backups'])) {
            $matching = array_values(array_filter($list['backups'], function ($b) use ($storage) {
                return ($b['storage'] ?? '') === $storage;
            }));
            if (!empty($matching)) {
                $latest = $matching[0];
                VmInstanceBackup::create([
                    'vm_instance_id' => $instanceId,
                    'vmid' => $vmid,
                    'storage' => $storage,
                    'volid' => (string) ($latest['volid'] ?? ''),
                    'size_bytes' => (int) ($latest['size'] ?? 0),
                    'ctime' => (int) ($latest['ctime'] ?? 0),
                    'format' => (string) ($latest['format'] ?? null),
                ]);
            }
        }

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id' => (int) $task['vm_node_id'],
            'user_id' => null,
            'event' => 'vm:backup.done',
            'metadata' => ['vmid' => $vmid],
            'ip' => '127.0.0.1',
        ]);
    }

    private static function completeRestore(string $taskId, array $task, array $meta, Proxmox $client): void
    {
        $instanceId = (int) ($meta['instance_id'] ?? 0);
        $node = $task['target_node'];
        $vmid = (int) $task['vmid'];
        $vmType = $meta['vm_type'] ?? 'qemu';

        $start = $client->startVm($node, $vmid, $vmType);
        $finalStatus = $start['ok'] ? 'running' : 'stopped';

        VmInstance::updateStatus($instanceId, $finalStatus);

        VmInstanceActivity::createActivity([
            'vm_instance_id' => $instanceId,
            'vm_node_id' => (int) $task['vm_node_id'],
            'user_id' => null,
            'event' => 'vm:restore.done',
            'metadata' => ['vmid' => $vmid],
            'ip' => '127.0.0.1',
        ]);
    }
}
