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

class GetFileContentTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::FILE_READ_CONTENT);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $file = isset($params['file']) && is_scalar($params['file']) ? trim((string) $params['file']) : '';
        if ($file === '') {
            return ['success' => false, 'error' => 'file path is required.'];
        }
        $daemon = FeatherQuilldClient::getWebSpaceFileContents($access['webNode'], $access['uuid'], $file);
        if (!$daemon['ok']) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'Failed to read file'];
        }
        $body = $daemon['body'] ?? '';
        $content = is_array($body) ? (string) ($body['content'] ?? $body['contents'] ?? json_encode($body)) : (string) $body;
        $truncated = false;
        if (strlen($content) > 51200) {
            $content = substr($content, 0, 51200);
            $truncated = true;
        }

        return ['success' => true, 'file' => $file, 'content' => $content, 'truncated' => $truncated];
    }

    public function getDescription(): string
    {
        return 'Read a text file from a WebSpace (capped at 50 KB).';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'file' => 'Absolute file path'];
    }
}
