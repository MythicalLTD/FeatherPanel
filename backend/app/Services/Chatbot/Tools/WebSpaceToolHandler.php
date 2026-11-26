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
use App\Services\Chatbot\Tools\WebSpace\RenewSslTool;
use App\Services\Chatbot\Tools\WebSpace\ListFilesTool;
use App\Services\Chatbot\Tools\WebSpace\SetWafModeTool;
use App\Services\Chatbot\Tools\WebSpace\ListBackupsTool;
use App\Services\Chatbot\Tools\WebSpace\ListDnsZonesTool;
use App\Services\Chatbot\Tools\WebSpace\ListSchedulesTool;
use App\Services\Chatbot\Tools\WebSpace\TriggerDeployTool;
use App\Services\Chatbot\Tools\WebSpace\GetFileContentTool;
use App\Services\Chatbot\Tools\WebSpace\GetWafOverviewTool;
use App\Services\Chatbot\Tools\WebSpace\GetWafSettingsTool;
use App\Services\Chatbot\Tools\WebSpace\ListDnsRecordsTool;
use App\Services\Chatbot\Tools\WebSpace\GetWebSpaceStatusTool;
use App\Services\Chatbot\Tools\WebSpace\GetAppDeployConfigTool;
use App\Services\Chatbot\Tools\WebSpace\GetWebSpaceDetailsTool;
use App\Services\Chatbot\Tools\WebSpace\CreateWebSpaceBackupTool;

/**
 * WebSpace Tool Handler - registers and dispatches WebSpace-specific chatbot tools.
 */
class WebSpaceToolHandler
{
    private $app;
    private $tools = [];

    public function __construct()
    {
        $this->app = App::getInstance(true);
        $this->registerTools();
    }

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
                if ($paramsJson !== '') {
                    $decoded = json_decode($paramsJson, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $params = $decoded;
                    } else {
                        $this->app->getLogger()->warning("WebSpaceToolHandler: Failed to parse tool call JSON for {$toolName}: " . json_last_error_msg());
                    }
                }

                $toolCalls[] = [
                    'tool' => $toolName,
                    'params' => $params,
                ];
                $offset = $jsonEnd;
            } else {
                $offset = $bracePos + 1;
            }
        }

        return $toolCalls;
    }

    public function executeTool(string $toolName, array $params, array $user, array $pageContext = []): array
    {
        if (!isset($this->tools[$toolName])) {
            return [
                'success' => false,
                'data' => null,
                'error' => "Unknown WebSpace tool: {$toolName}",
            ];
        }

        try {
            $result = $this->tools[$toolName]->execute($params, $user, $pageContext);
            if (is_array($result) && array_key_exists('success', $result) && $result['success'] === false) {
                return [
                    'success' => false,
                    'data' => $result,
                    'error' => is_string($result['error'] ?? null) ? $result['error'] : 'Tool failed',
                ];
            }

            return [
                'success' => true,
                'data' => $result,
                'error' => null,
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error("WebSpaceToolHandler execution error for {$toolName}: " . $e->getMessage());

            return [
                'success' => false,
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function removeToolCalls(string $response): string
    {
        $pattern = '/TOOL_CALL:\s*\w+\s*\{[^}]*\}|TOOL_CALL:\s*[^\n]+/s';

        return preg_replace($pattern, '', $response) ?? $response;
    }

    public function hasMalformedToolCall(string $response): bool
    {
        return str_contains($response, 'TOOL_CALL:') && empty($this->parseToolCalls($response));
    }

    public function formatToolResult(string $toolName, array $result): string
    {
        if (!$result['success']) {
            $error = $result['error'] ?? 'Unknown error';

            return "Tool {$toolName} failed: {$error}";
        }

        $data = $result['data'];
        if (is_string($data)) {
            return $data;
        }

        if (is_array($data) && isset($data['action_type'])) {
            $formatted = "Action completed successfully!\n\n";
            if (isset($data['message'])) {
                $formatted .= "Result: {$data['message']}\n";
            }
            foreach (['uuid_short', 'name', 'mode', 'schedule_id', 'schedule_name', 'job_id'] as $key) {
                if (isset($data[$key]) && $data[$key] !== null && $data[$key] !== '') {
                    $label = ucwords(str_replace('_', ' ', $key));
                    $formatted .= "{$label}: {$data[$key]}\n";
                }
            }

            return $formatted;
        }

        if (is_array($data)) {
            return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '';
        }

        return (string) $data;
    }

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

    private function registerTools(): void
    {
        $this->tools = [
            'get_webspace_details' => new GetWebSpaceDetailsTool(),
            'get_webspace_status' => new GetWebSpaceStatusTool(),
            'list_dns_zones' => new ListDnsZonesTool(),
            'list_dns_records' => new ListDnsRecordsTool(),
            'get_waf_overview' => new GetWafOverviewTool(),
            'get_waf_settings' => new GetWafSettingsTool(),
            'list_schedules' => new ListSchedulesTool(),
            'list_backups' => new ListBackupsTool(),
            'list_files' => new ListFilesTool(),
            'get_file_content' => new GetFileContentTool(),
            'get_app_deploy_config' => new GetAppDeployConfigTool(),
            'create_backup' => new CreateWebSpaceBackupTool(),
            'trigger_deploy' => new TriggerDeployTool(),
            'renew_ssl' => new RenewSslTool(),
            'set_waf_mode' => new SetWafModeTool(),
        ];
    }
}
