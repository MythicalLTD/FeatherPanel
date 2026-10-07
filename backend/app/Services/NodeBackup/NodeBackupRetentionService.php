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

namespace App\Services\NodeBackup;

use App\App;
use App\Chat\NodeBackupPolicy;
use App\Chat\NodeBackupDestination;

/**
 * Deletes remote node backup objects older than the policy retention window.
 */
class NodeBackupRetentionService
{
    /**
     * @param array<string, mixed> $policy
     *
     * @return array{deleted: int, errors: list<string>}
     */
    public function purgePolicyDestinations(array $policy): array
    {
        $days = (int) ($policy['retention_days'] ?? 90);
        if ($days <= 0) {
            return ['deleted' => 0, 'errors' => []];
        }
        $cutoff = time() - ($days * 86400);
        $deleted = 0;
        $errors = [];

        $destIds = [(int) ($policy['primary_destination_id'] ?? 0)];
        foreach (NodeBackupPolicy::getMirrorDestinationIds((int) $policy['id']) as $id) {
            $destIds[] = $id;
        }
        $destIds = array_values(array_unique(array_filter($destIds)));

        foreach ($destIds as $destId) {
            $row = NodeBackupDestination::getById($destId);
            if (!$row) {
                continue;
            }
            try {
                $client = DestinationFactory::fromRow($row);
                foreach ($client->listObjects('wings/') as $obj) {
                    $mtime = (int) ($obj['mtime'] ?? 0);
                    $path = (string) ($obj['path'] ?? '');
                    if ($path === '' || !str_contains($path, 'wings/')) {
                        continue;
                    }
                    // Prefer embedded timestamp in filename YYYYMMDD_HHMMSS
                    if ($mtime <= 0 && preg_match('/(\d{8}_\d{6})/', $path, $m)) {
                        $parsed = \DateTimeImmutable::createFromFormat('Ymd_His', $m[1], new \DateTimeZone('UTC'));
                        if ($parsed) {
                            $mtime = $parsed->getTimestamp();
                        }
                    }
                    if ($mtime > 0 && $mtime < $cutoff) {
                        $client->delete($path);
                        ++$deleted;
                    }
                }
            } catch (\Throwable $e) {
                $errors[] = 'destination ' . $destId . ': ' . $e->getMessage();
                App::getInstance(true)->getLogger()->error('Node backup retention: ' . $e->getMessage());
            }
        }

        return ['deleted' => $deleted, 'errors' => $errors];
    }

    /**
     * @return array{deleted: int, errors: list<string>}
     */
    public function purgeDestination(int $destinationId, int $retentionDays = 90): array
    {
        $row = NodeBackupDestination::getById($destinationId);
        if (!$row) {
            return ['deleted' => 0, 'errors' => ['destination not found']];
        }

        return $this->purgePolicyDestinations([
            'id' => 0,
            'primary_destination_id' => $destinationId,
            'retention_days' => $retentionDays,
        ]);
    }
}
