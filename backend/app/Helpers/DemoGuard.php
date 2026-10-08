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
use Symfony\Component\HttpFoundation\Response;

/**
 * Central guards for demo-marked panels (app_demo_yes).
 *
 * Blocks destructive / insecure mutations that would break the shared public demo
 * or expose host-level control (shell, snapshots, node tokens, plugin upload/uninstall).
 * Admin settings writes are allowed — the demo reset loop restores defaults.
 */
class DemoGuard
{
    public const ERROR_CODE = 'UNMANAGED_ACTIONS_NOT_PERMITTED';
    public const ERROR_MESSAGE = 'Unmanaged actions are not permitted in demo mode';

    public static function isDemo(): bool
    {
        try {
            return App::getInstance(true)->isDemoMode();
        } catch (\Throwable) {
            return false;
        }
    }

    public static function denyUnmanaged(): Response
    {
        return ApiResponse::error(self::ERROR_MESSAGE, self::ERROR_CODE, 400);
    }

    /**
     * Return a deny response when demo mode is on, otherwise null.
     */
    public static function denyIfDemo(): ?Response
    {
        return self::isDemo() ? self::denyUnmanaged() : null;
    }
}
