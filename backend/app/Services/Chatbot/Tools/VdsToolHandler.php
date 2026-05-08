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

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Services\Chatbot\Tools\Vds\GetVdsStatusTool;
use App\Services\Chatbot\Tools\Vds\GetVdsBackupsTool;
use App\Services\Chatbot\Tools\Vds\GetVdsDetailsTool;
use App\Services\Chatbot\Tools\Vds\GetVdsSubusersTool;
use App\Services\Chatbot\Tools\Vds\VdsPowerActionTool;
use App\Services\Chatbot\Tools\Vds\CreateVdsBackupTool;
use App\Services\Chatbot\Tools\Vds\DeleteVdsBackupTool;
use App\Services\Chatbot\Tools\Vds\GetVdsActivitiesTool;
use App\Services\Chatbot\Tools\Vds\GetVdsNetworkingTool;
use App\Services\Chatbot\Tools\Vds\RestoreVdsBackupTool;

/**
 * VDS Tool Handler - registers and dispatches VDS-specific chatbot tools.
 */
class VdsToolHandler
{
    private $app;
    private $tools = [];

    public function __construct()
    {
        $this->app = App::getInstance(true);
        $this->registerTools();
    }

    /**
     * Parse tool calls from AI response.
     * Format: TOOL_CALL: tool_name {"param1": "value1", "param2": "value2"}.
     *
     * @param string $response AI response text
     *
     * @return array Array of tool calls [['tool' => 'name', 'params' => [...]], ...]
     */
    public function parseToolCalls(string $response): array
    {
        $toolCalls = [];
        $pattern = '/TOOL_CALL:\s*(\w+)\s*(\{)/s';
        $offset = 0;

        while (preg_match($pattern, $response, $matches, PREG_OFFSET_CAPTURE, $offset)) {
            $toolName = trim($matches[1][0]);
            $bracePos = $matches[2][1];

            $depth = 0;
            $jsonStart = $bracePos;
            $jsonEnd = $jsonStart;

            for ($i = $bracePos; $i < strlen($response); ++$i) {
                $char = $response[$i];
                if ($char === '{') {
                    ++$depth;
                } elseif ($char === '}') {
                    --$depth;
                    if ($depth === 0) {
                        $jsonEnd = $i + 1;
                        break;
                    }
                }
            }

            if ($depth === 0) {
                $paramsJson = substr($response, $jsonStart, $jsonEnd - $jsonStart);

                $params = [];
                if (!empty($paramsJson)) {
                    $decoded = json_decode($paramsJson, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $params = $decoded;
                    } else {
                        $this->app->getLogger()->warning("VdsToolHandler: Failed to parse tool call JSON for {$toolName}: " . json_last_error_msg() . ' | JSON: ' . substr($paramsJson, 0, 200));
                    }
                }

                $toolCalls[] = [
                    'tool'   => $toolName,
                    'params' => $params,
                ];

                $offset = $jsonEnd;
            } else {
                $offset = $bracePos + 1;
            }
        }

        return $toolCalls;
    }

    /**
     * Execute a tool call.
     *
     * @param string $toolName Tool name
     * @param array $params Tool parameters
     * @param array $user Current user data
     * @param array $pageContext Page context
     *
     * @return array Tool execution result ['success' => bool, 'data' => mixed, 'error' => string|null]
     */
    public function executeTool(string $toolName, array $params, array $user, array $pageContext = []): array
    {
        if (!isset($this->tools[$toolName])) {
            return [
                'success' => false,
                'data'    => null,
                'error'   => "Unknown VDS tool: {$toolName}",
            ];
        }

        try {
            $tool = $this->tools[$toolName];
            $result = $tool->execute($params, $user, $pageContext);

            return [
                'success' => true,
                'data'    => $result,
                'error'   => null,
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error("VdsToolHandler execution error for {$toolName}: " . $e->getMessage());

            return [
                'success' => false,
                'data'    => null,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Remove tool calls from response text.
     *
     * @param string $response Response text
     *
     * @return string Response without tool calls
     */
    public function removeToolCalls(string $response): string
    {
        $pattern = '/TOOL_CALL:\s*\w+\s*\{[^}]*\}/s';

        return preg_replace($pattern, '', $response);
    }

    /**
     * Format tool result for AI context.
     *
     * @param string $toolName Tool name
     * @param array $result Tool execution result
     *
     * @return string Formatted result string
     */
    public function formatToolResult(string $toolName, array $result): string
    {
        if (!$result['success']) {
            $error = $result['error'] ?? 'Unknown error';

            return "❌ Tool {$toolName} failed: {$error}";
        }

        $data = $result['data'];
        if (is_string($data)) {
            return $data;
        }

        if (is_array($data)) {
            if (isset($data['action_type'])) {
                $formatted = "✅ Action completed successfully!\n\n";

                if (isset($data['message'])) {
                    $formatted .= "Result: {$data['message']}\n\n";
                }

                switch ($data['action_type']) {
                    case 'vds_power':
                        if (isset($data['action_past'])) {
                            $formatted .= "Action: {$data['action_past']}\n";
                        }
                        if (isset($data['hostname'])) {
                            $formatted .= "VDS: {$data['hostname']}\n";
                        }
                        if (isset($data['instance_id'])) {
                            $formatted .= "Instance ID: {$data['instance_id']}\n";
                        }
                        if (isset($data['task_id'])) {
                            $formatted .= "Task ID: {$data['task_id']}\n";
                        }
                        $formatted .= "\nThe power task has been queued to Proxmox via the async runner.";
                        break;

                    case 'vds_create_backup':
                        if (isset($data['hostname'])) {
                            $formatted .= "VDS: {$data['hostname']}\n";
                        }
                        if (isset($data['instance_id'])) {
                            $formatted .= "Instance ID: {$data['instance_id']}\n";
                        }
                        if (isset($data['backup_id'])) {
                            $formatted .= "Backup task ID: {$data['backup_id']}\n";
                        }
                        if (isset($data['storage'])) {
                            $formatted .= "Storage: {$data['storage']}\n";
                        }
                        $formatted .= "\nBackup has been started on Proxmox.";
                        break;

                    case 'vds_delete_backup':
                        if (isset($data['hostname'])) {
                            $formatted .= "VDS: {$data['hostname']}\n";
                        }
                        if (isset($data['volid'])) {
                            $formatted .= "Volume ID: {$data['volid']}\n";
                        }
                        if (isset($data['storage'])) {
                            $formatted .= "Storage: {$data['storage']}\n";
                        }
                        if (isset($data['message'])) {
                            $formatted .= "Note: {$data['message']}\n";
                        }
                        $formatted .= "\nThe backup deletion will be executed by the frontend.";
                        break;

                    case 'vds_restore_backup':
                        if (isset($data['hostname'])) {
                            $formatted .= "VDS: {$data['hostname']}\n";
                        }
                        if (isset($data['volid'])) {
                            $formatted .= "Volume ID: {$data['volid']}\n";
                        }
                        if (isset($data['storage'])) {
                            $formatted .= "Storage: {$data['storage']}\n";
                        }
                        if (isset($data['message'])) {
                            $formatted .= "Note: {$data['message']}\n";
                        }
                        $formatted .= "\nThe backup restore will be executed by the frontend.";
                        break;

                    default:
                        $formatted .= json_encode($data, JSON_PRETTY_PRINT);
                        break;
                }

                return $formatted;
            }

            // Generic array formatting
            return json_encode($data, JSON_PRETTY_PRINT);
        }

        return (string) $data;
    }

    /**
     * Get available VDS tools metadata.
     *
     * @return array Tool metadata array keyed by tool name
     */
    public function getAvailableTools(): array
    {
        $tools = [];
        foreach ($this->tools as $name => $tool) {
            $tools[$name] = [
                'name'        => $name,
                'description' => $tool->getDescription(),
                'parameters'  => $tool->getParameters(),
            ];
        }

        return $tools;
    }

    /**
     * Register all VDS tools.
     */
    private function registerTools(): void
    {
        $this->tools = [
            'get_vds_details'    => new GetVdsDetailsTool(),
            'get_vds_status'     => new GetVdsStatusTool(),
            'vds_power_action'   => new VdsPowerActionTool(),
            'get_vds_backups'    => new GetVdsBackupsTool(),
            'get_vds_activities' => new GetVdsActivitiesTool(),
            'create_vds_backup'  => new CreateVdsBackupTool(),
            'delete_vds_backup'  => new DeleteVdsBackupTool(),
            'restore_vds_backup' => new RestoreVdsBackupTool(),
            'get_vds_networking' => new GetVdsNetworkingTool(),
            'get_vds_subusers'   => new GetVdsSubusersTool(),
        ];
    }
}
