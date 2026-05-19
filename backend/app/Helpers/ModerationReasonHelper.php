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

use App\Chat\User;

class ModerationReasonHelper
{
    public const CATEGORY_LABELS = [
        'payment_overdue' => 'Payment overdue',
        'terms_violation' => 'Terms of service violation',
        'abuse_harassment' => 'Abuse or harassment',
        'resource_abuse' => 'Resource abuse',
        'security_threat' => 'Security threat',
        'spam' => 'Spam or advertising',
        'chargeback' => 'Chargeback or fraud',
        'manual_review' => 'Manual review required',
        'featherzerotrust' => 'FeatherZeroTrust detection',
        'other' => 'Other',
    ];

    public static function normalizeDetails(string $details): string
    {
        return trim(preg_replace('/\s+/u', ' ', $details) ?? '');
    }

    public static function formatReason(?string $category, string $details): string
    {
        $details = self::normalizeDetails($details);
        $category = $category !== null ? trim($category) : '';

        if ($category !== '' && isset(self::CATEGORY_LABELS[$category])) {
            $label = self::CATEGORY_LABELS[$category];
            if ($details === '') {
                return $label;
            }

            return $label . ': ' . $details;
        }

        return $details;
    }

    public static function validateReason(string $reason): ?string
    {
        $reason = self::normalizeDetails($reason);
        if ($reason === '') {
            return 'A reason is required when suspending or banning.';
        }
        if (mb_strlen($reason) < 3) {
            return 'Reason must be at least 3 characters.';
        }
        if (mb_strlen($reason) > 2000) {
            return 'Reason must be 2000 characters or fewer.';
        }

        return null;
    }

    /**
     * @return array{reason:string,category:?string,details:string}|null
     */
    public static function parseRequestBody(array $body): ?array
    {
        $category = isset($body['reason_category']) && is_string($body['reason_category'])
            ? trim($body['reason_category'])
            : null;
        if ($category === '') {
            $category = null;
        }

        $details = '';
        if (isset($body['reason_details']) && is_string($body['reason_details'])) {
            $details = $body['reason_details'];
        } elseif (isset($body['reason']) && is_string($body['reason'])) {
            $details = $body['reason'];
        }

        $reason = self::formatReason($category, $details);
        if (self::validateReason($reason) !== null && isset($body['reason']) && is_string($body['reason'])) {
            $reason = self::normalizeDetails($body['reason']);
        }

        return [
            'reason' => $reason,
            'category' => $category,
            'details' => self::normalizeDetails($details),
        ];
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    public static function enrichUserBanMetadata(array $row): array
    {
        $staffUuid = isset($row['banned_by_uuid']) ? trim((string) $row['banned_by_uuid']) : '';
        if ($staffUuid !== '') {
            $staff = User::getUserByUuid($staffUuid);
            $row['banned_by'] = $staff ? [
                'uuid' => $staff['uuid'],
                'username' => $staff['username'],
            ] : [
                'uuid' => $staffUuid,
                'username' => null,
            ];
        } else {
            $row['banned_by'] = null;
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    public static function enrichServerSuspensionMetadata(array $row): array
    {
        $staffUuid = isset($row['suspended_by_uuid']) ? trim((string) $row['suspended_by_uuid']) : '';
        if ($staffUuid !== '') {
            $staff = User::getUserByUuid($staffUuid);
            $row['suspended_by'] = $staff ? [
                'uuid' => $staff['uuid'],
                'username' => $staff['username'],
            ] : [
                'uuid' => $staffUuid,
                'username' => $staffUuid === 'system' ? 'System' : null,
            ];
        } else {
            $row['suspended_by'] = null;
        }

        return $row;
    }

    /**
     * @return array<string, string|null>
     */
    public static function banAppliedFields(string $reason, ?array $staffUser): array
    {
        return [
            'banned' => 'true',
            'ban_reason' => $reason,
            'banned_at' => gmdate('Y-m-d H:i:s'),
            'banned_by_uuid' => is_array($staffUser) ? ($staffUser['uuid'] ?? null) : null,
        ];
    }

    /**
     * @return array<string, null>
     */
    public static function banClearedFields(): array
    {
        return [
            'banned' => 'false',
            'ban_reason' => null,
            'banned_at' => null,
            'banned_by_uuid' => null,
        ];
    }

    /**
     * @return array<string, int|string|null>
     */
    public static function suspensionAppliedFields(string $reason, ?array $staffUser): array
    {
        return [
            'suspended' => 1,
            'suspension_reason' => $reason,
            'suspended_at' => gmdate('Y-m-d H:i:s'),
            'suspended_by_uuid' => is_array($staffUser) ? ($staffUser['uuid'] ?? null) : null,
        ];
    }

    /**
     * @return array<string, int|null>
     */
    public static function suspensionClearedFields(): array
    {
        return [
            'suspended' => 0,
            'suspension_reason' => null,
            'suspended_at' => null,
            'suspended_by_uuid' => null,
        ];
    }
}
