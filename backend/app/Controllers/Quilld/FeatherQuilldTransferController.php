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

namespace App\Controllers\Quilld;

use App\Helpers\ApiResponse;
use App\Plugins\Events\Events\QuilldEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\WebSpaces\WebSpaceTransferInitiator;

class FeatherQuilldTransferController
{
    public function postStatus(Request $request, string $uuid): Response
    {
        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON', 'INVALID_JSON', 400);
        }

        $successful = !empty($content['successful']);
        $error = isset($content['error']) ? (string) $content['error'] : null;

        (new WebSpaceTransferInitiator())->handleRemoteReport($uuid, $successful, $error);

        self::emitPluginEvent(QuilldEvent::onQuilldTransferStatusReported(), [
            'webspace_uuid' => $uuid,
            'successful' => $successful,
            'error' => $error,
        ]);

        return ApiResponse::success(['ok' => true], 'OK', 200);
    }

    private static function emitPluginEvent(string $event, array $payload): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($event, $payload);
        }
    }
}
