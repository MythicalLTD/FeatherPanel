<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
     * Format bytes to a human-readable string.
     *
     * Avoids using float as an array key to prevent PHPStan errors.
     */
    public function formatBytes(int $bytes, int $precision = 2): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        $base = log($bytes, 1024);
        $pow = (int) floor($base);
        $value = $bytes / pow(1024, $pow);

        // Ensure $pow is a valid index for $units
        $pow = min($pow, count($units) - 1);

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

    /**
     * Trigger a Wings self-update.
     *
     * @param array $options Self-update options payload
     * @param bool $disableRetries Whether to disable client-level retry logic
     */
    public function triggerSelfUpdate(array $options, bool $disableRetries = false): array
    {
        $maxRetries = $disableRetries ? 0 : 3;

        return $this->connection->post('/api/system/self-update', $options, [], $maxRetries);
    }

    /**
     * Execute a command on the host system.
     *
     * @param string $command The command to execute
     * @param int|null $timeoutSeconds Command timeout in seconds (default: 60)
     * @param string|null $workingDirectory Working directory for command execution
     * @param array|null $environment Environment variables for the command
     *
     * @return array Response containing exit_code, stdout, stderr, timed_out, duration_ms
     */
    public function executeCommand(
        string $command,
        ?int $timeoutSeconds = null,
        ?string $workingDirectory = null,
        ?array $environment = null,
    ): array {
        $payload = [
            'command' => $command,
        ];

        if ($timeoutSeconds !== null) {
            $payload['timeout_seconds'] = $timeoutSeconds;
        }

        if ($workingDirectory !== null) {
            $payload['working_directory'] = $workingDirectory;
        }

        if ($environment !== null && !empty($environment)) {
            $payload['environment'] = $environment;
        }

        return $this->connection->post('/api/system/terminal/exec', $payload);
    }

    /**
     * Generate a diagnostics bundle.
     *
     * Returns plain-text diagnostics by default. When format is set to `url`,
     * the response will be JSON with an uploaded report URL.
     *
     * @param bool|null $includeEndpoints Include HTTP endpoint metadata when true
     * @param bool|null $includeLogs Include daemon logs when true
     * @param int|null $logLines Number of log lines to include (1-500)
     * @param string|null $format Response format (`text`|`url`)
     * @param string|null $uploadApiUrl Override upload endpoint when using `url` format
     *
     * @return array|string Plain text diagnostics or JSON payload depending on format
     */
    public function getDiagnostics(
        ?bool $includeEndpoints = null,
        ?bool $includeLogs = null,
        ?int $logLines = null,
        ?string $format = null,
        ?string $uploadApiUrl = null,
    ): array | string {
        $queryParameters = [];

        if ($includeEndpoints !== null) {
            $queryParameters['include_endpoints'] = $includeEndpoints ? 'true' : 'false';
        }

        if ($includeLogs !== null) {
            $queryParameters['include_logs'] = $includeLogs ? 'true' : 'false';
        }

        if ($logLines !== null) {
            $queryParameters['log_lines'] = max(1, min(500, $logLines));
        }

        $normalizedFormat = null;
        if ($format !== null) {
            $candidateFormat = strtolower($format);
            $normalizedFormat = in_array($candidateFormat, ['text', 'url'], true) ? $candidateFormat : 'text';
            $queryParameters['format'] = $normalizedFormat;
        }

        if ($uploadApiUrl !== null && $uploadApiUrl !== '' && $normalizedFormat === 'url') {
            $queryParameters['upload_api_url'] = $uploadApiUrl;
        }

        $endpoint = '/api/diagnostics';
        if ($queryParameters !== []) {
            $endpoint .= '?' . http_build_query($queryParameters);
        }

        if ($normalizedFormat === 'url') {
            return $this->connection->get($endpoint);
        }

        return $this->connection->getRaw($endpoint, ['Accept' => 'text/plain']);
    }
}
