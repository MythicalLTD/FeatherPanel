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
use App\Services\Chatbot\Providers\BasicProvider;
use App\Services\Chatbot\Providers\OllamaProvider;
use App\Services\Chatbot\Providers\OpenAIProvider;
use App\Services\Chatbot\Providers\ProviderInterface;
use App\Services\Chatbot\Providers\OpenRouterProvider;
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
     * Supports multiple AI providers: basic, google_gemini, openrouter, openai
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
                $errorMessage = 'Google AI API key is not configured. Please configure it in admin settings or your user preferences.';
            } elseif ($provider === 'openrouter') {
                $errorMessage = 'OpenRouter API key is not configured. Please configure it in admin settings or your user preferences.';
            } elseif ($provider === 'openai') {
                $errorMessage = 'OpenAI API key is not configured. Please configure it in admin settings or your user preferences.';
            } elseif ($provider === 'ollama') {
                $errorMessage = 'Ollama base URL is not configured. Please configure it in admin settings.';
            }

            return [
                'response' => $errorMessage,
                'model' => 'FeatherPanel AI (Error)',
            ];
        }

        // Process message through provider
        return $providerInstance->processMessage($fullMessage, $history, $systemPrompt);
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

            case 'ollama':
                $baseUrl = $this->config->getSetting(ConfigInterface::CHATBOT_OLLAMA_BASE_URL, 'http://localhost:11434');
                if (empty($baseUrl)) {
                    return null;
                }
                $model = $this->config->getSetting(ConfigInterface::CHATBOT_OLLAMA_MODEL, 'llama3.2');

                return new OllamaProvider($baseUrl, $model, $temperature, $maxTokens);

            case 'basic':
            default:
                return new BasicProvider();
        }
    }
}
