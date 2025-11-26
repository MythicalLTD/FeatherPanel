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
	public function processMessage(string $message, array $history, array $user, array $pageContext = []): array
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
		$maxHistory = (int) $this->config->getSetting(ConfigInterface::CHATBOT_MAX_HISTORY, '10');

		// Limit history to configured max
		$history = array_slice($history, -$maxHistory);

		// Build comprehensive system prompt
		$contextBuilder = new ContextBuilder();

		// Load base system prompt from file
		$baseSystemPrompt = ContextBuilder::loadSystemPrompt();

		// Get admin-configured system prompt (optional override)
		$adminSystemPrompt = $this->config->getSetting(ConfigInterface::CHATBOT_SYSTEM_PROMPT, '');

		// Build user context (servers, info, current page)
		$userContext = $contextBuilder->buildContext($user, $pageContext);

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
			$systemPrompt .= "\n\n## Conversation Memory\n{$conversationMemory}";
		}

		// Get admin-configured user prompt (optional)
		$userPrompt = $this->config->getSetting(ConfigInterface::CHATBOT_USER_PROMPT, '');

		// Prepend user prompt to message if configured
		$fullMessage = $message;
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
		$toolHandler = new ToolHandler();

		// Add tool information to system prompt
		$toolsInfo = $this->formatToolsForPrompt($toolHandler);
		$systemPrompt .= "\n\n## Available Tools\n{$toolsInfo}";

		// Process message with tool calling support (max 3 iterations to avoid loops)
		$maxToolIterations = 3;
		$toolIterations = 0;
		$currentMessage = $fullMessage;
		$currentHistory = $history;
		$finalResponse = '';
		$toolExecutions = []; // Store tool execution results for frontend

		while ($toolIterations < $maxToolIterations) {
			// Process message through provider
			$result = $providerInstance->processMessage($currentMessage, $currentHistory, $systemPrompt);
			$response = $result['response'];

			// Check for tool calls
			$toolCalls = $toolHandler->parseToolCalls($response);

			if (empty($toolCalls)) {
				// No tool calls, return final response
				$finalResponse = $toolHandler->removeToolCalls($response);
				break;
			}

			// Execute tool calls
			$toolResults = [];
			foreach ($toolCalls as $toolCall) {
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

				$toolResults[] = [
					'tool' => $toolCall['tool'],
					'result' => $toolHandler->formatToolResult($toolCall['tool'], $toolResult),
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
			$toolResultsText .= "- Include relevant information from the tool results (names, IDs, timestamps, etc.)\n";
			$toolResultsText .= "- If an action failed, explain the error clearly\n";
			$toolResultsText .= "- Never just say 'I'll do that' or 'done' without explaining what actually happened\n";
			$toolResultsText .= '- Be conversational and helpful - the user wants to know what you did for them';

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

		// If we still have tool calls after max iterations, append a note
		if ($toolIterations >= $maxToolIterations) {
			$remainingCalls = $toolHandler->parseToolCalls($response);
			if (!empty($remainingCalls)) {
				$finalResponse .= "\n\n[Note: Maximum tool call iterations reached. Some tools may not have been executed.]";
			}
		}

		return [
			'response' => trim($finalResponse),
			'model' => $result['model'] ?? 'FeatherPanel AI',
			'tool_executions' => $toolExecutions, // Include tool execution results for frontend
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
		$text = "You have access to the following tools to retrieve real-time data and perform actions:\n\n";

		foreach ($tools as $tool) {
			$text .= "### {$tool['name']}\n";
			$text .= "Description: {$tool['description']}\n";
			$text .= "Parameters:\n";
			foreach ($tool['parameters'] as $param => $desc) {
				$text .= "  - {$param}: {$desc}\n";
			}
			$text .= "\n";
			$text .= "To use this tool, include in your response:\n";
			$text .= "TOOL_CALL: {$tool['name']} {\"param1\": \"value1\", \"param2\": \"value2\"}\n\n";
		}

		$text .= "IMPORTANT:\n";
		$text .= "- Use tools when you need real-time data (e.g., server activities, database credentials)\n";
		$text .= "- Do NOT include all data in your initial response - use tools to fetch what's needed\n";
		$text .= "- You can call multiple tools in one response\n";
		$text .= "- Tool results will be provided in your next context\n";
		$text .= "- Always provide a natural language response along with tool calls\n";

		return $text;
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
