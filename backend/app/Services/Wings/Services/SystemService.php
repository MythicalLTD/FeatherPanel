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

namespace App\Services\Wings\Services;

use App\App;
use App\Services\Wings\WingsConnection;
use App\Services\Wings\Exceptions\WingsRequestException;

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
    private const UTILIZATION_CACHE_TTL_SECONDS = 2.0;
    private WingsConnection $connection;

    /** Short-lived per-instance memoization for getSystemUtilization() to avoid
     *  repeated fallback-ladder round trips when multiple getters (getCpuPercent,
     *  getUsedMemory, etc.) are called for the same request. */
    private ?array $utilizationCache = null;

    private float $utilizationCacheExpiresAt = 0.0;

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
     *
     * Soft-fails when the daemon does not expose /api/system/ips (Calagopus wings-rs).
     *
     * @return array{ip_addresses: list<string>}
     */
    public function getSystemIPs(): array
    {
        try {
            $result = $this->connection->get('/api/system/ips');
        } catch (WingsRequestException $e) {
            if ((int) $e->getCode() !== 404) {
                throw $e;
            }

            return ['ip_addresses' => []];
        }

        if (isset($result['ip_addresses']) && is_array($result['ip_addresses'])) {
            return ['ip_addresses' => array_values(array_filter($result['ip_addresses'], 'is_string'))];
        }

        if (isset($result['data']['ip_addresses']) && is_array($result['data']['ip_addresses'])) {
            return ['ip_addresses' => array_values(array_filter($result['data']['ip_addresses'], 'is_string'))];
        }

        return ['ip_addresses' => []];
    }

    /**
     * Get backup destination capabilities for this Wings node.
     *
     * @return array{default_adapter?: string, pbs?: array{enabled?: bool, namespace?: string, configured?: bool}}
     */
    public function getBackupDestinations(): array
    {
        try {
            return $this->connection->get('/api/system/backups');
        } catch (\Throwable $e) {
            // Older Wings builds may not expose this endpoint yet.
            return [
                'default_adapter' => 'wings',
                'pbs' => [
                    'enabled' => false,
                    'configured' => false,
                ],
            ];
        }
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
     *
     * Normalizes Calagopus wings-rs flat /api/system (+ optional /overview)
     * into the FeatherWings-shaped payload expected by the admin UI.
     */
    public function getDetailedSystemInfo(): array
    {
        $info = $this->getSystemInfo('v2');

        return self::isFeatherWingsSystemShape($info)
            ? $info
            : $this->normalizeCalagopusSystemInfo($info);
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
     *
     * Falls back when /api/system/utilization is missing (404):
     * 1. Calagopus /api/system/stats
     * 2. Calagopus /api/system/overview
     * 3. /api/system?v=2 capacity stubs (Pterodactyl / older daemons)
     *
     * @param int $maxRetries Maximum Wings HTTP retry attempts (default: 3)
     */
    public function getSystemUtilization(int $maxRetries = 3): array
    {
        if ($this->utilizationCache !== null && microtime(true) < $this->utilizationCacheExpiresAt) {
            return $this->utilizationCache;
        }

        $result = $this->fetchSystemUtilization($maxRetries);
        $this->utilizationCache = $result;
        $this->utilizationCacheExpiresAt = microtime(true) + self::UTILIZATION_CACHE_TTL_SECONDS;

        return $result;
    }

    /**
     * Fail-fast utilization probe for status dashboards (no retries).
     */
    public function getSystemUtilizationForStatus(): array
    {
        return $this->getSystemUtilization(0);
    }

    /**
     * Whether the payload already matches FeatherWings /api/system?v=2 shape.
     *
     * @param array<string, mixed> $systemInfo
     */
    public static function isFeatherWingsSystemShape(array $systemInfo): bool
    {
        return isset($systemInfo['system']) && is_array($systemInfo['system']);
    }

    /**
     * Map /api/system?v=2 payload into a utilization-shaped array.
     *
     * @param array<string, mixed> $systemInfo
     *
     * @return array<string, mixed>
     */
    public static function utilizationFromSystemInfo(array $systemInfo): array
    {
        // Prefer nested FeatherWings shape; also accept already-normalized payloads.
        $memoryTotal = (int) ($systemInfo['system']['memory_bytes'] ?? 0);

        // Flat Calagopus /api/system has no memory totals — leave zeros (caller should prefer stats).
        return self::emptyUtilization([
            'memory_total' => $memoryTotal,
        ]);
    }

    /**
     * Map Calagopus GET /api/system/stats into utilization shape.
     *
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    public static function utilizationFromCalagopusStats(array $payload): array
    {
        $stats = is_array($payload['stats'] ?? null) ? $payload['stats'] : $payload;

        return self::emptyUtilization([
            'memory_total' => (int) ($stats['memory']['total'] ?? 0),
            'memory_used' => (int) ($stats['memory']['used'] ?? 0),
            'disk_total' => (int) ($stats['disk']['total'] ?? 0),
            'disk_used' => (int) ($stats['disk']['used'] ?? 0),
            'cpu_percent' => (float) ($stats['cpu']['used'] ?? 0.0),
        ]);
    }

    /**
     * Map Calagopus GET /api/system/overview into utilization shape (no live CPU %).
     *
     * @param array<string, mixed> $overview
     *
     * @return array<string, mixed>
     */
    public static function utilizationFromCalagopusOverview(array $overview): array
    {
        return self::emptyUtilization([
            'memory_total' => (int) ($overview['memory']['total_bytes'] ?? 0),
            'memory_used' => (int) ($overview['memory']['used_bytes'] ?? 0),
        ]);
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function emptyUtilization(array $overrides = []): array
    {
        return array_merge([
            'memory_total' => 0,
            'memory_used' => 0,
            'swap_total' => 0,
            'swap_used' => 0,
            'disk_total' => 0,
            'disk_used' => 0,
            'cpu_percent' => 0.0,
            'load_average1' => 0.0,
            'load_average5' => 0.0,
            'load_average15' => 0.0,
            'disk_details' => [],
        ], $overrides);
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
     * FeatherWings: POST /api/system/self-update
     * Calagopus wings-rs: POST /api/system/upgrade (requires url + sha256 + restart command)
     *
     * @param array $options Self-update options payload
     * @param bool $disableRetries Whether to disable client-level retry logic
     * @param bool $useCalagopusUpgrade Use Calagopus /api/system/upgrade endpoint
     */
    public function triggerSelfUpdate(array $options, bool $disableRetries = false, bool $useCalagopusUpgrade = false): array
    {
        $maxRetries = $disableRetries ? 0 : 3;

        if ($useCalagopusUpgrade) {
            return $this->connection->post('/api/system/upgrade', $options, [], $maxRetries);
        }

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
     * List daemon system log files (Calagopus GET /api/system/logs).
     *
     * @return array{log_files?: list<array<string, mixed>>}|array<string, mixed>
     */
    public function listSystemLogs(): array
    {
        return $this->connection->get('/api/system/logs');
    }

    /**
     * Read a daemon system log file (Calagopus GET /api/system/logs/{file}).
     *
     * Returns plain-text log contents.
     */
    public function getSystemLogFile(string $file, ?int $lines = null): string
    {
        $encoded = rawurlencode($file);
        $endpoint = "/api/system/logs/{$encoded}";
        if ($lines !== null && $lines > 0) {
            $endpoint .= '?lines=' . min(500, $lines);
        }

        return $this->connection->getRaw($endpoint, ['Accept' => 'text/plain']);
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

    private function fetchSystemUtilization(int $maxRetries): array
    {
        try {
            return $this->connection->get('/api/system/utilization', [], $maxRetries);
        } catch (WingsRequestException $e) {
            // Only fall back when the utilization endpoint is missing (404).
            // Other errors (auth, network, 5xx) should propagate.
            if ((int) $e->getCode() !== 404) {
                throw $e;
            }

            // Calagopus wings-rs: live CPU/memory/disk from /api/system/stats
            try {
                $stats = $this->connection->get('/api/system/stats', [], $maxRetries);

                return self::utilizationFromCalagopusStats($stats);
            } catch (WingsRequestException $statsError) {
                if ((int) $statsError->getCode() !== 404) {
                    throw $statsError;
                }
            }

            // Calagopus overview: memory totals + coarse host info (no CPU %)
            try {
                $overview = $this->connection->get('/api/system/overview', [], $maxRetries);

                return self::utilizationFromCalagopusOverview($overview);
            } catch (WingsRequestException $overviewError) {
                if ((int) $overviewError->getCode() !== 404) {
                    throw $overviewError;
                }
            }

            // Last resort: /api/system?v=2 capacity only (may be zeros on Calagopus flat shape)
            $systemInfo = $this->connection->get('/api/system?v=2', [], $maxRetries);

            return self::utilizationFromSystemInfo($systemInfo);
        }
    }

    /**
     * Map Calagopus /api/system (+ optional overview) into FeatherWings system shape.
     *
     * @param array<string, mixed> $info Flat Calagopus /api/system body
     *
     * @return array<string, mixed>
     */
    private function normalizeCalagopusSystemInfo(array $info): array
    {
        $overview = [];
        try {
            $overview = $this->connection->get('/api/system/overview', [], 0);
        } catch (\Throwable $e) {
            // Overview is optional enrichment; flat /api/system is enough to avoid UI crashes.
            App::getInstance(true)->getLogger()->debug(
                'Failed to fetch Calagopus /api/system/overview enrichment: ' . $e->getMessage()
            );
        }

        $memoryBytes = (int) ($overview['memory']['total_bytes'] ?? 0);
        $cpuThreads = (int) ($overview['cpu']['cpu_count'] ?? $info['cpu_count'] ?? 0);
        $os = (string) ($info['os'] ?? '');

        return [
            'version' => (string) ($overview['version'] ?? $info['version'] ?? ''),
            // Calagopus does not expose FeatherWings docker detail on /api/system.
            'docker' => [
                'version' => '',
                'cgroups' => [
                    'driver' => '',
                    'version' => '',
                ],
                'containers' => [
                    'total' => 0,
                    'running' => 0,
                    'paused' => 0,
                    'stopped' => 0,
                ],
                'storage' => [
                    'driver' => '',
                    'filesystem' => '',
                ],
                'runc' => [
                    'version' => '',
                ],
            ],
            'system' => [
                'architecture' => (string) ($overview['architecture'] ?? $info['architecture'] ?? ''),
                'cpu_threads' => $cpuThreads,
                'memory_bytes' => $memoryBytes,
                'kernel_version' => (string) ($overview['kernel_version'] ?? $info['kernel_version'] ?? ''),
                'os' => $os,
                'os_type' => $os,
            ],
            // Calagopus-only extras (ignored by current UI, useful for debugging)
            'servers' => $overview['servers'] ?? null,
            'container_type' => $overview['container_type'] ?? null,
        ];
    }
}
