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

namespace App\Controllers\Admin;

use App\App;
use App\Cache\Cache;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudException;
use App\Services\FeatherCloud\MythicTranslationsClient;

class MythicTranslationsController
{
    #[OA\Get(path: '/api/admin/cloud/translations/projects', summary: 'List Mythic translation projects', tags: ['Admin - FeatherCloud Translations'])]
    public function listProjects(Request $request): Response
    {
        return $this->proxy(static fn (MythicTranslationsClient $client): array => $client->listProjects(), 'Translation projects retrieved');
    }

    #[OA\Get(path: '/api/admin/cloud/translations/projects/{slug}', summary: 'Get Mythic translation project', tags: ['Admin - FeatherCloud Translations'])]
    public function getProject(Request $request, string $slug): Response
    {
        return $this->proxy(
            static fn (MythicTranslationsClient $client): array => $client->getProject($slug),
            'Translation project retrieved'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/translations/projects/{slug}/locales', summary: 'List project locales', tags: ['Admin - FeatherCloud Translations'])]
    public function listLocales(Request $request, string $slug): Response
    {
        return $this->proxy(
            static fn (MythicTranslationsClient $client): array => $client->listLocales($slug),
            'Translation locales retrieved'
        );
    }

    #[OA\Get(path: '/api/admin/cloud/translations/projects/{slug}/locales/{locale}', summary: 'Preview locale JSON', tags: ['Admin - FeatherCloud Translations'])]
    public function getLocale(Request $request, string $slug, string $locale): Response
    {
        if (!$this->isValidLocale($locale)) {
            return ApiResponse::error('Invalid locale code', 'INVALID_LOCALE', 400);
        }

        return $this->proxy(
            static fn (MythicTranslationsClient $client): array => $client->getLocale($slug, $locale),
            'Translation locale retrieved'
        );
    }

    #[OA\Get(
        path: '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/download',
        summary: 'Download locale JSON file stream',
        tags: ['Admin - FeatherCloud Translations']
    )]
    public function downloadLocale(Request $request, string $slug, string $locale): Response
    {
        if (!$this->isValidLocale($locale)) {
            return ApiResponse::error('Invalid locale code', 'INVALID_LOCALE', 400);
        }

        try {
            $client = new MythicTranslationsClient();
            $content = $client->downloadLocale($slug, $locale);
            $response = new Response($content, 200);
            $response->headers->set('Content-Type', 'application/json');
            $response->headers->set('Content-Disposition', 'attachment; filename="' . $locale . '.json"');

            return $response;
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to download locale: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/cloud/translations/projects/{slug}/locales/{locale}/install',
        summary: 'Download Mythic locale and install into panel translations',
        tags: ['Admin - FeatherCloud Translations']
    )]
    public function installLocale(Request $request, string $slug, string $locale): Response
    {
        if (!$this->isValidLocale($locale)) {
            return ApiResponse::error('Invalid locale code', 'INVALID_LOCALE', 400);
        }

        try {
            $client = new MythicTranslationsClient();
            $content = $client->downloadLocale($slug, $locale);
            $decoded = json_decode($content, true);
            if (!is_array($decoded)) {
                // Envelope fallback: some responses wrap under data.json
                $envelope = json_decode($content, true);
                if (is_array($envelope) && is_array($envelope['data']['json'] ?? null)) {
                    $decoded = $envelope['data']['json'];
                } else {
                    return ApiResponse::error('Downloaded locale is not valid JSON object', 'INVALID_JSON', 422);
                }
            }

            // If download returned envelope with data.json, unwrap it.
            if (isset($decoded['data']['json']) && is_array($decoded['data']['json'])) {
                $decoded = $decoded['data']['json'];
            }

            if (!is_array($decoded) || $decoded === []) {
                return ApiResponse::error('Translation JSON is empty', 'EMPTY_TRANSLATIONS', 422);
            }

            $lang = strtolower(str_replace('-', '_', $locale));
            // Normalize en_US style for panel storage: prefer underscore; also accept hyphen files.
            if (!preg_match('/^[a-z]{2}([_-][a-z0-9]+)?$/i', $lang)) {
                return ApiResponse::error('Invalid locale code after normalize', 'INVALID_LOCALE', 400);
            }
            $fileCode = str_replace('_', '-', $lang);
            // Keep common patterns: en, de, pt-BR → pt-br for panel filenames historically lowercased.
            $fileCode = strtolower($fileCode);

            if (!defined('APP_PUBLIC')) {
                return ApiResponse::error('APP_PUBLIC is not defined', 'INTERNAL_ERROR', 500);
            }

            $translationsDir = APP_PUBLIC . '/translations';
            if (!is_dir($translationsDir) && !mkdir($translationsDir, 0755, true) && !is_dir($translationsDir)) {
                return ApiResponse::error('Failed to create translations directory', 'DIRECTORY_CREATE_ERROR', 500);
            }
            if (!is_writable($translationsDir)) {
                return ApiResponse::error('Translations directory is not writable', 'DIRECTORY_NOT_WRITABLE', 500);
            }

            $path = $translationsDir . '/' . $fileCode . '.json';
            $jsonContent = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($jsonContent === false) {
                return ApiResponse::error('Failed to encode translations', 'ENCODE_ERROR', 500);
            }

            $written = @file_put_contents($path, $jsonContent, LOCK_EX);
            if ($written === false) {
                return ApiResponse::error('Failed to save translation file', 'SAVE_ERROR', 500);
            }

            Cache::forget('translations:' . $fileCode);

            return ApiResponse::success([
                'installed' => true,
                'lang' => $fileCode,
                'project' => $slug,
                'size' => $written,
                'path' => $fileCode . '.json',
            ], 'Translation locale installed successfully', 200);
        } catch (FeatherCloudException $e) {
            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $e->getHttpStatusCode());
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Mythic translation install failed: ' . $e->getMessage());

            return ApiResponse::error('Failed to install locale: ' . $e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    #[OA\Get(path: '/api/admin/cloud/translations/settings', summary: 'Get Mythic translations client settings', tags: ['Admin - FeatherCloud Translations'])]
    public function getSettings(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        $project = trim((string) ($config->getSetting(ConfigInterface::FEATHERCLOUD_TRANSLATE_PROJECT, '') ?? ''));

        return ApiResponse::success([
            'base_url' => MythicTranslationsClient::resolveBaseUrl(),
            'project' => $project !== '' ? $project : MythicTranslationsClient::DEFAULT_PROJECT,
            'defaults' => [
                'base_url_prod' => MythicTranslationsClient::DEFAULT_PROD_BASE_URL,
                'base_url_dev' => MythicTranslationsClient::DEFAULT_DEV_BASE_URL,
                'project' => MythicTranslationsClient::DEFAULT_PROJECT,
            ],
        ], 'Mythic translations settings fetched', 200);
    }

    /**
     * @param callable(MythicTranslationsClient): array $callback
     */
    private function proxy(callable $callback, string $successMessage): Response
    {
        try {
            $data = $callback(new MythicTranslationsClient());

            return ApiResponse::success($data, $successMessage, 200);
        } catch (FeatherCloudException $e) {
            $status = $e->getHttpStatusCode();
            if ($status === 401) {
                $status = 503;
            }

            return ApiResponse::error($e->getMessage(), $e->getErrorCode(), $status);
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), 'INTERNAL_ERROR', 500);
        }
    }

    private function isValidLocale(string $locale): bool
    {
        return (bool) preg_match('/^[a-z]{2}([_-][A-Za-z0-9]+)?$/', $locale);
    }
}
