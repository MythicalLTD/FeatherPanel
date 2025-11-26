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

class PerplexityProvider implements ProviderInterface
{
	private $app;
	private $apiKey;
	private $model;
	private $temperature;
	private $maxTokens;
	private $baseUrl;

	public function __construct(
		string $apiKey,
		string $model = 'sonar-pro',
		float $temperature = 0.7,
		int $maxTokens = 2048,
		string $baseUrl = 'https://api.perplexity.ai',
	) {
		$this->app = App::getInstance(true);
		$this->apiKey = $apiKey;
		$this->model = $model;
		$this->temperature = $temperature;
		$this->maxTokens = $maxTokens;
		$this->baseUrl = rtrim($baseUrl, '/');
	}

	/**
	 * Process a user message and generate a response using Perplexity API.
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
			$url = $this->baseUrl . '/chat/completions';

			// Build messages array (system + recent history + current message)
			$messages = [];

			if (!empty($systemPrompt)) {
				$messages[] = [
					'role' => 'system',
					'content' => $systemPrompt,
				];
			}

			$recentHistory = array_slice($history, -10);
			foreach ($recentHistory as $msg) {
				$messages[] = [
					'role' => $msg['role'],
					'content' => $msg['content'],
				];
			}

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

				$this->app->getLogger()->error("Perplexity API HTTP error: {$httpCode} - Response: {$responseBody}");

				return [
					'response' => "Error from Perplexity API (HTTP {$httpCode}){$errorDetails}",
					'model' => 'Perplexity (Error)',
				];
			}

			$data = json_decode($responseBody, true);
			if (!isset($data['choices'][0]['message']['content'])) {
				$this->app->getLogger()->error("Perplexity API unexpected response: {$responseBody}");

				return [
					'response' => 'Unexpected response from Perplexity. Please try again.',
					'model' => 'Perplexity (Error)',
				];
			}

			$responseText = $data['choices'][0]['message']['content'];

			return [
				'response' => $responseText,
				'model' => "Perplexity {$this->model}",
			];
		} catch (GuzzleException $e) {
			$this->app->getLogger()->error('Perplexity API exception: ' . $e->getMessage());

			return [
				'response' => "Error connecting to Perplexity: {$e->getMessage()}",
				'model' => 'Perplexity (Error)',
			];
		} catch (\Exception $e) {
			$this->app->getLogger()->error('Perplexity API exception: ' . $e->getMessage());

			return [
				'response' => 'Error: ' . $e->getMessage(),
				'model' => 'Perplexity (Error)',
			];
		}
	}
}
