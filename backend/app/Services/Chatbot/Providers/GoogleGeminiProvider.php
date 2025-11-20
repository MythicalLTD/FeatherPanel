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

namespace App\Services\Chatbot\Providers;

use App\App;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class GoogleGeminiProvider implements ProviderInterface
{
    private $app;
    private $apiKey;
    private $model;

    public function __construct(string $apiKey, string $model)
    {
        $this->app = App::getInstance(true);
        $this->apiKey = $apiKey;
        $this->model = trim($model);
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
                    'temperature' => 0.7,
                    'topK' => 40,
                    'topP' => 0.95,
                    'maxOutputTokens' => 2048,
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
