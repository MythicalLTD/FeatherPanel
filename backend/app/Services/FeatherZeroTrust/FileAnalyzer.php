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

namespace App\Services\FeatherZeroTrust;

/**
 * File Analyzer for FeatherZeroTrust scanning system.
 *
 * Analyzes files for suspicious patterns and content using configurable patterns.
 */
class FileAnalyzer
{
    private Configuration $config;

    /**
     * Create a new FileAnalyzer instance.
     */
    public function __construct(?Configuration $config = null)
    {
        $this->config = $config ?? new Configuration();
    }

    /**
     * Check if a file is suspicious based on its name and extension.
     *
     * @param string $fileName File name
     * @param int $fileSize File size in bytes
     *
     * @return array{isSuspicious: bool, reason: string, detectionType: string}
     */
    public function analyzeFileName(string $fileName, int $fileSize): array
    {
        $config = $this->config->getAll();
        $fileNameLower = strtolower($fileName);
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        // Check for suspicious extensions
        $suspiciousExts = array_map('strtolower', $config['suspicious_extensions']);
        if (in_array('.' . $extension, $suspiciousExts, true)) {
            return [
                'isSuspicious' => true,
                'reason' => "Suspicious file extension: {$extension}",
                'detectionType' => 'suspicious_extension',
            ];
        }

        // Check for suspicious file names
        $suspiciousNames = array_map('strtolower', $config['suspicious_names']);
        foreach ($suspiciousNames as $suspiciousName) {
            if (strpos($fileNameLower, strtolower($suspiciousName)) !== false) {
                return [
                    'isSuspicious' => true,
                    'reason' => "Suspicious file name pattern: {$suspiciousName}",
                    'detectionType' => 'suspicious_name',
                ];
            }
        }

        // Check for small JAR files (common abuse pattern)
        if ($extension === 'jar' && $fileSize > 0 && $fileSize < $config['max_jar_size']) {
            return [
                'isSuspicious' => true,
                'reason' => "Small JAR file detected ({$fileSize} bytes)",
                'detectionType' => 'small_jar',
            ];
        }

        return [
            'isSuspicious' => false,
            'reason' => '',
            'detectionType' => '',
        ];
    }

    /**
     * Analyze file content for suspicious patterns.
     *
     * @param string $content File content
     * @param string $fileName File name
     *
     * @return array{isSuspicious: bool, reason: string, detectionType: string}
     */
    public function analyzeFileContent(string $content, string $fileName): array
    {
        if (empty($content)) {
            return [
                'isSuspicious' => false,
                'reason' => '',
                'detectionType' => '',
            ];
        }

        $config = $this->config->getAll();
        $contentLower = strtolower($content);

        // Check for suspicious patterns
        foreach ($config['suspicious_patterns'] as $pattern) {
            // Convert simple string patterns to regex if needed
            $regexPattern = $this->convertPatternToRegex($pattern);
            if (preg_match($regexPattern, $content)) {
                $detectionType = $this->getDetectionTypeFromPattern($pattern);

                return [
                    'isSuspicious' => true,
                    'reason' => "Suspicious content pattern detected: {$pattern}",
                    'detectionType' => $detectionType,
                ];
            }
        }

        // Check for WhatsApp bot dependencies in package.json
        if (strpos($fileName, 'package.json') !== false) {
            $whatsappIndicators = $config['whatsapp_indicators'];
            foreach ($whatsappIndicators as $indicator) {
                if (preg_match('/"(' . preg_quote($indicator, '/') . ')"/i', $content)) {
                    return [
                        'isSuspicious' => true,
                        'reason' => 'WhatsApp bot dependencies detected: ' . $indicator,
                        'detectionType' => 'whatsapp_bot',
                    ];
                }
            }
        }

        // Check for suspicious content strings
        foreach ($config['suspicious_content'] as $suspiciousContent) {
            if (stripos($content, $suspiciousContent) !== false) {
                return [
                    'isSuspicious' => true,
                    'reason' => "Suspicious content detected: {$suspiciousContent}",
                    'detectionType' => 'suspicious_content',
                ];
            }
        }

        return [
            'isSuspicious' => false,
            'reason' => '',
            'detectionType' => '',
        ];
    }

    /**
     * Convert a pattern string to regex if needed.
     *
     * @param string $pattern Pattern string
     *
     * @return string Regex pattern
     */
    private function convertPatternToRegex(string $pattern): string
    {
        // If already a regex pattern (starts and ends with /), return as is
        if (preg_match('/^\/.*\/[imsxADSUXu]*$/', $pattern)) {
            return $pattern;
        }

        // Otherwise, escape and make case-insensitive
        return '/' . preg_quote($pattern, '/') . '/i';
    }

    /**
     * Get detection type from pattern.
     *
     * @param string $pattern Pattern that matched
     *
     * @return string Detection type
     */
    private function getDetectionTypeFromPattern(string $pattern): string
    {
        $patternLower = strtolower($pattern);

        if (strpos($patternLower, 'stratum') !== false || strpos($patternLower, 'pool') !== false || strpos($patternLower, 'mining') !== false) {
            return 'mining_pool';
        }

        if (strpos($patternLower, 'proxy') !== false || strpos($patternLower, 'socks') !== false) {
            return 'proxy_config';
        }

        if (strpos($patternLower, 'eval') !== false || strpos($patternLower, 'base64') !== false || strpos($patternLower, 'gzinflate') !== false) {
            return 'obfuscated_code';
        }

        if (strpos($patternLower, 'whatsapp') !== false) {
            return 'whatsapp_bot';
        }

        return 'suspicious_content';
    }
}
