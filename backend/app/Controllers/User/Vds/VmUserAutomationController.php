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

use App\Chat\Database;
use App\Chat\VmSchedule;
use App\Services\Vm\Bandwidth;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VDS self-service automation: per-VDS Proxmox firewall (rules, presets, inbound policy)
 * and scheduled tasks (auto reboot / auto snapshot). Gated by admin settings and the
 * "firewall" / "schedules" VDS permissions.
 */
#[OA\Tag(name: 'User - VM Instances')]
class VmUserAutomationController extends VmUserExtrasController
{
    /** Rule presets: key => list of [proto, dport, comment]. */
    public const FIREWALL_PRESETS = [
        'ssh' => [['tcp', '22', 'SSH']],
        'web' => [['tcp', '80', 'HTTP'], ['tcp', '443', 'HTTPS']],
        'rdp' => [['tcp', '3389', 'RDP']],
        'mail' => [['tcp', '25', 'SMTP'], ['tcp', '465', 'SMTPS'], ['tcp', '587', 'Submission'], ['tcp', '993', 'IMAPS']],
        'dns' => [['udp', '53', 'DNS'], ['tcp', '53', 'DNS']],
        'ping' => [['icmp', '', 'Ping']],
        'ftp' => [['tcp', '21', 'FTP']],
        'mysql' => [['tcp', '3306', 'MySQL']],
        'minecraft' => [['tcp', '25565', 'Minecraft']],
    ];

    private const RULE_ACTIONS = ['ACCEPT', 'DROP', 'REJECT'];
    private const PROTOCOLS = ['tcp', 'udp', 'icmp', 'ipv6-icmp'];

    public static function firewallFeatures(): array
    {
        return [
            'enabled' => self::flag(ConfigInterface::VDS_FIREWALL_ENABLED, 'false'),
            'max_rules' => self::maxRules(),
            'allow_policy' => self::flag(ConfigInterface::VDS_FIREWALL_ALLOW_POLICY, 'true'),
            'presets' => self::presets(),
        ];
    }

    public static function scheduleFeatures(bool $isQemu = true): array
    {
        return [
            'enabled' => self::flag(ConfigInterface::VDS_SCHEDULES_ENABLED, 'true'),
            'max' => max(0, min(50, (int) self::setting(ConfigInterface::VDS_SCHEDULES_MAX_PER_VDS, '5'))),
            'actions' => self::scheduleActions(),
            'allow_hourly' => self::flag(ConfigInterface::VDS_SCHEDULES_ALLOW_HOURLY, 'false'),
            'max_keep' => max(1, min(50, (int) self::setting(ConfigInterface::VDS_SCHEDULES_MAX_KEEP, '5'))),
        ];
    }

    // ---------------------------------------------------------------- firewall

    #[OA\Get(path: '/api/user/vm-instances/{id}/firewall', summary: 'VDS firewall rules and options', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Firewall state')])]
    public function getFirewall(Request $request, int $id): Response
    {
        $ctx = $this->firewallContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $rules = $this->fetchRules($ctx);
        if ($rules === null) {
            return ApiResponse::error('Failed to fetch firewall rules from Proxmox', 'PROXMOX_ERROR', 503);
        }
        $opts = $ctx['client']->apiGet($this->vmPath($ctx, '/firewall/options'));
        $o = is_array($opts['data'] ?? null) ? $opts['data'] : [];

        return ApiResponse::success([
            'enabled' => (int) ($o['enable'] ?? 0) === 1,
            'policy_in' => strtoupper((string) ($o['policy_in'] ?? 'ACCEPT')),
            'policy_out' => strtoupper((string) ($o['policy_out'] ?? 'ACCEPT')),
            'rules' => $rules,
            'features' => self::firewallFeatures(),
        ], 'Firewall fetched', 200);
    }

    #[OA\Put(path: '/api/user/vm-instances/{id}/firewall/options', summary: 'Enable/disable the VDS firewall and set the inbound policy', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Updated')])]
    public function setFirewallOptions(Request $request, int $id): Response
    {
        $ctx = $this->firewallContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $body = self::body($request);
        $params = [];
        if (array_key_exists('enabled', $body)) {
            $params['enable'] = !empty($body['enabled']) ? 1 : 0;
        }
        if (array_key_exists('policy_in', $body)) {
            if (!self::flag(ConfigInterface::VDS_FIREWALL_ALLOW_POLICY, 'true')) {
                return ApiResponse::error('Changing the firewall policy is disabled by the administrator', 'POLICY_LOCKED', 403);
            }
            $policy = strtoupper((string) $body['policy_in']);
            if (!in_array($policy, self::RULE_ACTIONS, true)) {
                return ApiResponse::error('Invalid policy', 'INVALID_POLICY', 400);
            }
            if (($reauth = \App\Services\Vm\VdsReauth::check($request, 'firewall_policy')) !== null) {
                return $reauth;
            }
            $params['policy_in'] = $policy;
        }
        if ($params === []) {
            return ApiResponse::error('Nothing to update', 'NOTHING_TO_UPDATE', 400);
        }
        if (($params['enable'] ?? 0) === 1 && ($err = $this->ensureNicFirewall($ctx)) !== null) {
            return ApiResponse::error($err, 'PROXMOX_ERROR', 503);
        }
        $res = $ctx['client']->apiPut($this->vmPath($ctx, '/firewall/options'), $params);
        if (!$res['ok']) {
            return ApiResponse::error('Proxmox rejected the firewall options', 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:firewall.options', $params);

        return ApiResponse::success([], 'Firewall updated', 200);
    }

    #[OA\Post(path: '/api/user/vm-instances/{id}/firewall/rules', summary: 'Add a firewall rule', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Rule added')])]
    public function addFirewallRule(Request $request, int $id): Response
    {
        $ctx = $this->firewallContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $rule = self::validateRule(self::body($request));
        if (is_string($rule)) {
            return ApiResponse::error($rule, 'INVALID_RULE', 400);
        }
        $existing = $this->fetchRules($ctx);
        if ($existing === null) {
            return ApiResponse::error('Failed to fetch firewall rules from Proxmox', 'PROXMOX_ERROR', 503);
        }
        if (count($existing) >= self::maxRules()) {
            return ApiResponse::error('Firewall rule limit reached (' . self::maxRules() . ')', 'RULE_LIMIT_REACHED', 409);
        }
        if (!$ctx['client']->apiPost($this->vmPath($ctx, '/firewall/rules'), $rule)['ok']) {
            return ApiResponse::error('Proxmox rejected the firewall rule', 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:firewall.rule_add', $rule);

        return ApiResponse::success([], 'Rule added', 200);
    }

    #[OA\Post(path: '/api/user/vm-instances/{id}/firewall/presets/{preset}', summary: 'Apply a firewall rule preset', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')), new OA\Parameter(name: 'preset', in: 'path', required: true, schema: new OA\Schema(type: 'string'))], responses: [new OA\Response(response: 200, description: 'Preset applied')])]
    public function applyFirewallPreset(Request $request, int $id, string $preset): Response
    {
        $ctx = $this->firewallContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        if (!in_array($preset, self::presets(), true)) {
            return ApiResponse::error('Unknown or disabled preset', 'INVALID_PRESET', 400);
        }
        $existing = $this->fetchRules($ctx);
        if ($existing === null) {
            return ApiResponse::error('Failed to fetch firewall rules from Proxmox', 'PROXMOX_ERROR', 503);
        }
        $todo = [];
        foreach (self::FIREWALL_PRESETS[$preset] as [$proto, $dport, $comment]) {
            $dupe = array_filter($existing, static fn ($r) => $r['type'] === 'in' && $r['action'] === 'ACCEPT' && $r['proto'] === $proto && $r['dport'] === $dport && $r['source'] === '');
            if ($dupe === []) {
                $todo[] = ['type' => 'in', 'action' => 'ACCEPT', 'enable' => 1, 'proto' => $proto, 'dport' => $dport, 'comment' => $comment];
            }
        }
        if (count($existing) + count($todo) > self::maxRules()) {
            return ApiResponse::error('Firewall rule limit reached (' . self::maxRules() . ')', 'RULE_LIMIT_REACHED', 409);
        }
        foreach ($todo as $rule) {
            if ($rule['dport'] === '') {
                unset($rule['dport']);
            }
            if (!$ctx['client']->apiPost($this->vmPath($ctx, '/firewall/rules'), $rule)['ok']) {
                return ApiResponse::error('Proxmox rejected the firewall rule', 'PROXMOX_ERROR', 503);
            }
        }
        $this->activity($ctx, 'vm:firewall.preset', ['preset' => $preset, 'added' => count($todo)]);

        return ApiResponse::success(['added' => count($todo)], 'Preset applied', 200);
    }

    #[OA\Delete(path: '/api/user/vm-instances/{id}/firewall/rules/{pos}', summary: 'Delete a firewall rule', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')), new OA\Parameter(name: 'pos', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Rule deleted')])]
    public function deleteFirewallRule(Request $request, int $id, int $pos): Response
    {
        $ctx = $this->firewallContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $existing = $this->fetchRules($ctx);
        $match = array_values(array_filter($existing ?? [], static fn ($r) => $r['pos'] === $pos));
        if ($match === []) {
            return ApiResponse::error('Rule not found', 'RULE_NOT_FOUND', 404);
        }
        if (!$ctx['client']->apiDelete($this->vmPath($ctx, '/firewall/rules/' . $pos))['ok']) {
            return ApiResponse::error('Proxmox rejected the rule removal', 'PROXMOX_ERROR', 503);
        }
        $this->activity($ctx, 'vm:firewall.rule_delete', $match[0]);

        return ApiResponse::success([], 'Rule deleted', 200);
    }

    // --------------------------------------------------------------- bandwidth

    #[OA\Get(path: '/api/user/vm-instances/{id}/bandwidth', summary: 'Monthly VDS traffic usage', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Usage')])]
    public function getBandwidth(Request $request, int $id): Response
    {
        $instance = $request->attributes->get('vmInstance');
        if (!$instance) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!self::flag(ConfigInterface::VDS_BANDWIDTH_ENABLED, 'true')) {
            return ApiResponse::error('Traffic accounting is disabled by the administrator', 'FEATURE_DISABLED', 403);
        }
        $limit = Bandwidth::limitBytes($instance);
        $rows = Bandwidth::usage(Database::getPdoConnection(), $id);
        $history = array_map(static fn ($r) => [
            'period' => $r['period'],
            'rx_bytes' => (int) $r['rx_bytes'],
            'tx_bytes' => (int) $r['tx_bytes'],
            'counted_bytes' => Bandwidth::counted($r),
            'action_taken' => $r['action_taken'],
        ], $rows);
        $current = ($history[0]['period'] ?? null) === Bandwidth::period() ? $history[0] : ['period' => Bandwidth::period(), 'rx_bytes' => 0, 'tx_bytes' => 0, 'counted_bytes' => 0, 'action_taken' => 'none'];

        return ApiResponse::success([
            'current' => $current,
            'limit_bytes' => $limit,
            'percent' => $limit ? min(100, (int) floor($current['counted_bytes'] * 100 / $limit)) : null,
            'count' => self::setting(ConfigInterface::VDS_BANDWIDTH_COUNT, 'both'),
            'action' => self::setting(ConfigInterface::VDS_BANDWIDTH_ACTION, 'notify'),
            'resets_at' => date('Y-m-01 00:00:00', strtotime('first day of next month')),
            'history' => $history,
        ], 'Bandwidth fetched', 200);
    }

    // --------------------------------------------------------------- schedules

    #[OA\Get(path: '/api/user/vm-instances/{id}/schedules', summary: 'List VDS scheduled tasks', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Schedules')])]
    public function listSchedules(Request $request, int $id): Response
    {
        $ctx = $this->scheduleContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }

        return ApiResponse::success([
            'schedules' => array_map([self::class, 'serializeSchedule'], VmSchedule::forInstance($id)),
            'features' => self::scheduleFeatures(),
            'timezone' => date_default_timezone_get(),
        ], 'Schedules fetched', 200);
    }

    #[OA\Post(path: '/api/user/vm-instances/{id}/schedules', summary: 'Create a scheduled task', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Created')])]
    public function createSchedule(Request $request, int $id): Response
    {
        $ctx = $this->scheduleContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $features = self::scheduleFeatures();
        if (count(VmSchedule::forInstance($id)) >= $features['max']) {
            return ApiResponse::error('Schedule limit reached (' . $features['max'] . ')', 'SCHEDULE_LIMIT_REACHED', 409);
        }
        $data = self::validateSchedule(self::body($request), $features, null);
        if (is_string($data)) {
            return ApiResponse::error($data, 'INVALID_SCHEDULE', 400);
        }
        $data['vm_instance_id'] = $id;
        $data['created_by'] = (int) ($ctx['user']['id'] ?? 0) ?: null;
        $data['next_run_at'] = $data['enabled'] ? VmSchedule::nextRun($data) : null;
        $newId = VmSchedule::create($data);
        if ($newId === null) {
            return ApiResponse::error('Failed to save schedule', 'DATABASE_ERROR', 500);
        }
        $this->activity($ctx, 'vm:schedule.create', ['schedule' => $data['name'], 'action' => $data['action'], 'frequency' => $data['frequency']]);

        return ApiResponse::success(['schedule' => self::serializeSchedule((array) VmSchedule::getById($newId))], 'Schedule created', 200);
    }

    #[OA\Patch(path: '/api/user/vm-instances/{id}/schedules/{scheduleId}', summary: 'Update a scheduled task', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')), new OA\Parameter(name: 'scheduleId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Updated')])]
    public function updateSchedule(Request $request, int $id, int $scheduleId): Response
    {
        $ctx = $this->scheduleContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $row = VmSchedule::getById($scheduleId);
        if (!$row || (int) $row['vm_instance_id'] !== $id) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }
        $data = self::validateSchedule(self::body($request), self::scheduleFeatures(), $row);
        if (is_string($data)) {
            return ApiResponse::error($data, 'INVALID_SCHEDULE', 400);
        }
        $data['next_run_at'] = $data['enabled'] ? VmSchedule::nextRun(array_merge($row, $data)) : null;
        VmSchedule::update($scheduleId, $data);
        $this->activity($ctx, 'vm:schedule.update', ['schedule' => $data['name'], 'enabled' => $data['enabled']]);

        return ApiResponse::success(['schedule' => self::serializeSchedule((array) VmSchedule::getById($scheduleId))], 'Schedule updated', 200);
    }

    #[OA\Delete(path: '/api/user/vm-instances/{id}/schedules/{scheduleId}', summary: 'Delete a scheduled task', tags: ['User - VM Instances'], parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')), new OA\Parameter(name: 'scheduleId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))], responses: [new OA\Response(response: 200, description: 'Deleted')])]
    public function deleteSchedule(Request $request, int $id, int $scheduleId): Response
    {
        $ctx = $this->scheduleContext($request, $id);
        if ($ctx instanceof Response) {
            return $ctx;
        }
        $row = VmSchedule::getById($scheduleId);
        if (!$row || (int) $row['vm_instance_id'] !== $id) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }
        VmSchedule::delete($scheduleId);
        $this->activity($ctx, 'vm:schedule.delete', ['schedule' => $row['name']]);

        return ApiResponse::success([], 'Schedule deleted', 200);
    }

    public static function serializeSchedule(array $s): array
    {
        return [
            'id' => (int) $s['id'],
            'name' => (string) $s['name'],
            'action' => (string) $s['action'],
            'frequency' => (string) $s['frequency'],
            'minute' => (int) $s['minute'],
            'hour' => (int) $s['hour'],
            'weekday' => (int) $s['weekday'],
            'keep' => (int) $s['keep'],
            'enabled' => (int) $s['enabled'] === 1,
            'next_run_at' => $s['next_run_at'] ?? null,
            'last_run_at' => $s['last_run_at'] ?? null,
            'last_status' => $s['last_status'] ?? null,
            'last_error' => $s['last_error'] ?? null,
        ];
    }

    // ----------------------------------------------------------------- helpers

    private function firewallContext(Request $request, int $id): array|Response
    {
        if (!self::flag(ConfigInterface::VDS_FIREWALL_ENABLED, 'false')) {
            return ApiResponse::error('The VDS firewall is disabled by the administrator', 'FEATURE_DISABLED', 403);
        }

        return $this->context($request, $id, 'firewall');
    }

    private function scheduleContext(Request $request, int $id): array|Response
    {
        if (!self::flag(ConfigInterface::VDS_SCHEDULES_ENABLED, 'true')) {
            return ApiResponse::error('Scheduled tasks are disabled by the administrator', 'FEATURE_DISABLED', 403);
        }
        $user = $request->attributes->get('user');
        if (!$request->attributes->get('vmInstance')) {
            return ApiResponse::error('VM instance not found', 'VM_INSTANCE_NOT_FOUND', 404);
        }
        if (!\App\Helpers\VmGateway::hasVmPermission($user['uuid'], $id, 'schedules')) {
            return ApiResponse::error('You do not have permission for this action', 'PERMISSION_DENIED', 403);
        }

        // Schedules are DB-only; Proxmox is only contacted by the cron, so no client here.
        return ['user' => $user, 'instance' => $request->attributes->get('vmInstance')];
    }

    /** Normalised rules or null when Proxmox fails. */
    private function fetchRules(array $ctx): ?array
    {
        /** @var Proxmox $client */
        $client = $ctx['client'];
        $res = $client->apiGet($this->vmPath($ctx, '/firewall/rules'));
        if (!$res['ok'] || !is_array($res['data'] ?? null)) {
            return null;
        }
        $rules = [];
        foreach ($res['data'] as $r) {
            if (!is_array($r) || !in_array($r['type'] ?? '', ['in', 'out'], true)) {
                continue; // security groups and other types are admin-managed
            }
            $rules[] = [
                'pos' => (int) ($r['pos'] ?? 0),
                'type' => (string) $r['type'],
                'action' => strtoupper((string) ($r['action'] ?? '')),
                'proto' => (string) ($r['proto'] ?? ''),
                'dport' => (string) ($r['dport'] ?? ''),
                'source' => (string) ($r['source'] ?? ''),
                'comment' => (string) ($r['comment'] ?? ''),
                'enabled' => (int) ($r['enable'] ?? 0) === 1,
            ];
        }
        usort($rules, static fn ($a, $b) => $a['pos'] <=> $b['pos']);

        return $rules;
    }

    /** Proxmox only filters a NIC with firewall=1; add it to every net device that lacks it. */
    private function ensureNicFirewall(array $ctx): ?string
    {
        /** @var Proxmox $client */
        $client = $ctx['client'];
        $cfg = $client->getVmConfig($ctx['node'], $ctx['vmid'], $ctx['type']);
        if (!$cfg['ok'] || !is_array($cfg['config'] ?? null)) {
            return 'Failed to fetch VM config';
        }
        $changes = [];
        foreach ($cfg['config'] as $k => $v) {
            if (preg_match('/^net\d+$/', (string) $k) && is_string($v) && !preg_match('/(^|,)firewall=1(,|$)/', $v)) {
                $changes[$k] = preg_match('/(^|,)firewall=0(,|$)/', $v) ? preg_replace('/firewall=0/', 'firewall=1', $v) : $v . ',firewall=1';
            }
        }
        if ($changes === []) {
            return null;
        }

        return $client->setVmConfig($ctx['node'], $ctx['vmid'], $ctx['type'], $changes, [])['ok'] ? null : 'Failed to enable the firewall on the network interfaces';
    }

    private static function validateRule(array $b): array|string
    {
        $type = strtolower((string) ($b['type'] ?? 'in'));
        $action = strtoupper((string) ($b['action'] ?? 'ACCEPT'));
        $proto = strtolower(trim((string) ($b['proto'] ?? '')));
        $dport = preg_replace('/\s+/', '', (string) ($b['dport'] ?? ''));
        $source = trim((string) ($b['source'] ?? ''));
        $comment = mb_substr(preg_replace('/[^\p{L}\p{N} ._:\/-]/u', '', (string) ($b['comment'] ?? '')), 0, 80);
        if (!in_array($type, ['in', 'out'], true)) {
            return 'Direction must be in or out';
        }
        if (!in_array($action, self::RULE_ACTIONS, true)) {
            return 'Action must be ACCEPT, DROP or REJECT';
        }
        if ($proto !== '' && !in_array($proto, self::PROTOCOLS, true)) {
            return 'Unsupported protocol';
        }
        if ($dport !== '') {
            if (!in_array($proto, ['tcp', 'udp'], true)) {
                return 'Ports require tcp or udp';
            }
            if (!preg_match('/^\d{1,5}(:\d{1,5})?(,\d{1,5}(:\d{1,5})?){0,9}$/', $dport)) {
                return 'Ports must look like 80, 8000:8100 or 80,443';
            }
            foreach (preg_split('/[,:]/', $dport) ?: [] as $p) {
                if ((int) $p < 1 || (int) $p > 65535) {
                    return 'Ports must be between 1 and 65535';
                }
            }
        }
        if ($source !== '' && !self::validCidr($source)) {
            return 'Source must be an IP address or CIDR range';
        }
        $rule = ['type' => $type, 'action' => $action, 'enable' => 1];
        foreach (['proto' => $proto, 'dport' => $dport, 'source' => $source, 'comment' => $comment] as $k => $v) {
            if ($v !== '') {
                $rule[$k] = $v;
            }
        }

        return $rule;
    }

    private static function validCidr(string $v): bool
    {
        [$ip, $mask] = array_pad(explode('/', $v, 2), 2, null);
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }
        if ($mask === null) {
            return true;
        }
        $max = str_contains((string) $ip, ':') ? 128 : 32;

        return ctype_digit($mask) && (int) $mask >= 0 && (int) $mask <= $max;
    }

    private static function validateSchedule(array $b, array $features, ?array $row): array|string
    {
        $get = static fn (string $k, $d) => array_key_exists($k, $b) ? $b[$k] : ($row[$k] ?? $d);
        $name = trim(mb_substr((string) $get('name', ''), 0, 80));
        $action = (string) $get('action', '');
        $frequency = (string) $get('frequency', 'daily');
        if ($name === '') {
            return 'Name is required';
        }
        if (!in_array($action, $features['actions'], true)) {
            return 'This action is not available';
        }
        if (!in_array($frequency, VmSchedule::FREQUENCIES, true) || ($frequency === 'hourly' && !$features['allow_hourly'])) {
            return 'This frequency is not available';
        }
        $minute = (int) $get('minute', 0);
        $hour = (int) $get('hour', 4);
        $weekday = (int) $get('weekday', 0);
        $keep = (int) $get('keep', 3);
        if ($minute < 0 || $minute > 59 || $hour < 0 || $hour > 23 || $weekday < 0 || $weekday > 6) {
            return 'Invalid time';
        }
        if ($action === 'snapshot' && ($keep < 1 || $keep > $features['max_keep'])) {
            return 'Keep must be between 1 and ' . $features['max_keep'];
        }

        return [
            'name' => $name,
            'action' => $action,
            'frequency' => $frequency,
            'minute' => $minute,
            'hour' => $hour,
            'weekday' => $weekday,
            'keep' => max(1, $keep),
            'enabled' => !empty($get('enabled', true)) ? 1 : 0,
        ];
    }

    private static function maxRules(): int
    {
        return max(1, min(500, (int) self::setting(ConfigInterface::VDS_FIREWALL_MAX_RULES, '50')));
    }

    private static function presets(): array
    {
        $list = array_map('trim', explode(',', strtolower(self::setting(ConfigInterface::VDS_FIREWALL_PRESETS, 'ssh,web,rdp,mail,dns,ping'))));

        return array_values(array_intersect(array_keys(self::FIREWALL_PRESETS), $list));
    }

    private static function scheduleActions(): array
    {
        $list = array_map('trim', explode(',', strtolower(self::setting(ConfigInterface::VDS_SCHEDULES_ACTIONS, 'reboot,snapshot'))));

        return array_values(array_intersect(VmSchedule::ACTIONS, $list));
    }

    private static function body(Request $request): array
    {
        $b = json_decode($request->getContent(), true);

        return is_array($b) ? $b : [];
    }
}
