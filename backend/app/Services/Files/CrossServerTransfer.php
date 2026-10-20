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

namespace App\Services\Files;

use App\Chat\Node;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\FileTransfer;
use App\Chat\ServerActivity;
use App\Helpers\AppUrlHelper;
use App\Services\Wings\Wings;
use App\Helpers\WingsUrlHelper;
use App\Helpers\DaemonCapabilities;
use App\Services\Wings\Services\JwtService;
use App\Services\Notifications\InboxNotifier;
use App\Controllers\User\CalagopusClientCompatController;

/**
 * Copies or moves files between two servers, on the same or different nodes.
 *
 * Flow: compress the selection on the source, hand the target Wings a signed one time
 * download URL so it pulls the archive itself, decompress at the destination, then clean
 * up the temporary archive on both sides (and the originals for a move). When the pull
 * cannot run (for example private node addresses), the panel streams the files instead.
 * FeatherWings (wings-rs) on both ends uses its native copy-remote endpoint.
 */
class CrossServerTransfer
{
    public static function run(string $jobUuid): void
    {
        @set_time_limit(0);
        @ignore_user_abort(true);

        $job = FileTransfer::getByUuid($jobUuid);
        if (!$job || $job['status'] !== 'pending') {
            return;
        }
        $id = (int) $job['id'];
        FileTransfer::update($id, ['status' => 'running', 'stage' => 'preparing', 'progress' => 5]);

        $source = Server::getServerById((int) $job['source_server_id']);
        $target = Server::getServerById((int) $job['target_server_id']);
        $user = User::getUserById((int) $job['user_id']);
        $files = json_decode((string) $job['files'], true) ?: [];
        $root = (string) $job['source_root'];
        $destination = (string) $job['destination'];

        try {
            if (!$source || !$target || !$user || $files === []) {
                throw new \RuntimeException('Transfer is missing its servers or files');
            }
            $sourceNode = Node::getNodeById((int) $source['node_id']);
            $targetNode = Node::getNodeById((int) $target['node_id']);
            if (!$sourceNode || !$targetNode) {
                throw new \RuntimeException('Source or target node not found');
            }

            $nativeBoth = DaemonCapabilities::fromNode($sourceNode)->isWingsRs() && DaemonCapabilities::fromNode($targetNode)->isWingsRs();
            if ($nativeBoth) {
                FileTransfer::update($id, ['stage' => 'copying', 'progress' => 30, 'method' => 'native']);
                self::runNative($sourceNode, $source, $targetNode, $target, $user, $root, $files, $destination);
            } else {
                $method = self::runArchivePull($id, $sourceNode, $source, $targetNode, $target, $user, $root, $files, $destination);
                FileTransfer::update($id, ['method' => $method]);
            }

            if ($job['mode'] === 'move') {
                FileTransfer::update($id, ['stage' => 'removing_originals', 'progress' => 92]);
                $del = Wings::fromNode($sourceNode, 300)->getServer()->deleteFiles((string) $source['uuid'], $root, $files);
                if (!$del->isSuccessful()) {
                    throw new \RuntimeException('Copied, but removing the originals failed: ' . $del->getError());
                }
            }

            FileTransfer::update($id, ['status' => 'completed', 'stage' => 'done', 'progress' => 100, 'finished' => true]);
            self::log($source, $user, 'file_transfer_sent', $job, $target);
            self::log($target, $user, 'file_transfer_received', $job, $source);
            InboxNotifier::fileTransferFinished($user, $source, $target, $job, true);
        } catch (\Throwable $e) {
            FileTransfer::update($id, ['status' => 'failed', 'stage' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 1000), 'finished' => true]);
            if ($source && $user) {
                self::log($source, $user, 'file_transfer_failed', $job, $target ?: null, $e->getMessage());
            }
            if ($user && $source && $target) {
                InboxNotifier::fileTransferFinished($user, $source, $target, $job, false);
            }
        }
    }

    private static function runNative(array $sourceNode, array $source, array $targetNode, array $target, array $user, string $root, array $files, string $destination): void
    {
        $url = '';
        $token = '';
        if ((int) $sourceNode['id'] !== (int) $targetNode['id']) {
            $targetBase = WingsUrlHelper::buildFromNode($targetNode);
            $jwt = (new JwtService((string) $targetNode['daemon_token'], AppUrlHelper::wingsRemoteUrl(), $targetBase, 900))
                ->generateFileTransferToken((string) $target['uuid'], (string) $user['uuid'], $root, $destination);
            $url = rtrim($targetBase, '/') . '/api/transfers/files';
            $token = 'Bearer ' . $jwt;
        }
        $pairs = array_map(static fn (string $f) => ['from' => $f, 'to' => $f], $files);
        $response = Wings::fromNode($sourceNode, 900)->getServer()->copyRemoteFiles(
            (string) $source['uuid'],
            $url,
            $token,
            $root,
            $pairs,
            (string) $target['uuid'],
            $destination,
            true,
            'tar_gz'
        );
        if (!$response->isSuccessful()) {
            throw new \RuntimeException('Copy failed: ' . $response->getError());
        }
    }

    /**
     * @return string method used: pull or stream
     */
    private static function runArchivePull(int $id, array $sourceNode, array $source, array $targetNode, array $target, array $user, string $root, array $files, string $destination): string
    {
        $sourceService = Wings::fromNode($sourceNode, 900)->getServer();
        $targetService = Wings::fromNode($targetNode, 900)->getServer();
        $archiveBase = '.fp-transfer-' . substr(bin2hex(random_bytes(8)), 0, 12);

        FileTransfer::update($id, ['stage' => 'compressing', 'progress' => 15]);
        $compressed = $sourceService->compressFiles((string) $source['uuid'], $root, $files, $archiveBase, 'tar.gz', null, true);
        if (!$compressed->isSuccessful()) {
            throw new \RuntimeException('Compressing on the source failed: ' . $compressed->getError());
        }
        $info = $compressed->getData();
        $archiveName = is_array($info) && is_string($info['name'] ?? null) && $info['name'] !== '' ? basename($info['name']) : $archiveBase . '.tar.gz';
        $archivePath = rtrim($root, '/') . '/' . $archiveName;

        try {
            FileTransfer::update($id, ['stage' => 'pulling', 'progress' => 40]);
            $jwt = (new JwtService((string) $sourceNode['daemon_token'], AppUrlHelper::wingsRemoteUrl(), WingsUrlHelper::buildFromNode($sourceNode)))
                ->generateFileDownloadToken((string) $source['uuid'], (string) $user['uuid'], $archivePath);
            $url = rtrim(WingsUrlHelper::buildFromNode($sourceNode), '/') . '/download/file?token=' . $jwt
                . '&server=' . $source['uuid'] . '&file=' . urlencode($archivePath);

            $pulled = $targetService->pullFile((string) $target['uuid'], $url, $destination, $archiveName, true, false);
            if (!$pulled->isSuccessful()) {
                // Pull is blocked or unavailable (private addresses, disabled remote downloads): stream through the panel.
                FileTransfer::update($id, ['stage' => 'streaming', 'progress' => 45]);
                (new CalagopusClientCompatController())->copyRemoteThroughPanel(
                    $sourceNode,
                    $source,
                    $targetNode,
                    $target,
                    $root,
                    $destination,
                    array_map(static fn (string $f) => ['from' => $f, 'to' => $f], $files)
                );

                return 'stream';
            }

            FileTransfer::update($id, ['stage' => 'extracting', 'progress' => 75]);
            $extracted = $targetService->decompressArchive((string) $target['uuid'], $archiveName, $destination, null, true);
            $targetService->deleteFiles((string) $target['uuid'], $destination, [$archiveName]);
            if (!$extracted->isSuccessful()) {
                throw new \RuntimeException('Extracting on the target failed: ' . $extracted->getError());
            }

            return 'pull';
        } finally {
            $sourceService->deleteFiles((string) $source['uuid'], $root, [$archiveName]);
        }
    }

    private static function log(array $server, array $user, string $event, array $job, ?array $other, ?string $error = null): void
    {
        $meta = [
            'mode' => $job['mode'],
            'files' => json_decode((string) $job['files'], true) ?: [],
            'root' => $job['source_root'],
            'destination' => $job['destination'],
            'other_server' => $other['uuidShort'] ?? null,
        ];
        if ($error !== null) {
            $meta['error'] = mb_substr($error, 0, 300);
        }
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'] ?? null,
            'event' => $event,
            'metadata' => json_encode($meta),
        ]);
    }
}
