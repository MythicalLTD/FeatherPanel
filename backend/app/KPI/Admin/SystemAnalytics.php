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

namespace App\KPI\Admin;

use App\Chat\Database;

/**
 * System Analytics and KPI service for mail, API keys, SSH keys, plugins, and system features.
 */
class SystemAnalytics
{
    /**
     * Get mail queue statistics.
     *
     * @return array Mail queue statistics
     */
    public static function getMailQueueStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total emails
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_mail_queue WHERE deleted = 'false'");
        $total = (int) $stmt->fetchColumn();

        // By status
        $stmt = $pdo->query("
            SELECT 
                status,
                COUNT(*) as count
            FROM featherpanel_mail_queue
            WHERE deleted = 'false'
            GROUP BY status
        ");
        $byStatus = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $pending = 0;
        $sent = 0;
        $failed = 0;

        foreach ($byStatus as $item) {
            $count = (int) $item['count'];
            if ($item['status'] === 'pending') {
                $pending = $count;
            } elseif ($item['status'] === 'sent') {
                $sent = $count;
            } elseif ($item['status'] === 'failed') {
                $failed = $count;
            }
        }

        // Locked emails
        $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_mail_queue WHERE locked = 'true' AND deleted = 'false'");
        $locked = (int) $stmt->fetchColumn();

        // Emails today
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM featherpanel_mail_queue 
            WHERE DATE(created_at) = CURDATE() AND deleted = 'false'
        ");
        $today = (int) $stmt->fetchColumn();

        // Recent queued emails
        $stmt = $pdo->query("
            SELECT 
                mq.id, 
                u.email, 
                mq.subject, 
                mq.status, 
                mq.created_at
            FROM featherpanel_mail_queue mq
            LEFT JOIN featherpanel_users u ON mq.user_uuid = u.uuid
            WHERE mq.deleted = 'false'
            ORDER BY mq.created_at DESC
            LIMIT 10
        ");
        $recentQueued = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return [
            'total_queued' => $pending,
            'total_sent' => $sent,
            'total_failed' => $failed,
            'total_locked' => $locked,
            'today' => $today,
            'success_rate' => ($sent + $failed) > 0 ? round(($sent / ($sent + $failed)) * 100, 2) : 0,
            'recent_queued' => $recentQueued,
        ];
    }

    /**
     * Get feature adoption statistics for newer platform capabilities.
     *
     * @return array Feature adoption metrics
     */
    public static function getFeatureAdoptionStats(): array
    {
        $pdo = Database::getPdoConnection();

        $metrics = [
            'chatbot_conversations' => 0,
            'chatbot_messages' => 0,
            'chatbot_active_users_30d' => 0,
            'api_clients' => 0,
            'oauth2_authorizations' => 0,
            'oauth2_pending_authorizations' => 0,
            'oidc_providers' => 0,
            'oidc_enabled_providers' => 0,
        ];

        if (self::tableExists($pdo, 'featherpanel_chatbot_conversations')) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_chatbot_conversations');
            $metrics['chatbot_conversations'] = (int) $stmt->fetchColumn();

            $stmt = $pdo->query('
                SELECT COUNT(DISTINCT user_uuid)
                FROM featherpanel_chatbot_conversations
                WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ');
            $metrics['chatbot_active_users_30d'] = (int) $stmt->fetchColumn();
        }

        if (self::tableExists($pdo, 'featherpanel_chatbot_messages')) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_chatbot_messages');
            $metrics['chatbot_messages'] = (int) $stmt->fetchColumn();
        }

        if (self::tableExists($pdo, 'featherpanel_apikeys_client')) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_apikeys_client');
            $metrics['api_clients'] = (int) $stmt->fetchColumn();
        }

        if (self::tableExists($pdo, 'featherpanel_oauth2_api_authorizations')) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_oauth2_api_authorizations');
            $metrics['oauth2_authorizations'] = (int) $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_oauth2_api_authorizations WHERE status = 'pending'");
            $metrics['oauth2_pending_authorizations'] = (int) $stmt->fetchColumn();
        }

        if (self::tableExists($pdo, 'featherpanel_oidc_providers')) {
            $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_oidc_providers');
            $metrics['oidc_providers'] = (int) $stmt->fetchColumn();

            $stmt = $pdo->query("SELECT COUNT(*) FROM featherpanel_oidc_providers WHERE enabled = 'true'");
            $metrics['oidc_enabled_providers'] = (int) $stmt->fetchColumn();
        }

        $metrics['avg_messages_per_conversation'] = $metrics['chatbot_conversations'] > 0
            ? round($metrics['chatbot_messages'] / $metrics['chatbot_conversations'], 2)
            : 0;

        return $metrics;
    }

    /**
     * Get comprehensive system analytics dashboard.
     *
     * @return array Complete system statistics
     */
    public static function getSystemDashboard(): array
    {
        return [
            'mail_queue' => self::getMailQueueStats(),
            'feature_adoption' => self::getFeatureAdoptionStats(),
        ];
    }

    /**
     * Check if a table exists in the current database.
     */
    private static function tableExists(\PDO $pdo, string $tableName): bool
    {
        $stmt = $pdo->prepare('SHOW TABLES LIKE :table_name');
        $stmt->execute(['table_name' => $tableName]);

        return (bool) $stmt->fetchColumn();
    }
}
