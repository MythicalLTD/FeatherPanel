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

namespace App\Controllers\System;

use OpenApi\Attributes as OA;
use App\Observability\HealthProbe;
use App\Observability\MetricsAuth;
use App\Observability\PrometheusText;
use App\Observability\MetricsCollector;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ObservabilityController
{
    #[OA\Get(
        path: '/api/system/metrics',
        summary: 'Prometheus metrics',
        description: 'Prometheus text exposition of panel, runtime, dependency and HTTP metrics. Disabled by default; enable it under Admin > Observability. Requires the metrics bearer token (or an allowed IP in IP mode).',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Metrics in Prometheus text format'),
            new OA\Response(response: 401, description: 'Missing or invalid metrics token'),
            new OA\Response(response: 403, description: 'Address not allowed or metrics access not configured'),
            new OA\Response(response: 404, description: 'Metrics are disabled'),
        ]
    )]
    public function metrics(Request $request): Response
    {
        $denied = MetricsAuth::check($request);
        if ($denied !== null) {
            return $denied;
        }

        return new Response((new MetricsCollector())->collect(), 200, [
            'Content-Type' => PrometheusText::CONTENT_TYPE,
            'Cache-Control' => 'no-store',
        ]);
    }

    #[OA\Get(
        path: '/api/health/live',
        summary: 'Liveness probe',
        description: 'Answers 200 as long as PHP serves requests. Does not touch the database.',
        tags: ['System'],
        responses: [new OA\Response(response: 200, description: 'Alive')]
    )]
    public function live(Request $request): Response
    {
        return HealthProbe::live();
    }

    #[OA\Get(
        path: '/api/health/ready',
        summary: 'Readiness probe',
        description: 'Checks the database, Redis, Mercure, storage and disk. 200 when the panel can serve traffic (status ok or degraded), 503 when a critical dependency fails.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Ready (ok or degraded)'),
            new OA\Response(response: 503, description: 'Not ready'),
        ]
    )]
    public function ready(Request $request): Response
    {
        return HealthProbe::ready();
    }
}
