<?php

/*
 * This file is part of App.
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
}
