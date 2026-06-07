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
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\Allocation;
use App\Chat\ServerTransfer;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Helpers\WingsUrlHelper;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Initiates Wings server transfers between nodes, including automatic allocation assignment.
 */
class ServerTransferInitiator
{
    /**
     * @param array<string, mixed> $options
     *                                      - destination_node_id (required)
     *                                      - destination_allocation_id (optional)
     *                                      - destination_additional_allocations (optional int[])
     *                                      - auto_allocate (bool, default true when primary allocation omitted)
     *                                      - auto_open_ports (bool, create missing allocations from Wings IPs)
     *
     * @return array{success: bool, error?: string, code?: string, http_status?: int, transfer_id?: int|false, new_allocation?: int|null, new_additional_allocations?: int[]}
     */
    public function initiate(int $serverId, array $options, array $actingUser): array
    {
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ['success' => false, 'error' => 'Server not found', 'code' => 'SERVER_NOT_FOUND', 'http_status' => 404];
        }

        if (!isset($options['destination_node_id']) || !is_numeric($options['destination_node_id'])) {
            return ['success' => false, 'error' => 'Invalid or missing destination_node_id', 'code' => 'INVALID_DESTINATION_NODE', 'http_status' => 400];
        }

        $destinationNodeId = (int) $options['destination_node_id'];

        if ((int) $server['node_id'] === $destinationNodeId) {
            return ['success' => false, 'error' => 'Cannot transfer server to the same node', 'code' => 'SAME_SOURCE_DESTINATION', 'http_status' => 400];
        }

        if ($server['status'] === 'transferring' || ServerTransfer::hasActiveTransfer($serverId)) {
            return ['success' => false, 'error' => 'Server is already being transferred', 'code' => 'ALREADY_TRANSFERRING', 'http_status' => 400];
        }

        if ($server['status'] === 'installing' || $server['status'] === 'restoring') {
            return ['success' => false, 'error' => 'Server cannot be transferred while installing or restoring', 'code' => 'SERVER_NOT_TRANSFERABLE', 'http_status' => 400];
        }

        $destinationNode = Node::getNodeById($destinationNodeId);
        if (!$destinationNode) {
            return ['success' => false, 'error' => 'Destination node not found', 'code' => 'DESTINATION_NODE_NOT_FOUND', 'http_status' => 404];
        }

        $sourceNode = Node::getNodeById((int) $server['node_id']);
        if (!$sourceNode) {
            return ['success' => false, 'error' => 'Source node not found', 'code' => 'SOURCE_NODE_NOT_FOUND', 'http_status' => 404];
        }

        $originalNodeId = (int) $server['node_id'];
        $originalAllocationId = $server['allocation_id'];

        $currentAllocations = Allocation::getByServerId($serverId);
        $oldAdditionalAllocations = array_values(array_filter(
            array_map('intval', array_column($currentAllocations, 'id')),
            fn (int $allocId) => $allocId !== (int) $originalAllocationId
        ));

        $allocationCountNeeded = max(1, 1 + count($oldAdditionalAllocations));

        $newAllocationId = null;
        $newAdditionalAllocations = [];

        if (isset($options['destination_allocation_id'])) {
            $destinationAllocation = Allocation::getAllocationById((int) $options['destination_allocation_id']);
            if (!$destinationAllocation) {
                return ['success' => false, 'error' => 'Destination allocation not found', 'code' => 'DESTINATION_ALLOCATION_NOT_FOUND', 'http_status' => 404];
            }
            if ((int) $destinationAllocation['node_id'] !== $destinationNodeId) {
                return ['success' => false, 'error' => 'Destination allocation does not belong to destination node', 'code' => 'ALLOCATION_NODE_MISMATCH', 'http_status' => 400];
            }
            if ($destinationAllocation['server_id'] !== null) {
                return ['success' => false, 'error' => 'Destination allocation is already assigned to another server', 'code' => 'ALLOCATION_IN_USE', 'http_status' => 400];
            }
            $newAllocationId = (int) $destinationAllocation['id'];
        }

        if (isset($options['destination_additional_allocations']) && is_array($options['destination_additional_allocations'])) {
            foreach ($options['destination_additional_allocations'] as $allocId) {
                $alloc = Allocation::getAllocationById((int) $allocId);
                if ($alloc && (int) $alloc['node_id'] === $destinationNodeId && $alloc['server_id'] === null) {
                    $newAdditionalAllocations[] = (int) $allocId;
                }
            }
        }

        $autoAllocate = !array_key_exists('auto_allocate', $options) || $options['auto_allocate'] !== false;
        $autoOpenPorts = !empty($options['auto_open_ports']);
        $excludeIds = array_merge(
            $newAllocationId ? [$newAllocationId] : [],
            $newAdditionalAllocations
        );

        if ($newAllocationId === null && $autoAllocate) {
            $pickResult = $this->pickTransferAllocations(
                $autoOpenPorts,
                $destinationNodeId,
                $destinationNode,
                $currentAllocations,
                (int) $originalAllocationId,
                $allocationCountNeeded,
                $excludeIds
            );
            if (!$pickResult['success']) {
                return $pickResult;
            }
            $picked = $pickResult['picked'];
            $newAllocationId = array_shift($picked);
            if (!empty($picked)) {
                $newAdditionalAllocations = array_merge($newAdditionalAllocations, $picked);
            }
        } elseif ($newAllocationId === null) {
            return [
                'success' => false,
                'error' => 'Destination allocation is required when auto_allocate is disabled',
                'code' => 'DESTINATION_ALLOCATION_REQUIRED',
                'http_status' => 400,
            ];
        } elseif ($autoAllocate && count($newAdditionalAllocations) < count($oldAdditionalAllocations)) {
            $stillNeeded = count($oldAdditionalAllocations) - count($newAdditionalAllocations);
            $pickResult = $this->pickTransferAllocations(
                $autoOpenPorts,
                $destinationNodeId,
                $destinationNode,
                $currentAllocations,
                (int) $originalAllocationId,
                $stillNeeded,
                array_merge($excludeIds, [$newAllocationId], $newAdditionalAllocations),
                true
            );
            if (!$pickResult['success']) {
                return $pickResult;
            }
            $newAdditionalAllocations = array_merge($newAdditionalAllocations, $pickResult['picked']);
        }

        $config = App::getInstance(true)->getConfig();
        $panelUrl = $config->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems');
        $destinationUrl = WingsUrlHelper::buildFromNode($destinationNode);

        try {
            if ($newAllocationId) {
                $allocationsToAssign = array_merge([$newAllocationId], $newAdditionalAllocations);
                Allocation::assignMultipleToServer($serverId, $allocationsToAssign);
            }

            $updated = Server::updateServerById($serverId, [
                'status' => 'transferring',
                'node_id' => $destinationNodeId,
            ]);
            if (!$updated) {
                if ($newAllocationId) {
                    Allocation::unassignMultiple(array_merge([$newAllocationId], $newAdditionalAllocations));
                }

                return ['success' => false, 'error' => 'Failed to update server status', 'code' => 'UPDATE_FAILED', 'http_status' => 500];
            }

            $wings = Wings::fromNode($sourceNode, 30);

            $jwtService = new \App\Services\Wings\Services\JwtService(
                $destinationNode['daemon_token'],
                $panelUrl,
                $destinationUrl,
                3600
            );

            $transferToken = $jwtService->generateTransferToken(
                $server['uuid'],
                $actingUser['uuid'],
                ['*']
            );

            $transferData = [
                'url' => $destinationUrl . '/api/transfers',
                'token' => 'Bearer ' . $transferToken,
            ];

            $wings->getTransfer()->startTransfer($server['uuid'], $transferData);

            $transferId = ServerTransfer::create([
                'server_id' => $serverId,
                'source_node_id' => $originalNodeId,
                'destination_node_id' => $destinationNodeId,
                'old_allocation' => $originalAllocationId,
                'new_allocation' => $newAllocationId,
                'old_additional_allocations' => $oldAdditionalAllocations,
                'new_additional_allocations' => $newAdditionalAllocations,
                'status' => 'in_progress',
                'progress' => 0.0,
                'started_at' => date('Y-m-d H:i:s'),
            ]);

            if (!$transferId) {
                App::getInstance(true)->getLogger()->error('Failed to create server transfer record for server ' . $serverId);
            }

            Activity::createActivity([
                'user_uuid' => $actingUser['uuid'],
                'name' => 'initiate_server_transfer',
                'context' => 'Initiated transfer of server ' . $server['name'] . ' from node ' . $sourceNode['name'] . ' to node ' . $destinationNode['name'],
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    ServerEvent::onServerTransferInitiated(),
                    [
                        'server' => $server,
                        'source_node' => $sourceNode,
                        'destination_node' => $destinationNode,
                        'initiated_by' => $actingUser,
                    ]
                );
            }

            return [
                'success' => true,
                'transfer_id' => $transferId,
                'new_allocation' => $newAllocationId,
                'new_additional_allocations' => $newAdditionalAllocations,
            ];
        } catch (\Exception $e) {
            Server::updateServerById($serverId, [
                'status' => $server['status'],
                'node_id' => $originalNodeId,
            ]);

            if ($newAllocationId) {
                Allocation::unassignMultiple(array_merge([$newAllocationId], $newAdditionalAllocations));
            }

            App::getInstance(true)->getLogger()->error('Failed to initiate server transfer: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to initiate server transfer: ' . $e->getMessage(),
                'code' => 'TRANSFER_INITIATION_FAILED',
                'http_status' => 500,
            ];
        }
    }

    /**
     * @param array<int> $serverIds Empty means all transferable servers on the source node
     *
     * @return array{
     *     initiated: array<int, array{server_id: int, name: string, transfer_id: int|false}>,
     *     failed: array<int, array{server_id: int, name: string, error: string, code: string}>,
     *     skipped: array<int, array{server_id: int, name: string, reason: string}>
     * }
     */
    public function massTransfer(
        int $sourceNodeId,
        int $destinationNodeId,
        array $serverIds,
        bool $moveAll,
        array $actingUser,
        int $maxPerRequest = 100,
    ): array {
        $initiated = [];
        $failed = [];
        $skipped = [];

        if ($sourceNodeId === $destinationNodeId) {
            return [
                'initiated' => [],
                'failed' => [[
                    'server_id' => 0,
                    'name' => '',
                    'error' => 'Cannot transfer to the same node',
                    'code' => 'SAME_SOURCE_DESTINATION',
                ]],
                'skipped' => [],
            ];
        }

        $serversOnNode = Server::getServersByNodeId($sourceNodeId);
        $transferable = [];
        foreach ($serversOnNode as $server) {
            if ($server['status'] === 'transferring' || ServerTransfer::hasActiveTransfer((int) $server['id'])) {
                $skipped[] = [
                    'server_id' => (int) $server['id'],
                    'name' => $server['name'],
                    'reason' => 'already_transferring',
                ];
                continue;
            }
            if ($server['status'] === 'installing' || $server['status'] === 'restoring') {
                $skipped[] = [
                    'server_id' => (int) $server['id'],
                    'name' => $server['name'],
                    'reason' => 'not_transferable',
                ];
                continue;
            }
            $transferable[(int) $server['id']] = $server;
        }

        if ($moveAll) {
            $targets = array_values($transferable);
        } else {
            $targets = [];
            $onNodeIds = array_map(fn (array $s) => (int) $s['id'], $serversOnNode);
            foreach ($serverIds as $serverId) {
                $serverId = (int) $serverId;
                if (!isset($transferable[$serverId])) {
                    if (!in_array($serverId, $onNodeIds, true)) {
                        $skipped[] = [
                            'server_id' => $serverId,
                            'name' => 'Server #' . $serverId,
                            'reason' => 'not_on_source_node',
                        ];
                    }
                    continue;
                }
                $targets[] = $transferable[$serverId];
            }
        }

        if (count($targets) > $maxPerRequest) {
            $targets = array_slice($targets, 0, $maxPerRequest);
        }

        $reservedAllocationIds = [];

        foreach ($targets as $server) {
            $serverId = (int) $server['id'];
            $currentAllocations = Allocation::getByServerId($serverId);
            $additionalCount = max(0, count($currentAllocations) - 1);
            $needed = 1 + $additionalCount;

            $picked = Allocation::pickFreeAllocationIdsForNode($destinationNodeId, $needed, $reservedAllocationIds);
            if (count($picked) < $needed) {
                $failed[] = [
                    'server_id' => $serverId,
                    'name' => $server['name'],
                    'error' => 'Not enough free allocations on destination node',
                    'code' => 'INSUFFICIENT_FREE_ALLOCATIONS',
                ];
                continue;
            }

            $primaryId = array_shift($picked);
            $reservedAllocationIds[] = $primaryId;
            $additionalIds = $picked;
            $reservedAllocationIds = array_merge($reservedAllocationIds, $additionalIds);

            $result = $this->initiate($serverId, [
                'destination_node_id' => $destinationNodeId,
                'destination_allocation_id' => $primaryId,
                'destination_additional_allocations' => $additionalIds,
                'auto_allocate' => false,
            ], $actingUser);

            if ($result['success']) {
                $initiated[] = [
                    'server_id' => $serverId,
                    'name' => $server['name'],
                    'transfer_id' => $result['transfer_id'] ?? false,
                ];
            } else {
                $failed[] = [
                    'server_id' => $serverId,
                    'name' => $server['name'],
                    'error' => $result['error'] ?? 'Transfer failed',
                    'code' => $result['code'] ?? 'TRANSFER_FAILED',
                ];
                Allocation::unassignMultiple(array_merge([$primaryId], $additionalIds));
                $reservedAllocationIds = array_values(array_diff(
                    $reservedAllocationIds,
                    array_merge([$primaryId], $additionalIds)
                ));
            }
        }

        return [
            'initiated' => $initiated,
            'failed' => $failed,
            'skipped' => $skipped,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $sourceAllocations
     * @param array<int> $excludeIds
     *
     * @return array{success: bool, picked: array<int>, error?: string, code?: string, http_status?: int}
     */
    private function pickTransferAllocations(
        bool $autoOpenPorts,
        int $destinationNodeId,
        array $destinationNode,
        array $sourceAllocations,
        int $primaryAllocationId,
        int $countNeeded,
        array $excludeIds,
        bool $additionalOnly = false,
    ): array {
        if ($countNeeded <= 0) {
            return ['success' => true, 'picked' => []];
        }

        $provisioner = new TransferAllocationProvisioner();

        if ($autoOpenPorts) {
            $wingsIpsResult = $provisioner->fetchWingsIpAddresses($destinationNode);
            if (!$wingsIpsResult['success']) {
                return [
                    'success' => false,
                    'picked' => [],
                    'error' => $wingsIpsResult['error'] ?? 'Failed to read Wings IP list',
                    'code' => $wingsIpsResult['code'] ?? 'WINGS_IPS_UNAVAILABLE',
                    'http_status' => $wingsIpsResult['http_status'] ?? 503,
                ];
            }

            $allSlots = $provisioner->resolveDestinationSlots(
                $sourceAllocations,
                $primaryAllocationId,
                max(1, count($sourceAllocations)),
                $wingsIpsResult['ips'],
                $destinationNode
            );
            $slots = $additionalOnly ? array_slice($allSlots, 1, $countNeeded) : array_slice($allSlots, 0, $countNeeded);

            $picked = Allocation::pickFreeAllocationIdsForSlots($destinationNodeId, $slots, $excludeIds);
            if (count($picked) < $countNeeded) {
                $missingSlots = array_slice($slots, count($picked));
                $provisionResult = $provisioner->provisionResolvedSlots($destinationNodeId, $missingSlots);
                if (!$provisionResult['success']) {
                    return [
                        'success' => false,
                        'picked' => [],
                        'error' => $provisionResult['error'] ?? 'Failed to auto-open ports on destination node',
                        'code' => $provisionResult['code'] ?? 'AUTO_OPEN_PORTS_FAILED',
                        'http_status' => $provisionResult['http_status'] ?? 500,
                    ];
                }
                $picked = Allocation::pickFreeAllocationIdsForSlots($destinationNodeId, $slots, $excludeIds);
            }

            if (count($picked) < $countNeeded) {
                return [
                    'success' => false,
                    'picked' => [],
                    'error' => $additionalOnly
                        ? 'Not enough free allocations on the destination node for additional ports'
                        : 'Not enough free allocations on the destination node (need ' . $countNeeded . ', found ' . count($picked) . ')',
                    'code' => 'INSUFFICIENT_FREE_ALLOCATIONS',
                    'http_status' => 400,
                ];
            }

            return ['success' => true, 'picked' => $picked];
        }

        $picked = Allocation::pickFreeAllocationIdsForNode($destinationNodeId, $countNeeded, $excludeIds);
        if (count($picked) < $countNeeded) {
            return [
                'success' => false,
                'picked' => [],
                'error' => $additionalOnly
                    ? 'Not enough free allocations on the destination node for additional ports'
                    : 'Not enough free allocations on the destination node (need ' . $countNeeded . ', found ' . count($picked) . ')',
                'code' => 'INSUFFICIENT_FREE_ALLOCATIONS',
                'http_status' => 400,
            ];
        }

        return ['success' => true, 'picked' => $picked];
    }
}
