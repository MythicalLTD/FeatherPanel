<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Hooks\MythicalSystems\CloudFlare;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CloudFlareTurnstile
{
	/**
	 * Validate a Cloudflare Turnstile response using Guzzle.
	 *
	 * @param string $response The user response token provided by the Turnstile widget
	 * @param string $ip The user's IP address
	 * @param string $secret_key Your Turnstile secret key
	 * @return bool True if validation is successful, false otherwise
	 */
	public static function validate(string $response, string $ip, string $secret_key): bool
	{
		$client = new Client([
			'timeout' => 5.0,
		]);

		$data = [
			'secret' => $secret_key,
			'response' => $response,
			'remoteip' => $ip,
		];

		try {
			$res = $client->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
				'form_params' => $data,
				'headers' => [
					'Accept' => 'application/json',
				],
			]);
			$body = $res->getBody()->getContents();
			$result = json_decode($body, true);
			if (isset($result['success']) && $result['success'] === true) {
				return true;
			}
		} catch (GuzzleException $e) {
			// Log error if desired: $e->getMessage()
			return false;
		} catch (\Exception $e) {
			// Catch any other exceptions
			return false;
		}
		return false;
	}
}
