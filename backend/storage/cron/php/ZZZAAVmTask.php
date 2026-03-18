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

namespace App\Cron;

use App\App;
use App\Chat\VmNode;
use App\Chat\VmTask;
use App\Chat\TimedTask;
use App\Services\Vm\VmInstanceUtil;
use App\Cli\Utils\MinecraftColorCodeSupport;

class ZZZAAVmTask implements TimeTask
{
    /**
     * Entry point for the VM task runner.
     */
    public function run()
    {
        $cron = new Cron('vm-task-runner', '1M');
        // $force = getenv('FP_CRON_FORCE') === '1';
        $force = true;
        try {
            $cron->runIfDue(function () {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aStarting VM task runner...');
                $this->processTasks();
                TimedTask::markRun('vm-task-runner', true, 'VM task runner heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('VM Task Runner failed: ' . $e->getMessage());
            TimedTask::markRun('vm-task-runner', false, $e->getMessage());
        }
    }

    /**
     * Process all pending or running VM tasks.
     */
    private function processTasks()
    {
        $tasks = VmTask::getPendingTasks();
        $count = count($tasks);
        if ($count > 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . $count . ' pending/running VM tasks');
        }

        foreach ($tasks as $task) {
            $this->processTask($task);
        }
    }

    /**
     * Helper for logging with task-specific prefix.
     */
    private function logTask(string $type, string $message)
    {
        $prefix = match (strtolower($type)) {
            'create', 'reinstall' => '[VM] (INIT)',
            'backup' => '[VM] (BACKUP)',
            'delete' => '[VM] (DELETE)',
            'power'  => '[VM] (POWER)',
            default  => '[VM] (TASK)',
        };
        MinecraftColorCodeSupport::sendOutputWithNewLine("&7{$prefix} &f{$message}");
    }

    /**
     * Process a single VM task and await completion.
     */
    private function processTask(array $task)
    {
        $taskId = $task['task_id'];
        $vmNodeId = (int) ($task['vm_node_id'] ?? 0);
        $type = $task['task_type'] ?? 'unknown';

        if ($vmNodeId <= 0) {
            $this->logTask($type, "&cError: Task {$taskId} has invalid vm_node_id ({$vmNodeId})");
            VmTask::update($taskId, ['status' => 'failed', 'error' => 'Invalid vm_node_id']);

            return;
        }

        $vmNode = VmNode::getVmNodeById($vmNodeId);
        if (!$vmNode) {
            $this->logTask($type, "&cError: VM Node {$vmNodeId} not found for task {$taskId}");
            VmTask::update($taskId, ['status' => 'failed', 'error' => 'VM node not found in DB']);

            return;
        }

        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
            $this->logTask($type, "&aStarted task {$taskId}... following live.");

            while (true) {
                // Fetch fresh task data from DB
                $task = VmTask::getByTaskId($taskId);
                if (!$task || in_array($task['status'], ['completed', 'failed'])) {
                    return;
                }

                $node = $task['target_node'] ?? '';
                $upid = $task['upid'] ?? '';
                $meta = json_decode($task['data'] ?? '{}', true);
                $step = $meta['current_step'] ?? 'initial';
                $vmType = $meta['vm_type'] ?? 'qemu';
                $vmid = (int) $task['vmid'];

                if (empty($upid)) {
                    if ($type === 'create') {
                        if ($step === 'initial') {
                            $this->logTask($type, '&eInitiating Clone operation...');
                            $this->initiateAsyncCreate($task, $client);
                            continue;
                        }

                        if ($step === 'resize') {
                            $requestedDiskGb = (int) ($meta['disk'] ?? $meta['disk_gb'] ?? 0);
                            if ($requestedDiskGb > 0) {
                                // Check current disk size first to avoid unnecessary resize or errors
                                $this->logTask($type, '&eChecking disk size before resize...');
                                $cfg = $client->getVmConfig($node, $vmid, $vmType);
                                $currentDiskGb = 0;
                                if ($cfg['ok'] && is_array($cfg['config'])) {
                                    $diskKey = $vmType === 'qemu' ? ($meta['root_disk'] ?? 'scsi0') : 'rootfs';
                                    $diskValue = $cfg['config'][$diskKey] ?? '';
                                    if (preg_match('/size=(\d+)([GgMmTt])?/', $diskValue, $m)) {
                                        $n = (int) $m[1];
                                        $u = strtolower($m[2] ?? 'g');
                                        $currentDiskGb = match ($u) {
                                            'm' => (int) ceil($n / 1024), 't' => $n * 1024, default => $n,
                                        };
                                    }
                                }

                                if ($requestedDiskGb > $currentDiskGb) {
                                    $this->logTask($type, "&eResizing disk from {$currentDiskGb}G to {$requestedDiskGb}G...");
                                    $res = $vmType === 'qemu'
                                        ? $client->resizeQemuDisk($node, $vmid, $meta['root_disk'] ?? 'scsi0', $requestedDiskGb . 'G')
                                        : $client->resizeContainerDisk($node, $vmid, 'rootfs', $requestedDiskGb . 'G');

                                    if ($res['ok'] && !empty($res['upid'])) {
                                        VmTask::update($taskId, ['upid' => $res['upid']]);
                                        continue;
                                    }
                                } else {
                                    $this->logTask($type, "&aDisk is already {$currentDiskGb}G or larger. Skipping resize.");
                                }
                            }

                            $meta['current_step'] = 'config';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'config') {
                            $this->logTask($type, '&eApplying Cloud-init / Container configuration...');
                            $this->applyVmConfig($task, $client, $meta, $node, $vmid, $vmType);

                            $meta['current_step'] = 'start';
                            VmTask::update($taskId, ['upid' => '', 'data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'start') {
                            $this->logTask($type, '&eStarting VM/Container...');
                            $res = $client->startVm($node, $vmid, $vmType);
                            $startUpid = isset($res['data']) && is_string($res['data']) ? $res['data'] : null;
                            if ($res['ok'] && $startUpid) {
                                VmTask::update($taskId, ['upid' => $startUpid]);
                            } else {
                                // Start command sent but no UPID returned (common for already running VMs or quick starts)
                                if ($res['ok']) {
                                    $this->logTask($type, '&aStart command sent successfully (no task returned).');
                                    VmTask::update($taskId, ['status' => 'completed']);
                                    if (isset($meta['instance_id'])) {
                                        \App\Chat\VmInstance::updateStatus((int) $meta['instance_id'], 'running');
                                    }
                                    $this->logTask($type, "&aTask {$taskId} completed successfully.");
                                } else {
                                    $this->logTask($type, '&cFailed to start VM: ' . ($res['error'] ?? 'unknown'));
                                    VmTask::update($taskId, ['status' => 'failed', 'error' => 'Start failed: ' . ($res['error'] ?? 'unknown')]);
                                }

                                return;
                            }
                            continue;
                        }
                    }

                    if ($type === 'reinstall') {
                        if ($step === 'initial') {
                            $this->logTask($type, '&eInitiating Clone operation...');
                            $this->initiateAsyncCreate($task, $client);
                            continue;
                        }

                        if ($step === 'resize') {
                            $requestedDiskGb = (int) ($meta['disk'] ?? $meta['disk_gb'] ?? 0);
                            if ($requestedDiskGb > 0) {
                                $this->logTask($type, '&eChecking disk size before resize...');
                                $cfg = $client->getVmConfig($node, $vmid, $vmType);
                                $currentDiskGb = 0;
                                if ($cfg['ok'] && is_array($cfg['config'])) {
                                    $diskKey = $vmType === 'qemu' ? ($meta['root_disk'] ?? 'scsi0') : 'rootfs';
                                    $diskValue = $cfg['config'][$diskKey] ?? '';
                                    if (preg_match('/size=(\d+)([GgMmTt])?/', $diskValue, $m)) {
                                        $n = (int) $m[1];
                                        $u = strtolower($m[2] ?? 'g');
                                        $currentDiskGb = match ($u) {
                                            'm' => (int) ceil($n / 1024), 't' => $n * 1024, default => $n,
                                        };
                                    }
                                }

                                if ($requestedDiskGb > $currentDiskGb) {
                                    $this->logTask($type, "&eResizing disk from {$currentDiskGb}G to {$requestedDiskGb}G...");
                                    $res = $vmType === 'qemu'
                                        ? $client->resizeQemuDisk($node, $vmid, $meta['root_disk'] ?? 'scsi0', $requestedDiskGb . 'G')
                                        : $client->resizeContainerDisk($node, $vmid, 'rootfs', $requestedDiskGb . 'G');

                                    if ($res['ok'] && !empty($res['upid'])) {
                                        VmTask::update($taskId, ['upid' => $res['upid']]);
                                        continue;
                                    }
                                } else {
                                    $this->logTask($type, "&aDisk is already {$currentDiskGb}G or larger. Skipping resize.");
                                }
                            }

                            $meta['current_step'] = 'config';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'config') {
                            $this->logTask($type, '&eApplying Cloud-init / Container configuration...');
                            $this->applyVmConfig($task, $client, $meta, $node, $vmid, $vmType);

                            $meta['current_step'] = 'backups';
                            VmTask::update($taskId, ['upid' => '', 'data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'backups') {
                            $this->logTask($type, '&eDeleting old backups...');
                            $instanceId = (int) ($meta['instance_id'] ?? 0);
                            $instance = $instanceId > 0 ? \App\Chat\VmInstance::getById($instanceId) : null;
                            if ($instance) {
                                VmInstanceUtil::deleteInstanceBackups($instance, $client);
                                $this->logTask($type, '&aBackups deleted.');
                            } else {
                                $this->logTask($type, '&eNo instance found for backup deletion.');
                            }

                            $meta['current_step'] = 'cleanup';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'cleanup') {
                            $oldVmid = (int) ($meta['old_vmid'] ?? 0);
                            if ($oldVmid > 0 && $oldVmid !== $vmid) {
                                $this->logTask($type, "&eStopping and deleting old VM {$oldVmid}...");
                                $client->stopVm($node, $oldVmid, $vmType);
                                sleep(2);
                                $res = $client->deleteVm($node, $oldVmid, $vmType);
                                if ($res['ok']) {
                                    $this->logTask($type, "&aOld VM {$oldVmid} deleted.");
                                } else {
                                    $this->logTask($type, '&cFailed to delete old VM: ' . ($res['error'] ?? 'unknown'));
                                }
                            }

                            $meta['current_step'] = 'update_db';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'update_db') {
                            $this->logTask($type, '&eUpdating database records...');
                            $instanceId = (int) ($meta['instance_id'] ?? 0);
                            if ($instanceId > 0) {
                                $pdo = \App\Chat\Database::getPdoConnection();
                                $stmt = $pdo->prepare(
                                    'UPDATE featherpanel_vm_instances SET vmid = :vmid, pve_node = :node, status = :status WHERE id = :id'
                                );
                                $stmt->execute([
                                    'vmid' => $vmid,
                                    'node' => $node,
                                    'status' => 'stopped',
                                    'id' => $instanceId,
                                ]);
                            }

                            $meta['current_step'] = 'start';
                            VmTask::update($taskId, ['upid' => '', 'data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'start') {
                            $this->logTask($type, '&eStarting VM/Container...');
                            $res = $client->startVm($node, $vmid, $vmType);
                            $startUpid = isset($res['data']) && is_string($res['data']) ? $res['data'] : null;
                            if ($res['ok'] && $startUpid) {
                                VmTask::update($taskId, ['upid' => $startUpid]);
                            } else {
                                if ($res['ok']) {
                                    $this->logTask($type, '&aStart command sent successfully (no task returned).');
                                    VmTask::update($taskId, ['status' => 'completed']);
                                    if (isset($meta['instance_id'])) {
                                        \App\Chat\VmInstance::updateStatus((int) $meta['instance_id'], 'running');
                                    }
                                    $this->logTask($type, "&aTask {$taskId} completed successfully.");
                                } else {
                                    $this->logTask($type, '&cFailed to start VM: ' . ($res['error'] ?? 'unknown'));
                                    VmTask::update($taskId, ['status' => 'failed', 'error' => 'Start failed: ' . ($res['error'] ?? 'unknown')]);
                                }

                                return;
                            }
                            continue;
                        }
                    }

                    if ($type === 'delete') {
                        if ($step === 'initial') {
                            $this->logTask($type, '&eStopping VM Before Deletion...');
                            $client->stopVm($node, $vmid, $vmType);
                            sleep(2); // Short wait for stop command

                            $meta['current_step'] = 'backups';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'backups') {
                            $this->logTask($type, '&eChecking and removing backups...');
                            $instanceId = (int) ($meta['instance_id'] ?? 0);
                            $instance = $instanceId > 0 ? \App\Chat\VmInstance::getById($instanceId) : null;
                            if ($instance) {
                                VmInstanceUtil::deleteInstanceBackups($instance, $client);
                            } else {
                                $this->logTask($type, '&eNo backups or instance found to remove.');
                            }

                            $meta['current_step'] = 'delete';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'delete') {
                            $this->logTask($type, '&eDeleting VM/Container from Proxmox...');
                            $res = $client->deleteVm($node, $vmid, $vmType); // deleteVm also waits for deletion UPID inside Proxmox client usually, but just in case
                            if (!$res['ok']) {
                                $this->logTask($type, '&cFailed to delete from Proxmox: ' . ($res['error'] ?? 'unknown'));
                            }

                            $meta['current_step'] = 'finalize';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'finalize') {
                            $this->logTask($type, '&eRemoving database records...');
                            $instanceId = (int) ($meta['instance_id'] ?? 0);
                            if ($instanceId > 0) {
                                \App\Chat\VmInstance::delete($instanceId);
                                \App\Chat\Activity::createActivity([
                                    'user_uuid' => $task['user_uuid'] ?? null,
                                    'name' => 'vm_instance_delete',
                                    'context' => 'Deleted VM instance: ' . $vmid,
                                    'ip_address' => '127.0.0.1',
                                ]);
                            }
                            VmTask::update($taskId, ['status' => 'completed']);
                            $this->logTask($type, "&aTask {$taskId} completed successfully.");

                            return;
                        }
                    }

                    // Fallback for types that don't need complex sequencing
                    if ($type === 'power' || $type === 'backup' || $type === 'restore_backup') {
                        $this->logTask($type, '&eExecuting action directly...');
                        VmInstanceUtil::completeTask($task, $client);
                    } else {
                        VmTask::update($taskId, ['status' => 'failed', 'error' => 'Missing UPID and no handler for type ' . $type]);

                        return;
                    }
                    continue;
                }

                // Poll Proxmox for task status
                $taskResult = $client->getTaskStatus($node, $upid);
                if (!$taskResult['ok']) {
                    $this->logTask($type, '&cFailed to get Proxmox status: ' . ($taskResult['error'] ?? 'unknown'));
                    sleep(3);
                    continue;
                }

                $status = $taskResult['status'] ?? '';
                $exitStatus = $taskResult['exitstatus'] ?? '';

                if ($status !== 'stopped') {
                    $this->logTask($type, "&bOperation in progress (UPID: {$upid})...");
                    if (($task['status'] ?? '') !== 'running') {
                        VmTask::update($taskId, ['status' => 'running']);
                    }
                } else {
                    // Task finished in Proxmox
                    if ($exitStatus !== 'OK') {
                        $error = $exitStatus ?: 'Task failed in Proxmox';
                        $this->logTask($type, "&cProxmox step failed: {$error}");
                        VmTask::update($taskId, ['status' => 'failed', 'error' => $error]);

                        if ($type === 'create' && $step === 'initial') {
                            if ($vmid > 0) {
                                $this->logTask($type, "&cCleaning up failed clone VM {$vmid}...");
                                $client->deleteVm($node, $vmid, $vmType);
                            }
                        }

                        return;
                    }
                    $this->logTask($type, '&aProxmox operation finished successfully.');

                    // Sequence management
                    if ($type === 'create') {
                        if ($step === 'initial') {
                            $meta['current_step'] = 'resize';
                        } elseif ($step === 'resize') {
                            $meta['current_step'] = 'config';
                        } elseif ($step === 'start') {
                            // Start finished
                            if (isset($meta['instance_id'])) {
                                \App\Chat\VmInstance::updateStatus((int) $meta['instance_id'], 'running');
                            }
                            VmTask::update($taskId, ['status' => 'completed']);
                            $this->logTask($type, "&aTask {$taskId} completed successfully.");

                            return;
                        }

                        VmTask::update($taskId, ['upid' => '', 'data' => json_encode($meta)]);
                        continue;
                    }

                    if ($type === 'reinstall') {
                        if ($step === 'initial') {
                            $meta['current_step'] = 'resize';
                        } elseif ($step === 'resize') {
                            $meta['current_step'] = 'config';
                        } elseif ($step === 'start') {
                            // Start finished
                            if (isset($meta['instance_id'])) {
                                \App\Chat\VmInstance::updateStatus((int) $meta['instance_id'], 'running');
                            }
                            VmTask::update($taskId, ['status' => 'completed']);
                            $this->logTask($type, "&aTask {$taskId} completed successfully.");

                            return;
                        }

                        VmTask::update($taskId, ['upid' => '', 'data' => json_encode($meta)]);
                        continue;
                    }

                    // For simple tasks, finalizing is enough
                    VmInstanceUtil::completeTask($task, $client);
                    $this->logTask($type, "&aTask {$taskId} completed successfully.");

                    return;

                }
                sleep(3);
            }
        } catch (\Throwable $e) {
            $this->logTask($type, "&cError processing task {$taskId}: " . $e->getMessage());
            App::getInstance(false, true)->getLogger()->error("Runner failed task {$taskId}: " . $e->getMessage());
        }
    }

    /**
     * Start the clone on Proxmox and update the task with its UPID.
     */
    private function initiateAsyncCreate(array $task, \App\Services\Proxmox\Proxmox $client)
    {
        $taskId = $task['task_id'];
        $meta = json_decode($task['data'] ?? '{}', true);

        $templateVmid = (int) ($meta['template_vmid'] ?? 0);
        $templateNode = $meta['template_node'] ?? $task['target_node'] ?? '';
        $newid = (int) ($task['vmid'] ?? 0);
        $hostname = $meta['hostname'] ?? 'vm-' . $newid;
        $targetNode = $task['target_node'] ?? '';
        $vmType = $meta['vm_type'] ?? 'qemu';
        $storage = $meta['storage'] ?? 'local';

        if ($templateVmid === 0 || $newid === 0 || $targetNode === '') {
            VmTask::update($taskId, ['status' => 'failed', 'error' => 'Invalid create metadata']);

            return;
        }

        try {
            if ($vmType === 'qemu') {
                $cloneResult = $client->cloneQemu($templateNode, $templateVmid, $newid, $hostname, $targetNode);
            } else {
                $cloneResult = $client->cloneLxc($templateNode, $templateVmid, $newid, $hostname, $targetNode, $storage);
            }

            if (!$cloneResult['ok']) {
                VmTask::update($taskId, ['status' => 'failed', 'error' => 'Clone initiation failed: ' . ($cloneResult['error'] ?? 'unknown')]);

                return;
            }

            VmTask::update($taskId, [
                'upid' => $cloneResult['upid'] ?? '',
                'status' => 'running',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            VmTask::update($taskId, ['status' => 'failed', 'error' => 'Clone error: ' . $e->getMessage()]);
        }
    }

    /**
     * Apply VM configuration (Cloud-init for QEMU, network for LXC).
     */
    private function applyVmConfig(array $task, \App\Services\Proxmox\Proxmox $client, array $meta, string $node, int $vmid, string $vmType)
    {
        $taskId = $task['task_id'];
        $type = $task['task_type'];
        $instanceId = (int) ($meta['instance_id'] ?? 0);

        try {
            if ($type === 'create') {
                // For create, we need to set up the VM and create DB record
                $ipId = isset($meta['vm_ip_id']) ? (int) $meta['vm_ip_id'] : null;
                $ip = $ipId ? \App\Chat\VmIp::getById($ipId) : null;
                if (!$ip) {
                    throw new \Exception('IP no longer available');
                }

                $cidr = (int) ($ip['cidr'] ?? 24);
                $gateway = $ip['gateway'] ?? '';
                $bridge = $meta['bridge'] ?? 'vmbr0';
                $memory = (int) ($meta['memory'] ?? 512);
                $cpus = (int) ($meta['cpus'] ?? 1);
                $cores = (int) ($meta['cores'] ?? 1);
                $onBoot = !empty($meta['on_boot']);
                $hostname = $meta['hostname'] ?? 'vm-' . $vmid;

                if ($vmType === 'qemu') {
                    $client->setVmConfig($node, $vmid, 'qemu', [
                        'memory' => $memory,
                        'sockets' => $cpus,
                        'cores' => $cores,
                        'nameserver' => '1.1.1.1 8.8.8.8',
                        'ipconfig0' => "ip={$ip['ip']}/$cidr" . ($gateway ? ",gw=$gateway" : ''),
                        'onboot' => $onBoot ? 1 : 0,
                        'boot' => 'order=scsi0',
                        'ciuser' => $meta['ci_user'] ?? 'debian',
                        'cipassword' => $meta['ci_password'] ?? bin2hex(random_bytes(6)),
                        'tags' => 'FeatherPanel-Managed',
                        'description' => "FeatherPanel Managed VM | IP: {$ip['ip']} | Hostname: $hostname | User: {$task['user_uuid']} | Created: " . date('Y-m-d H:i:s'),
                    ]);
                } else {
                    $client->setVmConfig($node, $vmid, 'lxc', [
                        'memory' => $memory,
                        'cores' => $cpus * $cores,
                        'nameserver' => '1.1.1.1 8.8.8.8',
                        'net0' => "name=eth0,bridge=$bridge,ip={$ip['ip']}/$cidr" . ($gateway ? ",gw=$gateway" : ''),
                        'onboot' => $onBoot ? 1 : 0,
                        'tags' => 'FeatherPanel-Managed',
                        'description' => "FeatherPanel Managed VM | IP: {$ip['ip']} | Hostname: $hostname | User: {$task['user_uuid']} | Created: " . date('Y-m-d H:i:s'),
                    ]);
                }

                // Create DB record
                $pdo = \App\Chat\Database::getPdoConnection();
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
                    'ip_address' => $ip['ip'],
                    'gateway' => $ip['gateway'] ?? null,
                    'vm_ip_id' => $ipId,
                    'notes' => $meta['notes'] ?? null,
                    'backup_limit' => (int) ($meta['backup_limit'] ?? 5),
                    'memory' => $memory,
                    'cpus' => $cpus,
                    'cores' => $cores,
                    'disk_gb' => (int) ($meta['disk'] ?? 10),
                    'on_boot' => $onBoot ? 1 : 0,
                ];

                $instance = \App\Chat\VmInstance::create($instanceData, $pdo);

                \App\Chat\VmInstanceActivity::createActivity([
                    'vm_instance_id' => (int) ($instance['id'] ?? 0),
                    'vm_node_id' => (int) $task['vm_node_id'],
                    'user_id' => null,
                    'event' => 'vm:create',
                    'metadata' => ['hostname' => $hostname, 'vmid' => $vmid],
                    'ip' => '127.0.0.1',
                ]);

                // Store instance_id for later steps
                $meta['instance_id'] = (int) ($instance['id'] ?? 0);
                VmTask::update($taskId, ['data' => json_encode($meta)]);
            } elseif ($type === 'reinstall') {
                // For reinstall, just update the config
                $ipAddress = $meta['ip_address'] ?? null;
                $ipCidr = (int) ($meta['ip_cidr'] ?? 24);
                $gateway = trim((string) ($meta['gateway'] ?? ''));
                $memory = (int) ($meta['memory'] ?? 512);
                $cpus = (int) ($meta['cpus'] ?? 1);
                $cores = (int) ($meta['cores'] ?? 1);
                $ciUser = $meta['ci_user'] ?? null;
                $ciPassword = $meta['ci_password'] ?? null;
                $hostname = $meta['hostname'] ?? 'vm-' . $vmid;

                if ($vmType === 'qemu') {
                    $ipconfig0 = 'ip=' . $ipAddress . '/' . $ipCidr;
                    if ($gateway !== '') {
                        $ipconfig0 .= ',gw=' . $gateway;
                    }
                    $rootDisk = $meta['root_disk'] ?? 'scsi0';
                    $bootOrder = 'order=' . $rootDisk;

                    $client->setVmConfig($node, $vmid, 'qemu', [
                        'nameserver' => '1.1.1.1 8.8.8.8',
                        'ipconfig0' => $ipconfig0,
                        'boot' => $bootOrder,
                        'memory' => $memory,
                        'sockets' => $cpus > 0 ? $cpus : 1,
                        'cores' => $cores > 0 ? $cores : 1,
                        'ciuser' => $ciUser ?? 'debian',
                        'cipassword' => $ciPassword ?? bin2hex(random_bytes(6)),
                        'tags' => 'FeatherPanel-Managed',
                        'description' => "FeatherPanel Managed VM (Reinstalled) | IP: $ipAddress | Hostname: $hostname | User: {$task['user_uuid']} | Reinstalled: " . date('Y-m-d H:i:s'),
                    ], []);
                } else {
                    // Clean up old network interfaces
                    $deleteNetKeys = [];
                    $getConfig = $client->getVmConfig($node, $vmid, 'lxc');
                    if ($getConfig['ok'] && is_array($getConfig['config'] ?? null)) {
                        foreach (array_keys((array) $getConfig['config']) as $k) {
                            if (preg_match('/^net\d+$/', (string) $k)) {
                                $deleteNetKeys[] = (string) $k;
                            }
                        }
                    }
                    if (!empty($deleteNetKeys)) {
                        $client->setVmConfig($node, $vmid, 'lxc', [], $deleteNetKeys);
                    }

                    $net0 = 'name=eth0,bridge=vmbr0,ip=' . $ipAddress . '/' . $ipCidr;
                    if ($gateway !== '') {
                        $net0 .= ',gw=' . $gateway;
                    }

                    $client->setVmConfig($node, $vmid, 'lxc', [
                        'nameserver' => '1.1.1.1 8.8.8.8',
                        'net0' => $net0,
                        'memory' => $memory,
                        'cores' => $cores > 0 ? $cores : 1,
                        'onboot' => 0,
                        'tags' => 'FeatherPanel-Managed',
                        'description' => "FeatherPanel Managed VM (Reinstalled) | IP: $ipAddress | Hostname: $hostname | User: {$task['user_uuid']} | Reinstalled: " . date('Y-m-d H:i:s'),
                    ], []);
                }
            }
        } catch (\Exception $e) {
            VmTask::update($taskId, ['status' => 'failed', 'error' => 'Config failed: ' . $e->getMessage()]);
            throw $e;
        }
    }
}
