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
use GuzzleHttp\Exception\GuzzleException;

class OllamaProvider implements ProviderInterface
{
    private $app;
    private $baseUrl;
    private $model;
    private $temperature;
    private $maxTokens;

    public function __construct(string $baseUrl, string $model, float $temperature = 0.7, int $maxTokens = 2048)
    {
        $this->app = App::getInstance(true);
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->model = trim($model);
        $this->temperature = $temperature;
        $this->maxTokens = $maxTokens;
    }

    /**
     * Process a user message and generate a response using Ollama API.
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
            $url = "{$this->baseUrl}/api/chat";

            // Build conversation messages
            $messages = [];

            // Add system prompt if provided
            if (!empty($systemPrompt)) {
                $messages[] = [
                    'role' => 'system',
                    'content' => $systemPrompt,
                ];
            }

            // Add history messages (only last 10 to avoid token limits)
            $recentHistory = array_slice($history, -10);
            foreach ($recentHistory as $msg) {
                $role = $msg['role'] === 'user' ? 'user' : 'assistant';
                $messages[] = [
                    'role' => $role,
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
                'stream' => false,
                'options' => [
                    'temperature' => $this->temperature,
                    'num_predict' => $this->maxTokens,
                ],
            ];

            $client = new Client([
                'timeout' => 60, // Ollama can be slower, especially for large models
                'verify' => false, // Ollama typically runs locally without SSL
            ]);

            $response = $client->post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
            ]);

            $httpCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            if ($httpCode !== 200) {
                $errorDetails = '';
                $errorData = json_decode($responseBody, true);
                if (isset($errorData['error'])) {
                    $errorDetails = ': ' . (is_string($errorData['error']) ? $errorData['error'] : json_encode($errorData['error']));
                }

                $this->app->getLogger()->error("Ollama API HTTP error: {$httpCode} - Model: {$this->model} - URL: {$url} - Response: {$responseBody}");

                $errorMessage = "Error from Ollama API (HTTP {$httpCode})";
                if ($httpCode === 404) {
                    $errorMessage .= ". Model '{$this->model}' not found. Please ensure the model is pulled: ollama pull {$this->model}";
                } elseif ($httpCode === 401 || $httpCode === 403) {
                    $errorMessage .= '. Unauthorized access. Please check your Ollama configuration.';
                } else {
                    $errorMessage .= $errorDetails;
                }

                return [
                    'response' => $errorMessage,
                    'model' => 'Ollama (Error)',
                ];
            }

            $data = json_decode($responseBody, true);
            if (!isset($data['message']['content'])) {
                $this->app->getLogger()->error("Ollama API unexpected response: {$responseBody}");

                return [
                    'response' => 'Unexpected response from Ollama. Please try again.',
                    'model' => 'Ollama (Error)',
                ];
            }

            $responseText = $data['message']['content'];

            return [
                'response' => $responseText,
                'model' => "Ollama {$this->model}",
            ];
        } catch (GuzzleException $e) {
            $this->app->getLogger()->error('Ollama API exception: ' . $e->getMessage());

            // Check if it's a connection error
            if (strpos($e->getMessage(), 'Connection refused') !== false || strpos($e->getMessage(), 'Failed to connect') !== false) {
                return [
                    'response' => "Cannot connect to Ollama server at {$this->baseUrl}. Please ensure Ollama is running and the URL is correct.",
                    'model' => 'Ollama (Error)',
                ];
            }

            return [
                'response' => "Error connecting to Ollama: {$e->getMessage()}",
                'model' => 'Ollama (Error)',
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('Ollama API exception: ' . $e->getMessage());

            return [
                'response' => 'Error: ' . $e->getMessage(),
                'model' => 'Ollama (Error)',
            ];
        }
    }
}
