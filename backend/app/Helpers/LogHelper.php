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
use App\Config\ConfigInterface;

/**
 * LogHelper - Utility class for log file operations and uploads.
 */
class LogHelper
{
    /** MythicalSystems Paste API (mclo.gs-compatible). */
    public const PASTE_API_BASE = 'https://pastes.mythicalsystems.org';

    /** Web viewer host (paste.*, not pastes.*). */
    public const PASTE_VIEWER_BASE = 'https://paste.mythicalsystems.org';

    private const MAX_PASTE_BYTES = 10485760; // 10 MiB
    private const MAX_PASTE_LINES = 25000;

    /**
     * Get the full path to a log file by type.
     *
     * @param string $type Log type ('web', 'app', etc.)
     *
     * @return string Full path to the log file
     */
    public static function getLogFilePath(string $type): string
    {
        $logDir = dirname(__DIR__, 2) . '/storage/logs/';

        switch ($type) {
            case 'web':
                return $logDir . 'featherpanel-web.fplog';
            case 'app':
                return $logDir . 'App.fplog';
            case 'mail':
                return $logDir . 'mail.fplog';
            case 'runner':
                $configuredRunnerDir = trim((string) ($_ENV['LOG_DIR'] ?? ''));
                if ($configuredRunnerDir !== '') {
                    $configuredPath = rtrim($configuredRunnerDir, '/') . '/runner.fplog';
                    if (file_exists($configuredPath)) {
                        return $configuredPath;
                    }
                }

                // Docker runtime fallback used by async-runner image.
                $tmpRunnerPath = '/tmp/runner-logs/runner.fplog';
                if (file_exists($tmpRunnerPath)) {
                    return $tmpRunnerPath;
                }

                return $logDir . 'runner.fplog';
            default:
                return $logDir . 'featherpanel-web.fplog';
        }
    }

    /**
     * Ensure the log directory exists and the log file for the given type is
     * present on disk. Creates both with safe permissions if missing.
     * Returns the full path to the log file.
     *
     * @param string $type Log type ('web', 'app', 'mail', 'runner', …)
     *
     * @return string Full path to the (now-guaranteed) log file
     */
    public static function ensureLogFile(string $type): string
    {
        $path = self::getLogFilePath($type);
        $dir = dirname($path);

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        if (!file_exists($path)) {
            file_put_contents($path, '');
            chmod($path, 0664);
        }

        return $path;
    }

    /**
     * Read the last N lines from a log file.
     *
     * @param string $filePath Path to the log file
     * @param int $lines Number of lines to read from the end
     *
     * @return string Content of the last N lines
     */
    public static function readLastLines(string $filePath, int $lines): string
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return '';
        }

        $buffer = [];
        $lineCount = 0;

        // Read the file line by line and keep only the last $lines
        while (($line = fgets($handle)) !== false) {
            $buffer[] = $line;
            ++$lineCount;

            // Keep only the last $lines in memory
            if ($lineCount > $lines) {
                array_shift($buffer);
                --$lineCount;
            }
        }

        fclose($handle);

        return implode('', $buffer);
    }

    /**
     * Upload log content to MythicalSystems Paste API.
     * Prefers linked Mythic Cloud (team paste quota) when available, otherwise
     * posts anonymously to pastes.mythicalsystems.org (mclo.gs-compatible).
     *
     * @param string $content Log content to upload
     * @param string $source Source name (domain / software)
     *
     * @return array Upload result with 'success', 'url', 'raw', 'id' or 'error'
     */
    public static function uploadPaste(string $content, string $source = 'featherpanel'): array
    {
        $content = self::truncateForPaste($content);

        $mythic = self::uploadToMythicPaste($content, $source);
        if ($mythic !== null) {
            return $mythic;
        }

        return self::uploadToPublicPasteApi($content, $source);
    }

    /**
     * @deprecated Use uploadPaste()
     *
     * @return array{success: bool, id?: string, url?: string, raw?: string, error?: string}
     */
    public static function uploadToMcloGs(string $content): array
    {
        return self::uploadPaste($content);
    }

    /**
     * Get log type from filename.
     *
     * @param string $filename The log filename
     *
     * @return string Log type ('web', 'app', or 'unknown')
     */
    public static function getLogTypeFromFileName(string $filename): string
    {
        if (strpos($filename, 'web') !== false) {
            return 'web';
        }
        if (strpos($filename, 'App') !== false) {
            return 'app';
        }
        if (strpos($filename, 'mail') !== false) {
            return 'mail';
        }
        if (strpos($filename, 'runner') !== false) {
            return 'runner';
        }

        return 'unknown';
    }

    /**
     * Enforce Paste API limits client-side (10 MiB / 25,000 lines).
     */
    private static function truncateForPaste(string $content): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $content);
        if ($lines === false) {
            $lines = [$content];
        }

        if (count($lines) > self::MAX_PASTE_LINES) {
            $lines = array_slice($lines, -self::MAX_PASTE_LINES);
            $content = implode("\n", $lines);
        }

        if (strlen($content) > self::MAX_PASTE_BYTES) {
            $content = substr($content, -self::MAX_PASTE_BYTES);
        }

        return $content;
    }

    /**
     * @return array{success: bool, id?: string, url?: string, raw?: string, token?: string, error?: string}|null
     */
    private static function uploadToMythicPaste(string $content, string $source): ?array
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if (($config->getSetting(ConfigInterface::FEATHERCLOUD_PASTES_ENABLED, 'true') ?? 'true') !== 'true') {
                return null;
            }

            $client = new \App\Services\FeatherCloud\FeatherCloudClient();
            if (!$client->isConfigured()) {
                return null;
            }

            $data = $client->createPaste([
                'content' => $content,
                'source' => $source,
            ]);

            return self::normalizePasteResponse($data, $client->getBaseUrl());
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Mythic Cloud paste upload failed, using public Paste API: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Anonymous / API-key paste upload via pastes.mythicalsystems.org.
     *
     * @return array{success: bool, id?: string, url?: string, raw?: string, token?: string, error?: string}
     */
    private static function uploadToPublicPasteApi(string $content, string $source): array
    {
        try {
            $payload = json_encode([
                'content' => $content,
                'source' => $source,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if ($payload === false) {
                return [
                    'success' => false,
                    'error' => 'Failed to encode paste payload',
                ];
            }

            $ch = curl_init(self::PASTE_API_BASE . '/log');
            if ($ch === false) {
                return [
                    'success' => false,
                    'error' => 'Failed to initialize curl',
                ];
            }

            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_FOLLOWLOCATION => true,
            ]);

            $response = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                return [
                    'success' => false,
                    'error' => 'Curl error: ' . $curlError,
                ];
            }

            $data = json_decode($response, true);
            if (!is_array($data)) {
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response (HTTP ' . $httpCode . ')',
                ];
            }

            if ($httpCode >= 400 || ($data['success'] ?? false) !== true) {
                return [
                    'success' => false,
                    'error' => (string) ($data['error'] ?? $data['message'] ?? ('Paste API error (HTTP ' . $httpCode . ')')),
                ];
            }

            return self::normalizePasteResponse($data, self::PASTE_API_BASE);
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{success: bool, id?: string, url?: string, raw?: string, token?: string, error?: string}
     */
    private static function normalizePasteResponse(array $data, string $apiBase): array
    {
        $id = (string) ($data['id'] ?? $data['key'] ?? '');
        if ($id === '') {
            return [
                'success' => false,
                'error' => 'Paste response missing id',
            ];
        }

        $apiBase = rtrim($apiBase, '/');
        $result = [
            'success' => true,
            'id' => $id,
            'url' => (string) ($data['url'] ?? (self::PASTE_VIEWER_BASE . '/p/' . $id)),
            'raw' => (string) ($data['raw'] ?? ($apiBase . '/raw/' . $id)),
        ];

        if (!empty($data['token']) && is_string($data['token'])) {
            $result['token'] = $data['token'];
        }

        return $result;
    }
}
