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

use App\App;
use App\Chat\User;
use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;
use App\Chat\HostingPackage;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\WebSpaceSchedule;
use App\Helpers\DnsProvisioner;
use App\Helpers\WebSpacePresenter;
use App\Helpers\WebSpaceDaemonSync;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\WebSpaceScheduleTasks;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\WebSpaceHostingMaturity;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\WebSpaceInfrastructureReadiness;

/**
 * Admin CRUD for WebSpaces — persists on the panel, then tells FeatherQuilld to pull.
 */
class WebSpacesController
{
    #[OA\Get(path: '/api/admin/webspaces', summary: 'List WebSpaces', tags: ['Admin - WebSpaces'])]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = max(1, min(200, (int) $request->query->get('limit', 50)));
        $nodeId = (int) $request->query->get('web_node_id', 0);
        $ownerId = (int) $request->query->get('owner_id', 0);
        $search = $request->query->get('search');
        $searchFilter = is_string($search) && trim($search) !== '' ? trim($search) : null;
        $nodeFilter = $nodeId > 0 ? $nodeId : null;
        $ownerFilter = $ownerId > 0 ? $ownerId : null;

        $total = WebSpace::countAll($searchFilter, $nodeFilter, $ownerFilter);
        $totalPages = max(1, (int) ceil($total / $limit));
        $from = $total === 0 ? 0 : (($page - 1) * $limit) + 1;
        $to = min($page * $limit, $total);

        return ApiResponse::success([
            'webspaces' => WebSpace::listAll($page, $limit, $searchFilter, $nodeFilter, $ownerFilter),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
        ], 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/webspaces/infrastructure-readiness', summary: 'WebSpace infrastructure readiness', tags: ['Admin - WebSpaces'])]
    public function infrastructureReadiness(Request $request): Response
    {
        $webNodeId = (int) $request->query->get('web_node_id', 0);
        $ssl = filter_var($request->query->get('ssl', false), FILTER_VALIDATE_BOOLEAN);
        $databaseLimit = max(0, (int) $request->query->get('database_limit', 0));
        $mailboxLimit = max(0, (int) $request->query->get('mailbox_limit', 0));
        $hasDomains = filter_var($request->query->get('has_domains', false), FILTER_VALIDATE_BOOLEAN);

        $payload = WebSpaceInfrastructureReadiness::inspect(
            $webNodeId > 0 ? $webNodeId : null,
            $ssl,
            $databaseLimit,
            $mailboxLimit,
            $hasDomains,
        );

        return ApiResponse::success($payload, 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/webspaces/hosting-maturity', summary: 'Web hosting platform maturity', tags: ['Admin - WebSpaces'])]
    public function hostingMaturity(Request $request): Response
    {
        $webNodeId = (int) $request->query->get('web_node_id', 0);
        $payload = WebSpaceHostingMaturity::assess($webNodeId > 0 ? $webNodeId : null);

        return ApiResponse::success($payload, 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/webspaces/hosting-setup/wizard', summary: 'Admin first-node setup wizard steps', tags: ['Admin - WebSpaces'])]
    public function hostingSetupWizard(Request $request): Response
    {
        $webNodeId = (int) $request->query->get('web_node_id', 0);
        $payload = WebSpaceHostingMaturity::wizardSteps($webNodeId > 0 ? $webNodeId : null);

        return ApiResponse::success($payload, 'OK', 200);
    }

    public function installPanelWebmail(Request $request): Response
    {
        try {
            \App\Helpers\Roundcube::ensureInstalled();
        } catch (\Throwable $e) {
            return ApiResponse::error('Webmail install failed: ' . $e->getMessage(), 'WEBMAIL_INSTALL_FAILED', 500);
        }

        return ApiResponse::success([
            'installed' => \App\Helpers\Roundcube::isInstalled(),
        ], 'Panel webmail installed', 200);
    }

    #[OA\Get(path: '/api/admin/webspaces/{uuid}', summary: 'Get WebSpace', tags: ['Admin - WebSpaces'])]
    public function show(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        return ApiResponse::success(WebSpacePresenter::forAdmin($space), 'OK', 200);
    }

    #[OA\Patch(path: '/api/admin/webspaces/{uuid}', summary: 'Update WebSpace settings', tags: ['Admin - WebSpaces'])]
    public function update(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $fields = [];
        if (array_key_exists('name', $content)) {
            $fields['name'] = trim((string) $content['name']);
        }
        if (array_key_exists('description', $content)) {
            $fields['description'] = (string) $content['description'];
        }
        if (array_key_exists('domains', $content)) {
            $fields['domains'] = $content['domains'];
        }
        if (array_key_exists('ssl', $content)) {
            $fields['ssl'] = !empty($content['ssl']);
        }
        if (array_key_exists('disk', $content)) {
            $fields['disk'] = (int) $content['disk'];
        }
        if (array_key_exists('cpu_limit', $content)) {
            $fields['cpu_limit'] = max(0, (float) $content['cpu_limit']);
        }
        if (array_key_exists('memory_limit', $content)) {
            $fields['memory_limit'] = max(0, (int) $content['memory_limit']);
        }
        if (array_key_exists('bandwidth_limit_gb', $content)) {
            $fields['bandwidth_limit_gb'] = $content['bandwidth_limit_gb'] === null || $content['bandwidth_limit_gb'] === ''
                ? null
                : max(0, (int) $content['bandwidth_limit_gb']);
        }
        if (array_key_exists('waf_enabled', $content)) {
            $fields['waf_enabled'] = !empty($content['waf_enabled']) ? 1 : 0;
        }
        if (array_key_exists('waf_deny_ips', $content)) {
            $fields['waf_deny_ips'] = $content['waf_deny_ips'];
        }
        if (array_key_exists('database_limit', $content)) {
            $fields['database_limit'] = max(0, (int) $content['database_limit']);
        }
        if (array_key_exists('mailbox_limit', $content)) {
            $fields['mailbox_limit'] = max(0, (int) $content['mailbox_limit']);
        }
        if (array_key_exists('document_root', $content)) {
            $fields['document_root'] = trim((string) $content['document_root']);
        }
        if (array_key_exists('webplate_id', $content)) {
            $fields['webplate_id'] = (int) $content['webplate_id'];
        }
        if (array_key_exists('domain_routes', $content) && is_array($content['domain_routes'])) {
            $fields['domain_routes'] = $content['domain_routes'];
        }
        if (array_key_exists('ssl_mode', $content)) {
            $fields['ssl_mode'] = trim((string) $content['ssl_mode']);
        }
        if (array_key_exists('backend_host', $content)) {
            $fields['backend_host'] = trim((string) $content['backend_host']);
        }

        if ($fields === []) {
            return ApiResponse::error('No updatable fields provided', 'MISSING_FIELDS', 400);
        }

        $previousSpace = $space;

        if (isset($fields['webplate_id'])) {
            $newPlateId = (int) $fields['webplate_id'];
            $newPlate = WebPlate::getById($newPlateId);
            if (!$newPlate) {
                return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
            }
            $currentPlate = WebPlate::getById((int) $space['webplate_id']);
            $currentRuntime = strtolower(trim((string) ($currentPlate['runtime'] ?? 'static')));
            $newRuntime = strtolower(trim((string) ($newPlate['runtime'] ?? 'static')));
            if (!WebPlate::runtimeFamiliesMatch($currentRuntime, $newRuntime)) {
                return ApiResponse::error(
                    'WebPlate runtime family must match the current WebSpace (e.g. php → php only)',
                    'RUNTIME_FAMILY_MISMATCH',
                    400,
                );
            }
            $fields['image'] = (string) ($newPlate['docker_image'] ?? '');
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $sslEnabled = array_key_exists('ssl', $fields) ? (bool) $fields['ssl'] : !empty($space['ssl']);
        if ($sslEnabled && !WebSpaceInfrastructureReadiness::hasAcmeContact($space, $webNode)) {
            return ApiResponse::error(
                'The site owner\'s account email is required when SSL is enabled (or set a fallback acmeEmail on the web node)',
                'MISSING_ACME_EMAIL',
                400,
            );
        }

        if (!WebSpace::update($uuid, $fields)) {
            return ApiResponse::error('Failed to update WebSpace', 'UPDATE_FAILED', 500);
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        $daemon = WebSpaceDaemonSync::syncAfterUpdate($webNode, $space, $previousSpace);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                'WebSpace saved on panel but daemon sync failed: ' . ($daemon['error'] ?? 'unknown'),
                'DAEMON_SYNC_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.settings.updated', [
            'fields' => array_keys($fields),
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceUpdated(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            [
                'changed_fields' => array_keys($fields),
                'context' => ['source' => 'admin'],
            ],
        ));

        $body = is_array($daemon['sync']['body'] ?? null) ? $daemon['sync']['body'] : [];

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
            'runtime_recreated' => isset($daemon['recreate']),
        ], 'WebSpace updated', 200);
    }

    #[OA\Put(path: '/api/admin/webspaces', summary: 'Create WebSpace on panel + daemon', tags: ['Admin - WebSpaces'])]
    public function create(Request $request): Response
    {
        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $content = HostingPackage::applyToCreatePayload($content);

        $name = trim((string) ($content['name'] ?? ''));
        $webNodeId = (int) ($content['web_node_id'] ?? 0);
        $webplateId = (int) ($content['webplate_id'] ?? 0);
        $hostingPackageId = isset($content['hosting_package_id']) ? (int) $content['hosting_package_id'] : 0;
        $ownerId = isset($content['owner_id']) ? (int) $content['owner_id'] : 0;
        $disk = isset($content['disk']) ? (int) $content['disk'] : 1024;
        $cpuLimit = isset($content['cpu_limit']) ? max(0, (float) $content['cpu_limit']) : 0;
        $memoryLimit = isset($content['memory_limit']) ? max(0, (int) $content['memory_limit']) : 0;
        $bandwidthLimitGb = array_key_exists('bandwidth_limit_gb', $content) && $content['bandwidth_limit_gb'] !== null && $content['bandwidth_limit_gb'] !== ''
            ? max(0, (int) $content['bandwidth_limit_gb'])
            : null;
        $databaseLimit = isset($content['database_limit']) ? max(0, (int) $content['database_limit']) : 1;
        $mailboxLimit = isset($content['mailbox_limit']) ? max(0, (int) $content['mailbox_limit']) : 0;
        $domains = $content['domains'] ?? [];
        $ssl = !empty($content['ssl']);
        $documentRoot = trim((string) ($content['document_root'] ?? ''));
        $skipScripts = !empty($content['skip_scripts']);
        $startOnCompletion = !empty($content['start_on_completion']);

        if ($name === '' || $webNodeId <= 0 || $webplateId <= 0) {
            return ApiResponse::error('name, web_node_id, and webplate_id are required', 'MISSING_FIELDS', 400);
        }

        if ($ownerId <= 0) {
            return ApiResponse::error('owner_id is required', 'MISSING_OWNER', 400);
        }

        $owner = User::getUserById($ownerId);
        if (!$owner) {
            return ApiResponse::error('Owner user not found', 'OWNER_NOT_FOUND', 400);
        }

        $webNode = WebNode::getWebNodeById($webNodeId);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        if ($ssl && !WebSpaceInfrastructureReadiness::hasAcmeContact($owner, $webNode)) {
            return ApiResponse::error(
                'The site owner\'s account email is required when SSL is enabled (or set a fallback acmeEmail on the web node)',
                'MISSING_ACME_EMAIL',
                400,
            );
        }

        $plate = WebPlate::getById($webplateId);
        if (!$plate) {
            return ApiResponse::error('WebPlate not found', 'WEBPLATE_NOT_FOUND', 404);
        }

        $runtime = strtolower(trim((string) ($plate['runtime'] ?? 'static')));
        $hostingGate = WebSpaceInfrastructureReadiness::blockingForCreate($webNodeId, $ssl, $runtime);
        if (!$hostingGate['ready']) {
            return ApiResponse::error(
                'Web hosting infrastructure is not ready on the selected web node',
                'HOSTING_NOT_READY',
                400,
                [
                    'blocking_checks' => $hostingGate['checks'],
                    'readiness' => $hostingGate['inspection'],
                ],
            );
        }

        if ($documentRoot === '') {
            $documentRoot = (string) ($plate['document_root'] ?? 'public');
        }

        $uuid = !empty($content['uuid']) && WebSpace::isValidUuid((string) $content['uuid'])
            ? (string) $content['uuid']
            : null;

        $id = WebSpace::create([
            'uuid' => $uuid,
            'name' => $name,
            'description' => (string) ($content['description'] ?? ''),
            'web_node_id' => $webNodeId,
            'webplate_id' => $webplateId,
            'hosting_package_id' => $hostingPackageId > 0 ? $hostingPackageId : null,
            'disk' => max(1, $disk),
            'cpu_limit' => $cpuLimit,
            'memory_limit' => $memoryLimit,
            'bandwidth_limit_gb' => $bandwidthLimitGb,
            'database_limit' => $databaseLimit,
            'mailbox_limit' => $mailboxLimit,
            'domains' => $domains,
            'ssl' => $ssl,
            'document_root' => $documentRoot,
            'image' => (string) ($content['image'] ?? $plate['docker_image'] ?? ''),
            'status' => 'installing',
            'owner_id' => $ownerId,
            'backend_port' => isset($content['backend_port']) ? (int) $content['backend_port'] : 0,
        ]);

        if ($id === false) {
            return ApiResponse::error('Failed to create WebSpace', 'CREATE_FAILED', 500);
        }

        $space = WebSpace::getById($id);
        if (!$space) {
            return ApiResponse::error('WebSpace created but could not be reloaded', 'CREATE_FAILED', 500);
        }

        // Wings-style: panel POSTs only uuid; daemon pulls config + install from quilld-remote.
        $daemon = FeatherQuilldClient::createWebSpace(
            $webNode,
            (string) $space['uuid'],
            $startOnCompletion,
            $skipScripts,
        );

        if (!$daemon['ok']) {
            WebSpace::updateStatus((string) $space['uuid'], 'daemon_sync_failed');
            $space = WebSpace::getByUuid((string) $space['uuid']) ?? $space;

            return ApiResponse::error(
                'WebSpace saved on panel but daemon sync failed: ' . ($daemon['error'] ?? 'unknown'),
                'DAEMON_SYNC_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $daemonStatus = (int) ($daemon['status'] ?? 0);

        if ($daemonStatus === 202 || (($body['status'] ?? '') === 'installing')) {
            WebSpace::updateStatus((string) $space['uuid'], 'installing');
            if (isset($body['state'])) {
                WebSpace::updateRuntimeState(
                    (string) $space['uuid'],
                    (string) $body['state'],
                    isset($body['backend_port']) ? (int) $body['backend_port'] : null,
                );
            }

            $space = WebSpace::getByUuid((string) $space['uuid']) ?? $space;

            $seededSchedules = 0;
            $defaults = WebSpaceScheduleTasks::validateAndNormalizeSchedules(WebPlate::getDefaultSchedules($plate));
            if (is_array($defaults) && $defaults !== []) {
                $seededSchedules = WebSpaceSchedule::seedFromDefaults((int) $space['id'], $defaults);
            }

            $user = $request->attributes->get('user');
            WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceCreated(), WebSpacePluginEvents::basePayload(
                is_array($user) ? ($user['uuid'] ?? null) : null,
                $space,
                ['context' => ['source' => 'admin', 'seeded_schedules' => $seededSchedules, 'installing' => true]],
            ));

            return ApiResponse::success([
                'webspace' => $space,
                'daemon' => $body,
                'seeded_schedules' => $seededSchedules,
                'installing' => true,
            ], 'WebSpace install started', 202);
        }

        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                (string) $space['uuid'],
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }
        if (isset($body['status'])) {
            WebSpace::updateStatus((string) $space['uuid'], (string) $body['status']);
        } else {
            WebSpace::updateStatus((string) $space['uuid'], 'installed');
        }

        $space = WebSpace::getByUuid((string) $space['uuid']) ?? $space;

        $seededSchedules = 0;
        $defaults = WebSpaceScheduleTasks::validateAndNormalizeSchedules(WebPlate::getDefaultSchedules($plate));
        if (is_array($defaults) && $defaults !== []) {
            $seededSchedules = WebSpaceSchedule::seedFromDefaults((int) $space['id'], $defaults);
            if ($seededSchedules > 0) {
                $sync = FeatherQuilldClient::syncWebSpaceSchedules($webNode, (string) $space['uuid']);
                if (!$sync['ok']) {
                    App::getInstance(true)->getLogger()->warning(
                        'WebSpace created but default schedule sync failed for ' . ($space['uuid'] ?? '?') .
                        ': ' . ($sync['error'] ?? 'unknown'),
                    );
                }
            }
        }

        $user = $request->attributes->get('user');
        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceCreated(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            ['context' => ['source' => 'admin', 'seeded_schedules' => $seededSchedules]],
        ));

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
            'seeded_schedules' => $seededSchedules,
        ], 'WebSpace created', 201);
    }

    #[OA\Delete(path: '/api/admin/webspaces/{uuid}', summary: 'Delete WebSpace', tags: ['Admin - WebSpaces'])]
    public function delete(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        $daemonError = null;

        if ($webNode) {
            $daemon = FeatherQuilldClient::deleteWebSpace($webNode, $uuid);
            if (!$daemon['ok'] && ($daemon['status'] ?? 0) !== 404) {
                $daemonError = $daemon['error'] ?? 'daemon delete failed';
            }
        }

        if (!WebSpace::deleteByUuid($uuid)) {
            return ApiResponse::error('Failed to delete WebSpace', 'DELETE_FAILED', 500);
        }

        $user = $request->attributes->get('user');
        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceDeleted(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            ['context' => ['source' => 'admin', 'daemon_error' => $daemonError]],
        ));

        return ApiResponse::success([
            'uuid' => $uuid,
            'daemon_error' => $daemonError,
        ], 'WebSpace deleted', 200);
    }

    public function power(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $action = strtolower(trim((string) ($content['action'] ?? '')));
        if (!in_array($action, ['start', 'stop', 'restart', 'kill'], true)) {
            return ApiResponse::error('action must be start, stop, restart, or kill', 'INVALID_ACTION', 400);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::powerWebSpace($webNode, $uuid, $action);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon power action failed',
                'DAEMON_POWER_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'OK', 200);
    }

    public function status(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceStatus($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon status failed',
                'DAEMON_STATUS_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
            $space = WebSpace::getByUuid($uuid) ?? $space;
        }

        return ApiResponse::success([
            'webspace' => $space,
            'status' => $body,
        ], 'OK', 200);
    }

    public function logs(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $lines = max(1, min(5000, (int) $request->query->get('lines', 100)));
        $daemon = FeatherQuilldClient::getWebSpaceLogs($webNode, $uuid, $lines);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon logs failed',
                'DAEMON_LOGS_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : ['data' => (string) $daemon['body']];

        return ApiResponse::success($body, 'OK', 200);
    }

    public function resetBandwidth(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::resetWebSpaceBandwidth($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon bandwidth reset failed',
                'DAEMON_BANDWIDTH_RESET_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['bandwidth_used_bytes'])) {
            WebSpace::updateBandwidthUsage($uuid, (int) $body['bandwidth_used_bytes']);
        }

        return ApiResponse::success($body, 'Bandwidth usage reset', 200);
    }

    public function installLogs(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceInstallLogs($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon install logs failed',
                'DAEMON_INSTALL_LOGS_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : ['data' => (string) $daemon['body']];

        return ApiResponse::success($body, 'OK', 200);
    }

    public function reinstall(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        $wipeFiles = array_key_exists('wipe_files', $content) ? (bool) $content['wipe_files'] : true;
        $startOnCompletion = !empty($content['start_on_completion']);

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        WebSpace::updateStatus($uuid, 'reinstalling');

        $daemon = FeatherQuilldClient::reinstallWebSpace($webNode, $uuid, $wipeFiles, $startOnCompletion);
        if (!$daemon['ok']) {
            WebSpace::updateStatus($uuid, 'reinstall_failed');

            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon reinstall failed',
                'DAEMON_REINSTALL_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }
        if (isset($body['status'])) {
            WebSpace::updateStatus($uuid, (string) $body['status']);
        } else {
            WebSpace::updateStatus($uuid, 'installed');
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'OK', 200);
    }

    public function sync(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::syncWebSpace($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon sync failed',
                'DAEMON_SYNC_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'Config synced from panel', 200);
    }

    public function abortInstall(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::abortWebSpaceInstall($webNode, $uuid);
        if (!$daemon['ok']) {
            $status = (int) ($daemon['status'] ?? 502);
            if ($status === 404) {
                return ApiResponse::error(
                    'No install in progress on the daemon',
                    'INSTALL_NOT_IN_PROGRESS',
                    404,
                );
            }

            return ApiResponse::error(
                $daemon['error'] ?? 'Install abort failed',
                'INSTALL_ABORT_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        WebSpace::updateStatus($uuid, 'installation_failed');
        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'aborted' => true,
        ], 'Install aborted', 200);
    }

    public function recreateRuntime(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::recreateRuntime($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon recreate failed',
                'DAEMON_RECREATE_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        if (isset($body['state'])) {
            WebSpace::updateRuntimeState(
                $uuid,
                (string) $body['state'],
                isset($body['backend_port']) ? (int) $body['backend_port'] : null,
            );
        }
        if (isset($body['status'])) {
            WebSpace::updateStatus($uuid, (string) $body['status']);
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'daemon' => $body,
        ], 'Runtime recreated', 200);
    }

    public function ssl(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getWebSpaceSsl($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon SSL status failed',
                'DAEMON_SSL_FAILED',
                502,
                [
                    'webspace' => $space,
                    'daemon' => $daemon,
                ],
            );
        }

        return ApiResponse::success([
            'webspace' => $space,
            'ssl' => is_array($daemon['body']) ? $daemon['body'] : $daemon['body'],
        ], 'OK', 200);
    }

    public function renewSsl(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::renewWebSpaceSsl($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon SSL renew failed',
                'DAEMON_SSL_RENEW_FAILED',
                ($daemon['status'] ?? 0) >= 400 && ($daemon['status'] ?? 0) < 500 ? (int) $daemon['status'] : 502,
                ['daemon' => $daemon],
            );
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.ssl.renewed', []);

        return ApiResponse::success([
            'webspace' => $space,
            'ssl' => is_array($daemon['body']) ? $daemon['body'] : $daemon['body'],
        ], 'SSL renew started', 200);
    }

    public function checkDns(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $nodeIp = trim((string) ($webNode['fqdn'] ?? $webNode['ip'] ?? ''));
        // Prefer explicit public IP when present; fall back to resolving FQDN.
        $expectedIps = [];
        foreach (['public_ip', 'ip', 'fqdn'] as $key) {
            $val = trim((string) ($webNode[$key] ?? ''));
            if ($val === '') {
                continue;
            }
            if (filter_var($val, FILTER_VALIDATE_IP)) {
                $expectedIps[] = $val;
            } else {
                $resolved = @gethostbynamel($val) ?: [];
                foreach ($resolved as $ip) {
                    $expectedIps[] = $ip;
                }
            }
        }
        $expectedIps = array_values(array_unique($expectedIps));

        $domains = $space['domains'] ?? [];
        if (is_string($domains)) {
            $decoded = json_decode($domains, true);
            $domains = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($domains)) {
            $domains = [];
        }

        $results = [];
        $allOk = true;
        foreach ($domains as $domain) {
            $domain = strtolower(trim((string) $domain));
            if ($domain === '') {
                continue;
            }
            $resolved = @gethostbynamel($domain) ?: [];
            $ok = false;
            foreach ($resolved as $ip) {
                if (in_array($ip, $expectedIps, true)) {
                    $ok = true;
                    break;
                }
            }
            if (!$ok) {
                $allOk = false;
            }
            $results[] = [
                'domain' => $domain,
                'resolved' => $resolved,
                'ok' => $ok,
            ];
        }

        $status = $allOk && $results !== [] ? 'dns_ok' : 'dns_error';
        WebSpace::updateDnsStatus($uuid, $status);

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'dns_status' => $status,
            'expected_ips' => $expectedIps,
            'results' => $results,
            'guidance' => array_map(static function (array $row) use ($expectedIps): array {
                $expected = $expectedIps !== [] ? implode(', ', $expectedIps) : '(configure web node IP/FQDN)';

                return [
                    'domain' => $row['domain'],
                    'ok' => $row['ok'],
                    'record_type' => 'A',
                    'expected_value' => $expected,
                    'current_value' => $row['resolved'] !== [] ? implode(', ', $row['resolved']) : '(none)',
                    'hint' => $row['ok']
                        ? 'DNS looks correct for this web node.'
                        : 'Create an A record for this domain pointing to: ' . $expected,
                ];
            }, $results),
            'node_hint' => $nodeIp,
        ], 'OK', 200);
    }

    #[OA\Post(path: '/api/admin/webspaces/{uuid}/dns/provision', summary: 'Provision DNS A records', tags: ['Admin - WebSpaces'])]
    public function provisionDns(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $domains = DnsProvisioner::collectProvisionDomains($space);
        if ($domains === []) {
            return ApiResponse::error('No domains configured on this WebSpace', 'NO_DOMAINS', 400);
        }

        $result = DnsProvisioner::provisionARecords($webNode, $domains, $space);
        if (!$result['ok']) {
            return ApiResponse::error(
                'DNS provision failed — link a DNS zone or configure DNS credentials on the web node',
                'DNS_PROVISION_FAILED',
                502,
                $result,
            );
        }

        return ApiResponse::success($result, 'DNS records provisioned', 200);
    }

    #[OA\Get(path: '/api/admin/webspaces/{uuid}/ssl/custom', summary: 'Custom SSL status', tags: ['Admin - WebSpaces'])]
    public function customSslStatus(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::getCustomSsl($webNode, $uuid);

        return $daemon['ok']
            ? ApiResponse::success($daemon['body'], 'OK', 200)
            : ApiResponse::error($daemon['error'] ?? 'Daemon request failed', 'DAEMON_ERROR', 502);
    }

    public function uploadCustomSsl(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $cert = $request->files->get('cert');
        $key = $request->files->get('key');
        if ($cert === null || $key === null) {
            return ApiResponse::error('cert and key files are required', 'MISSING_FILES', 400);
        }

        $daemon = FeatherQuilldClient::uploadCustomSsl(
            $webNode,
            $uuid,
            $cert->getPathname(),
            $key->getPathname(),
        );
        if (!$daemon['ok']) {
            return ApiResponse::error($daemon['error'] ?? 'Upload failed', 'DAEMON_ERROR', 502);
        }

        WebSpace::update($uuid, ['ssl' => true, 'ssl_mode' => 'custom']);

        return ApiResponse::success($daemon['body'], 'Custom SSL uploaded', 200);
    }

    public function deleteCustomSsl(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::deleteCustomSsl($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error($daemon['error'] ?? 'Delete failed', 'DAEMON_ERROR', 502);
        }

        WebSpace::update($uuid, ['ssl_mode' => 'acme']);

        return ApiResponse::success($daemon['body'], 'Custom SSL removed', 200);
    }

    public function listBackups(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::listWebSpaceBackups($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error($daemon['error'] ?? 'Daemon backup list failed', 'DAEMON_BACKUP_LIST_FAILED', 502, ['daemon' => $daemon]);
        }

        return ApiResponse::success([
            'backups' => is_array($daemon['body']) ? $daemon['body'] : [],
            'panel_backups' => \App\Chat\WebSpaceBackup::listByWebSpaceId((int) $space['id']),
        ], 'OK', 200);
    }

    public function reconcileBackups(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::reconcileWebSpaceBackups($webNode, $uuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon backup reconcile failed',
                'DAEMON_BACKUP_RECONCILE_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.reconciled', [
            'reconciled' => $body['reconciled'] ?? null,
        ]);

        return ApiResponse::success([
            'reconciled' => $body['reconciled'] ?? 0,
        ], 'OK', 200);
    }

    public function createBackup(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            $content = [];
        }

        try {
            \App\Helpers\WebSpaceDatabaseDumpService::writeDumpsToWebSpace($space);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('WebSpace DB dump before backup failed: ' . $e->getMessage());
        }

        $daemon = FeatherQuilldClient::createWebSpaceBackup($webNode, $uuid, [
            'stop_during_backup' => !empty($content['stop_during_backup']),
            'async' => !isset($content['async']) || !empty($content['async']),
        ]);
        if (!$daemon['ok'] && ($daemon['status'] ?? 0) !== 202) {
            return ApiResponse::error($daemon['error'] ?? 'Daemon backup failed', 'DAEMON_BACKUP_FAILED', 502, ['daemon' => $daemon]);
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $jobId = (string) ($body['job_id'] ?? '');

        if (($daemon['status'] ?? 0) === 202 && $jobId !== '') {
            $user = $request->attributes->get('user');
            WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.started', [
                'job_id' => $jobId,
            ]);

            WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceBackupCreated(), WebSpacePluginEvents::basePayload(
                is_array($user) ? ($user['uuid'] ?? null) : null,
                $space,
                [
                    'backup_uuid' => null,
                    'context' => ['source' => 'admin', 'async' => true, 'job_id' => $jobId],
                ],
            ));

            return ApiResponse::success([
                'job' => $body,
                'job_id' => $jobId,
                'phase' => $body['phase'] ?? 'running',
            ], 'Backup job accepted', 202);
        }

        $backupUuid = (string) ($body['uuid'] ?? '');
        if ($backupUuid !== '') {
            \App\Chat\WebSpaceBackup::create([
                'uuid' => $backupUuid,
                'webspace_id' => (int) $space['id'],
                'bytes' => (int) ($body['bytes'] ?? 0),
                'checksum' => $body['checksum'] ?? null,
                'status' => 'completed',
            ]);
            \App\Chat\WebSpaceBackup::markCompleted($backupUuid, (int) ($body['bytes'] ?? 0), isset($body['checksum']) ? (string) $body['checksum'] : null);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.created', [
            'backup_uuid' => $backupUuid,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceBackupCreated(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            [
                'backup_uuid' => $backupUuid !== '' ? $backupUuid : null,
                'context' => ['source' => 'admin'],
            ],
        ));

        return ApiResponse::success(['backup' => $body], 'OK', 201);
    }

    public function deleteBackup(Request $request, string $uuid, string $backupUuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::deleteWebSpaceBackup($webNode, $uuid, $backupUuid);
        if (!$daemon['ok'] && ($daemon['status'] ?? 0) !== 404) {
            return ApiResponse::error($daemon['error'] ?? 'Daemon delete backup failed', 'DAEMON_BACKUP_DELETE_FAILED', 502, ['daemon' => $daemon]);
        }

        \App\Chat\WebSpaceBackup::deleteByUuid($backupUuid);

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.deleted', [
            'backup_uuid' => $backupUuid,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceBackupDeleted(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            [
                'backup_uuid' => $backupUuid,
                'context' => ['source' => 'admin'],
            ],
        ));

        return ApiResponse::success(['uuid' => $backupUuid], 'OK', 200);
    }

    public function restoreBackup(Request $request, string $uuid, string $backupUuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        $paths = [];
        if (is_array($content) && isset($content['paths']) && is_array($content['paths'])) {
            foreach ($content['paths'] as $path) {
                $path = trim((string) $path);
                if ($path !== '') {
                    $paths[] = $path;
                }
            }
        }

        $payload = ['async' => true];
        if ($paths !== []) {
            $payload['paths'] = array_values($paths);
        }

        $daemon = FeatherQuilldClient::restoreWebSpaceBackup($webNode, $uuid, $backupUuid, $payload);
        if (!$daemon['ok'] && ($daemon['status'] ?? 0) !== 202) {
            return ApiResponse::error($daemon['error'] ?? 'Daemon restore failed', 'DAEMON_BACKUP_RESTORE_FAILED', 502, ['daemon' => $daemon]);
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $jobId = (string) ($body['job_id'] ?? '');

        if (($daemon['status'] ?? 0) === 202 && $jobId !== '') {
            $user = $request->attributes->get('user');
            WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.restore_started', [
                'backup_uuid' => $backupUuid,
                'job_id' => $jobId,
            ]);

            WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceBackupRestored(), WebSpacePluginEvents::basePayload(
                is_array($user) ? ($user['uuid'] ?? null) : null,
                $space,
                [
                    'backup_uuid' => $backupUuid,
                    'context' => ['source' => 'admin', 'async' => true, 'job_id' => $jobId],
                ],
            ));

            return ApiResponse::success([
                'job' => $body,
                'job_id' => $jobId,
            ], 'Restore job accepted', 202);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.restored', [
            'backup_uuid' => $backupUuid,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceBackupRestored(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            [
                'backup_uuid' => $backupUuid,
                'context' => ['source' => 'admin', 'async' => false],
            ],
        ));

        try {
            if ($paths === []) {
                \App\Helpers\WebSpaceDatabaseDumpService::importDumpsFromWebSpace($space);
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('WebSpace DB import after restore failed: ' . $e->getMessage());
        }

        return ApiResponse::success(['ok' => true], 'OK', 200);
    }

    public function listBackupFiles(Request $request, string $uuid, string $backupUuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $directory = (string) $request->query->get('directory', '/');
        $daemon = FeatherQuilldClient::listWebSpaceBackupFiles($webNode, $uuid, $backupUuid, $directory);
        if (!$daemon['ok']) {
            return ApiResponse::error($daemon['error'] ?? 'Failed to list backup files', 'DAEMON_BACKUP_FILES_FAILED', 502, ['daemon' => $daemon]);
        }

        return ApiResponse::success(is_array($daemon['body']) ? $daemon['body'] : [], 'OK', 200);
    }

    public function downloadBackup(Request $request, string $uuid, string $backupUuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::downloadWebSpaceBackup($webNode, $uuid, $backupUuid);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon backup download failed',
                'DAEMON_BACKUP_DOWNLOAD_FAILED',
                $daemon['status'] >= 400 && $daemon['status'] < 600 ? (int) $daemon['status'] : 502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $contents = (string) ($body['contents'] ?? '');
        $filename = (string) ($body['filename'] ?? ($backupUuid . '.tar.gz'));
        $contentType = (string) ($body['content_type'] ?? 'application/gzip');

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.downloaded', [
            'backup_uuid' => $backupUuid,
        ]);

        return new Response($contents, 200, [
            'Content-Type' => $contentType,
            'Content-Disposition' => 'attachment; filename="' . str_replace('"', '', $filename) . '"',
        ]);
    }

    public function importBackup(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $files = $request->files->all();
        $upload = $files['archive'] ?? $files['file'] ?? null;
        if ($upload === null) {
            return ApiResponse::error('No backup file uploaded (field: archive)', 'MISSING_FILE', 400);
        }

        $tmpPath = $upload->getPathname();
        $filename = $upload->getClientOriginalName() ?: 'backup.tar.gz';
        $mime = $upload->getMimeType() ?: 'application/gzip';

        $daemon = FeatherQuilldClient::importWebSpaceBackup($webNode, $uuid, $tmpPath, $filename, $mime);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Daemon backup import failed',
                'DAEMON_BACKUP_IMPORT_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        $body = is_array($daemon['body']) ? $daemon['body'] : [];
        $backupUuid = (string) ($body['uuid'] ?? '');
        if ($backupUuid !== '') {
            \App\Chat\WebSpaceBackup::create([
                'uuid' => $backupUuid,
                'webspace_id' => (int) $space['id'],
                'bytes' => (int) ($body['bytes'] ?? 0),
                'checksum' => $body['checksum'] ?? null,
                'status' => 'completed',
            ]);
            \App\Chat\WebSpaceBackup::markCompleted($backupUuid, (int) ($body['bytes'] ?? 0), isset($body['checksum']) ? (string) $body['checksum'] : null);
        }

        $user = $request->attributes->get('user');
        WebSpaceActivityLogger::log($space, is_array($user) ? $user : null, 'webspace.backup.imported', [
            'backup_uuid' => $backupUuid,
            'filename' => $filename,
        ]);

        return ApiResponse::success(['backup' => $body], 'OK', 201);
    }

    public function transfer(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $content = json_decode($request->getContent(), true);
        if (!is_array($content)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $destId = (int) ($content['dest_web_node_id'] ?? $content['destination_web_node_id'] ?? 0);
        if ($destId <= 0) {
            return ApiResponse::error('dest_web_node_id is required', 'MISSING_DEST', 400);
        }

        $startOnCompletion = array_key_exists('start_on_completion', $content)
            ? (bool) $content['start_on_completion']
            : true;
        $includeBackups = !empty($content['include_backups']);

        $result = (new \App\Services\WebSpaces\WebSpaceTransferInitiator())->initiate(
            $uuid,
            $destId,
            $startOnCompletion,
            $includeBackups,
        );

        if (!$result['success']) {
            return ApiResponse::error(
                $result['error'] ?? 'Transfer failed',
                $result['code'] ?? 'TRANSFER_FAILED',
                (int) ($result['http_status'] ?? 500),
            );
        }

        $space = WebSpace::getByUuid($uuid) ?? $space;

        return ApiResponse::success([
            'webspace' => $space,
            'transfer_id' => $result['transfer_id'] ?? null,
            'status' => $result['status'] ?? 'running',
        ], 'Transfer started', 200);
    }

    public function transferStatus(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $active = \App\Chat\WebSpaceTransfer::getActiveByUuid($uuid);
        if ($active) {
            $sourceNode = WebNode::getWebNodeById((int) $active['source_web_node_id']);
            if ($sourceNode) {
                $daemon = FeatherQuilldClient::getTransferStatus($sourceNode, $uuid);
                if ($daemon['ok'] && is_array($daemon['body'])) {
                    return ApiResponse::success([
                        'transfer_id' => (int) $active['id'],
                        'panel_status' => $active['status'],
                        'daemon' => $daemon['body'],
                    ], 'OK', 200);
                }
            }

            return ApiResponse::success([
                'transfer_id' => (int) $active['id'],
                'panel_status' => $active['status'],
                'daemon' => [
                    'uuid' => $uuid,
                    'phase' => 'running',
                ],
            ], 'OK', 200);
        }

        $latest = \App\Chat\WebSpaceTransfer::getLatestByUuid($uuid);
        if ($latest) {
            return ApiResponse::success([
                'transfer_id' => (int) $latest['id'],
                'panel_status' => $latest['status'],
                'daemon' => [
                    'uuid' => $uuid,
                    'phase' => ($latest['status'] ?? '') === 'completed' ? 'completed' : 'failed',
                    'message' => $latest['error'] ?? null,
                ],
            ], 'OK', 200);
        }

        return ApiResponse::error('No transfer found for this WebSpace', 'TRANSFER_NOT_FOUND', 404);
    }

    public function generateJwt(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ApiResponse::error('Web node is missing daemon credentials', 'MISSING_DAEMON_TOKEN', 500);
        }

        $fqdn = trim((string) ($webNode['fqdn'] ?? ''));
        if ($fqdn === '') {
            return ApiResponse::error('Web node is missing fqdn', 'MISSING_FQDN', 500);
        }

        try {
            $jwt = \App\Services\Quilld\QuilldConsoleJwt::create(
                (string) $space['uuid'],
                $tokenId,
                $token,
                \App\Services\Quilld\QuilldConsoleJwt::DEFAULT_TTL_SECONDS,
                ['*'],
                (string) ($request->attributes->get('user')['uuid'] ?? ''),
            );
            $socket = \App\Services\Quilld\QuilldConsoleJwt::buildSocketUrl($webNode, (string) $space['uuid']);

            return ApiResponse::success([
                'token' => $jwt,
                'socket' => $socket,
                'connection_string' => $socket,
            ], 'OK', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error(
                'Failed to generate JWT: ' . $e->getMessage(),
                'JWT_GENERATION_FAILED',
                500,
            );
        }
    }

    public function suspend(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if ($webNode) {
            FeatherQuilldClient::powerWebSpace($webNode, $uuid, 'stop');
        }

        WebSpace::updateStatus($uuid, 'suspended');
        $space = WebSpace::getByUuid($uuid) ?? $space;

        if ($webNode) {
            FeatherQuilldClient::syncWebSpace($webNode, $uuid);
        }

        $user = $request->attributes->get('user');
        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceSuspended(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            ['context' => ['source' => 'admin']],
        ));

        return ApiResponse::success(['webspace' => $space], 'WebSpace suspended', 200);
    }

    public function unsuspend(Request $request, string $uuid): Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        WebSpace::updateStatus($uuid, 'installed');
        $space = WebSpace::getByUuid($uuid) ?? $space;

        $webNode = WebNode::getWebNodeById((int) $space['web_node_id']);
        if ($webNode) {
            FeatherQuilldClient::syncWebSpace($webNode, $uuid);
        }

        $user = $request->attributes->get('user');
        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceUnsuspended(), WebSpacePluginEvents::basePayload(
            is_array($user) ? ($user['uuid'] ?? null) : null,
            $space,
            ['context' => ['source' => 'admin']],
        ));

        return ApiResponse::success(['webspace' => $space], 'WebSpace unsuspended', 200);
    }
}
