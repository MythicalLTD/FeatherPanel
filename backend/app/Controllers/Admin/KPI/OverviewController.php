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

namespace App\Controllers\Admin\KPI;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\KPI\Admin\OverviewAnalytics;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class OverviewController
{
    #[OA\Get(
        path: '/api/admin/analytics/overview',
        summary: 'Get the KPI overview for a date range',
        description: 'Growth against the previous period, active users, module counts, node capacity and overcommit, top consumers, tickets and activity. Disabled modules are left out.',
        tags: ['Admin - Analytics'],
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, description: 'First day (Y-m-d). Defaults to 29 days before "to".', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'to', in: 'query', required: false, description: 'Last day (Y-m-d). Defaults to today.', schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Overview retrieved successfully'),
            new OA\Response(response: 400, description: 'Invalid date range'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function getOverview(Request $request): Response
    {
        $today = new \DateTimeImmutable('today');
        $to = $this->parseDate($request->query->get('to'), $today);
        $from = $this->parseDate($request->query->get('from'), $to?->modify('-29 days'));

        if ($from === null || $to === null) {
            return ApiResponse::error('Dates must use the Y-m-d format', 'INVALID_DATE_RANGE', 400);
        }
        if ($from > $to) {
            return ApiResponse::error('The start date must be on or before the end date', 'INVALID_DATE_RANGE', 400);
        }
        if ((int) $from->diff($to)->days + 1 > OverviewAnalytics::MAX_DAYS) {
            return ApiResponse::error('The date range can cover at most two years', 'DATE_RANGE_TOO_LARGE', 400, [
                'max_days' => OverviewAnalytics::MAX_DAYS,
            ]);
        }

        return ApiResponse::success(OverviewAnalytics::getOverview($from, $to), 'Overview fetched successfully', 200);
    }

    private function parseDate(mixed $value, ?\DateTimeImmutable $fallback): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return $fallback;
        }
        if (!is_string($value)) {
            return null;
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if ($date === false || $date->format('Y-m-d') !== $value) {
            return null;
        }

        return $date;
    }
}
