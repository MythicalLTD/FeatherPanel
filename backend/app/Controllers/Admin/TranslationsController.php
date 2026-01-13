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

namespace App\Controllers\Admin;

use App\App;
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'TranslationFile',
    type: 'object',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: 'en'),
        new OA\Property(property: 'name', type: 'string', example: 'English'),
        new OA\Property(property: 'file', type: 'string', example: 'en.json'),
        new OA\Property(property: 'size', type: 'integer', example: 191515),
        new OA\Property(property: 'modified', type: 'string', example: '2024-01-10T19:26:00Z'),
    ]
)]
class TranslationsController
{
    public function list(Request $request): Response
    {
        $translationsDir = APP_PUBLIC . '/translations';
        $files = [];
        $enabledLanguages = $this->getEnabledLanguages();
        $languageMapping = $this->getLanguageMapping();

        if (is_dir($translationsDir)) {
            $dirFiles = scandir($translationsDir);
            foreach ($dirFiles as $file) {
                // Skip mapping.json file
                if ($file === 'mapping.json') {
                    continue;
                }

                if (preg_match('/^([a-z]{2}(?:-[A-Z]{2})?)\.json$/', $file, $matches)) {
                    $code = $matches[1];
                    $filePath = $translationsDir . '/' . $file;
                    // null means all enabled, otherwise check if in array
                    $isEnabled = $enabledLanguages === null || in_array($code, $enabledLanguages);

                    // Get language info from mapping, or use fallback
                    $langInfo = $languageMapping[$code] ?? [
                        'name' => ucfirst($code),
                        'nativeName' => ucfirst($code),
                    ];

                    $files[] = [
                        'code' => $code,
                        'name' => $langInfo['name'] ?? ucfirst($code),
                        'file' => $file,
                        'size' => file_exists($filePath) ? filesize($filePath) : 0,
                        'modified' => file_exists($filePath) ? date('c', filemtime($filePath)) : null,
                        'enabled' => $isEnabled,
                    ];
                }
            }
        }

        return ApiResponse::success($files, 'Translation files retrieved successfully', 200);
    }

    /**
     * Get translation file content.
     */
    #[OA\Get(
        path: '/api/admin/translations/{lang}',
        summary: 'Get translation file',
        description: 'Get the content of a specific translation file',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'en')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Translation file retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Translations')
            ),
            new OA\Response(response: 404, description: 'Translation file not found'),
        ]
    )]
    public function get(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $translationsPath = APP_PUBLIC . '/translations/' . $lang . '.json';

        if (!file_exists($translationsPath)) {
            return ApiResponse::error('Translation file not found', 'FILE_NOT_FOUND', 404);
        }

        $content = file_get_contents($translationsPath);
        if ($content === false) {
            return ApiResponse::error('Failed to read translation file', 'FILE_READ_ERROR', 500);
        }

        $translations = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in translation file', 'JSON_ERROR', 500);
        }

        return ApiResponse::success($translations, 'Translation file retrieved successfully', 200);
    }

    /**
     * Update translation file.
     */
    #[OA\Put(
        path: '/api/admin/translations/{lang}',
        summary: 'Update translation file',
        description: 'Update the content of a translation file',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'en')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'object',
                description: 'Translation key-value pairs'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Translation file updated successfully'),
            new OA\Response(response: 400, description: 'Invalid request'),
            new OA\Response(response: 500, description: 'Failed to save translation file'),
        ]
    )]
    public function update(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $content = $request->getContent();
        if (empty($content)) {
            return ApiResponse::error('Request body is empty', 'EMPTY_BODY', 400);
        }

        $translations = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body: ' . json_last_error_msg(), 'INVALID_JSON', 400);
        }

        if (!is_array($translations)) {
            return ApiResponse::error('Translations must be an object', 'INVALID_FORMAT', 400);
        }

        $translationsDir = APP_PUBLIC . '/translations';
        if (!is_dir($translationsDir)) {
            if (!mkdir($translationsDir, 0755, true)) {
                return ApiResponse::error('Failed to create translations directory', 'DIRECTORY_CREATE_ERROR', 500);
            }
        }

        // Check if directory is writable
        if (!is_writable($translationsDir)) {
            return ApiResponse::error('Translations directory is not writable', 'DIRECTORY_NOT_WRITABLE', 500);
        }

        $translationsPath = $translationsDir . '/' . $lang . '.json';

        // Encode with pretty print for easier editing
        $jsonContent = json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($jsonContent === false) {
            return ApiResponse::error('Failed to encode translations: ' . json_last_error_msg(), 'ENCODE_ERROR', 500);
        }

        // Use file_put_contents with LOCK_EX for atomic writes
        $result = @file_put_contents($translationsPath, $jsonContent, LOCK_EX);
        if ($result === false) {
            $error = error_get_last();
            $errorMsg = $error ? $error['message'] : 'Unknown error';

            return ApiResponse::error('Failed to save translation file: ' . $errorMsg, 'SAVE_ERROR', 500);
        }

        // Clear cache for this language
        $cacheKey = 'translations:' . $lang;
        Cache::forget($cacheKey);

        return ApiResponse::success(['saved' => true, 'size' => $result], 'Translation file updated successfully', 200);
    }

    /**
     * Download translation file.
     */
    #[OA\Get(
        path: '/api/admin/translations/{lang}/download',
        summary: 'Download translation file',
        description: 'Download a translation file as JSON',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'en')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Translation file downloaded',
                content: new OA\JsonContent(ref: '#/components/schemas/Translations')
            ),
            new OA\Response(response: 404, description: 'Translation file not found'),
        ]
    )]
    public function download(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $translationsPath = APP_PUBLIC . '/translations/' . $lang . '.json';

        if (!file_exists($translationsPath)) {
            return ApiResponse::error('Translation file not found', 'FILE_NOT_FOUND', 404);
        }

        $content = file_get_contents($translationsPath);
        if ($content === false) {
            return ApiResponse::error('Failed to read translation file', 'FILE_READ_ERROR', 500);
        }

        $response = new Response($content, 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $lang . '.json"',
        ]);

        return $response;
    }

    /**
     * Create new translation file.
     */
    #[OA\Post(
        path: '/api/admin/translations/{lang}',
        summary: 'Create translation file',
        description: 'Create a new translation file. If no content is provided, copies English translations as a base.',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'de')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                type: 'object',
                description: 'Translation key-value pairs (optional, defaults to copying English translations)'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Translation file created successfully'),
            new OA\Response(response: 400, description: 'Invalid request'),
            new OA\Response(response: 409, description: 'Translation file already exists'),
        ]
    )]
    public function create(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $translationsDir = APP_PUBLIC . '/translations';
        if (!is_dir($translationsDir)) {
            if (!mkdir($translationsDir, 0755, true)) {
                return ApiResponse::error('Failed to create translations directory', 'DIRECTORY_CREATE_ERROR', 500);
            }
        }

        $translationsPath = $translationsDir . '/' . $lang . '.json';

        if (file_exists($translationsPath)) {
            return ApiResponse::error('Translation file already exists', 'FILE_EXISTS', 409);
        }

        // Get translations from request body or copy from English
        $translations = [];
        $content = $request->getContent();

        if (!empty($content)) {
            $translations = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }
            if (!is_array($translations)) {
                return ApiResponse::error('Translations must be an object', 'INVALID_FORMAT', 400);
            }
        } else {
            // Copy English translations as base
            $englishPath = $translationsDir . '/en.json';
            if (file_exists($englishPath)) {
                $englishContent = file_get_contents($englishPath);
                if ($englishContent !== false) {
                    $translations = json_decode($englishContent, true);
                    if (json_last_error() !== JSON_ERROR_NONE || !is_array($translations)) {
                        // If English file is invalid, start with empty object
                        $translations = [];
                    }
                }
            }
        }

        // Encode with pretty print
        $jsonContent = json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($jsonContent === false) {
            return ApiResponse::error('Failed to encode translations', 'ENCODE_ERROR', 500);
        }

        $result = @file_put_contents($translationsPath, $jsonContent, LOCK_EX);
        if ($result === false) {
            $error = error_get_last();
            $errorMsg = $error ? $error['message'] : 'Unknown error';

            return ApiResponse::error('Failed to create translation file: ' . $errorMsg, 'CREATE_ERROR', 500);
        }

        return ApiResponse::success(['created' => true], 'Translation file created successfully', 200);
    }

    /**
     * Upload translation file.
     */
    #[OA\Post(
        path: '/api/admin/translations/upload',
        summary: 'Upload translation file',
        description: 'Upload a JSON translation file. The language code will be extracted from the filename.',
        tags: ['Admin - Translations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Translation JSON file (e.g., de.json)'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Translation file uploaded successfully'),
            new OA\Response(response: 400, description: 'Invalid file or request'),
            new OA\Response(response: 500, description: 'Failed to save translation file'),
        ]
    )]
    public function upload(Request $request): Response
    {
        // Check if file was uploaded
        if (!$request->files->has('file')) {
            return ApiResponse::error('No file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('file');

        // Validate file
        if (!$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // Check file size (max 10MB for translation files)
        $maxFileSize = 10 * 1024 * 1024;
        if ($file->getSize() > $maxFileSize) {
            return ApiResponse::error('File size too large. Maximum size is 10MB', 'FILE_TOO_LARGE', 400);
        }

        // Validate file extension
        $originalName = $file->getClientOriginalName();
        if (!preg_match('/^([a-z]{2}(?:-[A-Z]{2})?)\.json$/i', $originalName, $matches)) {
            return ApiResponse::error('Invalid filename. Must be in format: {lang}.json (e.g., de.json)', 'INVALID_FILENAME', 400);
        }

        $lang = strtolower($matches[1]);

        // Read and validate JSON content
        $content = file_get_contents($file->getPathname());
        if ($content === false) {
            return ApiResponse::error('Failed to read uploaded file', 'FILE_READ_ERROR', 500);
        }

        $translations = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in file: ' . json_last_error_msg(), 'INVALID_JSON', 400);
        }

        if (!is_array($translations)) {
            return ApiResponse::error('Translations must be an object', 'INVALID_FORMAT', 400);
        }

        $translationsDir = APP_PUBLIC . '/translations';
        if (!is_dir($translationsDir)) {
            if (!mkdir($translationsDir, 0755, true)) {
                return ApiResponse::error('Failed to create translations directory', 'DIRECTORY_CREATE_ERROR', 500);
            }
        }

        // Check if directory is writable
        if (!is_writable($translationsDir)) {
            return ApiResponse::error('Translations directory is not writable', 'DIRECTORY_NOT_WRITABLE', 500);
        }

        $translationsPath = $translationsDir . '/' . $lang . '.json';

        // Encode with pretty print for easier editing
        $jsonContent = json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($jsonContent === false) {
            return ApiResponse::error('Failed to encode translations', 'ENCODE_ERROR', 500);
        }

        // Use file_put_contents with LOCK_EX for atomic writes
        $result = @file_put_contents($translationsPath, $jsonContent, LOCK_EX);
        if ($result === false) {
            $error = error_get_last();
            $errorMsg = $error ? $error['message'] : 'Unknown error';

            return ApiResponse::error('Failed to save translation file: ' . $errorMsg, 'SAVE_ERROR', 500);
        }

        // Clear cache for this language
        $cacheKey = 'translations:' . $lang;
        Cache::forget($cacheKey);

        return ApiResponse::success(['uploaded' => true, 'lang' => $lang, 'size' => $result], 'Translation file uploaded successfully', 200);
    }

    /**
     * Delete translation file.
     */
    #[OA\Delete(
        path: '/api/admin/translations/{lang}',
        summary: 'Delete translation file',
        description: 'Delete a translation file',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'de')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Translation file deleted successfully'),
            new OA\Response(response: 404, description: 'Translation file not found'),
        ]
    )]
    public function delete(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $translationsPath = APP_PUBLIC . '/translations/' . $lang . '.json';

        if (!file_exists($translationsPath)) {
            return ApiResponse::error('Translation file not found', 'FILE_NOT_FOUND', 404);
        }

        // Don't allow deleting English (fallback)
        if ($lang === 'en') {
            return ApiResponse::error('Cannot delete English translation file (required fallback)', 'CANNOT_DELETE_EN', 400);
        }

        if (!unlink($translationsPath)) {
            return ApiResponse::error('Failed to delete translation file', 'DELETE_ERROR', 500);
        }

        // Clear cache
        $cacheKey = 'translations:' . $lang;
        Cache::forget($cacheKey);

        return ApiResponse::success(['deleted' => true], 'Translation file deleted successfully', 200);
    }

    /**
     * Get enabled languages setting.
     */
    #[OA\Get(
        path: '/api/admin/translations/enabled',
        summary: 'Get enabled languages',
        description: 'Get the list of enabled language codes',
        tags: ['Admin - Translations'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Enabled languages retrieved successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'enabled', type: 'array', items: new OA\Items(type: 'string'), example: ['en', 'de', 'fr']),
                    ]
                )
            ),
        ]
    )]
    public function getEnabled(Request $request): Response
    {
        $enabledLanguages = $this->getEnabledLanguages();

        // Return empty array if null (meaning all enabled) for consistency
        return ApiResponse::success(['enabled' => $enabledLanguages ?? []], 'Enabled languages retrieved successfully', 200);
    }

    /**
     * Set enabled languages.
     */
    #[OA\Put(
        path: '/api/admin/translations/enabled',
        summary: 'Set enabled languages',
        description: 'Set which languages are enabled. Empty array means all languages are enabled.',
        tags: ['Admin - Translations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'enabled', type: 'array', items: new OA\Items(type: 'string'), example: ['en', 'de', 'fr']),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Enabled languages updated successfully'),
            new OA\Response(response: 400, description: 'Invalid request'),
        ]
    )]
    public function setEnabled(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (!isset($data['enabled']) || !is_array($data['enabled'])) {
            return ApiResponse::error('Missing or invalid "enabled" field', 'INVALID_FIELD', 400);
        }

        // Validate language codes
        $enabled = [];
        foreach ($data['enabled'] as $lang) {
            $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
            if (!empty($lang)) {
                $enabled[] = $lang;
            }
        }

        // Ensure English is always enabled
        if (!in_array('en', $enabled)) {
            $enabled[] = 'en';
        }

        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $enabledJson = json_encode($enabled);
            $config->setSetting('enabled_languages', $enabledJson);

            // Clear cache for all languages to force refresh
            $translationsDir = APP_PUBLIC . '/translations';
            if (is_dir($translationsDir)) {
                $files = scandir($translationsDir);
                foreach ($files as $file) {
                    if (preg_match('/^([a-z]{2}(?:-[A-Z]{2})?)\.json$/', $file, $matches)) {
                        $lang = $matches[1];
                        $cacheKey = 'translations:' . $lang;
                        Cache::forget($cacheKey);
                    }
                }
            }

            return ApiResponse::success(['enabled' => $enabled], 'Enabled languages updated successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update enabled languages: ' . $e->getMessage(), 'UPDATE_ERROR', 500);
        }
    }

    /**
     * Enable a specific language.
     */
    #[OA\Post(
        path: '/api/admin/translations/{lang}/enable',
        summary: 'Enable language',
        description: 'Enable a specific language',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'de')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Language enabled successfully'),
            new OA\Response(response: 400, description: 'Invalid language code'),
        ]
    )]
    public function enableLanguage(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        $enabledLanguages = $this->getEnabledLanguages() ?? [];
        if (!in_array($lang, $enabledLanguages)) {
            $enabledLanguages[] = $lang;
        }

        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $enabledJson = json_encode($enabledLanguages);
            $config->setSetting('enabled_languages', $enabledJson);

            // Clear cache for this language
            $cacheKey = 'translations:' . $lang;
            Cache::forget($cacheKey);

            return ApiResponse::success(['enabled' => true], 'Language enabled successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to enable language: ' . $e->getMessage(), 'ENABLE_ERROR', 500);
        }
    }

    /**
     * Disable a specific language (except English).
     */
    #[OA\Post(
        path: '/api/admin/translations/{lang}/disable',
        summary: 'Disable language',
        description: 'Disable a specific language. English cannot be disabled.',
        tags: ['Admin - Translations'],
        parameters: [
            new OA\Parameter(
                name: 'lang',
                in: 'path',
                description: 'Language code',
                required: true,
                schema: new OA\Schema(type: 'string', example: 'de')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Language disabled successfully'),
            new OA\Response(response: 400, description: 'Invalid language code or cannot disable English'),
        ]
    )]
    public function disableLanguage(Request $request, string $lang): Response
    {
        $lang = preg_replace('/[^a-zA-Z0-9_-]/', '', $lang);
        if (empty($lang)) {
            return ApiResponse::error('Invalid language code', 'INVALID_LANG', 400);
        }

        // Cannot disable English
        if ($lang === 'en') {
            return ApiResponse::error('Cannot disable English language (required fallback)', 'CANNOT_DISABLE_EN', 400);
        }

        $enabledLanguages = $this->getEnabledLanguages() ?? [];
        $key = array_search($lang, $enabledLanguages);
        if ($key !== false) {
            unset($enabledLanguages[$key]);
            $enabledLanguages = array_values($enabledLanguages); // Re-index array
        }

        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $enabledJson = json_encode($enabledLanguages);
            $config->setSetting('enabled_languages', $enabledJson);

            // Clear cache for this language
            $cacheKey = 'translations:' . $lang;
            Cache::forget($cacheKey);

            return ApiResponse::success(['enabled' => false], 'Language disabled successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to disable language: ' . $e->getMessage(), 'DISABLE_ERROR', 500);
        }
    }

    /**
     * List all available translation files.
     */
    #[OA\Get(
        path: '/api/admin/translations',
        summary: 'List translation files',
        description: 'Get a list of all available translation files',
        tags: ['Admin - Translations'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Translation files retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/TranslationFile')
                )
            ),
        ]
    )]
    /**
     * Get enabled languages from settings
     * Returns null if not set (meaning all languages are enabled)
     * Returns array of language codes if set.
     */
    private function getEnabledLanguages(): ?array
    {
        try {
            $app = App::getInstance(true);
            $config = $app->getConfig();
            $enabledLangsJson = $config->getSetting('enabled_languages', null);

            if ($enabledLangsJson === null) {
                return null; // null means all languages enabled
            }

            $enabledLangs = json_decode($enabledLangsJson, true);
            if (!is_array($enabledLangs)) {
                return null; // Invalid JSON means all languages enabled
            }

            return $enabledLangs;
        } catch (\Exception $e) {
            return null; // Error means all languages enabled
        }
    }

    /**
     * Load language mapping from mapping.json file.
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
}
