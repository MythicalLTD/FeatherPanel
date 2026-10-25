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

namespace App\Controllers\User\Vds;

use App\App;
use App\Chat\VmIso;
use App\Chat\VmNode;
use App\Helpers\VmGateway;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Services\Vm\IsoLibrary;
use App\Chat\VmInstanceActivity;
use App\Services\Proxmox\Proxmox;
use App\Services\Vm\VmInstanceUtil;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VDS console extras: feature flags, resource history (Proxmox RRD), ISO library mounting,
 * rescue boot and snapshots. Every feature is gated by an admin setting (category "vds")
 * and by a VDS permission (owner/admin have all, subusers need the node).
 */
#[OA\Tag(name: 'User - VM Instances')]
class VmUserExtrasController
{
    public const TIMEFRAMES = ['hour', 'day', 'week', 'month', 'year'];

    private const SNAPSHOT_NAME_PATTERN = '/^[a-zA-Z][a-zA-Z0-9_\-]{1,39}$/';

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/features',
        summary: 'VDS console feature flags',
        description: 'Admin toggles and limits for console paste/screenshot, graphs, ISO mounting, rescue mode and snapshots.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'Feature flags')]
    )]
    public function getFeatures(Request $request, int $id): Response
    {
        $vmInstance = $request->attributes->get('vmInstance');
        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        $isQemu = ($vmInstance['vm_type'] ?? 'qemu') === 'qemu';
        $max = self::maxTimeframe();

        return ApiResponse::success([
            'graphs' => [
                'enabled' => self::flag(ConfigInterface::VDS_GRAPHS_ENABLED, 'true'),
                'timeframes' => array_slice(self::TIMEFRAMES, 0, array_search($max, self::TIMEFRAMES, true) + 1),
            ],
            'console' => [
                'paste_enabled' => self::flag(ConfigInterface::VDS_CONSOLE_PASTE_ENABLED, 'true'),
                'paste_max_chars' => max(1, min(20000, (int) self::setting(ConfigInterface::VDS_CONSOLE_PASTE_MAX_CHARS, '2000'))),
                'screenshot_enabled' => self::flag(ConfigInterface::VDS_CONSOLE_SCREENSHOT_ENABLED, 'true'),
                'ctrl_alt_del_enabled' => self::flag(ConfigInterface::VDS_CTRL_ALT_DEL_ENABLED, 'true'),
                'brand_name' => mb_substr(trim(self::setting(ConfigInterface::VDS_CONSOLE_BRAND_NAME, '')), 0, 64),
                'brand_logo' => self::brandLogo(),
            ],
            'iso' => self::isoFeatures($request, $id, $vmInstance, $isQemu),
            'rescue' => ['enabled' => $isQemu && self::rescueIso() !== null],
            'snapshots' => [
                'enabled' => self::flag(ConfigInterface::VDS_SNAPSHOTS_ENABLED, 'true'),
                'limit' => self::snapshotLimit($vmInstance),
                'include_ram_allowed' => $isQemu && self::flag(ConfigInterface::VDS_SNAPSHOTS_INCLUDE_RAM, 'false'),
            ],
            'firewall' => VmUserAutomationController::firewallFeatures(),
            'schedules' => VmUserAutomationController::scheduleFeatures(),
            'reauth' => \App\Services\Vm\VdsReauth::features($request),
            'bandwidth' => ['enabled' => self::flag(ConfigInterface::VDS_BANDWIDTH_ENABLED, 'true')],
        ], 'Features fetched', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/rrd',
        summary: 'VDS resource history',
        description: 'Proxies Proxmox rrddata (AVERAGE) for CPU, memory, network and disk I/O.',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'timeframe', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['hour', 'day', 'week', 'month', 'year'])),
        ],
        responses: [new OA\Response(response: 200, description: 'RRD points'), new OA\Response(response: 403, description: 'Disabled or forbidden')]
    )]
    public function getRrd(Request $request, int $id): Response
    {
        if (!self::flag(ConfigInterface::VDS_GRAPHS_ENABLED, 'true')) {
            return ApiResponse::error('Resource graphs are disabled', 'FEATURE_DISABLED', 403);
        }
        $ctx = $this->context($request, $id, 'console');
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $timeframe = (string) $request->query->get('timeframe', 'hour');
        $max = self::maxTimeframe();
        if (!in_array($timeframe, self::TIMEFRAMES, true) || array_search($timeframe, self::TIMEFRAMES, true) > array_search($max, self::TIMEFRAMES, true)) {
            return ApiResponse::error('Invalid or disallowed timeframe', 'INVALID_TIMEFRAME', 400);
        }
        $res = $ctx['client']->apiGet($this->vmPath($ctx, '/rrddata'), ['timeframe' => $timeframe, 'cf' => 'AVERAGE']);
        if (!$res['ok'] || !is_array($res['data'])) {
            return ApiResponse::error('Failed to fetch resource history from Proxmox', 'PROXMOX_ERROR', 503);
        }
        $points = [];
        foreach ($res['data'] as $row) {
            if (!is_array($row) || !isset($row['time'])) {
                continue;
            }
            $point = ['time' => (int) $row['time']];
            foreach (['cpu', 'maxcpu', 'mem', 'maxmem', 'netin', 'netout', 'diskread', 'diskwrite'] as $k) {
                $point[$k] = isset($row[$k]) && is_numeric($row[$k]) ? (float) $row[$k] : null;
            }
            $points[] = $point;
        }

        return ApiResponse::success(['timeframe' => $timeframe, 'points' => $points], 'Resource history fetched', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/isos',
        summary: 'List mountable ISOs',
        description: 'Provider ISOs (allowed storages + ISO library) and, when allowed, the user\'s own ISOs with quota and policy.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'ISO list')]
    )]
    public function listIsos(Request $request, int $id): Response
    {
        $ctx = $this->isoContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $mine = [];
        $userIsos = IsoLibrary::userIsosAllowed($ctx['instance']);
        $userId = (int) ($ctx['user']['id'] ?? 0);
        if ($userIsos) {
            $rows = IsoLibrary::refreshUserIsos($ctx['client'], VmIso::userIsosForNode($userId, (int) $ctx['instance']['vm_node_id'], $ctx['node']));
            $mine = array_map([IsoLibrary::class, 'serializeUserIso'], $rows);
        }
        $rules = IsoLibrary::userRules();

        return ApiResponse::success([
            'isos' => IsoLibrary::providerIsos($ctx['client'], $ctx['node'], $ctx['instance'], self::rescueIso()),
            'my_isos' => $mine,
            'user_isos' => $userIsos,
            'quota' => ['used' => $userIsos ? VmIso::countUserQuota($userId) : 0, 'max' => $rules['max_per_user']],
        ], 'ISOs fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/iso-mount',
        summary: 'Mount an ISO from the library',
        description: 'Mounts a provider ISO or one of the user\'s own ready+approved ISOs as ide2 cdrom and puts it first in the boot order.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [new OA\Property(property: 'volid', type: 'string')])),
        responses: [new OA\Response(response: 200, description: 'Mounted')]
    )]
    public function mountIso(Request $request, int $id): Response
    {
        $ctx = $this->isoContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $body = json_decode($request->getContent(), true);
        $volid = is_array($body) ? trim((string) ($body['volid'] ?? '')) : '';
        if ($volid === '' || !in_array($volid, $this->mountableVolids($ctx), true)) {
            return ApiResponse::error('This ISO is not available', 'ISO_NOT_ALLOWED', 400);
        }
        $err = $this->attachIso($ctx, $volid);
        if ($err !== null) {
            return ApiResponse::error($err, 'PROXMOX_UPDATE_FAILED', 503);
        }
        $this->activity($ctx, 'vm:iso.mount', ['volid' => $volid]);

        return ApiResponse::success(['mounted_iso' => ['slot' => 'ide2', 'volid' => $volid]], 'ISO mounted. Reboot the VDS to boot from it.', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/isos/upload',
        summary: 'Upload a custom ISO',
        description: 'Uploads an ISO (multipart "file", optional "name") to the admin-configured user ISO storage. Requires the iso.upload permission.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 201, description: 'Uploaded')]
    )]
    public function uploadUserIso(Request $request, int $id): Response
    {
        $ctx = $this->userIsoContext($request, $id, 'upload');
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $file = $request->files->get('file');
        if (!$file instanceof \Symfony\Component\HttpFoundation\File\UploadedFile || !$file->isValid()) {
            return ApiResponse::error('An ISO file is required (check the PHP upload_max_filesize / post_max_size limits)', 'FILE_REQUIRED', 400);
        }
        $original = (string) $file->getClientOriginalName();
        if (!str_ends_with(strtolower($original), '.iso')) {
            return ApiResponse::error('Only .iso files are allowed', 'INVALID_FILE_TYPE', 400);
        }
        $size = (int) $file->getSize();
        $max = $ctx['rules']['max_size_mb'] * 1024 * 1024;
        if ($size <= 0 || $size > $max) {
            return ApiResponse::error('The ISO must be smaller than ' . $ctx['rules']['max_size_mb'] . ' MB', 'FILE_TOO_LARGE', 413);
        }
        $fh = fopen($file->getPathname(), 'rb');
        $magic = '';
        if ($fh !== false) {
            fseek($fh, 0x8001);
            $magic = (string) fread($fh, 5);
            fclose($fh);
        }
        if ($magic !== 'CD001') {
            return ApiResponse::error('This file is not a valid ISO image', 'INVALID_ISO', 400);
        }
        $userId = (int) $ctx['user']['id'];
        $fileName = IsoLibrary::userFileName($userId, $original);
        $res = $ctx['client']->uploadIsoToStorage($ctx['node'], $ctx['storage'], $file->getPathname(), $fileName);
        if (!$res['ok']) {
            App::getInstance(true)->getLogger()->error('User ISO upload failed: ' . (string) $res['error']);

            return ApiResponse::error('Proxmox rejected the upload', 'PROXMOX_UPLOAD_FAILED', 502);
        }
        $rowId = $this->createUserIso($ctx, $request->request->get('name'), $original, [
            'volid' => $ctx['storage'] . ':iso/' . $fileName,
            'source' => 'upload',
            'size_bytes' => $size,
            'status' => 'ready',
        ]);
        if ($rowId === null) {
            return ApiResponse::error('Failed to save the ISO', 'DB_ERROR', 500);
        }
        $this->activity($ctx, 'vm:iso.upload', ['iso_id' => $rowId, 'name' => $original, 'size' => $size]);

        return ApiResponse::success(['iso' => IsoLibrary::serializeUserIso((array) VmIso::getById($rowId))], $ctx['rules']['require_approval'] ? 'ISO uploaded. It can be mounted after an administrator approves it.' : 'ISO uploaded', 201);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/isos/url',
        summary: 'Download a custom ISO from a URL',
        description: 'The Proxmox node downloads the ISO into the user ISO storage. Domain allowlist, size and quota are enforced. Requires iso.upload.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [new OA\Property(property: 'url', type: 'string'), new OA\Property(property: 'name', type: 'string')])),
        responses: [new OA\Response(response: 202, description: 'Download started')]
    )]
    public function fetchUserIso(Request $request, int $id): Response
    {
        $ctx = $this->userIsoContext($request, $id, 'url');
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $body = json_decode($request->getContent(), true);
        $url = is_array($body) ? trim((string) ($body['url'] ?? '')) : '';
        $err = IsoLibrary::validateUrl($url, $ctx['rules']['url_domains']);
        if ($err !== null) {
            return ApiResponse::error($err, 'INVALID_URL', 400);
        }
        /** @var Proxmox $client */
        $client = $ctx['client'];
        $meta = $client->queryIsoUrlMetadata($ctx['node'], $url, true);
        if (!$meta['ok']) {
            return ApiResponse::error('The URL could not be checked by the node', 'URL_CHECK_FAILED', 400);
        }
        $size = (int) ($meta['size'] ?? 0);
        if ($size > $ctx['rules']['max_size_mb'] * 1024 * 1024) {
            return ApiResponse::error('The ISO must be smaller than ' . $ctx['rules']['max_size_mb'] . ' MB', 'FILE_TOO_LARGE', 413);
        }
        $original = (string) ($meta['filename'] ?? '') !== '' ? (string) $meta['filename'] : basename((string) parse_url($url, PHP_URL_PATH));
        if (!str_ends_with(strtolower($original), '.iso')) {
            return ApiResponse::error('The URL must point to an .iso file', 'INVALID_FILE_TYPE', 400);
        }
        $fileName = IsoLibrary::userFileName((int) $ctx['user']['id'], $original);
        $dl = $client->downloadIsoUrlToStorage($ctx['node'], $ctx['storage'], $url, $fileName, true);
        if (!$dl['ok']) {
            return ApiResponse::error('The node could not start the download', 'PROXMOX_DOWNLOAD_FAILED', 502);
        }
        $rowId = $this->createUserIso($ctx, is_array($body) ? ($body['name'] ?? null) : null, $original, [
            'volid' => $ctx['storage'] . ':iso/' . $fileName,
            'source' => 'url',
            'source_url' => mb_substr($url, 0, 2048),
            'size_bytes' => $size,
            'status' => 'pending',
            'upid' => (string) ($dl['upid'] ?? ''),
        ]);
        if ($rowId === null) {
            return ApiResponse::error('Failed to save the ISO', 'DB_ERROR', 500);
        }
        $this->activity($ctx, 'vm:iso.download', ['iso_id' => $rowId, 'host' => parse_url($url, PHP_URL_HOST), 'size' => $size]);

        return ApiResponse::success(['iso' => IsoLibrary::serializeUserIso((array) VmIso::getById($rowId))], 'Download started', 202);
    }

    #[OA\Delete(
        path: '/api/user/vm-instances/{id}/isos/{isoId}',
        summary: 'Delete one of your ISOs',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'isoId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [new OA\Response(response: 200, description: 'Deleted')]
    )]
    public function deleteUserIso(Request $request, int $id, int $isoId): Response
    {
        $ctx = $this->isoContext($request, $id, 'iso.upload');
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $row = VmIso::getById($isoId);
        if ($row === null || $row['kind'] !== 'user' || (int) $row['user_id'] !== (int) $ctx['user']['id']) {
            return ApiResponse::error('ISO not found', 'ISO_NOT_FOUND', 404);
        }
        $cfg = $ctx['client']->getVmConfig($ctx['node'], $ctx['vmid'], 'qemu');
        if (str_starts_with((string) ($cfg['config']['ide2'] ?? ''), $row['volid'] . ',')) {
            return ApiResponse::error('Unmount the ISO before deleting it', 'ISO_IN_USE', 409);
        }
        if ($row['status'] !== 'failed' && !IsoLibrary::deleteVolume($ctx['client'], (string) $row['pve_node'], (string) $row['volid'])) {
            return ApiResponse::error('The ISO file could not be deleted from the node', 'PROXMOX_DELETE_FAILED', 502);
        }
        VmIso::delete($isoId);
        $this->activity($ctx, 'vm:iso.delete', ['iso_id' => $isoId, 'name' => $row['name']]);

        return ApiResponse::success([], 'ISO deleted', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/rescue',
        summary: 'Rescue mode state',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'Rescue state')]
    )]
    public function getRescue(Request $request, int $id): Response
    {
        $ctx = $this->rescueContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        return ApiResponse::success(['active' => $this->rescueActive($ctx), 'iso' => basename((string) self::rescueIso())], 'Rescue state fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/rescue',
        summary: 'Enter or leave rescue mode',
        description: 'enter: mounts the admin rescue ISO, boots from it first and restarts the VM. exit: unmounts it, restores disk boot and restarts.',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [new OA\Property(property: 'action', type: 'string', enum: ['enter', 'exit'])])),
        responses: [new OA\Response(response: 200, description: 'Done')]
    )]
    public function setRescue(Request $request, int $id): Response
    {
        $ctx = $this->rescueContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $body = json_decode($request->getContent(), true);
        $action = is_array($body) ? (string) ($body['action'] ?? '') : '';
        if (!in_array($action, ['enter', 'exit'], true)) {
            return ApiResponse::error('Invalid action. Use enter or exit.', 'INVALID_ACTION', 400);
        }

        if ($action === 'enter') {
            $err = $this->attachIso($ctx, (string) self::rescueIso());
            if ($err !== null) {
                return ApiResponse::error($err, 'PROXMOX_UPDATE_FAILED', 503);
            }
        } else {
            // Reuse the regular unmount flow (handles cloud-init seed and disk boot order).
            $res = (new VmUserInstanceController())->unmountIso($request, $id);
            if ($res->getStatusCode() >= 400) {
                return $res;
            }
        }

        $restartErr = $this->coldRestart($ctx);
        if ($restartErr !== null) {
            return ApiResponse::error($restartErr, 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:rescue.' . $action, []);

        return ApiResponse::success(['active' => $action === 'enter'], $action === 'enter' ? 'Rebooting into rescue mode' : 'Rebooting from the main disk', 200);
    }

    #[OA\Get(
        path: '/api/user/vm-instances/{id}/snapshots',
        summary: 'List snapshots',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [new OA\Response(response: 200, description: 'Snapshots')]
    )]
    public function listSnapshots(Request $request, int $id): Response
    {
        $ctx = $this->snapshotContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $list = $this->fetchSnapshots($ctx);
        if ($list === null) {
            return ApiResponse::error('Failed to fetch snapshots from Proxmox', 'PROXMOX_ERROR', 503);
        }

        return ApiResponse::success([
            'snapshots' => $list,
            'limit' => self::snapshotLimit($ctx['instance']),
            'include_ram_allowed' => $ctx['type'] === 'qemu' && self::flag(ConfigInterface::VDS_SNAPSHOTS_INCLUDE_RAM, 'false'),
        ], 'Snapshots fetched', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/snapshots',
        summary: 'Create a snapshot',
        tags: ['User - VM Instances'],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string'),
            new OA\Property(property: 'include_ram', type: 'boolean'),
        ])),
        responses: [new OA\Response(response: 200, description: 'Snapshot task started'), new OA\Response(response: 409, description: 'Limit reached')]
    )]
    public function createSnapshot(Request $request, int $id): Response
    {
        $ctx = $this->snapshotContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $body = json_decode($request->getContent(), true);
        $body = is_array($body) ? $body : [];
        $name = trim((string) ($body['name'] ?? ''));
        if (!preg_match(self::SNAPSHOT_NAME_PATTERN, $name)) {
            return ApiResponse::error('Snapshot name must start with a letter and use 2-40 letters, digits, - or _', 'INVALID_NAME', 400);
        }
        $existing = $this->fetchSnapshots($ctx);
        if ($existing === null) {
            return ApiResponse::error('Failed to fetch snapshots from Proxmox', 'PROXMOX_ERROR', 503);
        }
        $limit = self::snapshotLimit($ctx['instance']);
        if (count($existing) >= $limit) {
            return ApiResponse::error('Snapshot limit reached (' . $limit . ')', 'SNAPSHOT_LIMIT_REACHED', 409);
        }
        if (in_array($name, array_column($existing, 'name'), true)) {
            return ApiResponse::error('A snapshot with this name already exists', 'SNAPSHOT_EXISTS', 409);
        }
        $params = ['snapname' => $name];
        $description = mb_substr(trim((string) ($body['description'] ?? '')), 0, 255);
        if ($description !== '') {
            $params['description'] = $description;
        }
        if (!empty($body['include_ram']) && $ctx['type'] === 'qemu' && self::flag(ConfigInterface::VDS_SNAPSHOTS_INCLUDE_RAM, 'false')) {
            $params['vmstate'] = 1;
        }
        $res = $ctx['client']->apiPost($this->vmPath($ctx, '/snapshot'), $params);
        if (!$res['ok']) {
            return ApiResponse::error('Proxmox rejected the snapshot request', 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:snapshot.create', ['name' => $name]);

        return ApiResponse::success(['upid' => is_string($res['data'] ?? null) ? $res['data'] : null], 'Snapshot is being created', 200);
    }

    #[OA\Post(
        path: '/api/user/vm-instances/{id}/snapshots/{name}/rollback',
        summary: 'Roll back to a snapshot',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'name', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [new OA\Response(response: 200, description: 'Rollback task started')]
    )]
    public function rollbackSnapshot(Request $request, int $id, string $name): Response
    {
        if (($reauth = \App\Services\Vm\VdsReauth::check($request, 'rollback')) !== null) {
            return $reauth;
        }

        return $this->snapshotAction($request, $id, $name, 'rollback');
    }

    #[OA\Delete(
        path: '/api/user/vm-instances/{id}/snapshots/{name}',
        summary: 'Delete a snapshot',
        tags: ['User - VM Instances'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'name', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
        ],
        responses: [new OA\Response(response: 200, description: 'Delete task started')]
    )]
    public function deleteSnapshot(Request $request, int $id, string $name): Response
    {
        return $this->snapshotAction($request, $id, $name, 'delete');
    }

    public static function snapshotLimit(array $vmInstance): int
    {
        $own = $vmInstance['snapshot_limit'] ?? null;
        if ($own !== null && $own !== '') {
            return max(0, (int) $own);
        }

        return max(0, (int) self::setting(ConfigInterface::VDS_SNAPSHOTS_DEFAULT_LIMIT, '3'));
    }

    /** Resolves user, permission, Proxmox client and node for a VDS request. */
    protected function context(Request $request, int $id, string $permission): array | Response
    {
        $user = $request->attributes->get('user');
        $vmInstance = $request->attributes->get('vmInstance');
        if (!$vmInstance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!VmGateway::hasVmPermission($user['uuid'], $id, $permission)) {
            return ApiResponse::error('You do not have permission for this action', 'PERMISSION_DENIED', 403);
        }
        $vmNode = VmNode::getVmNodeById((int) ($vmInstance['vm_node_id'] ?? 0));
        if (!$vmNode) {
            return ApiResponse::error('VM node not found', 'VM_NODE_NOT_FOUND', 404);
        }
        try {
            $client = VmInstanceUtil::buildProxmoxClientForNode($vmNode);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to connect to Proxmox node', 'PROXMOX_ERROR', 500);
        }
        $node = (string) ($vmInstance['pve_node'] ?? '');
        if ($node === '') {
            $find = $client->findNodeByVmid((int) $vmInstance['vmid']);
            $node = $find['ok'] ? (string) $find['node'] : '';
        }
        if ($node === '') {
            return ApiResponse::error('Could not determine Proxmox node', 'NODE_UNKNOWN', 500);
        }

        return [
            'user' => $user,
            'instance' => $vmInstance,
            'client' => $client,
            'node' => $node,
            'vmid' => (int) $vmInstance['vmid'],
            'type' => ($vmInstance['vm_type'] ?? 'qemu') === 'lxc' ? 'lxc' : 'qemu',
        ];
    }

    protected function vmPath(array $ctx, string $suffix): string
    {
        return sprintf('/api2/json/nodes/%s/%s/%d', rawurlencode($ctx['node']), $ctx['type'], $ctx['vmid']) . $suffix;
    }

    /** Stop + start so Proxmox applies the new boot order (a guest reboot keeps the old one). */
    protected function coldRestart(array $ctx): ?string
    {
        /** @var Proxmox $client */
        $client = $ctx['client'];
        $status = $client->apiGet($this->vmPath($ctx, '/status/current'));
        $running = is_array($status['data'] ?? null) && ($status['data']['status'] ?? '') === 'running';
        if ($running) {
            $stop = $client->apiPost($this->vmPath($ctx, '/status/stop'));
            if (!$stop['ok']) {
                return 'The VM could not be stopped';
            }
            if (is_string($stop['data'] ?? null) && $stop['data'] !== '') {
                $client->waitTask($ctx['node'], $stop['data'], 60, 2);
            } else {
                sleep(3);
            }
        }
        $start = $client->startVm($ctx['node'], $ctx['vmid'], 'qemu');

        return $start['ok'] ? null : 'The VM could not be started';
    }

    protected function activity(array $ctx, string $event, array $metadata): void
    {
        try {
            VmInstanceActivity::createActivity([
                'vm_instance_id' => (int) $ctx['instance']['id'],
                'vm_node_id' => (int) $ctx['instance']['vm_node_id'],
                'user_id' => (int) ($ctx['user']['id'] ?? 0),
                'event' => $event,
                'metadata' => array_merge(['hostname' => $ctx['instance']['hostname'] ?? null], $metadata),
                'ip' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('VDS activity log failed: ' . $e->getMessage());
        }
    }

    protected static function flag(string $key, string $default): bool
    {
        return self::setting($key, $default) === 'true';
    }

    protected static function setting(string $key, string $default): string
    {
        return (string) App::getInstance(true)->getConfig()->getSetting($key, $default);
    }

    private function createUserIso(array $ctx, mixed $name, string $original, array $data): ?int
    {
        $name = is_string($name) ? trim(strip_tags($name)) : '';

        return VmIso::create(array_merge([
            'kind' => 'user',
            'vm_node_id' => (int) $ctx['instance']['vm_node_id'],
            'pve_node' => $ctx['node'],
            'storage' => $ctx['storage'],
            'name' => mb_substr($name !== '' ? $name : $original, 0, 120),
            'category' => IsoLibrary::guessCategory($original),
            'user_id' => (int) $ctx['user']['id'],
            'vm_instance_id' => (int) $ctx['instance']['id'],
            'approval' => $ctx['rules']['require_approval'] ? 'pending' : 'approved',
        ], $data));
    }

    private function snapshotAction(Request $request, int $id, string $name, string $action): Response
    {
        $ctx = $this->snapshotContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        if (!preg_match(self::SNAPSHOT_NAME_PATTERN, $name)) {
            return ApiResponse::error('Invalid snapshot name', 'INVALID_NAME', 400);
        }
        $existing = $this->fetchSnapshots($ctx);
        if ($existing === null || !in_array($name, array_column($existing, 'name'), true)) {
            return ApiResponse::error('Snapshot not found', 'SNAPSHOT_NOT_FOUND', 404);
        }
        $path = $this->vmPath($ctx, '/snapshot/' . rawurlencode($name));
        $res = $action === 'rollback'
            ? $ctx['client']->apiPost($path . '/rollback')
            : $ctx['client']->apiDelete($path);
        if (!$res['ok']) {
            return ApiResponse::error('Proxmox rejected the snapshot ' . $action, 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:snapshot.' . $action, ['name' => $name]);

        return ApiResponse::success(['upid' => is_string($res['data'] ?? null) ? $res['data'] : null], $action === 'rollback' ? 'Rolling back to snapshot' : 'Snapshot is being deleted', 200);
    }

    /** @return array<int, array{name: string, description: string, snaptime: int|null, vmstate: bool, parent: string|null}>|null */
    private function fetchSnapshots(array $ctx): ?array
    {
        $res = $ctx['client']->apiGet($this->vmPath($ctx, '/snapshot'));
        if (!$res['ok'] || !is_array($res['data'])) {
            return null;
        }
        $out = [];
        foreach ($res['data'] as $row) {
            $name = is_array($row) ? (string) ($row['name'] ?? '') : '';
            if ($name === '' || $name === 'current') {
                continue;
            }
            $out[] = [
                'name' => $name,
                'description' => trim((string) ($row['description'] ?? '')),
                'snaptime' => isset($row['snaptime']) ? (int) $row['snaptime'] : null,
                'vmstate' => !empty($row['vmstate']),
                'parent' => isset($row['parent']) ? (string) $row['parent'] : null,
            ];
        }
        usort($out, static fn ($a, $b) => ($b['snaptime'] ?? 0) <=> ($a['snaptime'] ?? 0));

        return $out;
    }

    private function snapshotContext(Request $request, int $id): array | Response
    {
        if (!self::flag(ConfigInterface::VDS_SNAPSHOTS_ENABLED, 'true')) {
            return ApiResponse::error('Snapshots are disabled', 'FEATURE_DISABLED', 403);
        }

        return $this->context($request, $id, 'snapshot');
    }

    private function isoContext(Request $request, int $id, string $permission = 'settings'): array | Response
    {
        $vmInstance = $request->attributes->get('vmInstance');
        if (is_array($vmInstance) && IsoLibrary::mode($vmInstance) === 'disabled') {
            return ApiResponse::error('ISO mounting is disabled', 'FEATURE_DISABLED', 403);
        }
        $ctx = $this->context($request, $id, $permission);
        if (!$ctx instanceof Response && $ctx['type'] !== 'qemu') {
            return ApiResponse::error('ISO mounting is only supported for QEMU VMs', 'ISO_NOT_SUPPORTED', 400);
        }

        return $ctx;
    }

    /** Context for adding user ISOs: mode, storage, quota and the iso.upload permission. */
    private function userIsoContext(Request $request, int $id, string $source): array | Response
    {
        $ctx = $this->isoContext($request, $id, 'iso.upload');
        if ($ctx instanceof Response) {
            return $ctx;
        }
        if (!IsoLibrary::userIsosAllowed($ctx['instance'])) {
            return ApiResponse::error('Custom ISOs are not allowed for this VDS', 'USER_ISOS_DISABLED', 403);
        }
        $rules = IsoLibrary::userRules();
        if (!$rules[$source === 'url' ? 'url_enabled' : 'upload_enabled']) {
            return ApiResponse::error($source === 'url' ? 'Downloading ISOs from a URL is disabled' : 'Uploading ISOs is disabled', 'FEATURE_DISABLED', 403);
        }
        $userId = (int) ($ctx['user']['id'] ?? 0);
        if ($rules['max_per_user'] <= 0 || VmIso::countUserQuota($userId) >= $rules['max_per_user']) {
            return ApiResponse::error('You reached the maximum number of custom ISOs (' . $rules['max_per_user'] . '). Delete one first.', 'ISO_QUOTA_REACHED', 409);
        }
        $ctx['rules'] = $rules;
        $ctx['storage'] = IsoLibrary::userStorage();

        return $ctx;
    }

    private static function isoFeatures(Request $request, int $id, array $vmInstance, bool $isQemu): array
    {
        $mode = IsoLibrary::mode($vmInstance);
        $rules = IsoLibrary::userRules();
        $user = $request->attributes->get('user');
        $userIsos = $isQemu && IsoLibrary::userIsosAllowed($vmInstance);

        return [
            'enabled' => $isQemu && $mode !== 'disabled',
            'mode' => $mode,
            'user_isos' => $userIsos,
            'upload_enabled' => $userIsos && $rules['upload_enabled'],
            'url_enabled' => $userIsos && $rules['url_enabled'],
            'max_size_mb' => $rules['max_size_mb'],
            'max_per_user' => $rules['max_per_user'],
            'require_approval' => $rules['require_approval'],
            'url_domains' => $rules['url_domains'],
            'can_upload' => $userIsos && is_array($user) && VmGateway::hasVmPermission((string) $user['uuid'], $id, 'iso.upload'),
        ];
    }

    /** Volids this VDS may mount: provider ISOs plus the user's own ready and approved ISOs. */
    private function mountableVolids(array $ctx): array
    {
        $volids = array_column(IsoLibrary::providerIsos($ctx['client'], $ctx['node'], $ctx['instance'], self::rescueIso()), 'volid');
        if (IsoLibrary::userIsosAllowed($ctx['instance'])) {
            foreach (VmIso::userIsosForNode((int) $ctx['user']['id'], (int) $ctx['instance']['vm_node_id'], $ctx['node']) as $row) {
                if (IsoLibrary::isMountable($row)) {
                    $volids[] = (string) $row['volid'];
                }
            }
        }

        return $volids;
    }

    private function rescueContext(Request $request, int $id): array | Response
    {
        if (self::rescueIso() === null) {
            return ApiResponse::error('Rescue mode is disabled', 'FEATURE_DISABLED', 403);
        }
        $ctx = $this->context($request, $id, 'power');
        if (!$ctx instanceof Response && $ctx['type'] !== 'qemu') {
            return ApiResponse::error('Rescue mode is only supported for QEMU VMs', 'RESCUE_NOT_SUPPORTED', 400);
        }

        return $ctx;
    }

    /** Mounts a volid as the only cdrom (ide2) and boots from it first. Returns an error message or null. */
    private function attachIso(array $ctx, string $volid): ?string
    {
        /** @var Proxmox $client */
        $client = $ctx['client'];
        $cfgRes = $client->getVmConfig($ctx['node'], $ctx['vmid'], 'qemu');
        if (!$cfgRes['ok'] || !is_array($cfgRes['config'] ?? null)) {
            return 'Failed to fetch VM config';
        }
        $cfg = $cfgRes['config'];
        $cdromKeys = [];
        foreach ($cfg as $k => $v) {
            if (is_string($v) && str_contains($v, 'media=cdrom') && !str_contains($v, 'cloudinit')) {
                $cdromKeys[] = $k;
            }
        }
        if ($cdromKeys !== []) {
            $unlink = $client->unlinkQemuDisks($ctx['node'], $ctx['vmid'], array_values(array_unique($cdromKeys)));
            if (!$unlink['ok']) {
                return 'Failed to unmount the previous cdrom';
            }
        }
        $bootDevices = [];
        if (is_string($cfg['boot'] ?? null) && preg_match('/order=([^,]+)/', $cfg['boot'], $m)) {
            $bootDevices = array_map('trim', explode(';', (string) $m[1]));
        }
        $bootDevices = array_values(array_unique(array_merge(['ide2'], array_filter($bootDevices, static fn ($d) => $d !== ''))));
        $set = $client->setVmConfig($ctx['node'], $ctx['vmid'], 'qemu', ['ide2' => $volid . ',media=cdrom', 'boot' => 'order=' . implode(';', $bootDevices)], []);

        return $set['ok'] ? null : 'Proxmox mount/config update failed';
    }

    private function rescueActive(array $ctx): bool
    {
        $cfgRes = $ctx['client']->getVmConfig($ctx['node'], $ctx['vmid'], 'qemu');
        $ide2 = is_array($cfgRes['config'] ?? null) ? (string) ($cfgRes['config']['ide2'] ?? '') : '';

        return $ide2 !== '' && str_starts_with($ide2, (string) self::rescueIso() . ',');
    }

    private static function rescueIso(): ?string
    {
        if (!self::flag(ConfigInterface::VDS_RESCUE_ENABLED, 'false')) {
            return null;
        }
        $iso = trim(self::setting(ConfigInterface::VDS_RESCUE_ISO, ''));

        return $iso === '' ? null : $iso;
    }

    private static function maxTimeframe(): string
    {
        $max = self::setting(ConfigInterface::VDS_GRAPHS_MAX_TIMEFRAME, 'week');

        return in_array($max, self::TIMEFRAMES, true) ? $max : 'week';
    }

    /** White-label console logo; only https URLs are passed to the browser. */
    private static function brandLogo(): string
    {
        $url = trim(self::setting(ConfigInterface::VDS_CONSOLE_BRAND_LOGO, ''));

        return preg_match('#^https://[^\s"\'<>]+$#i', $url) === 1 ? mb_substr($url, 0, 500) : '';
    }
}
