<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
     * Get comprehensive system analytics dashboard.
     *
     * @return array Complete system statistics
     */
    public static function getSystemDashboard(): array
    {
        return [
            'mail_queue' => self::getMailQueueStats(),
        ];
    }
}
