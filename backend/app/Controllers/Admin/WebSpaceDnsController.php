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

use App\Chat\DnsHost;
use App\Chat\WebNode;
use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceDnsZone;
use App\Helpers\DnsProvisioner;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceDnsController
{
    public function listZones(Request $request, string $uuid): Response
    {
        $space = $this->requireSpace($uuid);
        if ($space instanceof Response) {
            return $space;
        }

        $zones = WebSpaceDnsZone::listByWebspaceId((int) $space['id']);
        foreach ($zones as &$zone) {
            $host = DnsHost::getById((int) ($zone['dns_host_id'] ?? 0));
            $zone['dns_host'] = $host ? DnsHost::sanitizeForApi($host) : null;
        }
        unset($zone);

        return ApiResponse::success(['zones' => $zones], 'OK', 200);
    }

    public function linkZone(Request $request, string $uuid): Response
    {
        $space = $this->requireSpace($uuid);
        if ($space instanceof Response) {
            return $space;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $dnsHostId = (int) ($body['dns_host_id'] ?? 0);
        $zoneName = strtolower(trim((string) ($body['zone_name'] ?? '')));
        $isPrimary = !empty($body['is_primary']);
        if ($dnsHostId <= 0 || $zoneName === '') {
            return ApiResponse::error('dns_host_id and zone_name are required', 'VALIDATION_FAILED', 400);
        }

        $host = DnsHost::getById($dnsHostId);
        if (!$host) {
            return ApiResponse::error('DNS host not found', 'DNS_HOST_NOT_FOUND', 404);
        }

        $hostNodeError = DnsProvisioner::assertDnsHostMatchesWebSpace($host, $space);
        if ($hostNodeError !== null) {
            return ApiResponse::error($hostNodeError, 'DNS_HOST_NODE_MISMATCH', 400);
        }

        $owner = WebSpaceDnsZone::findOwnerWebspaceId($zoneName, (int) $space['id']);
        if ($owner !== null) {
            return ApiResponse::error('Zone is already linked to another WebSpace', 'ZONE_IN_USE', 409);
        }

        $provider = DnsHost::createProvider($host);
        if ($provider === null) {
            return ApiResponse::error('DNS provider is not configured', 'PROVIDER_UNAVAILABLE', 400);
        }

        $providerZoneId = trim((string) ($body['provider_zone_id'] ?? ''));
        if ($providerZoneId === '') {
            $providerZoneId = (string) ($provider->resolveZoneId($zoneName) ?? '');
        }
        if ($providerZoneId === '') {
            return ApiResponse::error('Could not resolve zone in provider account', 'ZONE_NOT_FOUND', 404);
        }

        $shouldBePrimary = $isPrimary || WebSpaceDnsZone::listByWebspaceId((int) $space['id']) === [];
        $id = WebSpaceDnsZone::create([
            'webspace_id' => (int) $space['id'],
            'dns_host_id' => $dnsHostId,
            'zone_name' => $zoneName,
            'provider_zone_id' => $providerZoneId,
            'is_primary' => $shouldBePrimary,
        ]);
        if ($id === false) {
            return ApiResponse::error('Failed to link DNS zone', 'CREATE_FAILED', 500);
        }

        $zone = WebSpaceDnsZone::getById($id);

        $webNode = WebNode::getWebNodeById((int) ($host['web_node_id'] ?? 0));
        $delegation = $webNode ? DnsProvisioner::delegationHint($webNode, $zoneName) : null;

        try {
            DnsProvisioner::provisionMailForWebSpace($space);
        } catch (\Throwable) {
            // best-effort when zone is linked
        }

        return ApiResponse::success([
            'zone' => $zone,
            'delegation' => $delegation,
        ], 'Zone linked', 201);
    }

    public function unlinkZone(Request $request, string $uuid, int $zoneId): Response
    {
        $space = $this->requireSpace($uuid);
        if ($space instanceof Response) {
            return $space;
        }

        if (!WebSpaceDnsZone::belongsToWebspace($zoneId, (int) $space['id'])) {
            return ApiResponse::error('DNS zone not found', 'NOT_FOUND', 404);
        }

        if (!WebSpaceDnsZone::delete($zoneId)) {
            return ApiResponse::error('Failed to unlink DNS zone', 'DELETE_FAILED', 500);
        }

        return ApiResponse::success([], 'Zone unlinked', 200);
    }

    public function listRecords(Request $request, string $uuid, int $zoneId): Response
    {
        $resolved = $this->resolveZoneProvider($uuid, $zoneId);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $type = $request->query->get('type');
        $name = $request->query->get('name');
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('per_page', 100)));

        try {
            $result = $resolved['provider']->listRecords(
                (string) $resolved['zone']['provider_zone_id'],
                is_string($type) ? $type : null,
                is_string($name) ? $name : null,
                $page,
                $perPage,
            );

            return ApiResponse::success($result, 'OK', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to list DNS records: ' . $e->getMessage(), 'LIST_FAILED', 502);
        }
    }

    public function createRecord(Request $request, string $uuid, int $zoneId): Response
    {
        $resolved = $this->resolveZoneProvider($uuid, $zoneId);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validateRecordPayload($body, true);
        if ($error !== null) {
            return $error;
        }

        try {
            $record = $resolved['provider']->createRecord((string) $resolved['zone']['provider_zone_id'], $body);

            return ApiResponse::success(['record' => $record], 'Record created', 201);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to create DNS record: ' . $e->getMessage(), 'CREATE_FAILED', 502);
        }
    }

    public function updateRecord(Request $request, string $uuid, int $zoneId, string $recordId): Response
    {
        $resolved = $this->resolveZoneProvider($uuid, $zoneId);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $error = $this->validateRecordPayload($body, false);
        if ($error !== null) {
            return $error;
        }

        try {
            $record = $resolved['provider']->updateRecord(
                (string) $resolved['zone']['provider_zone_id'],
                $recordId,
                $body,
            );

            return ApiResponse::success(['record' => $record], 'Record updated', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to update DNS record: ' . $e->getMessage(), 'UPDATE_FAILED', 502);
        }
    }

    public function deleteRecord(Request $request, string $uuid, int $zoneId, string $recordId): Response
    {
        $resolved = $this->resolveZoneProvider($uuid, $zoneId);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        try {
            $resolved['provider']->deleteRecord((string) $resolved['zone']['provider_zone_id'], $recordId);

            return ApiResponse::success([], 'Record deleted', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to delete DNS record: ' . $e->getMessage(), 'DELETE_FAILED', 502);
        }
    }

    public function listDnsHosts(Request $request, string $uuid): Response
    {
        $space = $this->requireSpace($uuid);
        if ($space instanceof Response) {
            return $space;
        }

        $hosts = array_map(static fn (array $host): array => DnsHost::sanitizeForApi($host), DnsHost::listAll());

        return ApiResponse::success(['hosts' => $hosts], 'OK', 200);
    }

    private function requireSpace(string $uuid): array | Response
    {
        $space = WebSpace::getByUuid($uuid);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        return $space;
    }

    /**
     * @return array{zone: array<string, mixed>, provider: \App\Services\Dns\DnsProviderInterface}|Response
     */
    private function resolveZoneProvider(string $uuid, int $zoneId): array | Response
    {
        $space = $this->requireSpace($uuid);
        if ($space instanceof Response) {
            return $space;
        }

        if (!WebSpaceDnsZone::belongsToWebspace($zoneId, (int) $space['id'])) {
            return ApiResponse::error('DNS zone not found', 'NOT_FOUND', 404);
        }

        $zone = WebSpaceDnsZone::getById($zoneId);
        if ($zone === null) {
            return ApiResponse::error('DNS zone not found', 'NOT_FOUND', 404);
        }

        $host = DnsHost::getById((int) ($zone['dns_host_id'] ?? 0));
        if (!$host) {
            return ApiResponse::error('DNS host not found', 'DNS_HOST_NOT_FOUND', 404);
        }

        $provider = DnsHost::createProvider($host);
        if ($provider === null) {
            return ApiResponse::error('DNS provider is not configured', 'PROVIDER_UNAVAILABLE', 400);
        }

        return ['zone' => $zone, 'provider' => $provider];
    }

    /**
     * @param array<string, mixed> $body
     */
    private function validateRecordPayload(array $body, bool $creating): ?Response
    {
        $type = strtoupper(trim((string) ($body['type'] ?? '')));
        if ($creating && $type === '') {
            return ApiResponse::error('type is required', 'VALIDATION_FAILED', 400);
        }

        $allowed = ['A', 'AAAA', 'CNAME', 'TXT', 'MX'];
        if ($type !== '' && !in_array($type, $allowed, true)) {
            return ApiResponse::error('Unsupported record type', 'VALIDATION_FAILED', 400);
        }

        if ($type === 'MX' && $creating && !isset($body['priority'])) {
            return ApiResponse::error('priority is required for MX records', 'VALIDATION_FAILED', 400);
        }

        return null;
    }
}
