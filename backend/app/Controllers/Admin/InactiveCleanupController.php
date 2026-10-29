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

namespace App\Controllers\Admin;

use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\InactiveCleanup\InactiveCleanupPolicy;
use App\Services\InactiveCleanup\InactiveCleanupService;

/**
 * Inactive server cleanup: policy, dry-run preview, confirmed manual run,
 * per-server exemption and the list of archives kept after deletion.
 */
class InactiveCleanupController
{
    public function settings(Request $request): Response
    {
        return ApiResponse::success([
            'policy' => InactiveCleanupPolicy::get(),
            'armed' => InactiveCleanupPolicy::actionArmed(InactiveCleanupPolicy::get()),
            'archive_available' => (new InactiveCleanupService())->archiveAvailable(),
        ], 'Inactive cleanup settings loaded');
    }

    public function updateSettings(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        $current = InactiveCleanupPolicy::get();
        $input = array_merge($current, array_intersect_key($data, InactiveCleanupPolicy::defaults()));
        unset($input['confirmed_action'], $input['confirmed_at']);
        $action = in_array($input['action'] ?? null, InactiveCleanupPolicy::ACTIONS, true) ? $input['action'] : 'notify';

        if ($action === 'archive' && !(new InactiveCleanupService())->archiveAvailable()) {
            return ApiResponse::error('Archiving needs S3 backup storage used by default (Admin, Settings, Backup Storage)', 'INACTIVE_CLEANUP_ARCHIVE_NEEDS_S3', 422);
        }
        if (in_array($action, InactiveCleanupPolicy::DESTRUCTIVE, true)) {
            $confirm = $data['confirm_action'] ?? null;
            if ($confirm === $action) {
                $input['confirmed_action'] = $action;
                $input['confirmed_at'] = gmdate('Y-m-d H:i:s');
            } elseif ($current['confirmed_action'] === $action) {
                $input['confirmed_action'] = $current['confirmed_action'];
                $input['confirmed_at'] = $current['confirmed_at'];
            } else {
                return ApiResponse::error('Confirm the ' . $action . ' action before saving it', 'INACTIVE_CLEANUP_CONFIRM_REQUIRED', 422);
            }
        }
        if (!InactiveCleanupPolicy::save($input)) {
            return ApiResponse::error('Failed to save the inactive cleanup settings', 'INACTIVE_CLEANUP_SAVE_FAILED', 500);
        }
        $saved = InactiveCleanupPolicy::get();
        $this->log($request, 'inactive_cleanup_settings_update', sprintf(
            'Inactive cleanup %s: action %s after %d days, grace %d days%s',
            $saved['enabled'] ? 'on' : 'off',
            $saved['action'],
            $saved['inactive_days'],
            $saved['grace_days'],
            $saved['confirmed_action'] !== null ? ' (confirmed ' . $saved['confirmed_action'] . ')' : ''
        ));

        return ApiResponse::success([
            'policy' => $saved,
            'armed' => InactiveCleanupPolicy::actionArmed($saved),
            'archive_available' => (new InactiveCleanupService())->archiveAvailable(),
        ], 'Inactive cleanup settings saved');
    }

    /** Dry run: what a run would do now. Changes nothing. */
    public function preview(Request $request): Response
    {
        $plan = (new InactiveCleanupService())->plan();
        $plan['total'] = count($plan['items']);
        $plan['items'] = array_slice($plan['items'], 0, 500);

        return ApiResponse::success($plan, 'Inactive cleanup preview');
    }

    /** Run the previewed plan; refused when the plan changed since the preview. */
    public function run(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        $token = is_array($data) ? (string) ($data['token'] ?? '') : '';
        if ($token === '') {
            return ApiResponse::error('Preview the run and confirm it first', 'INACTIVE_CLEANUP_PREVIEW_REQUIRED', 400);
        }
        $policy = InactiveCleanupPolicy::get();
        $service = new InactiveCleanupService($policy);
        $plan = $service->plan();
        if (!hash_equals($plan['token'], $token)) {
            return ApiResponse::error('The servers changed since the preview. Preview again before running.', 'INACTIVE_CLEANUP_PLAN_CHANGED', 409);
        }
        $result = $service->execute($plan, InactiveCleanupPolicy::actionArmed($policy), $request->attributes->get('user'));
        $this->log($request, 'inactive_cleanup_run', 'Ran inactive cleanup: ' . json_encode($result['applied']) . ', failed ' . $result['failed'] . ', deferred ' . $result['deferred']);

        return ApiResponse::success($result, 'Inactive cleanup finished');
    }

    public function setExempt(Request $request, int $id): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('exempt', $data) || !is_bool($data['exempt'])) {
            return ApiResponse::error('Send exempt as true or false', 'INVALID_REQUEST_BODY', 400);
        }
        $server = Server::getServerById($id);
        if ($server === null) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        $fields = ['inactivity_exempt' => $data['exempt'] ? 1 : 0];
        if ($data['exempt'] && in_array($server['inactivity_stage'], [InactiveCleanupService::STAGE_WARNED, InactiveCleanupService::STAGE_ARCHIVE_FAILED], true)) {
            $fields['inactivity_stage'] = null;
            $fields['inactivity_stage_at'] = null;
        }
        if (!Server::updateServerById($id, $fields)) {
            return ApiResponse::error('Failed to update the server', 'INACTIVE_CLEANUP_SAVE_FAILED', 500);
        }
        $this->log($request, 'inactive_cleanup_exempt', ($data['exempt'] ? 'Exempted ' : 'Removed exemption for ') . $server['name'] . ' (#' . $id . ') from inactive cleanup');

        return ApiResponse::success(['exempt' => $data['exempt']], 'Saved');
    }

    public function serverStatus(Request $request, int $id): Response
    {
        $server = Server::getServerById($id);
        if ($server === null) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }
        $stmt = Database::getPdoConnection()->prepare('SELECT MAX(timestamp) FROM featherpanel_server_activities WHERE server_id = :id AND user_id IS NOT NULL');
        $stmt->execute(['id' => $id]);
        $last = $stmt->fetchColumn() ?: null;

        return ApiResponse::success([
            'exempt' => (int) ($server['inactivity_exempt'] ?? 0) === 1,
            'stage' => $server['inactivity_stage'] ?? null,
            'stage_at' => $server['inactivity_stage_at'] ?? null,
            'last_activity_at' => $last ?? $server['created_at'],
            'policy' => InactiveCleanupPolicy::get(),
        ], 'Inactive cleanup status');
    }

    public function archives(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $pdo = Database::getPdoConnection();
        $total = (int) $pdo->query('SELECT COUNT(*) FROM featherpanel_server_archives')->fetchColumn();
        $stmt = $pdo->prepare('SELECT a.id, a.server_uuid, a.server_name, a.owner_id, u.username AS owner_username, a.node_id, a.backup_uuid, a.backup_disk, a.bytes, a.last_activity_at, a.created_at
            FROM featherpanel_server_archives a LEFT JOIN featherpanel_users u ON u.id = a.owner_id ORDER BY a.id DESC LIMIT ' . $limit . ' OFFSET ' . (($page - 1) * $limit));
        $stmt->execute();

        return ApiResponse::success([
            'items' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
        ], 'Server archives loaded');
    }

    private function log(Request $request, string $name, string $context): void
    {
        $user = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $user['uuid'] ?? null,
            'name' => $name,
            'context' => mb_substr($context, 0, 500),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
