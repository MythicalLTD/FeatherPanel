<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\System;

use App\App;
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Translations',
    type: 'object',
    description: 'Translation key-value pairs'
)]
class TranslationsController
{
    #[OA\Get(
        path: '/api/system/translations/{lang}',
        summary: 'Get translations',
        description: 'Retrieve translation strings for a specific language. Falls back to English if language file not found.',
        tags: ['System'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code (e.g., en, de, fr)',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'en')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Translations retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Translations')
            ),
            new OA\Response(response: 404, description: 'Translation file not found'),
        ]
    )]
    public function getTranslations(Request $request, string $lang): Response
    {
        // Sanitize language code to prevent directory traversal
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            $lang = 'en';
        }

        // Use APP_PUBLIC constant for correct path
        $translationsPath = APP_PUBLIC . '/translations/' . $lang . '.json';

        // Check cache first (only if APP_DEBUG is false)
        $cacheKey = 'translations:' . $lang;
        $useCache = !defined('APP_DEBUG') || APP_DEBUG !== true;

        if ($useCache) {
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                // Set cache headers for production
                $response = ApiResponse::sendManualResponse($cached, 200);
                $response->headers->set('Cache-Control', 'public, max-age=3600');
                $response->headers->set('Expires', gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
                return $response;
            }
        }

        // Check if translation file exists
        if (!file_exists($translationsPath)) {
            // Fallback to English if requested language doesn't exist
            if ($lang !== 'en') {
                $translationsPath = APP_PUBLIC . '/translations/en.json';
            }

            // If English also doesn't exist, return empty object (direct JSON, not wrapped)
            if (!file_exists($translationsPath)) {
                $response = ApiResponse::sendManualResponse([], 200);
                if ($useCache) {
                    $response->headers->set('Cache-Control', 'public, max-age=3600');
                } else {
                    $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                }
                return $response;
            }
        }

        // Read and parse JSON file
        $content = file_get_contents($translationsPath);
        if ($content === false) {
            return ApiResponse::error('Failed to read translation file', 'FILE_READ_ERROR', 500);
        }

        $translations = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in translation file', 'JSON_ERROR', 500);
        }

        // Cache translations (only if APP_DEBUG is false)
        // Cache::put uses minutes, so 3600 seconds = 60 minutes
        if ($useCache) {
            Cache::put($cacheKey, $translations, 60); // Cache for 1 hour (60 minutes)
        }

        // Set cache headers based on APP_DEBUG
        $response = ApiResponse::sendManualResponse($translations, 200);
        if ($useCache) {
            $response->headers->set('Cache-Control', 'public, max-age=3600');
            $response->headers->set('Expires', gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
        } else {
            // No cache when in debug mode
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }

    #[OA\Get(
        path: '/api/system/translations/languages',
        summary: 'Get available languages',
        description: 'Retrieve list of available translation languages',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Available languages retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'code', type: 'string', example: 'en'),
                            new OA\Property(property: 'name', type: 'string', example: 'English'),
                            new OA\Property(property: 'nativeName', type: 'string', example: 'English'),
                        ]
                    )
                )
            ),
        ]
    )]
    /**
     * Get enabled languages from settings
     * Returns null if not set (meaning all languages are enabled)
     * Returns array of language codes if set
     */
    private function getEnabledLanguages(): ?array
    {
        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $enabledLangsJson = $config->getSetting('enabled_languages', null);

            if ($enabledLangsJson === null) {
                // If not set, return null to allow all languages (backward compatibility)
                return null;
            }

            $enabledLangs = json_decode($enabledLangsJson, true);
            if (!is_array($enabledLangs)) {
                return null; // Invalid JSON means all languages enabled
            }

            return $enabledLangs;
        } catch (\Exception $e) {
            // If error, return null to allow all languages
            return null;
        }
    }

    /**
     * Load language mapping from mapping.json file
     */
    private function getLanguageMapping(): array
    {
        static $mapping = null;
        
        if ($mapping !== null) {
            return $mapping;
        }

        $mappingPath = APP_PUBLIC . '/translations/mapping.json';
        $mapping = [];

        if (file_exists($mappingPath)) {
            $content = file_get_contents($mappingPath);
            if ($content !== false) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $mapping = $decoded;
                }
            }
        }

        // Fallback to English if mapping file doesn't exist or is invalid
        if (empty($mapping)) {
            $mapping = [
                'en' => ['name' => 'English', 'nativeName' => 'English'],
            ];
        }

        return $mapping;
    }

    public function getLanguages(Request $request): Response
    {
        $translationsDir = APP_PUBLIC . '/translations';
        $languages = [];
        $languageMapping = $this->getLanguageMapping();

        // Get enabled languages from settings
        $enabledLanguages = $this->getEnabledLanguages();

        // Scan translations directory for available language files
        if (is_dir($translationsDir)) {
            $files = scandir($translationsDir);
            foreach ($files as $file) {
                // Skip mapping.json file
                if ($file === 'mapping.json') {
                    continue;
                }

                if (preg_match('/^([a-z]{2}(?:-[A-Z]{2})?)\.json$/', $file, $matches)) {
                    $code = $matches[1];

                    // Filter by enabled languages if setting exists
                    if ($enabledLanguages !== null && !in_array($code, $enabledLanguages)) {
                        continue;
                    }

                    // Get language info from mapping, or use fallback
                    $langInfo = $languageMapping[$code] ?? [
                        'name' => ucfirst($code),
                        'nativeName' => ucfirst($code),
                    ];
                    
                    $languages[] = [
                        'code' => $code,
                        'name' => $langInfo['name'] ?? ucfirst($code),
                        'nativeName' => $langInfo['nativeName'] ?? ucfirst($code),
                    ];
                }
            }
        }

        // If no languages found, return default English (always enabled)
        if (empty($languages)) {
            $languages = [
                [
                    'code' => 'en',
                    'name' => 'English',
                    'nativeName' => 'English',
                ],
            ];
        }

        return ApiResponse::success($languages, 'Available languages retrieved successfully', 200);
    }
}
