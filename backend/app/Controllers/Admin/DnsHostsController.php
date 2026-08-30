<?php

namespace App\Controllers\Admin;

use App\Chat\DnsHost;
use App\Chat\WebNode;
use App\Helpers\ApiResponse;
use App\Helpers\DnsProvisioner;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DnsHostsController
{
    #[OA\Get(path: '/api/admin/dns-hosts', summary: 'List DNS hosts', tags: ['Admin - DNS Hosts'])]
    public function index(Request $request): Response
    {
        $hosts = array_map(static fn (array $host): array => DnsHost::sanitizeForApi($host), DnsHost::listAll());

        return ApiResponse::success(['hosts' => $hosts], 'OK', 200);
    }

    #[OA\Get(path: '/api/admin/dns-hosts/{id}', summary: 'Show DNS host', tags: ['Admin - DNS Hosts'])]
    public function show(Request $request, int $id): Response
    {
        $host = DnsHost::getById($id);
        if (!$host) {
            return ApiResponse::error('DNS host not found', 'NOT_FOUND', 404);
        }

        return ApiResponse::success(['host' => DnsHost::sanitizeForApi($host)], 'OK', 200);
    }

    #[OA\Put(path: '/api/admin/dns-hosts', summary: 'Create DNS host', tags: ['Admin - DNS Hosts'])]
    public function create(Request $request): Response
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validate($body, true);
        if ($error !== null) {
            return $error;
        }

        $body['provider'] = 'node';
        $id = DnsHost::create($body);
        if ($id === false) {
            return ApiResponse::error('Failed to create DNS host', 'CREATE_FAILED', 500);
        }

        $host = DnsHost::getById($id);

        return ApiResponse::success(['host' => DnsHost::sanitizeForApi($host ?? [])], 'Created', 201);
    }

    #[OA\Patch(path: '/api/admin/dns-hosts/{id}', summary: 'Update DNS host', tags: ['Admin - DNS Hosts'])]
    public function update(Request $request, int $id): Response
    {
        $existing = DnsHost::getById($id);
        if (!$existing) {
            return ApiResponse::error('DNS host not found', 'NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validate($body, false);
        if ($error !== null) {
            return $error;
        }

        if (!DnsHost::update($id, $body)) {
            return ApiResponse::error('Failed to update DNS host', 'UPDATE_FAILED', 500);
        }

        $host = DnsHost::getById($id);

        return ApiResponse::success(['host' => DnsHost::sanitizeForApi($host ?? [])], 'Updated', 200);
    }

    #[OA\Delete(path: '/api/admin/dns-hosts/{id}', summary: 'Delete DNS host', tags: ['Admin - DNS Hosts'])]
    public function delete(Request $request, int $id): Response
    {
        $existing = DnsHost::getById($id);
        if (!$existing) {
            return ApiResponse::error('DNS host not found', 'NOT_FOUND', 404);
        }

        if (!DnsHost::delete($id)) {
            return ApiResponse::error('Failed to delete DNS host (it may still be in use)', 'DELETE_FAILED', 500);
        }

        return ApiResponse::success([], 'Deleted', 200);
    }

    #[OA\Post(path: '/api/admin/dns-hosts/{id}/test', summary: 'Test PowerDNS on DNS host web node', tags: ['Admin - DNS Hosts'])]
    public function test(Request $request, int $id): Response
    {
        $host = DnsHost::getById($id);
        if (!$host) {
            return ApiResponse::error('DNS host not found', 'NOT_FOUND', 404);
        }

        $provider = DnsHost::createProvider($host);
        if ($provider === null) {
            return ApiResponse::error('PowerDNS web node is not configured', 'PROVIDER_UNAVAILABLE', 400);
        }

        try {
            $zones = $provider->listZones();
            $webNode = WebNode::getWebNodeById((int) ($host['web_node_id'] ?? 0));
            $delegation = $webNode
                ? DnsProvisioner::delegationHint($webNode, 'example.com')
                : null;

            return ApiResponse::success([
                'ok' => true,
                'zones' => $zones,
                'zone_count' => count($zones),
                'delegation' => $delegation,
            ], 'PowerDNS connection verified', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('PowerDNS test failed: ' . $e->getMessage(), 'TEST_FAILED', 502);
        }
    }

    /**
     * @param array<string, mixed> $body
     */
    private function validate(array $body, bool $creating): ?Response
    {
        if ($creating && trim((string) ($body['name'] ?? '')) === '') {
            return ApiResponse::error('name is required', 'VALIDATION_FAILED', 400);
        }

        $webNodeId = (int) ($body['web_node_id'] ?? 0);
        if ($creating && $webNodeId <= 0) {
            return ApiResponse::error('web_node_id is required', 'VALIDATION_FAILED', 400);
        }
        if ($webNodeId > 0 && WebNode::getWebNodeById($webNodeId) === null) {
            return ApiResponse::error('Web node not found', 'VALIDATION_FAILED', 400);
        }

        return null;
    }
}
