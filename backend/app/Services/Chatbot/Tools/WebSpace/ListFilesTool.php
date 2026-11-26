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

namespace App\Services\Chatbot\Tools\WebSpace;

use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Services\Chatbot\Tools\ToolInterface;

class ListFilesTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::FILE_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $directory = isset($params['directory']) && is_scalar($params['directory']) ? (string) $params['directory'] : '/';
        $daemon = FeatherQuilldClient::listWebSpaceFiles($access['webNode'], $access['uuid'], $directory);
        if (!($daemon['ok'] ?? false)) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'Failed to list files'];
        }
        $body = is_array($daemon['body'] ?? null) ? $daemon['body'] : [];
        $files = $body['files'] ?? $body['data'] ?? $body;
        if (!is_array($files)) {
            $files = [];
        }
        $safe = [];
        foreach (array_slice(array_values($files), 0, 100) as $file) {
            if (!is_array($file)) {
                continue;
            }
            $safe[] = [
                'name' => $file['name'] ?? $file['file'] ?? null,
                'directory' => !empty($file['directory'] ?? $file['is_dir'] ?? false),
                'size' => $file['size'] ?? null,
                'modified' => $file['modified'] ?? $file['mtime'] ?? null,
            ];
        }

        return ['success' => true, 'directory' => $directory, 'files' => $safe];
    }

    public function getDescription(): string
    {
        return 'List files in a WebSpace directory.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'directory' => 'Directory path (default /)'];
    }
}
