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

namespace App\Services\Storage;

use App\App;

/**
 * Panel settings for backup storage (global S3 + bring-your-own destinations).
 * Registered into Admin → Settings under the "backup_storage" category.
 */
final class StorageSettings
{
    public const CATEGORY = 'backup_storage';

    public const S3_ENABLED = 'backup_s3_enabled';
    public const S3_USE_BY_DEFAULT = 'backup_s3_use_by_default';
    public const S3_ENDPOINT = 'backup_s3_endpoint';
    public const S3_REGION = 'backup_s3_region';
    public const S3_BUCKET = 'backup_s3_bucket';
    public const S3_PREFIX = 'backup_s3_prefix';
    public const S3_ACCESS_KEY = 'backup_s3_access_key';
    public const S3_SECRET_KEY = 'backup_s3_secret_key';
    public const S3_PATH_STYLE = 'backup_s3_path_style';
    public const PART_SIZE_MB = 'backup_upload_part_size_mb';
    public const MAX_CONCURRENT_UPLOADS = 'backup_max_concurrent_uploads';
    public const PRESIGN_TTL_MINUTES = 'backup_presign_ttl_minutes';
    public const BYO_ENABLED = 'backup_byo_enabled';
    public const BYO_PROVIDERS = 'backup_byo_providers';
    public const BYO_MAX_PER_USER = 'backup_byo_max_per_user';

    /** Providers users may connect, in display order. */
    public const PROVIDERS = ['s3'];

    /** @var list<string> */
    public const SENSITIVE = [self::S3_SECRET_KEY];

    /**
     * Ordered list of [key, default, type, description, options, validation, placeholder].
     *
     * @return list<array{0: string, 1: string, 2: string, 3: string, 4: list<string>, 5: string, 6: string}>
     */
    public static function specs(): array
    {
        $bool = ['true', 'false'];

        return [
            [self::S3_ENABLED, 'false', 'select', 'Enable the panel-managed S3 backup storage. The panel keeps the keys and gives Wings short-lived presigned URLs only, so nodes never see your credentials.', $bool, 'required|string|in:true,false', 'false'],
            [self::S3_USE_BY_DEFAULT, 'false', 'select', 'Store new server backups on this S3 bucket by default instead of the node disk (users can still pick their own destination when bring-your-own storage is enabled).', $bool, 'required|string|in:true,false', 'false'],
            [self::S3_ENDPOINT, '', 'text', 'S3 endpoint URL. Leave empty for AWS (https://s3.<region>.amazonaws.com). Examples: https://<account>.r2.cloudflarestorage.com, https://s3.eu-central-003.backblazeb2.com, https://minio.example.com', [], 'nullable|string|max:255', 'https://s3.eu-central-1.amazonaws.com'],
            [self::S3_REGION, 'us-east-1', 'text', 'Bucket region (use "auto" for Cloudflare R2).', [], 'nullable|string|max:64', 'us-east-1'],
            [self::S3_BUCKET, '', 'text', 'Bucket name.', [], 'nullable|string|max:255', 'featherpanel-backups'],
            [self::S3_PREFIX, 'backups', 'text', 'Optional key prefix (folder) inside the bucket.', [], 'nullable|string|max:255', 'backups'],
            [self::S3_ACCESS_KEY, '', 'text', 'Access key ID.', [], 'nullable|string|max:255', 'AKIA...'],
            [self::S3_SECRET_KEY, '', 'password', 'Secret access key (stored encrypted, never sent to nodes).', [], 'nullable|string|max:255', 'Enter secret to change'],
            [self::S3_PATH_STYLE, 'true', 'select', 'Use path-style URLs (endpoint/bucket/key). Required by MinIO and most self-hosted S3; AWS supports both.', $bool, 'required|string|in:true,false', 'true'],
            [self::PART_SIZE_MB, '100', 'number', 'Multipart upload part size in MiB (minimum 5). Larger parts mean fewer requests; it is raised automatically for very large backups.', [], 'required|integer|min:5|max:5120', '100'],
            [self::MAX_CONCURRENT_UPLOADS, '4', 'number', 'How many parts Wings may upload in parallel (sent to Wings as max_concurrent_uploads).', [], 'required|integer|min:1|max:32', '4'],
            [self::PRESIGN_TTL_MINUTES, '60', 'number', 'How long presigned upload/download URLs stay valid, in minutes.', [], 'required|integer|min:5|max:10080', '60'],
            [self::BYO_ENABLED, 'false', 'select', 'Let users add their own backup storage (Account, Storage) and pick it when creating a backup or schedule. Their backups still count toward the server backup limit. Custom S3 endpoints must use https and a public address.', $bool, 'required|string|in:true,false', 'false'],
            [self::BYO_PROVIDERS, 's3', 'text', 'Comma separated providers users may connect. Available: s3', [], 'nullable|string|max:255', 's3'],
            [self::BYO_MAX_PER_USER, '3', 'number', 'Maximum storage destinations per user.', [], 'required|integer|min:1|max:50', '3'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function category(): array
    {
        return [
            'name' => 'Backup Storage',
            'description' => 'Where backups are stored: panel-managed S3 and bring-your-own cloud storage.',
            'icon' => 'database',
            'settings' => array_map(static fn (array $s): string => $s[0], self::specs()),
        ];
    }

    /**
     * @param callable(string, string): string $mask
     *
     * @return array<string, array<string, mixed>>
     */
    public static function definitions(callable $mask): array
    {
        $config = App::getInstance(true)->getConfig();
        $out = [];
        foreach (self::specs() as [$key, $default, $type, $description, $options, $validation, $placeholder]) {
            $sensitive = in_array($key, self::SENSITIVE, true);
            $out[$key] = [
                'name' => $key,
                'value' => $sensitive ? $mask($key, '') : (string) $config->getSetting($key, $default),
                'description' => $description,
                'type' => $type,
                'required' => str_starts_with($validation, 'required'),
                'placeholder' => $placeholder,
                'validation' => $validation,
                'options' => $options,
                'category' => self::CATEGORY,
            ];
            if ($sensitive) {
                $out[$key]['sensitive'] = true;
            }
        }

        return $out;
    }

    public static function get(string $key): string
    {
        foreach (self::specs() as $s) {
            if ($s[0] === $key) {
                return (string) App::getInstance(true)->getConfig()->getSetting($key, $s[1]);
            }
        }

        return (string) App::getInstance(true)->getConfig()->getSetting($key, '');
    }

    public static function bool(string $key): bool
    {
        return in_array(strtolower(self::get($key)), ['1', 'true', 'yes', 'on'], true);
    }

    public static function int(string $key, int $min, int $max): int
    {
        return max($min, min($max, (int) self::get($key)));
    }

    public static function byoEnabled(): bool
    {
        return self::bool(self::BYO_ENABLED);
    }

    /**
     * @return list<string>
     */
    public static function allowedProviders(): array
    {
        $wanted = array_map(static fn (string $p): string => strtolower(trim($p)), explode(',', self::get(self::BYO_PROVIDERS)));

        return array_values(array_filter(self::PROVIDERS, static fn (string $p): bool => in_array($p, $wanted, true)));
    }

    public static function maxDestinationsPerUser(): int
    {
        return self::int(self::BYO_MAX_PER_USER, 1, 50);
    }

    public static function partSizeBytes(): int
    {
        return self::int(self::PART_SIZE_MB, 5, 5120) * 1024 * 1024;
    }

    public static function maxConcurrentUploads(): int
    {
        return self::int(self::MAX_CONCURRENT_UPLOADS, 1, 32);
    }

    public static function presignTtlSeconds(): int
    {
        return self::int(self::PRESIGN_TTL_MINUTES, 5, 10080) * 60;
    }

    /**
     * @return array<string, mixed>
     */
    public static function globalS3Config(): array
    {
        return [
            'endpoint' => self::get(self::S3_ENDPOINT),
            'region' => self::get(self::S3_REGION),
            'bucket' => self::get(self::S3_BUCKET),
            'prefix' => self::get(self::S3_PREFIX),
            'access_key' => self::get(self::S3_ACCESS_KEY),
            'secret_key' => self::get(self::S3_SECRET_KEY),
            'path_style' => self::bool(self::S3_PATH_STYLE),
        ];
    }

    public static function globalS3Configured(): bool
    {
        $c = self::globalS3Config();

        return self::bool(self::S3_ENABLED) && $c['bucket'] !== '' && $c['access_key'] !== '' && $c['secret_key'] !== '';
    }
}
