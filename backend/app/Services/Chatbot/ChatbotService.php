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

namespace App\Services\Chatbot;

use App\App;
use App\Chat\UserPreference;
use App\Config\ConfigInterface;
use App\Services\Chatbot\Tools\ToolHandler;
use App\Services\Chatbot\Providers\GrokProvider;
use App\Services\Chatbot\Providers\BasicProvider;
use App\Services\Chatbot\Providers\OllamaProvider;
use App\Services\Chatbot\Providers\OpenAIProvider;
use App\Services\Chatbot\Providers\ProviderInterface;
use App\Services\Chatbot\Providers\OpenRouterProvider;
use App\Services\Chatbot\Providers\PerplexityProvider;
use App\Services\Chatbot\Providers\GoogleGeminiProvider;

class ChatbotService
{
    private $app;
    private $config;

    public function __construct()
    {
        $this->app = App::getInstance(true);
        $this->config = $this->app->getConfig();
    }

    /**
     * Process a user message and generate a response.
     *
     * Supports multiple AI providers: basic, google_gemini, openrouter, openai, ollama, grok, perplexity
     *
     * @param string $message User's message
     * @param array $history Chat history (array of ['role' => 'user'|'assistant', 'content' => string])
     * @param array $user Current user data
     * @param array $pageContext Optional page context (route, server, etc.)
     *
     * @return array Response with 'response' and 'model' keys
     */
    public function processMessage(string $message, array $history, array $user, array $pageContext = [], ?callable $emit = null): array
    {
        // Check if chatbot is enabled
        $enabled = $this->config->getSetting(ConfigInterface::CHATBOT_ENABLED, 'true');
        if ($enabled !== 'true') {
            return [
                'response' => 'The AI chatbot is currently disabled by the administrator.',
                'model' => 'FeatherPanel AI (Disabled)',
            ];
        }

        $provider = $this->config->getSetting(ConfigInterface::CHATBOT_AI_PROVIDER, 'basic');

        // Get chatbot configuration
        $temperature = (float) $this->config->getSetting(ConfigInterface::CHATBOT_TEMPERATURE, '0.7');
        $maxTokens = (int) $this->config->getSetting(ConfigInterface::CHATBOT_MAX_TOKENS, '2048');
        $maxHistory = min((int) $this->config->getSetting(ConfigInterface::CHATBOT_MAX_HISTORY, '4'), 6);

        ChatbotRuntime::emit($emit, 'status', ['message' => 'Preparing chat context']);

        // Limit history to configured max
        $history = array_slice($history, -$maxHistory);

        $isDashboardMode = $this->isDashboardMode($pageContext);

        // Build comprehensive system prompt
        $contextBuilder = $isDashboardMode ? new DashboardContextBuilder() : new ContextBuilder();

        // Load base system prompt from file
        $baseSystemPrompt = $isDashboardMode
            ? DashboardContextBuilder::loadSystemPrompt()
            : ContextBuilder::loadSystemPrompt();

        // Get admin-configured system prompt (optional override)
        $adminSystemPrompt = $this->config->getSetting(ConfigInterface::CHATBOT_SYSTEM_PROMPT, '');

        // Build user context. Dashboard mode is compact and never injects logs by default.
        $userContext = $isDashboardMode
            ? $contextBuilder->buildContext($user, $pageContext)
            : $contextBuilder->buildContext($user, $pageContext, $this->shouldIncludeLogs($message));

        // Get conversation memory if available
        $conversationMemory = $pageContext['conversation_memory'] ?? '';

        // Combine system prompts
        $systemPrompt = $baseSystemPrompt;
        if (!empty($adminSystemPrompt)) {
            $systemPrompt .= "\n\n## Additional Instructions\n{$adminSystemPrompt}";
        }
        $systemPrompt .= "\n\n## Current User Context\n{$userContext}";

        // Add conversation memory if available
        if (!empty($conversationMemory)) {
            $systemPrompt .= "\n\n## Compact Conversation Memory\n{$conversationMemory}";
            $systemPrompt .= "\n\nUse this compact memory only as background. Never infer resource IDs, current state, or tool parameters from older summary text when the current dashboard/server context or tools disagree.";
        }

        // Get admin-configured user prompt (optional)
        $userPrompt = $this->config->getSetting(ConfigInterface::CHATBOT_USER_PROMPT, '');

        // Prepend user prompt to message if configured
        $fullMessage = $message;
        $fullMessage .= "\n\n[Current Turn Protocol: Treat this latest user message as the primary task. Use older conversation only as background. Do not bring up previous actions, previous questions, or unfinished older topics unless this latest message explicitly asks about them or clearly depends on them.]";
        $fullMessage .= "\n\n[Response Language Protocol: Reply in the same natural language as this latest user message. If this message is English, reply in English only, regardless of older conversation history. If earlier replies used the wrong language, acknowledge that plainly instead of denying it.]";
        $fullMessage .= "\n\n[Action Authorization Protocol: Only perform, claim, or emit ACTION/TOOL_CALL for destructive or state-changing actions when this latest user message explicitly requests that exact action. If the latest message asks to check, inspect, show status, diagnose, or look at a server, fetch/read status only. Do not restart, stop, kill, start, delete, write, or send console commands based on older conversation memory or summaries.]";
        if (!empty($userPrompt)) {
            $fullMessage = "{$fullMessage}\n\n[User Context: {$userPrompt}]";
        }

        // Check if user has personal API key preference
        $userPreferences = UserPreference::getPreferences($user['uuid'] ?? '');

        // Get provider instance
        $providerInstance = $this->getProvider($provider, $userPreferences, $temperature, $maxTokens);

        if (!$providerInstance) {
            // Determine which provider failed and return appropriate error
            $errorMessage = "Invalid AI provider configured: {$provider}";
            if ($provider === 'google_gemini') {
                $errorMessage = 'Google AI API key is not configured. Please configure it in admin settings.';
            } elseif ($provider === 'openrouter') {
                $errorMessage = 'OpenRouter API key is not configured. Please configure it in admin settings.';
            } elseif ($provider === 'openai') {
                $errorMessage = 'OpenAI API key is not configured. Please configure it in admin settings.';
            } elseif ($provider === 'ollama') {
                $errorMessage = 'Ollama base URL is not configured. Please configure it in admin settings.';
            } elseif ($provider === 'grok') {
                $errorMessage = 'xAI (Grok) API key is not configured. Please configure it in admin settings.';
            } elseif ($provider === 'perplexity') {
                $errorMessage = 'Perplexity API key is not configured. Please configure it in admin settings.';
            }

            return [
                'response' => $errorMessage,
                'model' => 'FeatherPanel AI (Error)',
            ];
        }

        // Initialize tool handler
        $toolHandler = new ToolHandler($isDashboardMode);

        // Add tool information to system prompt
        $toolsInfo = $this->formatToolsForPrompt($toolHandler);
        $systemPrompt .= "\n\n## Available Tools\n{$toolsInfo}";

        // Process message with tool calling support.
        $maxToolIterations = 5;
        $toolIterations = 0;
        $currentMessage = $fullMessage;
        $currentHistory = $history;
        $finalResponse = '';
        $toolExecutions = []; // Store tool execution results for frontend
        $toolActivity = [];
        $usageItems = [];
        $result = ['response' => '', 'model' => 'FeatherPanel AI'];
        $requiredTool = $this->detectRequiredTool($message, $history);
        $allowedSingleExecutionTools = $this->detectAllowedSingleExecutionTools($message, $history);
        $lastToolResultsText = '';
        $toolOutcomeFallbacks = [];
        $completedSingleExecutionTools = [];

        while ($toolIterations < $maxToolIterations) {
            // Process message through provider
            ChatbotRuntime::emit($emit, 'status', [
                'message' => $toolIterations === 0 ? 'Calling AI model' : 'Calling AI model with tool results',
                'iteration' => $toolIterations + 1,
            ]);
            $result = $providerInstance->processMessage($currentMessage, $currentHistory, $systemPrompt);
            $response = $result['response'];
            if (isset($result['usage']) && is_array($result['usage'])) {
                $usageItems[] = $result['usage'];
                ChatbotRuntime::emit($emit, 'usage', ['usage' => TokenUsage::aggregate($usageItems)]);
            }

            // Check for tool calls
            ChatbotRuntime::emit($emit, 'status', ['message' => 'Checking for tool calls']);
            $toolCalls = $toolHandler->parseToolCalls($response);

            if (empty($toolCalls) && $toolHandler->hasMalformedToolCall($response)) {
                $currentHistory[] = [
                    'role' => 'assistant',
                    'content' => $toolHandler->removeToolCalls($response),
                ];
                $currentMessage = $this->buildMalformedToolCorrection($toolHandler);
                $currentHistory[] = [
                    'role' => 'user',
                    'content' => $currentMessage,
                ];
                ++$toolIterations;
                $finalResponse = $toolHandler->removeToolCalls($response);
                continue;
            }

            if (
                empty($toolCalls)
                && $requiredTool !== null
                && $toolIterations < $maxToolIterations - 1
                && !$this->responseClaimsRequiredToolCompleted($response, $requiredTool)
            ) {
                $currentHistory[] = [
                    'role' => 'assistant',
                    'content' => $toolHandler->removeToolCalls($response),
                ];
                $currentMessage = $this->buildRequiredToolCorrection($requiredTool, $history, $pageContext);
                $currentHistory[] = [
                    'role' => 'user',
                    'content' => $currentMessage,
                ];
                ++$toolIterations;
                $finalResponse = $toolHandler->removeToolCalls($response);
                continue;
            }

            if (empty($toolCalls)) {
                // No tool calls, return final response
                $finalResponse = $toolHandler->removeToolCalls($response);
                break;
            }

            // Execute tool calls
            $toolResults = [];
            foreach ($toolCalls as $toolCall) {
                if (!$this->isToolAllowedForLatestIntent($toolCall, $allowedSingleExecutionTools)) {
                    $toolResults[] = [
                        'tool' => $toolCall['tool'],
                        'result' => "Skipped {$toolCall['tool']} because it does not match the latest user request. Do not use tools from older conversation context; answer using only the tools that were actually run for this message.",
                    ];
                    continue;
                }

                if ($this->shouldSkipDuplicateToolCall($toolCall, $completedSingleExecutionTools)) {
                    $toolResults[] = [
                        'tool' => $toolCall['tool'],
                        'result' => "Skipped duplicate {$toolCall['tool']} call because that action already completed during this message. Do not call it again; summarize the completed result.",
                    ];
                    continue;
                }

                ChatbotRuntime::emit($emit, 'tool_call', [
                    'tool' => $toolCall['tool'],
                    'params' => ChatbotRuntime::sanitizeValue($toolCall['params']),
                    'iteration' => $toolIterations + 1,
                ]);
                $toolResult = $toolHandler->executeTool(
                    $toolCall['tool'],
                    $toolCall['params'],
                    $user,
                    $pageContext
                );

                // Store tool execution for frontend (if it's an action tool)
                if (is_array($toolResult['data']) && isset($toolResult['data']['action_type'])) {
                    $toolExecutions[] = $toolResult['data'];
                }
                $activity = ChatbotRuntime::toolActivity($toolCall, $toolResult, $toolIterations + 1);
                $toolActivity[] = $activity;
                ChatbotRuntime::emit($emit, 'tool_result', $activity);

                $formattedToolResult = $toolHandler->formatToolResult($toolCall['tool'], $toolResult);
                if ($this->shouldGuaranteeToolOutcome($toolCall['tool'], $toolResult)) {
                    $toolOutcomeFallbacks[] = [
                        'tool' => $toolCall['tool'],
                        'summary' => $formattedToolResult,
                    ];
                }
                if (($toolResult['success'] ?? false) && $this->isSingleExecutionTool($toolCall['tool'])) {
                    $completedSingleExecutionTools[$toolCall['tool']] = true;
                }

                $toolResults[] = [
                    'tool' => $toolCall['tool'],
                    'result' => $formattedToolResult,
                ];
            }

            // Format tool results for next iteration
            $toolResultsText = "Tool execution completed. Here are the results:\n\n";
            foreach ($toolResults as $tr) {
                $toolResultsText .= "=== {$tr['tool']} ===\n{$tr['result']}\n\n";
            }
            $toolResultsText .= "\nCRITICAL INSTRUCTIONS:\n";
            $toolResultsText .= "- You MUST provide clear, specific feedback to the user about what happened\n";
            $toolResultsText .= "- If an action succeeded, confirm what was done with specific details (e.g., 'I've created a backup named [backup_name] for server [server_name]')\n";
            $toolResultsText .= "- If create_database succeeded, include the database name, username, password, host, port, and type in the final answer\n";
            $toolResultsText .= "- Include relevant information from the tool results (names, IDs, timestamps, etc.)\n";
            $toolResultsText .= "- If an action failed, explain the error clearly\n";
            $toolResultsText .= "- Never just say 'I'll do that' or 'done' without explaining what actually happened\n";
            $toolResultsText .= '- Be conversational and helpful - the user wants to know what you did for them';
            $lastToolResultsText = $toolResultsText;

            // Remove tool calls from response and add to history
            $cleanResponse = $toolHandler->removeToolCalls($response);
            $currentHistory[] = [
                'role' => 'assistant',
                'content' => $cleanResponse,
            ];

            // Add tool results as user message for next iteration
            $currentMessage = $toolResultsText;
            $currentHistory[] = [
                'role' => 'user',
                'content' => $toolResultsText,
            ];

            ++$toolIterations;
            $finalResponse = $cleanResponse; // Store in case we hit max iterations
        }

        // If the last model turn still tried to call a tool, force one final synthesis pass
        // so successful tool output is translated into a clean answer for the user.
        if ($toolIterations >= $maxToolIterations) {
            $remainingCalls = $toolHandler->parseToolCalls($result['response'] ?? '');
            if (!empty($remainingCalls)) {
                if ($lastToolResultsText !== '') {
                    ChatbotRuntime::emit($emit, 'status', ['message' => 'Preparing final tool result summary']);
                    $finalSystemPrompt = $systemPrompt . "\n\n## Final Tool Result Synthesis\n"
                        . 'Do not call any tools in this pass. Use only the supplied tool results and write the final user-facing answer.';
                    $finalMessage = $lastToolResultsText . "\n\nNo more tools may be called. Summarize the completed tool results for the user now.";
                    $synthesisResult = $providerInstance->processMessage($finalMessage, $currentHistory, $finalSystemPrompt);
                    if (isset($synthesisResult['usage']) && is_array($synthesisResult['usage'])) {
                        $usageItems[] = $synthesisResult['usage'];
                        ChatbotRuntime::emit($emit, 'usage', ['usage' => TokenUsage::aggregate($usageItems)]);
                    }
                    $finalResponse = $toolHandler->removeToolCalls($synthesisResult['response'] ?? $finalResponse);
                    $result = $synthesisResult + $result;
                } else {
                    $finalResponse .= "\n\n[Note: Maximum tool call iterations reached. Some tools may not have been executed.]";
                }
            }
        }

        $finalResponse = $this->appendMissingToolOutcomes($finalResponse, $toolOutcomeFallbacks);

        return [
            'response' => trim($finalResponse),
            'model' => $result['model'] ?? 'FeatherPanel AI',
            'tool_executions' => $toolExecutions, // Include tool execution results for frontend
            'tool_activity' => $toolActivity,
            'usage' => TokenUsage::aggregate($usageItems),
        ];
    }

    /**
     * Format tools information for system prompt.
     *
     * @param ToolHandler $toolHandler Tool handler instance
     *
     * @return string Formatted tools information
     */
    private function formatToolsForPrompt(ToolHandler $toolHandler): string
    {
        $tools = $toolHandler->getAvailableTools();
        $text = "Use TOOL_CALL only when real-time data or an action is needed. Available tools:\n\n";

        foreach ($tools as $tool) {
            $parameters = [];
            foreach ($tool['parameters'] as $param => $description) {
                $parameters[] = "{$param}: {$description}";
            }
            $text .= "- {$tool['name']}(" . implode('; ', $parameters) . ")\n";
        }

        $text .= "\nFormat: TOOL_CALL: tool_name {\"param\": \"value\"}\n";
        $text .= "TOOL_CALL always requires a valid JSON object after the tool name. Never write TOOL_CALL for navigation.\n";
        $text .= "For navigation, use ACTION: navigate server [uuid_or_name] to [page].\n";
        $text .= "Tool selection protocol: if a tool exists for the user's latest request, use that tool instead of navigating or describing the page. Examples: create database -> create_database, create backup -> create_backup, create schedule -> create_schedule, list status -> get_server_status, list databases/credentials -> get_database_credentials.\n";
        $text .= "You may call multiple tools. Always include a short natural language response with tool calls.\n";

        return $text;
    }

    private function buildMalformedToolCorrection(ToolHandler $toolHandler): string
    {
        $toolNames = implode(', ', array_keys($toolHandler->getAvailableTools()));

        return "Your previous response contained invalid TOOL_CALL syntax. Regenerate the answer now.\n"
            . "Rules:\n"
            . "- TOOL_CALL format is exactly: TOOL_CALL: tool_name {\"param\":\"value\"}\n"
            . "- TOOL_CALL must use one of these tool names: {$toolNames}\n"
            . "- Never use TOOL_CALL for navigation. Navigation uses ACTION: navigate server [uuid_or_name] to [page]\n"
            . "- If a tool exists for the latest user request, call it with valid JSON parameters.\n"
            . '- Do not expose TOOL_CALL text unless it is valid and intended for execution.';
    }

    private function detectRequiredTool(string $message, array $history): ?string
    {
        $message = mb_strtolower($message);
        $hasRecentDatabaseContext = $this->hasRecentDatabaseContext($history);

        if (
            preg_match('/\b(delete|remove|drop)\b.*\b(database|db)\b/u', $message)
            || (
                $hasRecentDatabaseContext
                && preg_match('/\b(delete|remove|drop)\s+(it|that|this|one)\b/u', $message)
            )
        ) {
            return 'delete_database';
        }

        if (
            preg_match('/\b(create|make|add|new|setup|set\s+up)\b.*\b(database|db)\b/u', $message)
            || (
                $hasRecentDatabaseContext
                && preg_match('/\b(create|make|add|setup|set\s+up)\b.*\b(one|it|that|this)\b/u', $message)
            )
        ) {
            return 'create_database';
        }

        if (
            preg_match('/\b(update|change|modify)\b.*\b(database|db)\b/u', $message)
            || (
                $hasRecentDatabaseContext
                && preg_match('/\b(update|change|modify)\s+(it|that|this|one)\b/u', $message)
            )
        ) {
            return 'update_database';
        }

        return null;
    }

    private function hasRecentDatabaseContext(array $history): bool
    {
        $recentHistory = array_slice($history, -6);
        $historyText = mb_strtolower(json_encode($recentHistory, JSON_UNESCAPED_SLASHES) ?: '');

        return (bool) preg_match('/\b(databases?|db|database_credentials|create_database|delete_database|update_database)\b/u', $historyText);
    }

    private function responseClaimsRequiredToolCompleted(string $response, string $tool): bool
    {
        if (str_contains($response, "TOOL_CALL: {$tool}")) {
            return true;
        }

        return false;
    }

    private function shouldGuaranteeToolOutcome(string $toolName, array $toolResult): bool
    {
        if (!($toolResult['success'] ?? false)) {
            return true;
        }

        $data = $toolResult['data'] ?? null;
        if (!is_array($data)) {
            return false;
        }

        if ($toolName === 'create_database' && (($data['success'] ?? false) === true)) {
            return true;
        }

        return isset($data['action_type']);
    }

    private function shouldSkipDuplicateToolCall(array $toolCall, array $completedSingleExecutionTools): bool
    {
        $toolName = (string) ($toolCall['tool'] ?? '');

        return $this->isSingleExecutionTool($toolName) && isset($completedSingleExecutionTools[$toolName]);
    }

    private function isToolAllowedForLatestIntent(array $toolCall, array $allowedSingleExecutionTools): bool
    {
        $toolName = (string) ($toolCall['tool'] ?? '');

        if (!$this->isSingleExecutionTool($toolName) || empty($allowedSingleExecutionTools)) {
            return true;
        }

        return in_array($toolName, $allowedSingleExecutionTools, true);
    }

    private function detectAllowedSingleExecutionTools(string $message, array $history): array
    {
        $message = mb_strtolower($message);
        $historyText = mb_strtolower(json_encode(array_slice($history, -6), JSON_UNESCAPED_SLASHES) ?: '');
        $isCreate = (bool) preg_match('/\b(create|make|add|new|setup|set\s+up)\b/u', $message);
        $isDelete = (bool) preg_match('/\b(delete|remove|drop|destroy)\b/u', $message);
        $isUpdate = (bool) preg_match('/\b(update|change|modify|edit|rename)\b/u', $message);

        if (!$isCreate && !$isDelete && !$isUpdate) {
            return [];
        }

        $hasContext = static function (string $pattern) use ($message, $historyText): bool {
            return (bool) preg_match($pattern, $message) || (bool) preg_match($pattern, $historyText);
        };

        if ($hasContext('/\b(databases?|db|database_credentials|create_database|delete_database|update_database)\b/u')) {
            return $isDelete ? ['delete_database'] : ($isUpdate ? ['update_database'] : ['create_database']);
        }

        if ($hasContext('/\b(backups?|create_backup|delete_backup)\b/u')) {
            return $isDelete ? ['delete_backup'] : ['create_backup'];
        }

        if ($hasContext('/\b(schedules?|tasks?|create_schedule|delete_schedule|update_schedule|create_task|delete_task|update_task)\b/u')) {
            if ($isDelete) {
                return ['delete_schedule', 'delete_task'];
            }

            return $isUpdate ? ['update_schedule', 'update_task'] : ['create_schedule', 'create_task'];
        }

        if ($hasContext('/\b(subdomains?|domains?|create_subdomain|delete_subdomain)\b/u')) {
            return $isDelete ? ['delete_subdomain'] : ['create_subdomain'];
        }

        if ($hasContext('/\b(allocations?|ports?|delete_allocation|set_primary_allocation|auto_allocate)\b/u')) {
            return $isDelete ? ['delete_allocation'] : ['set_primary_allocation', 'auto_allocate'];
        }

        if ($hasContext('/\b(files?|folders?|directories?|write_file|delete_files|rename_file|copy_files|compress_files|decompress_archive|pull_file)\b/u')) {
            if ($isDelete) {
                return ['delete_files'];
            }

            return ['write_file', 'create_directory', 'rename_file', 'copy_files', 'compress_files', 'decompress_archive', 'pull_file'];
        }

        return [];
    }

    private function isSingleExecutionTool(string $toolName): bool
    {
        return in_array($toolName, [
            'create_database',
            'delete_database',
            'update_database',
            'create_backup',
            'delete_backup',
            'server_power_action',
            'create_schedule',
            'delete_schedule',
            'update_schedule',
            'create_subdomain',
            'delete_subdomain',
            'delete_allocation',
            'set_primary_allocation',
            'auto_allocate',
            'write_file',
            'create_directory',
            'delete_files',
            'rename_file',
            'copy_files',
            'compress_files',
            'decompress_archive',
            'pull_file',
        ], true);
    }

    private function appendMissingToolOutcomes(string $response, array $fallbacks): string
    {
        $response = trim($response);

        foreach ($fallbacks as $fallback) {
            $summary = trim((string) ($fallback['summary'] ?? ''));
            if ($summary === '') {
                continue;
            }

            if ($this->summaryContainsDatabaseCredentials($summary) && !$this->responseCoversToolOutcome($response, $summary)) {
                $response = "The database was created successfully. Here are the actual credentials returned by the tool:\n\n" . $summary;
                continue;
            }

            if ($this->responseCoversToolOutcome($response, $summary)) {
                continue;
            }

            $summary = ChatbotRuntime::truncate($summary, 2500);
            $response = $response === '' ? $summary : $response . "\n\n" . $summary;
        }

        return $response;
    }

    private function responseCoversToolOutcome(string $response, string $summary): bool
    {
        if ($response === '') {
            return false;
        }

        $outcomeValues = $this->extractOutcomeValues($summary);
        foreach ($outcomeValues as $value) {
            if (mb_strlen($value) >= 3 && str_contains(mb_strtolower($response), mb_strtolower($value))) {
                return true;
            }
        }

        if (!empty($outcomeValues)) {
            return false;
        }

        $normalizedResponse = mb_strtolower($response);
        if (preg_match('/\b(successfully|completed|created|deleted|updated|started|stopped|restarted|renamed|copied|compressed|extracted|written|initiated)\b/u', $normalizedResponse)) {
            return true;
        }

        return false;
    }

    private function summaryContainsDatabaseCredentials(string $text): bool
    {
        return (bool) preg_match('/\bDatabase Name:\s*\S+.*\bUsername:\s*\S+.*\bPassword:\s*\S+/is', $text);
    }

    private function extractOutcomeValues(string $summary): array
    {
        preg_match_all('/^[A-Za-z][A-Za-z ]+:\s*(.+)$/m', $summary, $matches);

        return array_values(array_filter(array_map(static function (string $value): string {
            return trim($value);
        }, $matches[1] ?? [])));
    }

    private function buildRequiredToolCorrection(string $tool, array $history, array $pageContext): string
    {
        $historyText = substr(json_encode(array_slice($history, -6), JSON_UNESCAPED_SLASHES) ?: '', -6000);
        $contextText = substr(json_encode($pageContext, JSON_UNESCAPED_SLASHES) ?: '', -2000);

        return "The latest user message requires the {$tool} tool, but your previous answer did not call it.\n"
            . "Regenerate the answer now and call the required tool using valid JSON.\n"
            . "Use recent history/tool results to resolve references like 'it', 'that database', or a friendly name such as 'hide and seek'.\n"
            . "Recent history: {$historyText}\n"
            . "Current page context: {$contextText}\n"
            . "Required format: TOOL_CALL: {$tool} {\"server_uuid\":\"...\",\"database_name\":\"...\"}\n"
            . 'If the exact database name is known from history, pass it. If only a friendly name is known, pass that as database_name so the tool can fuzzy-match it.';
    }

    /**
     * Decide whether the latest user message needs server logs in context.
     */
    private function shouldIncludeLogs(string $message): bool
    {
        $message = mb_strtolower($message);

        return (bool) preg_match(
            '/\b(logs?|console|error|errors|crash(?:ed|es|ing)?|exception|stacktrace|traceback|failed?|failure|debug|diagnos(?:e|is)|troubleshoot|issue|problem|broken|boot|startup|start(?:ing)?|won[’\']?t\s+(?:start|boot)|not\s+(?:start(?:ing)?|boot(?:ing)?|working))\b/u',
            $message
        );
    }

    private function isDashboardMode(array $pageContext): bool
    {
        if (($pageContext['mode'] ?? '') !== 'dashboard') {
            return false;
        }

        $route = (string) ($pageContext['route'] ?? $pageContext['page'] ?? '');
        $allowedRoutes = [
            '/dashboard',
            '/dashboard/servers',
            '/dashboard/vms',
            '/dashboard/knowledgebase',
        ];

        return in_array($route, $allowedRoutes, true) || str_starts_with($route, '/dashboard/knowledgebase/');
    }

    /**
     * Get the appropriate provider instance based on configuration.
     *
     * @param string $provider Provider name
     * @param array $userPreferences User preferences for API keys
     * @param float $temperature Temperature setting
     * @param int $maxTokens Max tokens setting
     *
     * @return ProviderInterface|null Provider instance or null if invalid
     */
    private function getProvider(string $provider, array $userPreferences, float $temperature = 0.7, int $maxTokens = 2048): ?ProviderInterface
    {
        switch ($provider) {
            case 'google_gemini':
                $userApiKey = $userPreferences['chatbot_google_ai_api_key'] ?? null;
                $apiKey = $userApiKey ?: $this->config->getSetting(ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY, '');
                if (empty($apiKey)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_GOOGLE_AI_MODEL, 'gemini-2.5-flash');

                return new GoogleGeminiProvider($apiKey, $model, $temperature, $maxTokens);

            case 'openrouter':
                $userApiKey = $userPreferences['chatbot_openrouter_api_key'] ?? null;
                $apiKey = $userApiKey ?: $this->config->getSetting(ConfigInterface::CHATBOT_OPENROUTER_API_KEY, '');
                if (empty($apiKey)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_OPENROUTER_MODEL, 'openai/gpt-4o-mini');

                return new OpenRouterProvider($apiKey, $model, $temperature, $maxTokens);

            case 'openai':
                $userApiKey = $userPreferences['chatbot_openai_api_key'] ?? null;
                $apiKey = $userApiKey ?: $this->config->getSetting(ConfigInterface::CHATBOT_OPENAI_API_KEY, '');
                if (empty($apiKey)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_OPENAI_MODEL, 'gpt-4o-mini');

                return new OpenAIProvider($apiKey, $model, $temperature, $maxTokens);

            case 'grok':
                $userApiKey = $userPreferences['chatbot_grok_api_key'] ?? null;
                $apiKey = $userApiKey ?: $this->config->getSetting(ConfigInterface::CHATBOT_GROK_API_KEY, '');
                if (empty($apiKey)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_GROK_MODEL, 'grok-2-1212');

                return new GrokProvider($apiKey, $model, $temperature, $maxTokens);

            case 'ollama':
                $baseUrl = $this->config->getSetting(ConfigInterface::CHATBOT_OLLAMA_BASE_URL, 'http://localhost:11434');
                if (empty($baseUrl)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_OLLAMA_MODEL, 'llama3.2');

                return new OllamaProvider($baseUrl, $model, $temperature, $maxTokens);

            case 'perplexity':
                $apiKey = $this->config->getSetting(ConfigInterface::CHATBOT_PERPLEXITY_API_KEY, '');
                if (empty($apiKey)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_PERPLEXITY_MODEL, 'sonar-pro');
                $baseUrl = $this->config->getSetting(
                    ConfigInterface::CHATBOT_PERPLEXITY_BASE_URL,
                    'https://api.perplexity.ai'
                );

                return new PerplexityProvider($apiKey, $model, $temperature, $maxTokens, $baseUrl);

            case 'basic':
            default:
                return new BasicProvider();
        }
    }
}
