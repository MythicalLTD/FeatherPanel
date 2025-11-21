<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

namespace App\Services\Chatbot\Tools;

use App\App;

/**
 * Tool handler for executing AI-requested tools/functions.
 */
class ToolHandler
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
        // Find all TOOL_CALL: tool_name patterns
        $pattern = '/TOOL_CALL:\s*(\w+)\s*(\{)/s';
        $offset = 0;

        while (preg_match($pattern, $response, $matches, PREG_OFFSET_CAPTURE, $offset)) {
            $toolName = trim($matches[1][0]);
            $bracePos = $matches[2][1];

            // Find the matching closing brace
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

                // Try to parse JSON parameters
                $params = [];
                if (!empty($paramsJson)) {
                    $decoded = json_decode($paramsJson, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $params = $decoded;
                    } else {
                        // Log JSON parsing error for debugging
                        $this->app->getLogger()->warning("Failed to parse tool call JSON for {$toolName}: " . json_last_error_msg() . ' | JSON: ' . substr($paramsJson, 0, 200));
                    }
                }

                $toolCalls[] = [
                    'tool' => $toolName,
                    'params' => $params,
                ];

                $offset = $jsonEnd;
            } else {
                // Unmatched braces, skip this match
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
                'data' => null,
                'error' => "Unknown tool: {$toolName}",
            ];
        }

        try {
            $tool = $this->tools[$toolName];
            $result = $tool->execute($params, $user, $pageContext);

            return [
                'success' => true,
                'data' => $result,
                'error' => null,
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error("Tool execution error for {$toolName}: " . $e->getMessage());

            return [
                'success' => false,
                'data' => null,
                'error' => $e->getMessage(),
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
            // Format action results in a more natural way
            if (isset($data['action_type'])) {
                $formatted = "✅ Action completed successfully!\n\n";

                // Add success message if available
                if (isset($data['message'])) {
                    $formatted .= "Result: {$data['message']}\n\n";
                }

                // Add relevant details based on action type
                switch ($data['action_type']) {
                    case 'create_backup':
                        if (isset($data['backup_name'])) {
                            $formatted .= "Backup Name: {$data['backup_name']}\n";
                        }
                        if (isset($data['backup_uuid'])) {
                            $formatted .= "Backup UUID: {$data['backup_uuid']}\n";
                        }
                        if (isset($data['backup_id'])) {
                            $formatted .= "Backup ID: {$data['backup_id']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe backup has been initiated and is running in the background. You can check its status on the backups page.";
                        break;

                    case 'create_schedule':
                        if (isset($data['schedule_name'])) {
                            $formatted .= "Schedule Name: {$data['schedule_name']}\n";
                        }
                        if (isset($data['cron_expression'])) {
                            $formatted .= "Cron Expression: {$data['cron_expression']}\n";
                        }
                        if (isset($data['next_run_at'])) {
                            $formatted .= "Next Run: {$data['next_run_at']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        if (isset($data['tasks_created']) && $data['tasks_created'] > 0) {
                            $formatted .= "Tasks Created: {$data['tasks_created']}\n";
                            if (isset($data['tasks']) && is_array($data['tasks'])) {
                                foreach ($data['tasks'] as $task) {
                                    $formatted .= "  - Task #{$task['sequence_id']}: {$task['action']}\n";
                                }
                            }
                        } else {
                            $formatted .= "\n⚠️ Warning: No tasks were created. The schedule will not execute anything until tasks are added.";
                        }
                        $formatted .= "\nThe schedule has been created and is " . (isset($data['is_active']) && $data['is_active'] ? 'active' : 'inactive') . '.';
                        break;

                    case 'server_power':
                        if (isset($data['action_past'])) {
                            $formatted .= "Action: {$data['action_past']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe server power action has been executed successfully.";
                        break;

                    case 'create_database':
                        if (isset($data['database_name'])) {
                            $formatted .= "Database Name: {$data['database_name']}\n";
                        }
                        if (isset($data['username'])) {
                            $formatted .= "Username: {$data['username']}\n";
                        }
                        if (isset($data['password'])) {
                            $formatted .= "Password: {$data['password']}\n";
                        }
                        if (isset($data['database_host'])) {
                            $formatted .= "Host: {$data['database_host']}:{$data['database_port']}\n";
                        }
                        $formatted .= "\nThe database has been created successfully.";
                        break;

                    case 'delete_schedule':
                        if (isset($data['schedule_name'])) {
                            $formatted .= "Schedule Name: {$data['schedule_name']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe schedule has been deleted successfully.";
                        break;

                    case 'update_schedule':
                        if (isset($data['schedule_name'])) {
                            $formatted .= "Schedule Name: {$data['schedule_name']}\n";
                        }
                        if (isset($data['cron_expression'])) {
                            $formatted .= "Cron Expression: {$data['cron_expression']}\n";
                        }
                        if (isset($data['next_run_at'])) {
                            $formatted .= "Next Run: {$data['next_run_at']}\n";
                        }
                        if (isset($data['is_active'])) {
                            $formatted .= 'Status: ' . ($data['is_active'] ? 'Active' : 'Inactive') . "\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe schedule has been updated successfully.";
                        break;

                    case 'delete_database':
                        if (isset($data['database_name'])) {
                            $formatted .= "Database Name: {$data['database_name']}\n";
                        }
                        if (isset($data['username'])) {
                            $formatted .= "Username: {$data['username']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe database has been deleted successfully.";
                        break;

                    case 'update_database':
                        if (isset($data['database_name'])) {
                            $formatted .= "Database Name: {$data['database_name']}\n";
                        }
                        if (isset($data['username'])) {
                            $formatted .= "Username: {$data['username']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe database has been updated successfully.";
                        break;

                    case 'delete_backup':
                        if (isset($data['backup_name'])) {
                            $formatted .= "Backup Name: {$data['backup_name']}\n";
                        }
                        if (isset($data['backup_uuid'])) {
                            $formatted .= "Backup UUID: {$data['backup_uuid']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe backup has been deleted successfully.";
                        break;

                    case 'create_subdomain':
                        if (isset($data['subdomain'])) {
                            $formatted .= "Subdomain: {$data['subdomain']}\n";
                        }
                        if (isset($data['domain'])) {
                            $formatted .= "Domain: {$data['domain']}\n";
                        }
                        if (isset($data['fqdn'])) {
                            $formatted .= "FQDN: {$data['fqdn']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe subdomain has been created successfully.";
                        break;

                    case 'delete_subdomain':
                        if (isset($data['subdomain'])) {
                            $formatted .= "Subdomain: {$data['subdomain']}\n";
                        }
                        if (isset($data['domain'])) {
                            $formatted .= "Domain: {$data['domain']}\n";
                        }
                        if (isset($data['fqdn'])) {
                            $formatted .= "FQDN: {$data['fqdn']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $formatted .= "\nThe subdomain has been deleted successfully.";
                        break;

                    case 'delete_allocation':
                    case 'set_primary_allocation':
                    case 'auto_allocate':
                        if (isset($data['allocation_ip'])) {
                            $port = $data['allocation_port'] ?? '';
                            $formatted .= "Allocation: {$data['allocation_ip']}:{$port}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $actionText = $data['action_type'] === 'delete_allocation' ? 'removed' : ($data['action_type'] === 'set_primary_allocation' ? 'set as primary' : 'assigned');
                        $formatted .= "\nThe allocation has been {$actionText} successfully.";
                        break;

                    case 'create_task':
                    case 'update_task':
                    case 'delete_task':
                        if (isset($data['action'])) {
                            $formatted .= "Task Action: {$data['action']}\n";
                        }
                        if (isset($data['sequence_id'])) {
                            $formatted .= "Sequence: #{$data['sequence_id']}\n";
                        }
                        if (isset($data['schedule_name'])) {
                            $formatted .= "Schedule: {$data['schedule_name']}\n";
                        }
                        if (isset($data['server_name'])) {
                            $formatted .= "Server: {$data['server_name']}\n";
                        }
                        $actionText = $data['action_type'] === 'create_task' ? 'created' : ($data['action_type'] === 'update_task' ? 'updated' : 'deleted');
                        $formatted .= "\nThe task has been {$actionText} successfully.";
                        break;

                    case 'update_server':
                        if (isset($data['server_name'])) {
                            $formatted .= "Server Name: {$data['server_name']}\n";
                        }
                        if (isset($data['updated_fields']) && is_array($data['updated_fields'])) {
                            $formatted .= 'Updated Fields: ' . implode(', ', $data['updated_fields']) . "\n";
                        }
                        $formatted .= "\nThe server has been updated successfully.";
                        break;

                    default:
                        // For other action types, include all relevant data
                        $formatted .= "Details:\n";
                        foreach ($data as $key => $value) {
                            if ($key !== 'action_type' && $key !== 'message' && $key !== 'success') {
                                if (is_scalar($value)) {
                                    $formatted .= "- {$key}: {$value}\n";
                                }
                            }
                        }
                }

                return $formatted;
            }

            // For non-action results, format as JSON but more readable
            return json_encode($data, JSON_PRETTY_PRINT);
        }

        return (string) $data;
    }

    /**
     * Get list of available tools with descriptions.
     *
     * @return array Array of tool descriptions
     */
    public function getAvailableTools(): array
    {
        $tools = [];
        foreach ($this->tools as $name => $tool) {
            $tools[$name] = [
                'name' => $name,
                'description' => $tool->getDescription(),
                'parameters' => $tool->getParameters(),
            ];
        }

        return $tools;
    }

    /**
     * Register all available tools.
     */
    private function registerTools(): void
    {
        $this->tools = [
            'get_server_activities' => new GetServerActivitiesTool(),
            'get_database_credentials' => new GetDatabaseCredentialsTool(),
            'create_database' => new CreateDatabaseTool(),
            'get_server_status' => new GetServerStatusTool(),
            'get_server_schedules' => new GetServerSchedulesTool(),
            'get_server_backups' => new GetServerBackupsTool(),
            'create_backup' => new CreateBackupTool(),
            'create_schedule' => new CreateScheduleTool(),
            'server_power_action' => new ServerPowerActionTool(),
            'delete_schedule' => new DeleteScheduleTool(),
            'update_schedule' => new UpdateScheduleTool(),
            'delete_database' => new DeleteDatabaseTool(),
            'update_database' => new UpdateDatabaseTool(),
            'delete_backup' => new DeleteBackupTool(),
            'get_subdomains' => new GetSubdomainsTool(),
            'create_subdomain' => new CreateSubdomainTool(),
            'delete_subdomain' => new DeleteSubdomainTool(),
            'get_server_allocations' => new GetServerAllocationsTool(),
            'delete_allocation' => new DeleteAllocationTool(),
            'set_primary_allocation' => new SetPrimaryAllocationTool(),
            'auto_allocate' => new AutoAllocateTool(),
            'get_schedule_tasks' => new GetScheduleTasksTool(),
            'create_task' => new CreateTaskTool(),
            'update_task' => new UpdateTaskTool(),
            'delete_task' => new DeleteTaskTool(),
            'get_server_details' => new GetServerDetailsTool(),
        ];
    }
}
