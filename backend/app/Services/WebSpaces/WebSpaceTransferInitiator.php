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

namespace App\Services\WebSpaces;

use App\App;
use App\Chat\WebNode;
use App\Chat\WebSpace;
use App\Chat\WebSpaceTransfer;
use App\Helpers\WingsUrlHelper;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpaceActivityLogger;

/**
 * Orchestrate WebSpace moves between FeatherQuilld nodes.
 */
class WebSpaceTransferInitiator
{
    /**
     * @return array{success: bool, error?: string, code?: string, http_status?: int, transfer_id?: int}
     */
    public function initiate(
        string $webspaceUuid,
        int $destWebNodeId,
        bool $startOnCompletion = true,
        bool $includeBackups = false,
    ): array {
        $space = WebSpace::getByUuid($webspaceUuid);
        if (!$space) {
            return ['success' => false, 'error' => 'WebSpace not found', 'code' => 'WEBSPACE_NOT_FOUND', 'http_status' => 404];
        }

        $sourceNodeId = (int) $space['web_node_id'];
        if ($sourceNodeId === $destWebNodeId) {
            return ['success' => false, 'error' => 'Cannot transfer to the same web node', 'code' => 'SAME_NODE', 'http_status' => 400];
        }

        if (($space['status'] ?? '') === 'transferring' || WebSpaceTransfer::hasActiveTransfer($webspaceUuid)) {
            return ['success' => false, 'error' => 'WebSpace is already transferring', 'code' => 'ALREADY_TRANSFERRING', 'http_status' => 400];
        }

        $sourceNode = WebNode::getWebNodeById($sourceNodeId);
        $destNode = WebNode::getWebNodeById($destWebNodeId);
        if (!$sourceNode || !$destNode) {
            return ['success' => false, 'error' => 'Web node not found', 'code' => 'WEB_NODE_NOT_FOUND', 'http_status' => 404];
        }

        $transferId = WebSpaceTransfer::create([
            'webspace_uuid' => $webspaceUuid,
            'source_web_node_id' => $sourceNodeId,
            'dest_web_node_id' => $destWebNodeId,
            'status' => 'running',
        ]);
        if ($transferId === false) {
            return ['success' => false, 'error' => 'Failed to create transfer row', 'code' => 'TRANSFER_CREATE_FAILED', 'http_status' => 500];
        }

        // Dest must own the panel row before incoming CreateFromPanel pulls config.
        WebSpace::updateStatus($webspaceUuid, 'transferring');
        WebSpace::updateWebNodeId($webspaceUuid, $destWebNodeId);

        $destBase = rtrim(WingsUrlHelper::buildFromNode($destNode), '/');
        $destTokenId = trim((string) ($destNode['daemon_token_id'] ?? ''));
        $destToken = trim((string) ($destNode['daemon_token'] ?? ''));
        if ($destTokenId === '' || $destToken === '') {
            $this->fail($transferId, $webspaceUuid, $sourceNodeId, 'Destination node missing daemon credentials');

            return ['success' => false, 'error' => 'Destination node missing daemon credentials', 'code' => 'DEST_CREDS', 'http_status' => 400];
        }

        $daemon = FeatherQuilldClient::request($sourceNode, 'POST', '/api/webspaces/' . $webspaceUuid . '/transfer', [
            'url' => $destBase . '/api/transfers',
            'token' => $destTokenId . '.' . $destToken,
            'start_on_completion' => $startOnCompletion,
            'include_backups' => $includeBackups,
        ], 3600);

        if (!$daemon['ok']) {
            $this->fail($transferId, $webspaceUuid, $sourceNodeId, $daemon['error'] ?? 'Source daemon transfer failed');

            return [
                'success' => false,
                'error' => $daemon['error'] ?? 'Source daemon transfer failed',
                'code' => 'DAEMON_TRANSFER_FAILED',
                'http_status' => 502,
                'transfer_id' => $transferId,
            ];
        }

        // Transfer runs asynchronously on the source node; completion via quilld-remote callback.
        $space = WebSpace::getByUuid($webspaceUuid);
        if ($space) {
            WebSpaceActivityLogger::log($space, null, 'webspace.transfer.started', [
                'transfer_id' => $transferId,
                'source_web_node_id' => $sourceNodeId,
                'dest_web_node_id' => $destWebNodeId,
            ]);
        }

        App::getInstance(true)->getLogger()->info("WebSpace transfer {$webspaceUuid} → node {$destWebNodeId} started (transfer_id={$transferId})");

        return ['success' => true, 'transfer_id' => $transferId, 'status' => 'running'];
    }

    public function handleRemoteReport(string $uuid, bool $successful, ?string $error = null): void
    {
        $space = WebSpace::getByUuid($uuid);
        $active = WebSpaceTransfer::getActiveByUuid($uuid);
        if ($active) {
            WebSpaceTransfer::complete((int) $active['id'], $successful, $error);
            if ($successful) {
                WebSpace::updateStatus($uuid, 'installed');
                if ($space) {
                    WebSpaceActivityLogger::log($space, null, 'webspace.transfer.completed', [
                        'transfer_id' => (int) $active['id'],
                    ]);
                }
            } else {
                $sourceId = (int) $active['source_web_node_id'];
                WebSpace::updateWebNodeId($uuid, $sourceId);
                WebSpace::updateStatus($uuid, 'transfer_failed');
                if ($space) {
                    WebSpaceActivityLogger::log($space, null, 'webspace.transfer.failed', [
                        'transfer_id' => (int) $active['id'],
                        'error' => $error,
                    ]);
                }
            }

            return;
        }

        if ($successful) {
            WebSpace::updateStatus($uuid, 'installed');
            if ($space) {
                WebSpaceActivityLogger::log($space, null, 'webspace.transfer.completed', []);
            }
        } else {
            WebSpace::updateStatus($uuid, 'transfer_failed');
            if ($space) {
                WebSpaceActivityLogger::log($space, null, 'webspace.transfer.failed', [
                    'error' => $error,
                ]);
            }
        }
    }

    private function fail(int $transferId, string $uuid, int $sourceNodeId, string $error): void
    {
        WebSpaceTransfer::complete($transferId, false, $error);
        WebSpace::updateWebNodeId($uuid, $sourceNodeId);
        WebSpace::updateStatus($uuid, 'transfer_failed');
        App::getInstance(true)->getLogger()->error("WebSpace transfer failed {$uuid}: {$error}");
    }
}
