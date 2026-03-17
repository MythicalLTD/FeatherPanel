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

/**
 * Dear developer,.
 *
 * Once you are done trying to ‘optimize’ this routine,
 * and you have realized what a terrible mistake that was,
 * please increment the following counter as a warning
 * to the next guy.
 *
 * total_hours_wasted_here = 15
 */

use App\App;
use App\Chat\VmIp;
use App\Chat\VmNode;
use App\Chat\Database;
use App\Chat\VmInstance;
use App\Chat\VmTemplate;
use App\Chat\VmInstanceBackup;
use App\Chat\VmCreationPending;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;

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
        $savedCpus   = (int) ($instance['cpus'] ?? 1);
        $savedCores  = (int) ($instance['cores'] ?? 1);
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

        $nextResult = $client->getNextVmid(100);
        if (!$nextResult['ok'] || $nextResult['vmid'] === null) {
            return [
                'ok' => false,
                'error' => 'Could not get next VMID: ' . ($nextResult['error'] ?? 'unknown'),
                'code' => 'PROXMOX_ERROR',
                'http_status' => 500,
            ];
        }
        $newVmid = $nextResult['vmid'];

        if ($vmType === 'qemu') {
            $clone = $client->cloneQemu($templateNode, $templateVmid, $newVmid, (string) ($instance['hostname'] ?? 'vm-' . $newVmid), $node);
        } else {
            $clone = $client->cloneLxc($templateNode, $templateVmid, $newVmid, (string) ($instance['hostname'] ?? 'ct-' . $newVmid), $node, (string) ($vmNode['default_storage'] ?? 'local'));
        }
        if (!$clone['ok'] || empty($clone['upid'])) {
            return ['ok' => false, 'error' => 'Clone failed: ' . ($clone['error'] ?? 'unknown'), 'code' => 'CLONE_FAILED', 'http_status' => 500];
        }

        $ipId = !empty($instance['vm_ip_id']) ? (int) $instance['vm_ip_id'] : null;
        $ip = $ipId ? VmIp::getById($ipId) : null;

        $reinstallMeta = json_encode([
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
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $reinstallId = bin2hex(random_bytes(16));
        $saved = VmCreationPending::create([
            'creation_id' => $reinstallId,
            'upid' => $clone['upid'],
            'target_node' => $node,
            'vmid' => $newVmid,
            'hostname' => $instance['hostname'] ?? 'vm-' . $newVmid,
            'vm_node_id' => (int) $instance['vm_node_id'],
            'plan_id' => null,
            'template_id' => $instance['template_id'] ? (int) $instance['template_id'] : null,
            'vm_ip_id' => $ipId,
            'user_uuid' => $instance['user_uuid'] ?? null,
            'notes' => $reinstallMeta,
            'vm_type' => $vmType,
            'memory' => 512,
            'cpus' => 1,
            'cores' => 1,
            'disk' => 10,
            'storage' => 'local',
            'bridge' => 'vmbr0',
            'on_boot' => 0,
        ]);
        if (!$saved) {
            $client->deleteVm($node, $newVmid, $vmType);

            return ['ok' => false, 'error' => 'Failed to save reinstall pending record', 'code' => 'DB_ERROR', 'http_status' => 500];
        }

        return [
            'ok' => true,
            'reinstall_id' => $reinstallId,
            'message' => 'Reinstall clone started. Poll reinstall-status until active or failed.',
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
    public static function completeReinstallAfterClone(string $reinstallId, array $pending, array $reinstallMeta, Proxmox $client): array
    {
        $vmType = $pending['vm_type'] === 'lxc' ? 'lxc' : 'qemu';
        $newVmid = (int) $pending['vmid'];
        $node = $pending['target_node'];
        $oldVmid = (int) ($reinstallMeta['old_vmid'] ?? 0);
        $instanceId = (int) ($reinstallMeta['instance_id'] ?? 0);
        $ciUser = $reinstallMeta['ci_user'] ?? null;
        $ciPassword = $reinstallMeta['ci_password'] ?? null;
        $ipAddress = $reinstallMeta['ip_address'] ?? null;
        $ipCidr = (int) ($reinstallMeta['ip_cidr'] ?? 24);
        $gateway = trim((string) ($reinstallMeta['gateway'] ?? ''));
        $memory = (int) ($reinstallMeta['memory'] ?? 512);
        $cpus = (int) ($reinstallMeta['cpus'] ?? 1);
        $cores = (int) ($reinstallMeta['cores'] ?? 1);
        $diskGb = (int) ($reinstallMeta['disk_gb'] ?? 0);
        $rootDisk = is_string($reinstallMeta['root_disk'] ?? null) ? (string) $reinstallMeta['root_disk'] : null;

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
                'net0' => $net0,
                'memory' => $memory,
                'cores' => $cores > 0 ? $cores : 1,
                'onboot' => 0,
                'tags' => 'FeatherPanel-Managed',
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
                'ipconfig0' => $ipconfig0,
                'boot' => $bootOrder,
                'memory' => $memory,
                'sockets' => $cpus > 0 ? $cpus : 1,
                'cores' => $cores > 0 ? $cores : 1,
                'ciuser' => $ciUser ?? 'debian',
                'cipassword' => $ciPassword ?? bin2hex(random_bytes(6)),
                'tags' => 'FeatherPanel-Managed',
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
                self::deleteInstanceBackups($instanceForBackups, $client);
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

        VmCreationPending::deleteByCreationId($reinstallId);

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
                'http_status' => 502,
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
}
