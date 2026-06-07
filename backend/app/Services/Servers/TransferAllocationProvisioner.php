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

namespace App\Services\Servers;

use App\App;
use App\Chat\Allocation;
use App\Services\Wings\Wings;

/**
 * Creates missing panel allocations on a destination node during server transfer,
 * using IPs reported by Wings and the source server's current ports.
 */
class TransferAllocationProvisioner
{
    /**
     * @param array<string, mixed> $destinationNode
     * @param array<int, array<string, mixed>> $sourceAllocations
     *
     * @return array{success: bool, created: int, error?: string, code?: string, http_status?: int}
     */
    public function provisionMissing(
        int $destinationNodeId,
        array $destinationNode,
        array $sourceAllocations,
        int $primaryAllocationId,
        int $countNeeded,
    ): array {
        if ($countNeeded <= 0) {
            return ['success' => true, 'created' => 0];
        }

        $wingsIpsResult = $this->fetchWingsIpAddresses($destinationNode);
        if (!$wingsIpsResult['success']) {
            return array_merge($wingsIpsResult, ['created' => 0]);
        }

        $resolvedSlots = $this->resolveDestinationSlots(
            $sourceAllocations,
            $primaryAllocationId,
            $countNeeded,
            $wingsIpsResult['ips'],
            $destinationNode
        );

        if (empty($resolvedSlots)) {
            return [
                'success' => false,
                'created' => 0,
                'error' => 'Server has no allocations to mirror on the destination node',
                'code' => 'NO_SOURCE_ALLOCATIONS',
                'http_status' => 400,
            ];
        }

        $created = 0;
        foreach ($resolvedSlots as $slot) {
            $targetIp = $slot['ip'];
            $port = $slot['port'];
            $existing = Allocation::getByNodeIpPort($destinationNodeId, $targetIp, $port);

            if ($existing !== null) {
                if ($existing['server_id'] !== null) {
                    return [
                        'success' => false,
                        'created' => $created,
                        'error' => 'Port ' . $port . ' on ' . $targetIp . ' is already assigned on the destination node',
                        'code' => 'DESTINATION_PORT_IN_USE',
                        'http_status' => 400,
                    ];
                }

                continue;
            }

            $allocationId = Allocation::create([
                'node_id' => $destinationNodeId,
                'ip' => $targetIp,
                'port' => $port,
                'notes' => 'Auto-opened for server transfer',
            ]);

            if (!$allocationId) {
                return [
                    'success' => false,
                    'created' => $created,
                    'error' => 'Failed to create allocation for ' . $targetIp . ':' . $port . ' on destination node',
                    'code' => 'ALLOCATION_CREATE_FAILED',
                    'http_status' => 500,
                ];
            }

            ++$created;
        }

        return ['success' => true, 'created' => $created];
    }

    /**
     * @param array<int, array{ip: string, port: int}> $resolvedSlots
     *
     * @return array{success: bool, created: int, error?: string, code?: string, http_status?: int}
     */
    public function provisionResolvedSlots(int $destinationNodeId, array $resolvedSlots): array
    {
        $created = 0;

        foreach ($resolvedSlots as $slot) {
            $targetIp = $slot['ip'];
            $port = $slot['port'];
            $existing = Allocation::getByNodeIpPort($destinationNodeId, $targetIp, $port);

            if ($existing !== null) {
                if ($existing['server_id'] !== null) {
                    return [
                        'success' => false,
                        'created' => $created,
                        'error' => 'Port ' . $port . ' on ' . $targetIp . ' is already assigned on the destination node',
                        'code' => 'DESTINATION_PORT_IN_USE',
                        'http_status' => 400,
                    ];
                }

                continue;
            }

            $allocationId = Allocation::create([
                'node_id' => $destinationNodeId,
                'ip' => $targetIp,
                'port' => $port,
                'notes' => 'Auto-opened for server transfer',
            ]);

            if (!$allocationId) {
                return [
                    'success' => false,
                    'created' => $created,
                    'error' => 'Failed to create allocation for ' . $targetIp . ':' . $port . ' on destination node',
                    'code' => 'ALLOCATION_CREATE_FAILED',
                    'http_status' => 500,
                ];
            }

            ++$created;
        }

        return ['success' => true, 'created' => $created];
    }

    /**
     * @param array<int, array<string, mixed>> $sourceAllocations
     * @param array<int, string> $wingsIps
     * @param array<string, mixed> $destinationNode
     *
     * @return array<int, array{ip: string, port: int}>
     */
    public function resolveDestinationSlots(
        array $sourceAllocations,
        int $primaryAllocationId,
        int $countNeeded,
        array $wingsIps,
        array $destinationNode,
    ): array {
        $slots = array_slice($this->buildSourceSlots($sourceAllocations, $primaryAllocationId), 0, $countNeeded);
        $resolved = [];

        foreach ($slots as $slot) {
            $port = (int) ($slot['port'] ?? 0);
            if ($port < 1 || $port > 65535) {
                continue;
            }

            $resolved[] = [
                'ip' => $this->resolveTargetIp((string) ($slot['ip'] ?? ''), $wingsIps, $destinationNode),
                'port' => $port,
            ];
        }

        return $resolved;
    }

    /**
     * @param array<string, mixed> $destinationNode
     *
     * @return array{success: bool, ips?: array<int, string>, error?: string, code?: string, http_status?: int}
     */
    public function fetchWingsIpAddresses(array $destinationNode): array
    {
        try {
            $wings = Wings::fromNode($destinationNode, 30);
            $ipsResponse = $wings->getSystem()->getSystemIPs();
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Failed to fetch Wings IPs for transfer provisioning: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Could not reach destination node to read Wings IP list: ' . $e->getMessage(),
                'code' => 'WINGS_IPS_UNAVAILABLE',
                'http_status' => 503,
            ];
        }

        $wingsIps = $this->extractWingsIpAddresses($ipsResponse);
        if (empty($wingsIps)) {
            return [
                'success' => false,
                'error' => 'Destination node reported no usable IPs from Wings',
                'code' => 'WINGS_IPS_EMPTY',
                'http_status' => 400,
            ];
        }

        return ['success' => true, 'ips' => $wingsIps];
    }

    /**
     * @param array<int, array<string, mixed>> $sourceAllocations
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildSourceSlots(array $sourceAllocations, int $primaryAllocationId): array
    {
        $primary = null;
        $additional = [];

        foreach ($sourceAllocations as $allocation) {
            if ((int) $allocation['id'] === $primaryAllocationId) {
                $primary = $allocation;
            } else {
                $additional[] = $allocation;
            }
        }

        if ($primary === null && !empty($sourceAllocations)) {
            $primary = $sourceAllocations[0];
            $additional = array_slice($sourceAllocations, 1);
        }

        $slots = [];
        if ($primary !== null) {
            $slots[] = $primary;
        }

        return array_merge($slots, $additional);
    }

    /**
     * @param array<string, mixed> $ipsResponse
     *
     * @return array<int, string>
     */
    private function extractWingsIpAddresses(array $ipsResponse): array
    {
        $raw = $ipsResponse['ip_addresses'] ?? $ipsResponse['data']['ip_addresses'] ?? [];
        if (!is_array($raw)) {
            return [];
        }

        $ips = [];
        foreach ($raw as $ip) {
            if (!is_string($ip) || trim($ip) === '') {
                continue;
            }
            $ips[] = trim($ip);
        }

        return array_values(array_unique($ips));
    }

    /**
     * @param array<int, string> $wingsIps
     * @param array<string, mixed> $destinationNode
     */
    private function resolveTargetIp(string $sourceIp, array $wingsIps, array $destinationNode): string
    {
        if ($sourceIp !== '' && in_array($sourceIp, $wingsIps, true)) {
            return $sourceIp;
        }

        $publicIp = trim((string) ($destinationNode['public_ip_v4'] ?? ''));
        if ($publicIp !== '' && in_array($publicIp, $wingsIps, true)) {
            return $publicIp;
        }

        if (in_array('0.0.0.0', $wingsIps, true)) {
            return '0.0.0.0';
        }

        return $wingsIps[0];
    }
}
