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

namespace App\Controllers\User\User;

use App\App;
use App\Chat\User;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\CaptchaHelper;
use App\Config\ConfigInterface;
use PragmaRX\Google2FA\Google2FA;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\AccountDeletionOtp;
use App\Services\User\UserDeletionService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Mail\templates\AccountDeletionScheduled;

class AccountDeletionController
{
    #[OA\Get(
        path: '/api/user/account/deletion',
        summary: 'Get account deletion status',
        description: 'Returns whether self-service account deletion is enabled, verification requirements, mode, and any pending deletion.',
        tags: ['User - Account'],
        responses: [
            new OA\Response(response: 200, description: 'Deletion status retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function status(Request $request): Response
    {
        $user = $request->get('user');
        $fresh = User::getUserByUuid($user['uuid']) ?? $user;
        $verification = UserDeletionService::getVerificationRequirements();
        $mode = UserDeletionService::getConfiguredMode();
        $services = UserDeletionService::getActiveServicesSummary($fresh);

        return ApiResponse::success([
            'enabled' => UserDeletionService::isFeatureEnabled(),
            'mode' => $mode,
            'delay_days' => UserDeletionService::getConfiguredDelayDays(),
            'verification' => $verification,
            'pending' => UserDeletionService::hasPendingDeletion($fresh),
            'deletion_requested_at' => $fresh['deletion_requested_at'] ?? null,
            'deletion_scheduled_at' => $fresh['deletion_scheduled_at'] ?? null,
            'deletion_mode' => $fresh['deletion_mode'] ?? null,
            'active_services' => $services,
            'smtp_enabled' => App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SMTP_ENABLED, 'false') === 'true',
            'user_has_2fa' => ($fresh['two_fa_enabled'] ?? 'false') === 'true',
        ], 'Account deletion status retrieved', 200);
    }

    #[OA\Post(
        path: '/api/user/account/deletion/otp',
        summary: 'Send account deletion email OTP',
        description: 'Send a one-time email code required to confirm account deletion when email OTP verification is enabled.',
        tags: ['User - Account'],
        responses: [
            new OA\Response(response: 200, description: 'OTP sent successfully'),
            new OA\Response(response: 403, description: 'Feature disabled or email OTP not required'),
            new OA\Response(response: 429, description: 'Rate limited'),
        ]
    )]
    public function sendOtp(Request $request): Response
    {
        $gate = $this->ensureFeatureAvailable($request);
        if ($gate !== null) {
            return $gate;
        }

        $verification = UserDeletionService::getVerificationRequirements();
        if (!$verification['require_email_otp']) {
            return ApiResponse::error('Email OTP verification is not required for account deletion', 'EMAIL_OTP_NOT_REQUIRED', 400);
        }

        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::SMTP_ENABLED, 'false') !== 'true') {
            return ApiResponse::error('Email is not configured; cannot send deletion OTP', 'SMTP_NOT_CONFIGURED', 403);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        $captchaError = $this->validateCaptchaIfRequired($config, $data);
        if ($captchaError !== null) {
            return $captchaError;
        }

        $user = $request->get('user');
        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        if (
            !User::updateUser($user['uuid'], [
                'account_deletion_otp' => $code,
                'account_deletion_otp_expires' => $expiresAt,
            ])
        ) {
            return ApiResponse::error('Failed to store deletion OTP', 'OTP_STORE_FAILED', 500);
        }

        AccountDeletionOtp::send([
            'uuid' => $user['uuid'],
            'enabled' => 'true',
            'first_name' => $user['first_name'] ?? '',
            'last_name' => $user['last_name'] ?? '',
            'email' => $user['email'],
            'username' => $user['username'],
            'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
            'app_url' => $config->getSetting(ConfigInterface::APP_URL, ''),
            'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, ''),
            'otp_code' => $code,
            'expires_minutes' => 10,
        ]);

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'account_deletion_otp_sent',
            'context' => 'Account deletion OTP emailed',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'email' => $user['email'],
            'expires_minutes' => 10,
        ], 'If email is configured, a deletion code has been sent.', 200);
    }

    #[OA\Post(
        path: '/api/user/account/deletion/confirm',
        summary: 'Confirm account deletion',
        description: 'Verify identity (2FA and/or email OTP) and process the deletion according to admin configuration.',
        tags: ['User - Account'],
        responses: [
            new OA\Response(response: 200, description: 'Account deleted or scheduled'),
            new OA\Response(response: 400, description: 'Validation failed'),
            new OA\Response(response: 403, description: 'Feature disabled'),
            new OA\Response(response: 409, description: 'Active services block deletion'),
        ]
    )]
    public function confirm(Request $request): Response
    {
        $gate = $this->ensureFeatureAvailable($request);
        if ($gate !== null) {
            return $gate;
        }

        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true) ?: [];

        $captchaError = $this->validateCaptchaIfRequired($config, $data);
        if ($captchaError !== null) {
            return $captchaError;
        }

        $user = User::getUserByUuid($request->get('user')['uuid']);
        if ($user === null) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if (UserDeletionService::hasPendingDeletion($user)) {
            return ApiResponse::error('Account deletion is already pending', 'DELETION_ALREADY_PENDING', 409);
        }

        $verification = UserDeletionService::getVerificationRequirements();
        if (!$verification['require_2fa'] && !$verification['require_email_otp']) {
            return ApiResponse::error(
                'Account deletion verification is misconfigured. Contact an administrator.',
                'DELETION_VERIFICATION_MISCONFIGURED',
                503
            );
        }

        if ($verification['require_2fa']) {
            if (($user['two_fa_enabled'] ?? 'false') !== 'true' || empty($user['two_fa_key'])) {
                return ApiResponse::error(
                    'Two-factor authentication must be enabled before deleting your account',
                    'TWO_FA_REQUIRED_FOR_DELETION',
                    400
                );
            }
            $twoFaCode = isset($data['two_fa_code']) ? trim((string) $data['two_fa_code']) : '';
            if ($twoFaCode === '' || !preg_match('/^\d{6}$/', $twoFaCode)) {
                return ApiResponse::error('A valid 2FA code is required', 'TWO_FA_CODE_REQUIRED', 400);
            }
            $google2fa = new Google2FA();
            if (!$google2fa->verifyKey($user['two_fa_key'], $twoFaCode)) {
                return ApiResponse::error('Invalid 2FA code', 'INVALID_TWO_FA_CODE', 400);
            }
        }

        if ($verification['require_email_otp']) {
            $otp = isset($data['email_otp']) ? trim((string) $data['email_otp']) : '';
            if ($otp === '' || !preg_match('/^\d{6}$/', $otp)) {
                return ApiResponse::error('A valid email OTP is required', 'EMAIL_OTP_REQUIRED', 400);
            }
            if (
                empty($user['account_deletion_otp'])
                || empty($user['account_deletion_otp_expires'])
                || !hash_equals((string) $user['account_deletion_otp'], $otp)
            ) {
                return ApiResponse::error('Invalid email OTP', 'INVALID_EMAIL_OTP', 400);
            }
            if (strtotime((string) $user['account_deletion_otp_expires']) < time()) {
                return ApiResponse::error('Email OTP has expired', 'EMAIL_OTP_EXPIRED', 400);
            }
        }

        if ($app->isDemoMode() && in_array((int) $user['id'], [1, 2], true)) {
            return ApiResponse::error('Unmanaged actions are not permitted in demo mode', 'UNMANAGED_ACTIONS_NOT_PERMITTED', 400);
        }

        $mode = UserDeletionService::getConfiguredMode();
        $services = UserDeletionService::getActiveServicesSummary($user);

        if ($mode !== UserDeletionService::MODE_AFTER_SERVICES && $services['has_any']) {
            return ApiResponse::error(
                'Cannot delete your account while you have active servers, VDS instances, or subscriptions. Remove them first, or ask an administrator to enable delete-after-services mode.',
                'USER_HAS_ACTIVE_SERVICES',
                409,
                ['active_services' => $services]
            );
        }

        if ($mode === UserDeletionService::MODE_INSTANT) {
            $result = UserDeletionService::hardDelete($user, $user, 'User deleted their own account');
            if (!$result['success']) {
                return ApiResponse::error($result['error'] ?? 'Failed to delete account', $result['code'] ?? 'DELETE_FAILED', 409);
            }
            $this->clearSessionCookie();

            return ApiResponse::success([
                'deleted' => true,
                'mode' => $mode,
            ], 'Your account has been permanently deleted', 200);
        }

        $scheduledAt = null;
        $modeLabel = 'Delayed deletion';
        if ($mode === UserDeletionService::MODE_DELAYED) {
            $days = UserDeletionService::getConfiguredDelayDays();
            $scheduledAt = date('Y-m-d H:i:s', strtotime('+' . $days . ' days'));
            $modeLabel = 'Delayed deletion (' . $days . ' days)';
        } elseif ($mode === UserDeletionService::MODE_AFTER_SERVICES) {
            $modeLabel = 'Delete after active services expire';
            if (!$services['has_any']) {
                // No services left — delete immediately
                $result = UserDeletionService::hardDelete($user, $user, 'User deleted their own account (no active services)');
                if (!$result['success']) {
                    return ApiResponse::error($result['error'] ?? 'Failed to delete account', $result['code'] ?? 'DELETE_FAILED', 409);
                }
                $this->clearSessionCookie();

                return ApiResponse::success([
                    'deleted' => true,
                    'mode' => $mode,
                ], 'Your account has been permanently deleted', 200);
            }
            // Wait until services are gone; cron will purge
            $scheduledAt = null;
        }

        if (!UserDeletionService::scheduleDeletion($user, $mode, $scheduledAt)) {
            return ApiResponse::error('Failed to schedule account deletion', 'SCHEDULE_FAILED', 500);
        }

        try {
            AccountDeletionScheduled::send([
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'first_name' => $user['first_name'] ?? '',
                'last_name' => $user['last_name'] ?? '',
                'email' => $user['email'],
                'username' => $user['username'],
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, ''),
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, ''),
                'scheduled_at' => $scheduledAt ?? 'When all active services expire',
                'deletion_mode_label' => $modeLabel,
            ]);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to send account deletion scheduled email: ' . $e->getMessage());
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'account_deletion_scheduled',
            'context' => 'Account deletion scheduled (' . $mode . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'deleted' => false,
            'pending' => true,
            'mode' => $mode,
            'deletion_scheduled_at' => $scheduledAt,
            'active_services' => $services,
        ], 'Your account has been scheduled for deletion. Log in again to cancel.', 200);
    }

    #[OA\Delete(
        path: '/api/user/account/deletion',
        summary: 'Cancel pending account deletion',
        description: 'Cancel a pending delayed or after-services account deletion request.',
        tags: ['User - Account'],
        responses: [
            new OA\Response(response: 200, description: 'Pending deletion cancelled'),
            new OA\Response(response: 404, description: 'No pending deletion'),
        ]
    )]
    public function cancel(Request $request): Response
    {
        $user = User::getUserByUuid($request->get('user')['uuid']);
        if ($user === null) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        if (!UserDeletionService::hasPendingDeletion($user)) {
            return ApiResponse::error('No pending account deletion to cancel', 'NO_PENDING_DELETION', 404);
        }

        if (!UserDeletionService::cancelPendingDeletion($user)) {
            return ApiResponse::error('Failed to cancel account deletion', 'CANCEL_FAILED', 500);
        }

        return ApiResponse::success([], 'Account deletion cancelled', 200);
    }

    private function ensureFeatureAvailable(Request $request): ?Response
    {
        if (!UserDeletionService::isFeatureEnabled()) {
            return ApiResponse::error('Account deletion is disabled', 'ACCOUNT_DELETION_DISABLED', 403);
        }

        $user = $request->get('user');
        if (($user['deleted'] ?? 'false') === 'true') {
            return ApiResponse::error('Account is deleted', 'ACCOUNT_DELETED', 403);
        }

        return null;
    }

    private function validateCaptchaIfRequired($config, array $data): ?Response
    {
        if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false') == 'true') {
            if (!isset($data['turnstile_token']) || trim((string) $data['turnstile_token']) === '') {
                return ApiResponse::error('Captcha token is required', 'CAPTCHA_TOKEN_REQUIRED');
            }
            if (!CaptchaHelper::validate($data['turnstile_token'], CloudFlareRealIP::getRealIP())) {
                return ApiResponse::error('Captcha validation failed', 'CAPTCHA_VALIDATION_FAILED');
            }
        }

        return null;
    }

    private function clearSessionCookie(): void
    {
        setcookie('remember_token', '', time() - 3600, '/');
        unset($_COOKIE['remember_token']);
    }
}
