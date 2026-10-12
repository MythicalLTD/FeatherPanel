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

interface DestinationClientInterface
{
    /**
     * Upload a local file to the destination under $remotePath (relative to base).
     */
    public function upload(string $localPath, string $remotePath): void;

    /**
     * Test connectivity / credentials.
     */
    public function test(): void;

    /**
     * List object keys under a prefix with optional modification time.
     *
     * @return list<array{path: string, mtime: int, size: int}>
     */
    public function listObjects(string $prefix = ''): array;

    /**
     * Delete a remote object by path/key.
     */
    public function delete(string $remotePath): void;
}
