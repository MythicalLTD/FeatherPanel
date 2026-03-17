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
                    if ($type === 'create' || $type === 'reinstall') {
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
                                            'm' => (int) ceil($n / 1024), 't' => $n * 1024, default => $n
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
                            // This is typically very fast, so we do it synchronously here
                            VmInstanceUtil::completeTask($task, $client, true); // We'll add a 'skipStart' param

                            $meta['current_step'] = 'start';
                            VmTask::update($taskId, ['data' => json_encode($meta)]);
                            continue;
                        }

                        if ($step === 'start') {
                            $this->logTask($type, '&eStarting VM/Container...');
                            $res = $client->startVm($node, $vmid, $vmType);
                            $startUpid = isset($res['data']) && is_string($res['data']) ? $res['data'] : null;
                            if ($res['ok'] && $startUpid) {
                                VmTask::update($taskId, ['upid' => $startUpid]);
                            } else {
                                $this->logTask($type, '&aStart command sent (no task returned).');
                                VmTask::update($taskId, ['status' => 'completed']);
                                if (isset($meta['instance_id'])) {
                                    \App\Chat\VmInstance::updateStatus((int) $meta['instance_id'], 'running');
                                }
                                $this->logTask($type, "&aTask {$taskId} completed successfully.");

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
                    if ($type === 'create' || $type === 'reinstall') {
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
}
