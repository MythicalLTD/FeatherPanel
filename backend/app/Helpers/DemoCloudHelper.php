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

use Symfony\Component\HttpFoundation\Response;
use App\Services\FeatherCloud\FeatherCloudException;

/**
 * Blocks FeatherPanel / Mythic Cloud usage on demo-marked instances (app_demo_yes).
 */
class DemoCloudHelper
{
    public const ERROR_CODE = 'CLOUD_DISABLED_IN_DEMO';
    public const ERROR_MESSAGE = 'FeatherPanel Cloud is not available on demo instances.';

    public static function isBlocked(): bool
    {
        return DemoGuard::isDemo();
    }

    /**
     * @throws FeatherCloudException
     */
    public static function assertAllowed(): void
    {
        if (self::isBlocked()) {
            throw new FeatherCloudException(self::ERROR_MESSAGE, self::ERROR_CODE, 403);
        }
    }

    public static function denyResponse(): Response
    {
        return ApiResponse::error(self::ERROR_MESSAGE, self::ERROR_CODE, 403);
    }
}
