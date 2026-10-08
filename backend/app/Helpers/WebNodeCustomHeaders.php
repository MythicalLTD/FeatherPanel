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

/**
 * Stores web node remote custom headers as JSON entries with optional encrypted secret values.
 *
 * Storage format:
 * [{"key":"X-Header","value":"plain","secret":false},{"key":"X-Api-Key","value":"<encrypted>","secret":true}]
 */
class WebNodeCustomHeaders
{
    /**
     * @return array<int, string>
     */
    public static function validateIncoming(mixed $raw, ?string $existingRaw = null): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }

        if (!is_string($raw)) {
            return ['remoteCustomHeaders must be a JSON string'];
        }

        $entries = self::decodeEntries(trim($raw));
        if ($entries === null) {
            return ['remoteCustomHeaders must be valid JSON'];
        }

        $existingSecretKeys = self::existingSecretKeys($existingRaw);

        $errors = [];
        $seen = [];
        foreach ($entries as $entry) {
            $key = trim((string) ($entry['key'] ?? ''));
            $value = (string) ($entry['value'] ?? '');
            $secret = filter_var($entry['secret'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $keepValue = filter_var($entry['keep_value'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($key === '' && $value !== '') {
                $errors[] = 'remoteCustomHeaders entries require a header name when a value is set';

                continue;
            }

            if ($key === '') {
                continue;
            }

            if (isset($seen[$key])) {
                $errors[] = 'remoteCustomHeaders header names must be unique';

                continue;
            }

            $seen[$key] = true;

            if ($secret && trim($value) === '' && !$keepValue && !isset($existingSecretKeys[$key])) {
                $errors[] = 'remoteCustomHeaders secret entries require a value when first created';
            }
        }

        return $errors;
    }

    public static function normalizeForStorage(?string $incomingRaw, ?string $existingRaw = null): ?string
    {
        if ($incomingRaw === null || trim($incomingRaw) === '') {
            return null;
        }

        $incoming = self::decodeEntries(trim($incomingRaw));
        if ($incoming === null) {
            return null;
        }

        $existing = self::decodeStoredEntries($existingRaw);
        $existingByKey = [];
        foreach ($existing as $entry) {
            $existingByKey[$entry['key']] = $entry;
        }

        $app = App::getInstance(true);
        $normalized = [];

        foreach ($incoming as $entry) {
            $key = trim((string) ($entry['key'] ?? ''));
            if ($key === '') {
                continue;
            }

            $secret = filter_var($entry['secret'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $keepValue = filter_var($entry['keep_value'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $value = (string) ($entry['value'] ?? '');

            if ($secret) {
                $blankValue = trim($value) === '';
                $existingEntry = $existingByKey[$key] ?? null;
                $canKeepExisting = $blankValue
                    && is_array($existingEntry)
                    && ($existingEntry['secret'] ?? false)
                    && ($keepValue || ($existingEntry['value'] ?? '') !== '');

                if ($canKeepExisting) {
                    $normalized[] = $existingEntry;

                    continue;
                }

                if ($blankValue) {
                    continue;
                }

                $normalized[] = [
                    'key' => $key,
                    'value' => $app->encryptValue($value),
                    'secret' => true,
                ];

                continue;
            }

            if (trim($value) === '') {
                continue;
            }

            $normalized[] = [
                'key' => $key,
                'value' => $value,
                'secret' => false,
            ];
        }

        return $normalized === [] ? null : json_encode($normalized, JSON_UNESCAPED_UNICODE);
    }

    /**
     * JSON for admin API — secret values are never returned.
     */
    public static function redactForAdmin(?string $raw): ?string
    {
        $entries = self::decodeStoredEntries($raw);
        if ($entries === []) {
            return null;
        }

        $redacted = [];
        foreach ($entries as $entry) {
            $item = [
                'key' => $entry['key'],
                'secret' => $entry['secret'],
            ];

            if (!$entry['secret']) {
                $item['value'] = $entry['value'];
            } else {
                $item['value'] = '';
                $item['keep_value'] = true;
            }

            $redacted[] = $item;
        }

        return json_encode($redacted, JSON_UNESCAPED_UNICODE);
    }

    /**
     * @return array<string, string>
     */
    public static function toConfigMap(?string $raw): array
    {
        $entries = self::decodeStoredEntries($raw);
        $headers = [];

        foreach ($entries as $entry) {
            if ($entry['key'] === '' || $entry['value'] === '') {
                continue;
            }
            $headers[$entry['key']] = $entry['value'];
        }

        return $headers;
    }

    /**
     * @return array<int, array{key: string, value: string, secret: bool}>|null
     */
    private static function decodeEntries(string $raw): ?array
    {
        if ($raw === '' || $raw === '{}') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        if ($decoded === []) {
            return [];
        }

        if (array_is_list($decoded)) {
            return self::normalizeEntryList($decoded, false);
        }

        return self::legacyObjectToEntries($decoded);
    }

    /**
     * @return array<int, array{key: string, value: string, secret: bool}>
     */
    private static function decodeStoredEntries(?string $raw): array
    {
        if (!is_string($raw) || trim($raw) === '' || trim($raw) === '{}') {
            return [];
        }

        $decoded = json_decode(trim($raw), true);
        if (!is_array($decoded)) {
            return [];
        }

        if ($decoded === []) {
            return [];
        }

        if (array_is_list($decoded)) {
            return self::normalizeEntryList($decoded, true);
        }

        return self::legacyObjectToEntries($decoded);
    }

    /**
     * @param array<int, array<string, mixed>> $list
     *
     * @return array<int, array{key: string, value: string, secret: bool}>
     */
    private static function normalizeEntryList(array $list, bool $decryptSecrets): array
    {
        $app = App::getInstance(true);
        $entries = [];

        foreach ($list as $item) {
            if (!is_array($item)) {
                continue;
            }

            $key = trim((string) ($item['key'] ?? ''));
            if ($key === '') {
                continue;
            }

            $secret = filter_var($item['secret'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $value = (string) ($item['value'] ?? '');

            if ($secret && $decryptSecrets && $value !== '') {
                try {
                    $value = $app->decryptValue($value);
                } catch (\Throwable) {
                    $value = '';
                }
            }

            $entries[] = [
                'key' => $key,
                'value' => $value,
                'secret' => $secret,
            ];
        }

        return $entries;
    }

    /**
     * @return array<string, true>
     */
    private static function existingSecretKeys(?string $existingRaw): array
    {
        $entries = self::decodeStoredEntries($existingRaw);
        $keys = [];

        foreach ($entries as $entry) {
            if (($entry['secret'] ?? false) && ($entry['value'] ?? '') !== '') {
                $keys[$entry['key']] = true;
            }
        }

        return $keys;
    }

    /**
     * @param array<string, mixed> $object
     *
     * @return array<int, array{key: string, value: string, secret: bool}>
     */
    private static function legacyObjectToEntries(array $object): array
    {
        $entries = [];
        foreach ($object as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }
            if (!is_string($value) && !is_numeric($value)) {
                continue;
            }

            $entries[] = [
                'key' => $key,
                'value' => (string) $value,
                'secret' => false,
            ];
        }

        return $entries;
    }
}
