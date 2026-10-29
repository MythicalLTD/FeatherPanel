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

namespace Tests\Security;

use PHPUnit\Framework\TestCase;

/**
 * Regression: a user who must use 2FA (Security center) could turn it off through
 * PATCH /api/user/session, which stays reachable for 2FA setup.
 */
final class TwoFactorDisableGuardTest extends TestCase
{
    public function testSessionUpdateRefusesToDisableRequiredTwoFactor(): void
    {
        $src = (string) file_get_contents(__DIR__ . '/../../app/Controllers/User/User/SessionController.php');
        $this->assertMatchesRegularExpression('/SecurityPolicy::twoFactorApplies\(\$user\)\)\s*\{\s*return ApiResponse::error\([^;]+TWO_FACTOR_REQUIRED_BY_POLICY/s', $src);
        $locale = json_decode((string) file_get_contents(__DIR__ . '/../../../frontendv2/public/locales/en.json'), true);
        $this->assertStringContainsString('TWO_FACTOR_REQUIRED_BY_POLICY', json_encode($locale));
    }
}
