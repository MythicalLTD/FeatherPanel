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

namespace App\Services\Chatbot\Providers;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use GuzzleHttp\Exception\GuzzleException;

class OpenAIProvider implements ProviderInterface
{
    private $app;
    private $apiKey;
    private $model;
    private $temperature;
    private $maxTokens;
    private $baseUrl;

    public function __construct(string $apiKey, string $model, float $temperature = 0.7, int $maxTokens = 2048)
    {
        $this->app = App::getInstance(true);
        $this->apiKey = $apiKey;
        $this->model = $model;
        $this->temperature = $temperature;
        $this->maxTokens = $maxTokens;
        $config = $this->app->getConfig();
        $this->baseUrl = rtrim(
            $config->getSetting(ConfigInterface::CHATBOT_OPENAI_BASE_URL, 'https://api.openai.com'),
            '/'
        );
    }

    /**
     * Process a user message and generate a response using OpenAI API.
     *
     * @param string $message User's message
     * @param array $history Chat history
     * @param string $systemPrompt Optional system prompt
     *
     * @return array Response with 'response' and 'model' keys
     */
    public function processMessage(string $message, array $history, string $systemPrompt = ''): array
    {
        try {
            $url = $this->baseUrl . '/v1/chat/completions';

            // Build messages array
            $messages = [];

            // Add system prompt if provided
            if (!empty($systemPrompt)) {
                $messages[] = [
                    'role' => 'system',
                    'content' => $systemPrompt,
                ];
            }

            // Add history messages
            $recentHistory = array_slice($history, -10);
            foreach ($recentHistory as $msg) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                ];
            }

            // Add current message
            $messages[] = [
                'role' => 'user',
                'content' => $message,
            ];

            $payload = [
                'model' => $this->model,
                'messages' => $messages,
                'temperature' => $this->temperature,
                'max_tokens' => $this->maxTokens,
            ];

            $client = new Client([
                'timeout' => 30,
                'verify' => true,
            ]);

            $response = $client->post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiKey,
                ],
                'json' => $payload,
            ]);

            $httpCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            if ($httpCode !== 200) {
                $errorDetails = '';
                $errorData = json_decode($responseBody, true);
                if (isset($errorData['error']['message'])) {
                    $errorDetails = ': ' . $errorData['error']['message'];
                }

                $this->app->getLogger()->error("OpenAI API HTTP error: {$httpCode} - Response: {$responseBody}");

                return [
                    'response' => "Error from OpenAI API (HTTP {$httpCode}){$errorDetails}",
                    'model' => 'OpenAI (Error)',
                ];
            }

            $data = json_decode($responseBody, true);
            if (!isset($data['choices'][0]['message']['content'])) {
                $this->app->getLogger()->error("OpenAI API unexpected response: {$responseBody}");

                return [
                    'response' => 'Unexpected response from OpenAI. Please try again.',
                    'model' => 'OpenAI (Error)',
                ];
            }

            $responseText = $data['choices'][0]['message']['content'];

            return [
                'response' => $responseText,
                'model' => "OpenAI {$this->model}",
            ];
        } catch (GuzzleException $e) {
            $this->app->getLogger()->error('OpenAI API exception: ' . $e->getMessage());

            return [
                'response' => "Error connecting to OpenAI: {$e->getMessage()}",
                'model' => 'OpenAI (Error)',
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('OpenAI API exception: ' . $e->getMessage());

            return [
                'response' => 'Error: ' . $e->getMessage(),
                'model' => 'OpenAI (Error)',
            ];
        }
    }
}
