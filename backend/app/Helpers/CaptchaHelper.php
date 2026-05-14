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

namespace App\Helpers;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareTurnstile;

class CaptchaHelper
{
    /**
     * Validate a captcha response based on the configured provider.
     *
     * @param string $token The user response token
     * @param string $ip The user's IP address
     *
     * @return bool True if validation is successful or captcha is disabled
     */
    public static function validate(string $token, string $ip): bool
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false') !== 'true') {
            return true;
        }

        $provider = $config->getSetting(ConfigInterface::CAPTCHA_PROVIDER, 'turnstile');

        switch ($provider) {
            case 'hcaptcha':
                return self::validateHCaptcha($token, $ip, $config->getSetting(ConfigInterface::HCAPTCHA_SECRET_KEY, ''));
            case 'recaptcha':
                $recaptchaVersion = strtolower(trim($config->getSetting(ConfigInterface::RECAPTCHA_VERSION, 'v2')));
                if ($recaptchaVersion !== 'v3') {
                    $recaptchaVersion = 'v2';
                }
                $minRaw = $config->getSetting(ConfigInterface::RECAPTCHA_V3_MIN_SCORE, '0.5');
                $parsedMin = filter_var($minRaw, FILTER_VALIDATE_FLOAT);
                $v3MinScore = $parsedMin !== false ? max(0.0, min(1.0, (float) $parsedMin)) : 0.5;
                $v3Action = trim($config->getSetting(ConfigInterface::RECAPTCHA_V3_ACTION, 'submit'));

                return self::validateReCaptcha(
                    $token,
                    $ip,
                    $config->getSetting(ConfigInterface::RECAPTCHA_SECRET_KEY, ''),
                    $recaptchaVersion,
                    $v3MinScore,
                    $v3Action,
                );
            case 'friendlycaptcha':
                return self::validateFriendlyCaptcha($token, $config->getSetting(ConfigInterface::FRIENDLY_CAPTCHA_SECRET_KEY, ''), $config->getSetting(ConfigInterface::FRIENDLY_CAPTCHA_SITE_KEY, ''));
            case 'reforge':
                return self::validateReForgeCaptcha(
                    $token,
                    $config->getSetting(ConfigInterface::REFORGE_CAPTCHA_SECRET_KEY, ''),
                    $config->getSetting(ConfigInterface::REFORGE_CAPTCHA_MIN_SCORE, '0.5'),
                );
            case 'turnstile':
            default:
                return CloudFlareTurnstile::validate($token, $ip, $config->getSetting(ConfigInterface::TURNSTILE_KEY_PRIV, ''));
        }
    }

    /**
     * Validate hCaptcha.
     */
    private static function validateHCaptcha(string $token, string $ip, string $secret): bool
    {
        if (empty($secret)) {
            return false;
        }

        $client = new Client(['timeout' => 5.0]);
        try {
            $response = $client->post('https://hcaptcha.com/siteverify', [
                'form_params' => [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ],
            ]);
            $data = json_decode($response->getBody()->getContents(), true);

            return $data['success'] ?? false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Validate Google reCAPTCHA (v2 checkbox or v3 score).
     */
    private static function validateReCaptcha(
        string $token,
        string $ip,
        string $secret,
        string $version,
        float $v3MinScore,
        string $v3ExpectedAction,
    ): bool {
        if (empty($secret)) {
            return false;
        }

        $client = new Client(['timeout' => 5.0]);
        try {
            $response = $client->post('https://www.google.com/recaptcha/api/siteverify', [
                'form_params' => [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ],
            ]);
            $data = json_decode($response->getBody()->getContents(), true);
            if (!is_array($data) || !($data['success'] ?? false)) {
                return false;
            }

            if ($version === 'v3') {
                if (!isset($data['score']) || !is_numeric($data['score'])) {
                    return false;
                }
                $score = (float) $data['score'];
                if ($score < $v3MinScore) {
                    return false;
                }
                if ($v3ExpectedAction !== '' && (($data['action'] ?? '') !== $v3ExpectedAction)) {
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Validate Friendly Captcha.
     */
    private static function validateFriendlyCaptcha(string $token, string $secret, string $siteKey): bool
    {
        if (empty($secret) || empty($siteKey)) {
            return false;
        }

        $client = new Client(['timeout' => 5.0]);
        try {
            $response = $client->post('https://api.friendlycaptcha.com/api/v1/siteverify', [
                'form_params' => [
                    'secret' => $secret,
                    'solution' => $token,
                    'sitekey' => $siteKey,
                ],
            ]);
            $data = json_decode($response->getBody()->getContents(), true);

            return $data['success'] ?? false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Validate reForge Captcha token via https://reforgecaptcha.cloud/api/verify.
     */
    private static function validateReForgeCaptcha(string $token, string $secret, string $minScoreRaw): bool
    {
        if (empty($secret) || trim($token) === '') {
            return false;
        }

        $parsedMin = filter_var($minScoreRaw, FILTER_VALIDATE_FLOAT);
        $minScore = $parsedMin !== false ? max(0.0, min(1.0, (float) $parsedMin)) : 0.5;

        $client = new Client(['timeout' => 5.0]);
        try {
            $response = $client->post('https://reforgecaptcha.cloud/api/verify', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'json' => [
                    'secret' => $secret,
                    'token' => $token,
                ],
            ]);
            $data = json_decode($response->getBody()->getContents(), true);
            if (!is_array($data) || !($data['success'] ?? false)) {
                return false;
            }
            if (isset($data['score']) && is_numeric($data['score'])) {
                $score = (float) $data['score'];
                if ($score < $minScore) {
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
