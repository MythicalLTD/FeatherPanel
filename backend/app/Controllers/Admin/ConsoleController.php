<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ConsoleController
{
    #[OA\Post(
        path: '/api/admin/console/execute',
        summary: 'Execute system command',
        description: 'Execute a system command in the specified working directory. This endpoint is only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Console'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['command'],
                properties: [
                    new OA\Property(property: 'command', type: 'string', description: 'The command to execute', example: 'ls -la'),
                    new OA\Property(property: 'cwd', type: 'string', description: 'Working directory for command execution', example: '/var/www/featherpanel'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Command executed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'stdout', type: 'string', description: 'Standard output from the command'),
                        new OA\Property(property: 'stderr', type: 'string', description: 'Standard error output from the command'),
                        new OA\Property(property: 'return_code', type: 'integer', description: 'Command exit code'),
                        new OA\Property(property: 'execution_time', type: 'number', description: 'Command execution time in milliseconds'),
                        new OA\Property(property: 'command', type: 'string', description: 'The executed command'),
                        new OA\Property(property: 'working_directory', type: 'string', description: 'Working directory where command was executed'),
                        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time', description: 'Command execution timestamp'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No command provided'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Command execution failed'),
        ]
    )]
    public function executeCommand(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to execute commands in non-developer mode', 403);
            }
            // These variables are populated from POST form data (not JSON body).
            // 'command' is the system command to execute, 'cwd' is the working directory.
            // Support both POST form data and JSON body for command and cwd
            // First, check POST form data for 'command'
            $command = trim($request->request->get('command', ''));
            $workingDirectory = $request->request->get('cwd', getcwd());

            if (empty($command)) {
                // If not found in form data, check JSON body
                $contentType = $request->headers->get('Content-Type');
                $data = null;
                if ($contentType && str_contains($contentType, 'application/json')) {
                    $data = json_decode($request->getContent(), true);
                }

                if (is_array($data) && !empty($data['command'])) {
                    $command = trim($data['command']);
                    $workingDirectory = $data['cwd'] ?? getcwd();
                }
            }

            if (empty($command)) {
                return ApiResponse::error('No command provided in form data or JSON body', 400);
            }

            // Validate working directory - use current working directory as fallback
            $realCwd = realpath($workingDirectory);
            if (!$realCwd) {
                $workingDirectory = getcwd();
                $realCwd = realpath($workingDirectory);
            }

            // Execute command
            $output = [];
            $returnCode = 0;
            $executionTime = 0;

            $startTime = microtime(true);
            $descriptorspec = [
                0 => ['pipe', 'r'], // stdin
                1 => ['pipe', 'w'], // stdout
                2 => ['pipe', 'w'], // stderr
            ];

            $process = proc_open(
                'cd ' . escapeshellarg($workingDirectory) . ' && ' . $command,
                $descriptorspec,
                $pipes,
                null,
                [
                    'PATH' => $_ENV['PATH'] ?? '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                    'HOME' => $_ENV['HOME'] ?? getcwd(),
                    'USER' => $_ENV['USER'] ?? 'www-data',
                ]
            );

            if (is_resource($process)) {
                fclose($pipes[0]); // Close stdin

                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);

                fclose($pipes[1]);
                fclose($pipes[2]);

                $returnCode = proc_close($process);
                $executionTime = round((microtime(true) - $startTime) * 1000, 2);

                $output = [
                    'stdout' => $stdout,
                    'stderr' => $stderr,
                    'return_code' => $returnCode,
                    'execution_time' => $executionTime,
                    'command' => $command,
                    'working_directory' => $workingDirectory,
                    'timestamp' => date('Y-m-d H:i:s'),
                ];
            } else {
                return ApiResponse::error('Failed to execute command', 500);
            }

            return ApiResponse::success($output, 'Command executed successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to execute command: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/console/system-info',
        summary: 'Get system information',
        description: 'Retrieve detailed system information including OS, PHP version, disk usage, memory usage, and uptime. This endpoint is only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Console'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'System information retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'os', type: 'string', description: 'Operating system', example: 'Linux'),
                        new OA\Property(property: 'php_version', type: 'string', description: 'PHP version', example: '8.2.0'),
                        new OA\Property(property: 'server_software', type: 'string', description: 'Web server software', example: 'nginx/1.18.0'),
                        new OA\Property(property: 'server_name', type: 'string', description: 'Server name', example: 'featherpanel.local'),
                        new OA\Property(property: 'user', type: 'string', description: 'Current user', example: 'www-data'),
                        new OA\Property(property: 'home', type: 'string', description: 'Home directory', example: '/var/www'),
                        new OA\Property(property: 'working_directory', type: 'string', description: 'Current working directory', example: '/var/www/featherpanel'),
                        new OA\Property(property: 'disk_usage', type: 'object', description: 'Disk usage information', properties: [
                            new OA\Property(property: 'free', type: 'integer', description: 'Free disk space in bytes'),
                            new OA\Property(property: 'total', type: 'integer', description: 'Total disk space in bytes'),
                            new OA\Property(property: 'used', type: 'integer', description: 'Used disk space in bytes'),
                            new OA\Property(property: 'percentage', type: 'number', description: 'Disk usage percentage'),
                        ]),
                        new OA\Property(property: 'memory_usage', type: 'object', description: 'Memory usage information (Linux only)', additionalProperties: new OA\AdditionalProperties(type: 'integer', description: 'Memory values in bytes')),
                        new OA\Property(property: 'uptime', type: 'string', description: 'System uptime', example: '5 days, 12 hours, 30 minutes'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch system info'),
        ]
    )]
    public function getSystemInfo(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
            return ApiResponse::error('You are not allowed to view system info in non-developer mode', 403);
        }
        // Suppress PHP warnings to prevent them from interfering with JSON response
        $originalErrorReporting = error_reporting(E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR);

        try {
            $info = [
                'os' => PHP_OS,
                'php_version' => PHP_VERSION,
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                'server_name' => $_SERVER['SERVER_NAME'] ?? 'Unknown',
                'user' => $_ENV['USER'] ?? 'www-data',
                'home' => $_ENV['HOME'] ?? getcwd(),
                'working_directory' => getcwd(),
                'disk_usage' => $this->getDiskUsage(),
                'memory_usage' => $this->getMemoryUsage(),
                'uptime' => $this->getUptime(),
            ];

            return ApiResponse::success($info, 'System info fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch system info: ' . $e->getMessage(), 500);
        } finally {
            // Restore original error reporting
            error_reporting($originalErrorReporting);
        }
    }

    private function getDiskUsage(): array
    {
        $bytes = disk_free_space('.');
        $total = disk_total_space('.');

        if ($bytes === false || $total === false) {
            return [
                'free' => 0,
                'total' => 0,
                'used' => 0,
                'percentage' => 0,
            ];
        }

        $used = $total - $bytes;
        $percentage = $total > 0 ? round(($used / $total) * 100, 2) : 0;

        return [
            'free' => (int) $bytes,
            'total' => (int) $total,
            'used' => (int) $used,
            'percentage' => $percentage,
        ];
    }

    private function getMemoryUsage(): array
    {
        $memInfo = [];

        if (file_exists('/proc/meminfo')) {
            $memInfoRaw = file_get_contents('/proc/meminfo');
            preg_match_all('/(\w+):\s+(\d+)\s+kB/', $memInfoRaw, $matches);

            foreach ($matches[1] as $index => $key) {
                $memInfo[$key] = (int) ($matches[2][$index] * 1024); // Convert to bytes
            }
        }

        return $memInfo;
    }

    private function getUptime(): string
    {
        if (file_exists('/proc/uptime')) {
            $uptime = file_get_contents('/proc/uptime');
            $seconds = (float) explode(' ', $uptime)[0];

            $days = (int) ($seconds / 86400);
            $hours = (int) (($seconds % 86400) / 3600);
            $minutes = (int) (($seconds % 3600) / 60);

            return sprintf('%d days, %d hours, %d minutes', $days, $hours, $minutes);
        }

        return 'Unknown';
    }
}
