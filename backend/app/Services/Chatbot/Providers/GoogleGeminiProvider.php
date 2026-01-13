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

class GoogleGeminiProvider implements ProviderInterface
{
    private $app;
    private $apiKey;
    private $model;
    private $temperature;
    private $maxTokens;

    public function __construct(string $apiKey, string $model, float $temperature = 0.7, int $maxTokens = 2048)
    {
        $this->app = App::getInstance(true);
        $this->apiKey = $apiKey;
        $this->model = trim($model);
        $this->temperature = $temperature;
        $this->maxTokens = $maxTokens;
    }

    /**
     * Process a user message and generate a response using Google Gemini API.
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
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent";

            // Build conversation history
            $contents = [];

            // Add history messages (only last 10 to avoid token limits)
            $recentHistory = array_slice($history, -10);
            foreach ($recentHistory as $msg) {
                $role = $msg['role'] === 'user' ? 'user' : 'model';
                $contents[] = [
                    'role' => $role,
                    'parts' => [['text' => $msg['content']]],
                ];
            }

            // Add current message (must have role 'user')
            $contents[] = [
                'role' => 'user',
                'parts' => [['text' => $message]],
            ];

            $payload = [
                'contents' => $contents,
                'generationConfig' => [
                    'temperature' => $this->temperature,
                    'topK' => 40,
                    'topP' => 0.95,
                    'maxOutputTokens' => $this->maxTokens,
                ],
            ];

            // Add system instruction if provided (Google Gemini uses systemInstruction field)
            if (!empty($systemPrompt)) {
                $payload['systemInstruction'] = [
                    'parts' => [['text' => $systemPrompt]],
                ];
            }

            $client = new Client([
                'timeout' => 30,
                'verify' => true,
            ]);

            $response = $client->post($url, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $this->apiKey,
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
                } elseif (isset($errorData['error'])) {
                    $errorDetails = ': ' . json_encode($errorData['error']);
                }

                $logUrl = str_replace($this->apiKey, '[MASKED]', $url);
                $this->app->getLogger()->error("Google Gemini API HTTP error: {$httpCode} - Model: {$this->model} - URL: {$logUrl} - Response: {$responseBody}");

                $errorMessage = "Error from Google AI API (HTTP {$httpCode})";
                if ($httpCode === 404) {
                    $errorMessage .= ". Model '{$this->model}' not found or invalid. Please check:\n";
                    $errorMessage .= "1. The model name is correct (e.g., 'gemini-2.5-flash', 'gemini-2.5-pro')\n";
                    $errorMessage .= "2. The API key has access to the Gemini API\n";
                    $errorMessage .= '3. The Gemini API is enabled in your Google Cloud project';
                    if ($errorDetails) {
                        $errorMessage .= "\n\nDetails: " . $errorDetails;
                    }
                } elseif ($httpCode === 401 || $httpCode === 403) {
                    $errorMessage .= '. Invalid or unauthorized API key. Please check your API key in settings.';
                    if ($errorDetails) {
                        $errorMessage .= "\n\nDetails: " . $errorDetails;
                    }
                } else {
                    $errorMessage .= $errorDetails;
                }

                return [
                    'response' => $errorMessage,
                    'model' => 'Google Gemini (Error)',
                ];
            }

            $data = json_decode($responseBody, true);
            if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                $this->app->getLogger()->error("Google Gemini API unexpected response: {$responseBody}");

                return [
                    'response' => 'Unexpected response from Google AI. Please try again.',
                    'model' => 'Google Gemini (Error)',
                ];
            }

            $responseText = $data['candidates'][0]['content']['parts'][0]['text'];

            return [
                'response' => $responseText,
                'model' => "Google Gemini {$this->model}",
            ];
        } catch (GuzzleException $e) {
            $this->app->getLogger()->error('Google Gemini API exception: ' . $e->getMessage());

            return [
                'response' => "Error connecting to Google AI: {$e->getMessage()}",
                'model' => 'Google Gemini (Error)',
            ];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('Google Gemini API exception: ' . $e->getMessage());

            return [
                'response' => 'Error: ' . $e->getMessage(),
                'model' => 'Google Gemini (Error)',
            ];
        }
    }
}
