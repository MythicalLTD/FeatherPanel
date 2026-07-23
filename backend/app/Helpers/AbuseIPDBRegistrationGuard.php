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
use App\Chat\User;
use App\Config\ConfigInterface;
use App\Services\AbuseIPDB\AbuseIPDBService;
use Symfony\Component\HttpFoundation\Response;

class AbuseIPDBRegistrationGuard
{
    public const ACTION_BLOCK = 'block';
    public const ACTION_LOG = 'log';
    public const ACTION_AUTO_BAN = 'auto_ban';

    /**
     * Evaluate signup IP reputation.
     *
     * @return array{
     *   action: string,
     *   score: int,
     *   total_reports: int,
     *   ip: string,
     *   message?: string,
     *   code?: string
     * }|null Null when registration should continue normally
     */
    public static function evaluate(?string $ip = null): ?array
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        if ($config->getSetting(ConfigInterface::ABUSEIPDB_ENABLED, 'false') !== 'true') {
            return null;
        }
        if ($config->getSetting(ConfigInterface::ABUSEIPDB_CHECK_ON_REGISTER, 'false') !== 'true') {
            return null;
        }

        $ip = trim((string) ($ip ?? ''));
        if ($ip === '' || !AbuseIPDBService::isPublicIp($ip)) {
            return null;
        }

        $service = new AbuseIPDBService();
        if (!$service->isConfigured()) {
            $app->getLogger()->warning('AbuseIPDB registration check skipped: API key missing');

            return null;
        }

        $result = $service->check($ip);
        if (!$result['success']) {
            // Fail open so API outages do not block all signups
            $app->getLogger()->warning(
                'AbuseIPDB registration check failed for ' . $ip . ': ' . ($result['error'] ?? 'unknown')
            );

            return null;
        }

        $data = $result['data'] ?? [];
        $score = (int) ($data['abuseConfidenceScore'] ?? 0);
        $totalReports = (int) ($data['totalReports'] ?? 0);
        $threshold = (int) $config->getSetting(ConfigInterface::ABUSEIPDB_MIN_CONFIDENCE_SCORE, '75');
        $threshold = max(0, min(100, $threshold));

        if ($score < $threshold) {
            return null;
        }

        $action = strtolower(trim((string) $config->getSetting(
            ConfigInterface::ABUSEIPDB_REGISTER_ACTION,
            self::ACTION_BLOCK
        )));
        if (!in_array($action, [self::ACTION_BLOCK, self::ACTION_LOG, self::ACTION_AUTO_BAN], true)) {
            $action = self::ACTION_BLOCK;
        }

        $app->getLogger()->warning(
            'AbuseIPDB flagged registration IP ' . $ip
            . ' (score=' . $score . ', reports=' . $totalReports . ', action=' . $action . ')'
        );

        return [
            'action' => $action,
            'score' => $score,
            'total_reports' => $totalReports,
            'ip' => $ip,
            'message' => 'Registration blocked due to IP reputation (AbuseIPDB confidence score: ' . $score . '%)',
            'code' => 'IP_REPUTATION_BLOCKED',
        ];
    }

    /**
     * Block registration when configured action is "block".
     */
    public static function assertRegistrationAllowed(?string $ip = null): ?Response
    {
        $decision = self::evaluate($ip);
        if ($decision === null) {
            return null;
        }

        if ($decision['action'] === self::ACTION_LOG) {
            return null;
        }

        if ($decision['action'] === self::ACTION_AUTO_BAN) {
            // Caller creates the user, then applyAutoBanIfNeeded()
            return null;
        }

        return ApiResponse::error(
            $decision['message'] ?? 'Registration blocked due to IP reputation',
            $decision['code'] ?? 'IP_REPUTATION_BLOCKED',
            403
        );
    }

    /**
     * After user creation, ban the account when register action is auto_ban and IP was flagged.
     *
     * @param array<string, mixed>|null $decision Result from evaluate()
     */
    public static function applyAutoBanIfNeeded(string $userUuid, ?array $decision): void
    {
        if ($decision === null || ($decision['action'] ?? '') !== self::ACTION_AUTO_BAN) {
            return;
        }

        $score = (int) ($decision['score'] ?? 0);
        $ip = (string) ($decision['ip'] ?? '');
        $reason = ModerationReasonHelper::formatReason(
            'security_threat',
            'Automatically banned on registration: AbuseIPDB confidence score '
            . $score . '% for IP ' . $ip
        );

        User::updateUser($userUuid, ModerationReasonHelper::banAppliedFields($reason, null));
        App::getInstance(true)->getLogger()->info(
            'AbuseIPDB auto-banned new user ' . $userUuid . ' (IP ' . $ip . ', score ' . $score . ')'
        );
    }

    /**
     * Whether the current decision requires creating then auto-banning the user.
     *
     * @param array<string, mixed>|null $decision
     */
    public static function shouldAutoBan(?array $decision): bool
    {
        return is_array($decision) && ($decision['action'] ?? '') === self::ACTION_AUTO_BAN;
    }

    /**
     * Whether registration must be rejected before create.
     *
     * @param array<string, mixed>|null $decision
     */
    public static function shouldBlock(?array $decision): bool
    {
        return is_array($decision) && ($decision['action'] ?? '') === self::ACTION_BLOCK;
    }
}
