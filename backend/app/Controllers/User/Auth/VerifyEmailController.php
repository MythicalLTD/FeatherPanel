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

namespace App\Controllers\User\Auth;

use App\Chat\User;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyEmailController
{
    public function get(Request $request): Response
    {
        $token = trim((string) $request->query->get('token', ''));
        if ($token === '') {
            return ApiResponse::error('Verification token is required', 'MISSING_VERIFICATION_TOKEN', 400);
        }

        $user = User::getUserByMailVerify($token);
        if ($user === null) {
            return ApiResponse::error('Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN', 400);
        }

        if (!User::updateUser($user['uuid'], ['mail_verify' => null])) {
            return ApiResponse::error('Failed to verify email', 'FAILED_TO_VERIFY_EMAIL', 500);
        }

        return ApiResponse::success([], 'Email verified successfully. You can now log in.', 200);
    }
}
