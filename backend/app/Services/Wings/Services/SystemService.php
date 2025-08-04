<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * System Service for Wings API.
 *
 * Handles all system-related API endpoints including:
 * - System information
 * - System IP addresses
 * - Docker information
 * - System utilization
 */
class SystemService
{
    private WingsConnection $connection;

    /**
     * Create a new SystemService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get system information.
     *
     * @param string $version Version to get (v1 or v2)
     */
    public function getSystemInfo(string $version = 'v1'): array
    {
        $endpoint = '/api/system';
        if ($version === 'v2') {
            $endpoint .= '?v=2';
        }

        return $this->connection->get($endpoint);
    }

    /**
     * Get system IP addresses.
     */
    public function getSystemIPs(): array
    {
        return $this->connection->get('/api/system/ips');
    }

    /**
     * Get Docker information.
     */
    public function getDockerInfo(): array
    {
        $systemInfo = $this->getSystemInfo('v2');

        return $systemInfo['docker'] ?? [];
    }

    /**
     * Get system architecture.
     */
    public function getArchitecture(): string
    {
        $systemInfo = $this->getSystemInfo();

        return $systemInfo['architecture'] ?? '';
    }

    /**
     * Get CPU count.
     */
    public function getCpuCount(): int
    {
        $systemInfo = $this->getSystemInfo();

        return $systemInfo['cpu_count'] ?? 0;
    }

    /**
     * Get kernel version.
     */
    public function getKernelVersion(): string
    {
        $systemInfo = $this->getSystemInfo();

        return $systemInfo['kernel_version'] ?? '';
    }

    /**
     * Get operating system.
     */
    public function getOperatingSystem(): string
    {
        $systemInfo = $this->getSystemInfo();

        return $systemInfo['os'] ?? '';
    }

    /**
     * Get Wings version.
     */
    public function getWingsVersion(): string
    {
        $systemInfo = $this->getSystemInfo();

        return $systemInfo['version'] ?? '';
    }

    /**
     * Get Docker version.
     */
    public function getDockerVersion(): string
    {
        $dockerInfo = $this->getDockerInfo();

        return $dockerInfo['version'] ?? '';
    }

    /**
     * Get Docker containers count.
     */
    public function getDockerContainers(): array
    {
        $dockerInfo = $this->getDockerInfo();

        return $dockerInfo['containers'] ?? [];
    }

    /**
     * Get total containers count.
     */
    public function getTotalContainers(): int
    {
        $containers = $this->getDockerContainers();

        return $containers['total'] ?? 0;
    }

    /**
     * Get running containers count.
     */
    public function getRunningContainers(): int
    {
        $containers = $this->getDockerContainers();

        return $containers['running'] ?? 0;
    }

    /**
     * Get paused containers count.
     */
    public function getPausedContainers(): int
    {
        $containers = $this->getDockerContainers();

        return $containers['paused'] ?? 0;
    }

    /**
     * Get stopped containers count.
     */
    public function getStoppedContainers(): int
    {
        $containers = $this->getDockerContainers();

        return $containers['stopped'] ?? 0;
    }

    /**
     * Get Docker storage information.
     */
    public function getDockerStorage(): array
    {
        $dockerInfo = $this->getDockerInfo();

        return $dockerInfo['storage'] ?? [];
    }

    /**
     * Get Docker storage driver.
     */
    public function getDockerStorageDriver(): string
    {
        $storage = $this->getDockerStorage();

        return $storage['driver'] ?? '';
    }

    /**
     * Get Docker filesystem.
     */
    public function getDockerFilesystem(): string
    {
        $storage = $this->getDockerStorage();

        return $storage['filesystem'] ?? '';
    }

    /**
     * Get Docker cgroups information.
     */
    public function getDockerCgroups(): array
    {
        $dockerInfo = $this->getDockerInfo();

        return $dockerInfo['cgroups'] ?? [];
    }

    /**
     * Get Docker cgroups driver.
     */
    public function getDockerCgroupsDriver(): string
    {
        $cgroups = $this->getDockerCgroups();

        return $cgroups['driver'] ?? '';
    }

    /**
     * Get Docker cgroups version.
     */
    public function getDockerCgroupsVersion(): string
    {
        $cgroups = $this->getDockerCgroups();

        return $cgroups['version'] ?? '';
    }

    /**
     * Get Docker runc version.
     */
    public function getDockerRuncVersion(): string
    {
        $dockerInfo = $this->getDockerInfo();

        return $dockerInfo['runc']['version'] ?? '';
    }

    /**
     * Get system memory in bytes.
     */
    public function getMemoryBytes(): int
    {
        $systemInfo = $this->getSystemInfo('v2');

        return $systemInfo['system']['memory_bytes'] ?? 0;
    }

    /**
     * Get system memory in GB.
     */
    public function getMemoryGB(): float
    {
        $bytes = $this->getMemoryBytes();

        return round($bytes / 1024 / 1024 / 1024, 2);
    }

    /**
     * Get CPU threads count.
     */
    public function getCpuThreads(): int
    {
        $systemInfo = $this->getSystemInfo('v2');

        return $systemInfo['system']['cpu_threads'] ?? 0;
    }

    /**
     * Get OS type.
     */
    public function getOsType(): string
    {
        $systemInfo = $this->getSystemInfo('v2');

        return $systemInfo['system']['os_type'] ?? '';
    }

    /**
     * Get complete system information (v2).
     */
    public function getDetailedSystemInfo(): array
    {
        return $this->getSystemInfo('v2');
    }

    /**
     * Get basic system information (v1).
     */
    public function getBasicSystemInfo(): array
    {
        return $this->getSystemInfo('v1');
    }

    /**
     * Get system utilization information.
     */
    public function getSystemUtilization(): array
    {
        return $this->connection->get('/api/system/utilization');
    }

    /**
     * Get total memory in bytes.
     */
    public function getTotalMemory(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['memory_total'] ?? 0;
    }

    /**
     * Get used memory in bytes.
     */
    public function getUsedMemory(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['memory_used'] ?? 0;
    }

    /**
     * Get memory usage percentage.
     */
    public function getMemoryUsagePercent(): float
    {
        $total = $this->getTotalMemory();
        $used = $this->getUsedMemory();

        if ($total === 0) {
            return 0.0;
        }

        return round(($used / $total) * 100, 2);
    }

    /**
     * Get total swap in bytes.
     */
    public function getTotalSwap(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['swap_total'] ?? 0;
    }

    /**
     * Get used swap in bytes.
     */
    public function getUsedSwap(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['swap_used'] ?? 0;
    }

    /**
     * Get swap usage percentage.
     */
    public function getSwapUsagePercent(): float
    {
        $total = $this->getTotalSwap();
        $used = $this->getUsedSwap();

        if ($total === 0) {
            return 0.0;
        }

        return round(($used / $total) * 100, 2);
    }

    /**
     * Get load average (1 minute).
     */
    public function getLoadAverage1(): float
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['load_average1'] ?? 0.0;
    }

    /**
     * Get load average (5 minutes).
     */
    public function getLoadAverage5(): float
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['load_average5'] ?? 0.0;
    }

    /**
     * Get load average (15 minutes).
     */
    public function getLoadAverage15(): float
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['load_average15'] ?? 0.0;
    }

    /**
     * Get CPU usage percentage.
     */
    public function getCpuPercent(): float
    {
        $utilization = $this->getSystemUtilization();

        return round($utilization['cpu_percent'] ?? 0.0, 2);
    }

    /**
     * Get total disk space in bytes.
     */
    public function getTotalDisk(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['disk_total'] ?? 0;
    }

    /**
     * Get used disk space in bytes.
     */
    public function getUsedDisk(): int
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['disk_used'] ?? 0;
    }

    /**
     * Get disk usage percentage.
     */
    public function getDiskUsagePercent(): float
    {
        $total = $this->getTotalDisk();
        $used = $this->getUsedDisk();

        if ($total === 0) {
            return 0.0;
        }

        return round(($used / $total) * 100, 2);
    }

    /**
     * Get disk details array.
     */
    public function getDiskDetails(): array
    {
        $utilization = $this->getSystemUtilization();

        return $utilization['disk_details'] ?? [];
    }

    /**
     * Get available memory in bytes.
     */
    public function getAvailableMemory(): int
    {
        return $this->getTotalMemory() - $this->getUsedMemory();
    }

    /**
     * Get available disk space in bytes.
     */
    public function getAvailableDisk(): int
    {
        return $this->getTotalDisk() - $this->getUsedDisk();
    }

    /**
     * Get available swap in bytes.
     */
    public function getAvailableSwap(): int
    {
        return $this->getTotalSwap() - $this->getUsedSwap();
    }

    /**
     * Format bytes to human readable format.
     */
    public function formatBytes(int $bytes, int $precision = 2): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        $base = log($bytes, 1024);
        $pow = floor($base);
        $value = $bytes / pow(1024, $pow);

        return round($value, $precision) . ' ' . $units[$pow];
    }

    /**
     * Get formatted memory usage.
     */
    public function getFormattedMemoryUsage(): array
    {
        return [
            'total' => $this->formatBytes($this->getTotalMemory()),
            'used' => $this->formatBytes($this->getUsedMemory()),
            'available' => $this->formatBytes($this->getAvailableMemory()),
            'usage_percent' => $this->getMemoryUsagePercent(),
        ];
    }

    /**
     * Get formatted disk usage.
     */
    public function getFormattedDiskUsage(): array
    {
        return [
            'total' => $this->formatBytes($this->getTotalDisk()),
            'used' => $this->formatBytes($this->getUsedDisk()),
            'available' => $this->formatBytes($this->getAvailableDisk()),
            'usage_percent' => $this->getDiskUsagePercent(),
        ];
    }

    /**
     * Get formatted swap usage.
     */
    public function getFormattedSwapUsage(): array
    {
        return [
            'total' => $this->formatBytes($this->getTotalSwap()),
            'used' => $this->formatBytes($this->getUsedSwap()),
            'available' => $this->formatBytes($this->getAvailableSwap()),
            'usage_percent' => $this->getSwapUsagePercent(),
        ];
    }

    /**
     * Get system health summary.
     */
    public function getSystemHealth(): array
    {
        return [
            'memory' => $this->getFormattedMemoryUsage(),
            'disk' => $this->getFormattedDiskUsage(),
            'swap' => $this->getFormattedSwapUsage(),
            'cpu' => [
                'usage_percent' => $this->getCpuPercent(),
                'load_average_1m' => $this->getLoadAverage1(),
                'load_average_5m' => $this->getLoadAverage5(),
                'load_average_15m' => $this->getLoadAverage15(),
            ],
        ];
    }
}
