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

namespace App\Services\Proxmox;

use App\App;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Minimal Proxmox VE API client used for connectivity checks.
 *
 * This client currently focuses on a lightweight "ping" style check by
 * calling the /api2/json/nodes endpoint with a PVEAPIToken.
 */
class Proxmox
{
    private Client $client;
    private string $baseUrl;
    private string $tokenHeader;
    private bool $tlsNoVerify;
    /** @var array<string, string> */
    private array $defaultExtraHeaders;
    /** @var array<string, string|int|float> */
    private array $defaultExtraQuery;

    /**
     * @param string $host Proxmox hostname or IP
     * @param int $port Proxmox API port (default 8006, or 443 if proxied)
     * @param string $scheme http or https
     * @param string $user Proxmox user, e.g. root@pam or apiuser@pve
     * @param string $tokenId Token ID (part after user, before = in PVEAPIToken)
     * @param string $secret Token secret
     * @param bool $tlsNoVerify Whether to skip TLS verification
     * @param int $timeout Timeout in seconds
     * @param array<string, string> $defaultExtraHeaders Default extra headers to send with every request (e.g. X-Forwarded-For)
     * @param array<string, string|int|float> $defaultExtraQuery Default extra query parameters to send with every request
     */
    public function __construct(
        string $host,
        int $port,
        string $scheme,
        string $user,
        string $tokenId,
        string $secret,
        bool $tlsNoVerify,
        int $timeout = 10,
        array $defaultExtraHeaders = [],
        array $defaultExtraQuery = [],
    ) {
        // Keep base_uri at the host/port only; always send full API paths in requests.
        // This avoids Guzzle path resolution quirks that were dropping the /json formatter segment.
        $this->baseUrl = sprintf('%s://%s:%d', $scheme, $host, $port);
        $this->tlsNoVerify = $tlsNoVerify;
        $this->defaultExtraHeaders = $defaultExtraHeaders;
        $this->defaultExtraQuery = $defaultExtraQuery;

        $this->tokenHeader = sprintf(
            'PVEAPIToken=%s!%s=%s',
            $user,
            $tokenId,
            $secret,
        );

        $baseHeaders = [
            'Authorization' => $this->tokenHeader,
            'Accept' => 'application/json',
            'User-Agent' => 'FeatherPanel-Proxmox-Client',
        ];

        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => $timeout,
            'verify' => !$tlsNoVerify,
            'headers' => array_merge($baseHeaders, $this->defaultExtraHeaders),
        ]);
    }

    /**
     * Fetch Proxmox version information from /api2/json/version.
     *
     * @return array{ok: bool, data: array<string, mixed>|null, error: string|null}
     */
    public function getVersion(): array
    {
        try {
            $response = $this->client->get('/api2/json/version');
            $body = json_decode((string) $response->getBody(), true);
            $data = (is_array($body) && isset($body['data'])) ? $body['data'] : null;

            return ['ok' => true, 'data' => $data, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error(
                'Proxmox getVersion failed: ' . $e->getMessage()
            );

            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fetch all PVE cluster nodes from /api2/json/nodes.
     *
     * @return array{ok: bool, nodes: array<int, mixed>, error: string|null}
     */
    public function getNodes(): array
    {
        try {
            $response = $this->client->get('/api2/json/nodes');
            $body = json_decode((string) $response->getBody(), true);
            $nodes = (is_array($body) && isset($body['data']) && is_array($body['data']))
                ? $body['data']
                : [];

            return ['ok' => true, 'nodes' => $nodes, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error(
                'Proxmox getNodes failed: ' . $e->getMessage()
            );

            return ['ok' => false, 'nodes' => [], 'error' => $e->getMessage()];
        }
    }

    /**
     * List bridge interfaces on a node (for VM network selection).
     * GET /api2/json/nodes/{node}/network with type=bridge.
     *
     * @param string $node Proxmox node name (e.g. pve)
     *
     * @return array{ok: bool, bridges: array<int, string>, error: string|null}
     */
    public function getBridges(string $node): array
    {
        $path = '/api2/json/nodes/' . $node . '/network';
        $result = $this->apiGet($path, ['type' => 'bridge']);
        if (!$result['ok'] || !is_array($result['data'])) {
            return ['ok' => false, 'bridges' => [], 'error' => $result['error'] ?? 'Failed to fetch network'];
        }
        $bridges = [];
        foreach ($result['data'] as $iface) {
            $name = $iface['iface'] ?? $iface['bridge'] ?? null;
            if (is_string($name) && $name !== '') {
                $bridges[] = $name;
            }
        }
        sort($bridges);

        return ['ok' => true, 'bridges' => $bridges, 'error' => null];
    }

    /**
     * List storage that can hold VM/container images on a node.
     * GET /api2/json/nodes/{node}/storage; filter by content containing "images".
     *
     * @param string $node Proxmox node name (e.g. pve)
     *
     * @return array{ok: bool, storage: array<int, string>, error: string|null}
     */
    public function getStorage(string $node): array
    {
        $path = '/api2/json/nodes/' . $node . '/storage';
        $result = $this->apiGet($path);
        if (!$result['ok'] || !is_array($result['data'])) {
            return ['ok' => false, 'storage' => [], 'error' => $result['error'] ?? 'Failed to fetch storage'];
        }
        $names = [];
        foreach ($result['data'] as $entry) {
            $content = $entry['content'] ?? '';
            if (strpos($content, 'images') !== false || strpos($content, 'rootdir') !== false) {
                $name = $entry['storage'] ?? null;
                if (is_string($name) && $name !== '') {
                    $names[] = $name;
                }
            }
        }
        sort($names);

        return ['ok' => true, 'storage' => $names, 'error' => null];
    }

    /**
     * Perform a lightweight connectivity check against /nodes.
     *
     * @param array<string, string> $extraHeaders additional headers to send for this check
     * @param array<string, string|int|float> $extraQuery additional query parameters to send
     *
     * @return array{
     *     ok: bool,
     *     status_code: int|null,
     *     error: string|null,
     *     nodes: array<int, mixed>,
     *     latency_ms?: int
     * }
     */
    public function testConnection(array $extraHeaders = [], array $extraQuery = []): array
    {
        try {
            $start = microtime(true);

            $mergedQuery = $this->defaultExtraQuery;
            foreach ($extraQuery as $key => $value) {
                $mergedQuery[$key] = $value;
            }

            $options = [];
            if (!empty($mergedQuery)) {
                $options['query'] = $mergedQuery;
            }

            // Always use the full Proxmox API path with the json formatter.
            $response = $this->client->get('/api2/json/nodes', $options);
            $durationMs = (int) round((microtime(true) - $start) * 1000);
            $statusCode = $response->getStatusCode();

            if ($statusCode >= 200 && $statusCode < 300) {
                $body = json_decode((string) $response->getBody(), true);
                $nodes = [];
                if (is_array($body) && isset($body['data']) && is_array($body['data'])) {
                    $nodes = $body['data'];
                }

                return [
                    'ok' => true,
                    'status_code' => $statusCode,
                    'error' => null,
                    'nodes' => $nodes,
                    'latency_ms' => $durationMs,
                ];
            }

            return [
                'ok' => false,
                'status_code' => $statusCode,
                'error' => 'Unexpected status code from Proxmox: ' . $statusCode,
                'nodes' => [],
            ];
        } catch (GuzzleException $e) {
            $statusCode = null;
            $rawBody = null;
            $decodedBody = null;

            // Try to extract as much detail as possible from the Proxmox reply.
            if (method_exists($e, 'getResponse')) {
                $response = $e->getResponse();
                if ($response !== null) {
                    $statusCode = $response->getStatusCode();
                    $rawBody = (string) $response->getBody();

                    $decoded = json_decode($rawBody, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $decodedBody = $decoded;
                    }
                }
            }

            App::getInstance(true)->getLogger()->error(
                'Proxmox connection test failed: ' . $e->getMessage() .
                ($statusCode !== null ? ' (status ' . $statusCode . ')' : '') .
                ($rawBody ? ' body: ' . substr($rawBody, 0, 1000) : '')
            );

            return [
                'ok' => false,
                'status_code' => $statusCode,
                'error' => $e->getMessage(),
                'nodes' => [],
                'response_body_raw' => $rawBody,
                'response_body_json' => $decodedBody,
            ];
        }
    }

    /**
     * Raw GET request to Proxmox API. Path must start with /api2/json/.
     *
     * @param string $path e.g. /api2/json/cluster/nextid
     * @param array<string, string|int> $query
     *
     * @return array{ok: bool, data: mixed, error: string|null}
     */
    public function apiGet(string $path, array $query = []): array
    {
        try {
            $mergedQuery = $this->defaultExtraQuery;
            foreach ($query as $key => $value) {
                $mergedQuery[$key] = $value;
            }

            $options = [];
            if (!empty($mergedQuery)) {
                $options['query'] = $mergedQuery;
            }
            $response = $this->client->get($path, $options);
            $body = json_decode((string) $response->getBody(), true);
            $data = is_array($body) && array_key_exists('data', $body) ? $body['data'] : $body;

            return ['ok' => true, 'data' => $data, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Proxmox apiGet failed: ' . $e->getMessage());

            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Raw POST request to Proxmox API.
     *
     * @param string $path e.g. /api2/json/nodes/pve/qemu/100/clone
     * @param array<string, mixed> $body
     *
     * @return array{ok: bool, data: mixed, error: string|null}
     */
    public function apiPost(string $path, array $body = []): array
    {
        try {
            $options = ['form_params' => $body];
            if (!empty($this->defaultExtraQuery)) {
                $options['query'] = $this->defaultExtraQuery;
            }

            $response = $this->client->post($path, $options);
            $resBody = json_decode((string) $response->getBody(), true);
            $data = is_array($resBody) && array_key_exists('data', $resBody) ? $resBody['data'] : $resBody;

            return ['ok' => true, 'data' => $data, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Proxmox apiPost failed: ' . $e->getMessage());

            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Raw PUT request to Proxmox API (e.g. for VM/container config updates).
     *
     * @param string $path e.g. /api2/json/nodes/pve/lxc/100/config
     * @param array<string, mixed> $body Form params (delete, net0, memory, etc.)
     *
     * @return array{ok: bool, data: mixed, error: string|null}
     */
    public function apiPut(string $path, array $body = []): array
    {
        try {
            $options = ['form_params' => $body];
            if (!empty($this->defaultExtraQuery)) {
                $options['query'] = $this->defaultExtraQuery;
            }

            $response = $this->client->put($path, $options);
            $resBody = json_decode((string) $response->getBody(), true);
            $data = is_array($resBody) && array_key_exists('data', $resBody) ? $resBody['data'] : $resBody;

            return ['ok' => true, 'data' => $data, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Proxmox apiPut failed: ' . $e->getMessage());

            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Raw DELETE request to Proxmox API.
     *
     * @param string $path e.g. /api2/json/nodes/pve/qemu/100
     * @param array<string, string|int> $query
     *
     * @return array{ok: bool, data: mixed, error: string|null}
     */
    public function apiDelete(string $path, array $query = []): array
    {
        try {
            $mergedQuery = $this->defaultExtraQuery;
            foreach ($query as $key => $value) {
                $mergedQuery[$key] = $value;
            }

            $options = [];
            if (!empty($mergedQuery)) {
                $options['query'] = $mergedQuery;
            }
            $response = $this->client->delete($path, $options);
            $resBody = json_decode((string) $response->getBody(), true);
            $data = is_array($resBody) && array_key_exists('data', $resBody) ? $resBody['data'] : $resBody;

            return ['ok' => true, 'data' => $data, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Proxmox apiDelete failed: ' . $e->getMessage());

            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get next available VMID from cluster (optionally >= minVmid).
     * Does not pass vmid to the API (some PVE versions return 400 if that ID exists).
     * Falls back to computing next free from cluster resources if nextid fails.
     *
     * @return array{ok: bool, vmid: int|null, error: string|null}
     */
    public function getNextVmid(?int $minVmid = null): array
    {
        $minVmid = $minVmid !== null && $minVmid > 0 ? $minVmid : 100;

        $path = '/api2/json/cluster/nextid';
        $result = $this->apiGet($path, []);
        if ($result['ok'] && is_numeric($result['data'])) {
            $vmid = (int) $result['data'];
            if ($vmid >= $minVmid) {
                return ['ok' => true, 'vmid' => $vmid, 'error' => null];
            }
        }

        $list = $this->listVms();
        if (!$list['ok'] || !is_array($list['vms'])) {
            $err = $list['error'] ?? $result['error'] ?? 'Could not get next VMID';

            return ['ok' => false, 'vmid' => null, 'error' => $err];
        }
        $used = [];
        foreach ($list['vms'] as $vm) {
            $used[(int) $vm['vmid']] = true;
        }
        for ($id = $minVmid; $id <= 999999; ++$id) {
            if (!isset($used[$id])) {
                return ['ok' => true, 'vmid' => $id, 'error' => null];
            }
        }

        return ['ok' => false, 'vmid' => null, 'error' => 'No free VMID found in range'];
    }

    /**
     * Clone a QEMU VM from template. Returns UPID task id.
     *
     * @param string $node Proxmox node name (e.g. pve)
     * @param int $templateVmid Template VMID
     * @param int $newid New VM ID
     * @param string $name New VM name
     * @param string|null $target Target node (default same as node)
     *
     * @return array{ok: bool, upid: string|null, error: string|null}
     */
    public function cloneQemu(string $node, int $templateVmid, int $newid, string $name, ?string $target = null): array
    {
        $path = sprintf('/api2/json/nodes/%s/qemu/%d/clone', $node, $templateVmid);
        $body = [
            'newid' => $newid,
            'name' => $name,
            'full' => 1,
        ];
        if ($target !== null && $target !== '') {
            $body['target'] = $target;
        }
        $result = $this->apiPost($path, $body);
        if (!$result['ok']) {
            return ['ok' => false, 'upid' => null, 'error' => $result['error']];
        }
        $upid = is_string($result['data']) ? trim($result['data']) : null;
        if ($upid === null || $upid === '') {
            return ['ok' => false, 'upid' => null, 'error' => 'Clone did not return UPID'];
        }

        return ['ok' => true, 'upid' => $upid, 'error' => null];
    }

    /**
     * Clone an LXC container from a template. Returns UPID task id.
     * Uses full clone (full=1 + storage) so it works on storage that does not support linked clone.
     *
     * @param string $node Proxmox node name where the template lives
     * @param int $templateVmid Template container VMID
     * @param int $newid New container VMID
     * @param string $hostname New container hostname
     * @param string|null $target Target node (default same as node)
     * @param string|null $storage Target storage for full clone (e.g. local); required for full clone
     *
     * @return array{ok: bool, upid: string|null, error: string|null}
     */
    public function cloneLxc(string $node, int $templateVmid, int $newid, string $hostname, ?string $target = null, ?string $storage = null): array
    {
        $path = sprintf('/api2/json/nodes/%s/lxc/%d/clone', $node, $templateVmid);
        $body = [
            'newid' => $newid,
            'hostname' => $hostname,
            'full' => 1,
            'storage' => $storage !== null && $storage !== '' ? $storage : 'local',
        ];
        if ($target !== null && $target !== '') {
            $body['target'] = $target;
        }
        $result = $this->apiPost($path, $body);
        if (!$result['ok']) {
            return ['ok' => false, 'upid' => null, 'error' => $result['error']];
        }
        $upid = is_string($result['data']) ? trim($result['data']) : null;
        if ($upid === null || $upid === '') {
            return ['ok' => false, 'upid' => null, 'error' => 'Clone did not return UPID'];
        }

        return ['ok' => true, 'upid' => $upid, 'error' => null];
    }

    /**
     * Get status of a Proxmox task (UPID).
     *
     * @return array{ok: bool, status: string|null, exitstatus: string|null, error: string|null}
     */
    public function getTaskStatus(string $node, string $upid): array
    {
        $path = sprintf('/api2/json/nodes/%s/tasks/%s/status', $node, urlencode($upid));
        $result = $this->apiGet($path);
        if (!$result['ok']) {
            return ['ok' => false, 'status' => null, 'exitstatus' => null, 'error' => $result['error']];
        }
        $data = is_array($result['data']) ? $result['data'] : [];
        $status = isset($data['status']) ? (string) $data['status'] : null;
        $exitstatus = isset($data['exitstatus']) ? (string) $data['exitstatus'] : null;

        return ['ok' => true, 'status' => $status, 'exitstatus' => $exitstatus, 'error' => null];
    }

    /**
     * Wait for a Proxmox task to complete (status stopped, exitstatus OK).
     *
     * @param int $maxWaitSec Max seconds to wait
     * @param int $intervalSec Seconds between polls
     *
     * @return array{ok: bool, error: string|null}
     */
    public function waitTask(string $node, string $upid, int $maxWaitSec = 300, int $intervalSec = 5): array
    {
        $deadline = time() + $maxWaitSec;
        while (time() < $deadline) {
            $r = $this->getTaskStatus($node, $upid);
            if (!$r['ok']) {
                return ['ok' => false, 'error' => $r['error'] ?? 'Failed to get task status'];
            }
            if ($r['status'] === 'stopped') {
                if ($r['exitstatus'] === 'OK') {
                    return ['ok' => true, 'error' => null];
                }

                return ['ok' => false, 'error' => 'Task failed with exit status: ' . ($r['exitstatus'] ?? 'unknown')];
            }
            sleep($intervalSec);
        }

        return ['ok' => false, 'error' => 'Task did not complete within ' . $maxWaitSec . ' seconds'];
    }

    /**
     * Get current VM/container config from Proxmox.
     *
     * @return array{ok: bool, config: array<string, mixed>|null, error: string|null}
     */
    public function getVmConfig(string $node, int $vmid, string $vmType): array
    {
        $path = sprintf('/api2/json/nodes/%s/%s/%d/config', $node, $vmType === 'lxc' ? 'lxc' : 'qemu', $vmid);
        $result = $this->apiGet($path);
        if (!$result['ok']) {
            return ['ok' => false, 'config' => null, 'error' => $result['error'] ?? null];
        }
        $config = is_array($result['data']) ? $result['data'] : [];

        return ['ok' => true, 'config' => $config, 'error' => null];
    }

    /**
     * Get current VM/container status and resource usage (CPU, memory, disk, network).
     * GET /api2/json/nodes/{node}/{qemu|lxc}/{vmid}/status/current.
     *
     * @param string $node Proxmox node name
     * @param int $vmid VMID
     * @param 'qemu'|'lxc' $vmType
     *
     * @return array{ok: bool, status: array<string, mixed>|null, error: string|null}
     */
    public function getVmStatusCurrent(string $node, int $vmid, string $vmType): array
    {
        $type = $vmType === 'lxc' ? 'lxc' : 'qemu';
        $path = sprintf('/api2/json/nodes/%s/%s/%d/status/current', $node, $type, $vmid);
        $result = $this->apiGet($path);
        if (!$result['ok']) {
            return ['ok' => false, 'status' => null, 'error' => $result['error'] ?? null];
        }
        $status = is_array($result['data']) ? $result['data'] : [];

        return ['ok' => true, 'status' => $status, 'error' => null];
    }

    /**
     * Create a VNC proxy for a QEMU VM or LXC container (for noVNC console). Ticket is valid ~40 seconds.
     * POST /api2/json/nodes/{node}/qemu|lxc/{vmid}/vncproxy.
     *
     * @param 'qemu'|'lxc' $vmType
     *
     * @return array{ok: bool, ticket: string|null, port: int|null, cert: string|null, error: string|null}
     */
    public function createVncProxy(string $node, int $vmid, string $vmType = 'qemu'): array
    {
        $type = $vmType === 'lxc' ? 'lxc' : 'qemu';
        $path = sprintf('/api2/json/nodes/%s/%s/%d/vncproxy', $node, $type, $vmid);
        $result = $this->apiPost($path, ['websocket' => 1]);
        if (!$result['ok'] || !is_array($result['data'])) {
            return ['ok' => false, 'ticket' => null, 'port' => null, 'cert' => null, 'error' => $result['error'] ?? 'vncproxy failed'];
        }
        $data = $result['data'];
        $ticket = isset($data['ticket']) ? (string) $data['ticket'] : null;
        $port = isset($data['port']) ? (int) $data['port'] : null;
        $cert = isset($data['cert']) ? (string) $data['cert'] : null;

        return ['ok' => true, 'ticket' => $ticket, 'port' => $port, 'cert' => $cert, 'error' => null];
    }

    /**
     * Get a PVE auth ticket (cookie-style) via username+password login.
     * Used for redirect flow so the browser can land on Proxmox noVNC with a valid session.
     *
     * @return array{ok: bool, ticket: string|null, csrf: string|null, error: string|null}
     */
    public function getTicketWithPassword(string $username, string $password): array
    {
        try {
            $loginClient = new Client([
                'base_uri' => $this->baseUrl,
                'timeout' => 15,
                'verify' => !$this->tlsNoVerify,
                'headers' => ['Accept' => 'application/json'],
            ]);
            $response = $loginClient->post('/api2/json/access/ticket', [
                'form_params' => [
                    'username' => $username,
                    'password' => $password,
                ],
            ]);
            $body = json_decode((string) $response->getBody(), true);
            if (!is_array($body) || !isset($body['data'])) {
                return ['ok' => false, 'ticket' => null, 'csrf' => null, 'error' => 'Invalid ticket response'];
            }
            $data = $body['data'];
            $ticket = isset($data['ticket']) ? (string) $data['ticket'] : null;
            $csrf = isset($data['CSRFPreventionToken']) ? (string) $data['CSRFPreventionToken'] : null;

            return ['ok' => true, 'ticket' => $ticket, 'csrf' => $csrf, 'error' => null];
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->error('Proxmox getTicketWithPassword failed: ' . $e->getMessage());

            return ['ok' => false, 'ticket' => null, 'csrf' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create a Proxmox user (for temporary console access). Requires User.Modify.
     *
     * @param int|null $expire Unix timestamp when the user expires (optional)
     *
     * @return array{ok: bool, error: string|null}
     */
    public function createUser(string $userid, string $password, ?int $expire = null): array
    {
        $body = ['userid' => $userid, 'password' => $password];
        if ($expire !== null && $expire > 0) {
            $body['expire'] = $expire;
        }
        $result = $this->apiPost('/api2/json/access/users', $body);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Delete a Proxmox user. Requires User.Modify.
     * Call after getting a ticket so the ticket still works but the user is removed (no accumulation).
     *
     * @return array{ok: bool, error: string|null}
     */
    public function deleteUser(string $userid): array
    {
        $path = '/api2/json/access/users/' . rawurlencode($userid);
        $result = $this->apiDelete($path, []);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Add an ACL entry (e.g. grant PVEVMUser on a VM for console access). Requires ACL.Modify.
     * Proxmox expects PUT for /access/acl, not POST.
     *
     * @return array{ok: bool, error: string|null}
     */
    public function addAcl(string $path, string $roles, string $users): array
    {
        $result = $this->apiPut('/api2/json/access/acl', [
            'path' => $path,
            'roles' => $roles,
            'users' => $users,
        ]);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Update QEMU VM config (e.g. memory, cpu, cloud-init ipconfig0).
     * For LXC, pass $deleteKeys (e.g. ['net0']) to remove template network config before setting our own.
     *
     * @param array<string, mixed> $config Keys as Proxmox expects (memory, sockets, cores, ipconfig0, net0, etc.)
     * @param array<int, string> $deleteKeys Optional keys to remove from config (e.g. ['net0'] to purge template IP)
     *
     * @return array{ok: bool, error: string|null}
     */
    public function setVmConfig(string $node, int $vmid, string $vmType, array $config, array $deleteKeys = []): array
    {
        $path = sprintf('/api2/json/nodes/%s/%s/%d/config', $node, $vmType === 'lxc' ? 'lxc' : 'qemu', $vmid);
        $body = $config;
        if (!empty($deleteKeys)) {
            $body['delete'] = implode(',', $deleteKeys);
        }
        $result = $this->apiPut($path, $body);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Resize an LXC container disk (e.g. rootfs, mp0). Size format: absolute "20G" or relative "+5G".
     *
     * @return array{ok: bool, error: string|null}
     */
    public function resizeContainerDisk(string $node, int $vmid, string $disk, string $size): array
    {
        $path = sprintf('/api2/json/nodes/%s/lxc/%d/resize', $node, $vmid);
        $result = $this->apiPut($path, ['disk' => $disk, 'size' => $size]);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Resize a QEMU VM disk (e.g. scsi0). Size format: absolute "64G" or relative "+32G".
     *
     * @return array{ok: bool, error: string|null}
     */
    public function resizeQemuDisk(string $node, int $vmid, string $disk, string $size): array
    {
        $path = sprintf('/api2/json/nodes/%s/qemu/%d/resize', $node, $vmid);
        $result = $this->apiPut($path, ['disk' => $disk, 'size' => $size]);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Start a VM or container.
     *
     * @param 'qemu'|'lxc' $vmType
     *
     * @return array{ok: bool, error: string|null}
     */
    public function startVm(string $node, int $vmid, string $vmType): array
    {
        $type = $vmType === 'lxc' ? 'lxc' : 'qemu';
        $path = sprintf('/api2/json/nodes/%s/%s/%d/status/start', $node, $type, $vmid);

        return $this->apiPost($path, []);
    }

    /**
     * Stop a VM or container (hard stop).
     *
     * @param 'qemu'|'lxc' $vmType
     *
     * @return array{ok: bool, error: string|null}
     */
    public function stopVm(string $node, int $vmid, string $vmType): array
    {
        $type = $vmType === 'lxc' ? 'lxc' : 'qemu';
        $path = sprintf('/api2/json/nodes/%s/%s/%d/status/stop', $node, $type, $vmid);

        return $this->apiPost($path, []);
    }

    /**
     * Delete a VM or container from Proxmox.
     *
     * @param 'qemu'|'lxc' $vmType
     *
     * @return array{ok: bool, error: string|null}
     */
    public function deleteVm(string $node, int $vmid, string $vmType): array
    {
        $type = $vmType === 'lxc' ? 'lxc' : 'qemu';
        $path = sprintf('/api2/json/nodes/%s/%s/%d', $node, $type, $vmid);

        return $this->apiDelete($path, ['purge' => 1]);
    }

    /**
     * Unlink one or more QEMU disks (e.g. scsi1, unused0) from a VM.
     * For attached disks, this moves them to an unused slot; for unused slots it deletes the disk.
     *
     * @param array<int, string> $ids e.g. ['scsi1'] or ['unused0']
     *
     * @return array{ok: bool, error: string|null}
     */
    public function unlinkQemuDisks(string $node, int $vmid, array $ids): array
    {
        if (empty($ids)) {
            return ['ok' => true, 'error' => null];
        }

        $path = sprintf('/api2/json/nodes/%s/qemu/%d/unlink', $node, $vmid);
        $idlist = implode(',', $ids);
        $result = $this->apiPut($path, ['idlist' => $idlist]);

        return ['ok' => $result['ok'], 'error' => $result['error'] ?? null];
    }

    /**
     * Find which node hosts a given VMID (from cluster resources).
     *
     * @return array{ok: bool, node: string|null, error: string|null}
     */
    public function findNodeByVmid(int $vmid): array
    {
        $result = $this->apiGet('/api2/json/cluster/resources', ['type' => 'vm']);
        if (!$result['ok'] || !is_array($result['data'])) {
            return ['ok' => false, 'node' => null, 'error' => $result['error'] ?? 'No data'];
        }
        foreach ($result['data'] as $res) {
            if (isset($res['vmid']) && (int) $res['vmid'] === $vmid && isset($res['node'])) {
                return ['ok' => true, 'node' => (string) $res['node'], 'error' => null];
            }
        }

        return ['ok' => false, 'node' => null, 'error' => 'VMID ' . $vmid . ' not found in cluster'];
    }

    /**
     * List all VMs (and templates) from cluster resources for dropdown/selection.
     * Returns array of { vmid, name, node, template, type }.
     *
     * @return array{ok: bool, vms: array<int, array{vmid: int, name: string, node: string, template: int, type: string}>, error: string|null}
     */
    public function listVms(): array
    {
        $result = $this->apiGet('/api2/json/cluster/resources', ['type' => 'vm']);
        if (!$result['ok'] || !is_array($result['data'])) {
            return ['ok' => false, 'vms' => [], 'error' => $result['error'] ?? 'No data'];
        }
        $vms = [];
        foreach ($result['data'] as $res) {
            if (!isset($res['vmid'], $res['node'])) {
                continue;
            }
            $vms[] = [
                'vmid' => (int) $res['vmid'],
                'name' => (string) ($res['name'] ?? 'VM ' . $res['vmid']),
                'node' => (string) $res['node'],
                'template' => (int) ($res['template'] ?? 0),
                'type' => (string) ($res['type'] ?? ($res['subtype'] ?? 'qemu')),
            ];
        }
        usort($vms, static fn ($a, $b) => $a['vmid'] <=> $b['vmid']);

        return ['ok' => true, 'vms' => $vms, 'error' => null];
    }
}
