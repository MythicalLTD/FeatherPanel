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

use App\Chat\NodeBackupDestination;

final class DestinationFactory
{
    /**
     * @param array<string, mixed> $destinationRow
     */
    public static function fromRow(array $destinationRow): DestinationClientInterface
    {
        $creds = NodeBackupDestination::getCredentialsDecrypted($destinationRow);
        if (isset($destinationRow['base_path']) && trim((string) $destinationRow['base_path']) !== '' && !isset($creds['base_path'])) {
            $creds['base_path'] = $destinationRow['base_path'];
        }
        $type = (string) ($destinationRow['type'] ?? '');

        return match ($type) {
            NodeBackupDestination::TYPE_SFTP => new SftpDestinationClient($creds),
            NodeBackupDestination::TYPE_S3 => new S3DestinationClient($creds),
            default => throw new \InvalidArgumentException('Unknown destination type: ' . $type),
        };
    }
}
