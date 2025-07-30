<?php

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * System Service for Wings API
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
	 * Create a new SystemService instance
	 * 
	 * @param WingsConnection $connection
	 */
	public function __construct(WingsConnection $connection)
	{
		$this->connection = $connection;
	}

	/**
	 * Get system information
	 * 
	 * @param string $version Version to get (v1 or v2)
	 * @return array
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
	 * Get system IP addresses
	 * 
	 * @return array
	 */
	public function getSystemIPs(): array
	{
		return $this->connection->get('/api/system/ips');
	}

	/**
	 * Get Docker information
	 * 
	 * @return array
	 */
	public function getDockerInfo(): array
	{
		$systemInfo = $this->getSystemInfo('v2');
		return $systemInfo['docker'] ?? [];
	}

	/**
	 * Get system architecture
	 * 
	 * @return string
	 */
	public function getArchitecture(): string
	{
		$systemInfo = $this->getSystemInfo();
		return $systemInfo['architecture'] ?? '';
	}

	/**
	 * Get CPU count
	 * 
	 * @return int
	 */
	public function getCpuCount(): int
	{
		$systemInfo = $this->getSystemInfo();
		return $systemInfo['cpu_count'] ?? 0;
	}

	/**
	 * Get kernel version
	 * 
	 * @return string
	 */
	public function getKernelVersion(): string
	{
		$systemInfo = $this->getSystemInfo();
		return $systemInfo['kernel_version'] ?? '';
	}

	/**
	 * Get operating system
	 * 
	 * @return string
	 */
	public function getOperatingSystem(): string
	{
		$systemInfo = $this->getSystemInfo();
		return $systemInfo['os'] ?? '';
	}

	/**
	 * Get Wings version
	 * 
	 * @return string
	 */
	public function getWingsVersion(): string
	{
		$systemInfo = $this->getSystemInfo();
		return $systemInfo['version'] ?? '';
	}

	/**
	 * Get Docker version
	 * 
	 * @return string
	 */
	public function getDockerVersion(): string
	{
		$dockerInfo = $this->getDockerInfo();
		return $dockerInfo['version'] ?? '';
	}

	/**
	 * Get Docker containers count
	 * 
	 * @return array
	 */
	public function getDockerContainers(): array
	{
		$dockerInfo = $this->getDockerInfo();
		return $dockerInfo['containers'] ?? [];
	}

	/**
	 * Get total containers count
	 * 
	 * @return int
	 */
	public function getTotalContainers(): int
	{
		$containers = $this->getDockerContainers();
		return $containers['total'] ?? 0;
	}

	/**
	 * Get running containers count
	 * 
	 * @return int
	 */
	public function getRunningContainers(): int
	{
		$containers = $this->getDockerContainers();
		return $containers['running'] ?? 0;
	}

	/**
	 * Get paused containers count
	 * 
	 * @return int
	 */
	public function getPausedContainers(): int
	{
		$containers = $this->getDockerContainers();
		return $containers['paused'] ?? 0;
	}

	/**
	 * Get stopped containers count
	 * 
	 * @return int
	 */
	public function getStoppedContainers(): int
	{
		$containers = $this->getDockerContainers();
		return $containers['stopped'] ?? 0;
	}

	/**
	 * Get Docker storage information
	 * 
	 * @return array
	 */
	public function getDockerStorage(): array
	{
		$dockerInfo = $this->getDockerInfo();
		return $dockerInfo['storage'] ?? [];
	}

	/**
	 * Get Docker storage driver
	 * 
	 * @return string
	 */
	public function getDockerStorageDriver(): string
	{
		$storage = $this->getDockerStorage();
		return $storage['driver'] ?? '';
	}

	/**
	 * Get Docker filesystem
	 * 
	 * @return string
	 */
	public function getDockerFilesystem(): string
	{
		$storage = $this->getDockerStorage();
		return $storage['filesystem'] ?? '';
	}

	/**
	 * Get Docker cgroups information
	 * 
	 * @return array
	 */
	public function getDockerCgroups(): array
	{
		$dockerInfo = $this->getDockerInfo();
		return $dockerInfo['cgroups'] ?? [];
	}

	/**
	 * Get Docker cgroups driver
	 * 
	 * @return string
	 */
	public function getDockerCgroupsDriver(): string
	{
		$cgroups = $this->getDockerCgroups();
		return $cgroups['driver'] ?? '';
	}

	/**
	 * Get Docker cgroups version
	 * 
	 * @return string
	 */
	public function getDockerCgroupsVersion(): string
	{
		$cgroups = $this->getDockerCgroups();
		return $cgroups['version'] ?? '';
	}

	/**
	 * Get Docker runc version
	 * 
	 * @return string
	 */
	public function getDockerRuncVersion(): string
	{
		$dockerInfo = $this->getDockerInfo();
		return $dockerInfo['runc']['version'] ?? '';
	}

	/**
	 * Get system memory in bytes
	 * 
	 * @return int
	 */
	public function getMemoryBytes(): int
	{
		$systemInfo = $this->getSystemInfo('v2');
		return $systemInfo['system']['memory_bytes'] ?? 0;
	}

	/**
	 * Get system memory in GB
	 * 
	 * @return float
	 */
	public function getMemoryGB(): float
	{
		$bytes = $this->getMemoryBytes();
		return round($bytes / 1024 / 1024 / 1024, 2);
	}

	/**
	 * Get CPU threads count
	 * 
	 * @return int
	 */
	public function getCpuThreads(): int
	{
		$systemInfo = $this->getSystemInfo('v2');
		return $systemInfo['system']['cpu_threads'] ?? 0;
	}

	/**
	 * Get OS type
	 * 
	 * @return string
	 */
	public function getOsType(): string
	{
		$systemInfo = $this->getSystemInfo('v2');
		return $systemInfo['system']['os_type'] ?? '';
	}

	/**
	 * Get complete system information (v2)
	 * 
	 * @return array
	 */
	public function getDetailedSystemInfo(): array
	{
		return $this->getSystemInfo('v2');
	}

	/**
	 * Get basic system information (v1)
	 * 
	 * @return array
	 */
	public function getBasicSystemInfo(): array
	{
		return $this->getSystemInfo('v1');
	}
}