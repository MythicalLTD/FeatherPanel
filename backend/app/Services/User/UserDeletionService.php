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

namespace App\Services\User;

use App\App;
use App\Chat\User;
use App\Chat\Subuser;
use App\Chat\Activity;
use App\Chat\Database;
use App\Chat\MailList;
use App\Chat\WebSpace;
use App\Chat\ApiClient;
use App\Chat\MailQueue;
use App\Chat\UserDevice;
use App\Chat\VmInstance;
use App\Chat\WebSpaceSubuser;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Mail\templates\AccountDeleted;
use App\Plugins\Events\Events\UserEvent;

/**
 * Shared account deletion helpers for admin and user self-service flows.
 */
class UserDeletionService
{
    public const MODE_INSTANT = 'instant';
    public const MODE_DELAYED = 'delayed';
    public const MODE_AFTER_SERVICES = 'after_services';

    /**
     * @return array{servers: int, vms: int, webspaces: int, subscriptions: int, has_any: bool}
     */
    public static function getActiveServicesSummary(array $user): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_servers WHERE owner_id = :owner_id');
        $stmt->execute(['owner_id' => (int) $user['id']]);
        $serversCount = (int) $stmt->fetchColumn();

        $vmsCount = VmInstance::countByUserUuid((string) $user['uuid']);
        $webspacesCount = WebSpace::countByOwnerId((int) $user['id']);

        $subscriptionsCount = 0;
        if (class_exists(\App\Addons\billingplans\Chat\Subscription::class)) {
            try {
                $active = \App\Addons\billingplans\Chat\Subscription::getActiveByUserId((int) $user['id']);
                $subscriptionsCount = is_array($active) ? count($active) : 0;
            } catch (\Throwable $e) {
                App::getInstance(true)->getLogger()->warning(
                    'Failed to check billing subscriptions for account deletion: ' . $e->getMessage()
                );
            }
        }

        return [
            'servers' => $serversCount,
            'vms' => $vmsCount,
            'webspaces' => $webspacesCount,
            'subscriptions' => $subscriptionsCount,
            'has_any' => ($serversCount + $vmsCount + $webspacesCount + $subscriptionsCount) > 0,
        ];
    }

    public static function hasPendingDeletion(array $user): bool
    {
        return !empty($user['deletion_requested_at']);
    }

    /**
     * Clear a pending self-service deletion request (e.g. after login).
     */
    public static function cancelPendingDeletion(array $user): bool
    {
        if (!self::hasPendingDeletion($user)) {
            return true;
        }

        $cleared = User::updateUser($user['uuid'], [
            'deletion_requested_at' => null,
            'deletion_scheduled_at' => null,
            'deletion_mode' => null,
            'account_deletion_otp' => null,
            'account_deletion_otp_expires' => null,
        ]);

        if ($cleared) {
            Activity::createActivity([
                'user_uuid' => $user['uuid'],
                'name' => 'account_deletion_cancelled',
                'context' => 'Pending account deletion cancelled',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }

        return $cleared;
    }

    /**
     * Schedule a pending deletion without hard-deleting yet.
     */
    public static function scheduleDeletion(array $user, string $mode, ?string $scheduledAt): bool
    {
        return User::updateUser($user['uuid'], [
            'deletion_requested_at' => date('Y-m-d H:i:s'),
            'deletion_scheduled_at' => $scheduledAt,
            'deletion_mode' => $mode,
            'account_deletion_otp' => null,
            'account_deletion_otp_expires' => null,
        ]);
    }

    /**
     * Permanently delete a user and related rows that do not cascade.
     *
     * @return array{success: bool, error?: string, code?: string}
     */
    public static function hardDelete(array $user, ?array $deletedBy = null, string $context = 'User deleted'): array
    {
        $services = self::getActiveServicesSummary($user);
        if ($services['servers'] > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete user with active servers. Please transfer or delete all servers first.',
                'code' => 'USER_HAS_SERVERS',
            ];
        }
        if ($services['vms'] > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete user with VDS instances assigned. Reassign or delete those instances first.',
                'code' => 'USER_HAS_VM_INSTANCES',
            ];
        }
        if ($services['webspaces'] > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete user with active WebSpaces. Please transfer or delete all WebSpaces first.',
                'code' => 'USER_HAS_WEBSPACES',
            ];
        }
        if ($services['subscriptions'] > 0) {
            return [
                'success' => false,
                'error' => 'Cannot delete user with active subscriptions. Cancel or wait for subscriptions to expire first.',
                'code' => 'USER_HAS_ACTIVE_SUBSCRIPTIONS',
            ];
        }

        $app = App::getInstance(true);
        $config = $app->getConfig();

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserDeleted(),
                [
                    'user' => $user,
                    'deleted_by' => $deletedBy,
                ]
            );
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'delete_user',
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        try {
            AccountDeleted::send([
                'email' => $user['email'],
                'subject' => 'Your ' . $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel') . ' account has been deleted',
                'app_name' => $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'app_url' => $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'username' => $user['username'],
                'app_support_url' => $config->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://discord.mythical.systems'),
                'uuid' => $user['uuid'],
                'enabled' => $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
            ]);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to send account deleted email: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to send account deleted email: ' . $e->getMessage(),
                'code' => 'FAILED_TO_SEND_ACCOUNT_DELETED_EMAIL',
            ];
        }

        Activity::deleteUserData($user['uuid']);
        UserDevice::deleteUserData($user['uuid']);
        MailList::deleteAllMailListsByUserId($user['uuid']);
        ApiClient::deleteAllApiClientsByUserId($user['uuid']);
        Subuser::deleteAllSubusersByUserId((int) $user['id']);
        WebSpaceSubuser::deleteAllByUserId((int) $user['id']);
        MailQueue::deleteAllMailQueueByUserId($user['uuid']);

        $deleted = User::hardDeleteUser((int) $user['id']);
        if (!$deleted) {
            return [
                'success' => false,
                'error' => 'Failed to delete user',
                'code' => 'FAILED_TO_DELETE_USER',
            ];
        }

        return ['success' => true];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function getUsersDueForDeletion(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            "SELECT * FROM featherpanel_users
             WHERE deletion_requested_at IS NOT NULL
               AND deleted = 'false'
               AND (
                    (deletion_mode = :delayed AND deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW())
                    OR deletion_mode = :after_services
               )"
        );
        $stmt->execute([
            'delayed' => self::MODE_DELAYED,
            'after_services' => self::MODE_AFTER_SERVICES,
        ]);

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Process due delayed / after-services account deletions.
     */
    public static function processDueDeletions(): int
    {
        $processed = 0;
        foreach (self::getUsersDueForDeletion() as $user) {
            $mode = (string) ($user['deletion_mode'] ?? '');
            if ($mode === self::MODE_AFTER_SERVICES) {
                $services = self::getActiveServicesSummary($user);
                if ($services['has_any']) {
                    continue;
                }
            }

            $result = self::hardDelete($user, null, 'Scheduled account deletion completed');
            if ($result['success']) {
                ++$processed;
            } else {
                App::getInstance(true)->getLogger()->warning(
                    'Scheduled deletion skipped for user ' . ($user['uuid'] ?? '?') . ': ' . ($result['error'] ?? 'unknown')
                );
            }
        }

        return $processed;
    }

    public static function getConfiguredMode(): string
    {
        $mode = App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::USER_ACCOUNT_DELETION_MODE,
            self::MODE_INSTANT
        );

        return in_array($mode, [self::MODE_INSTANT, self::MODE_DELAYED, self::MODE_AFTER_SERVICES], true)
            ? $mode
            : self::MODE_INSTANT;
    }

    public static function getConfiguredDelayDays(): int
    {
        $days = (int) App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::USER_ACCOUNT_DELETION_DELAY_DAYS,
            '7'
        );

        return max(1, min(365, $days));
    }

    /**
     * @return array{require_2fa: bool, require_email_otp: bool}
     */
    public static function getVerificationRequirements(): array
    {
        $config = App::getInstance(true)->getConfig();

        return [
            'require_2fa' => $config->getSetting(ConfigInterface::USER_ACCOUNT_DELETION_VERIFY_2FA, 'true') === 'true',
            'require_email_otp' => $config->getSetting(ConfigInterface::USER_ACCOUNT_DELETION_VERIFY_EMAIL_OTP, 'true') === 'true',
        ];
    }

    public static function isFeatureEnabled(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(
            ConfigInterface::USER_ALLOW_ACCOUNT_DELETION,
            'false'
        ) === 'true';
    }
}
