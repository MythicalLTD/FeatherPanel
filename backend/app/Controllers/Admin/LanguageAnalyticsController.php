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

use App\Chat\Database;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'LanguageStat',
    type: 'object',
    properties: [
        new OA\Property(property: 'locale', type: 'string', description: 'Locale code'),
        new OA\Property(property: 'name', type: 'string', description: 'Language name'),
        new OA\Property(property: 'user_count', type: 'integer', description: 'Number of users'),
        new OA\Property(property: 'percentage', type: 'number', format: 'float', description: 'Percentage of total users'),
    ]
)]
#[OA\Schema(
    schema: 'LanguageTrend',
    type: 'object',
    properties: [
        new OA\Property(property: 'locale', type: 'string', description: 'Locale code'),
        new OA\Property(property: 'month', type: 'string', description: 'Month (YYYY-MM)'),
        new OA\Property(property: 'count', type: 'integer', description: 'Number of new users'),
    ]
)]
class LanguageAnalyticsController
{
    /**
     * Locale to human-readable name mapping.
     */
    private static array $localeNames = [
        'en' => 'English',
        'de' => 'German',
        'es' => 'Spanish',
        'fr' => 'French',
        'it' => 'Italian',
        'pt' => 'Portuguese',
        'nl' => 'Dutch',
        'pl' => 'Polish',
        'ru' => 'Russian',
        'ja' => 'Japanese',
        'ko' => 'Korean',
        'zh' => 'Chinese',
        'ar' => 'Arabic',
        'hi' => 'Hindi',
        'tr' => 'Turkish',
        'sv' => 'Swedish',
        'da' => 'Danish',
        'fi' => 'Finnish',
        'no' => 'Norwegian',
        'cs' => 'Czech',
        'el' => 'Greek',
        'he' => 'Hebrew',
        'id' => 'Indonesian',
        'th' => 'Thai',
        'vi' => 'Vietnamese',
        'ro' => 'Romanian',
        'hu' => 'Hungarian',
        'uk' => 'Ukrainian',
    ];

    #[OA\Get(
        path: '/api/admin/analytics/languages',
        summary: 'Get language usage analytics',
        description: 'Get a breakdown of user language preferences with counts and percentages.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Language statistics retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'languages', type: 'array', items: new OA\Items(ref: '#/components/schemas/LanguageStat')),
                        new OA\Property(property: 'total_users', type: 'integer', description: 'Total number of users'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $pdo = Database::getPdoConnection();

        // Get language distribution
        $stmt = $pdo->prepare('
            SELECT locale, COUNT(*) as user_count
            FROM featherpanel_users
            GROUP BY locale
            ORDER BY user_count DESC
        ');
        $stmt->execute();
        $languages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Get total users
        $totalStmt = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_users');
        $totalStmt->execute();
        $total = (int) $totalStmt->fetchColumn();

        // Format the response
        $formatted = array_map(function ($lang) use ($total) {
            return [
                'locale' => $lang['locale'],
                'name' => self::$localeNames[$lang['locale']] ?? $lang['locale'],
                'user_count' => (int) $lang['user_count'],
                'percentage' => $total > 0 ? round(((int) $lang['user_count'] / $total) * 100, 2) : 0,
            ];
        }, $languages);

        return ApiResponse::success([
            'languages' => $formatted,
            'total_users' => $total,
        ], 'Language statistics retrieved successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/analytics/languages/trends',
        summary: 'Get language adoption trends',
        description: 'Get language adoption trends over the last 12 months.',
        tags: ['Admin - Analytics'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Language trends retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'trends', type: 'array', items: new OA\Items(ref: '#/components/schemas/LanguageTrend')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function trends(Request $request): Response
    {
        $pdo = Database::getPdoConnection();

        // Get language adoption over last 12 months
        $stmt = $pdo->prepare("
            SELECT
                locale,
                DATE_FORMAT(first_seen, '%Y-%m') as month,
                COUNT(*) as count
            FROM featherpanel_users
            WHERE first_seen >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY locale, DATE_FORMAT(first_seen, '%Y-%m')
            ORDER BY month ASC, count DESC
        ");
        $stmt->execute();
        $trends = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Format trends
        $formatted = array_map(function ($trend) {
            return [
                'locale' => $trend['locale'],
                'name' => self::$localeNames[$trend['locale']] ?? $trend['locale'],
                'month' => $trend['month'],
                'count' => (int) $trend['count'],
            ];
        }, $trends);

        return ApiResponse::success([
            'trends' => $formatted,
        ], 'Language trends retrieved successfully', 200);
    }
}
