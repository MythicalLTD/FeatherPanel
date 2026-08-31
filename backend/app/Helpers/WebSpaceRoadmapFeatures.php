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

namespace App\Helpers;

/**
 * Roadmap feature availability for WebSpaces (FTP, mail, WordPress, analytics, WAF).
 */
class WebSpaceRoadmapFeatures
{
    /**
     * @return list<array{id: string, status: string, detail?: string}>
     */
    public static function assess(): array
    {
        return [
            [
                'id' => 'ftp',
                'status' => 'ready',
                'detail' => 'Classic FTP (port 21) and SFTP are available when enabled on the web node. Use the same WebSpace credentials.',
            ],
            [
                'id' => 'builtin_mail',
                'status' => 'ready',
                'detail' => 'Install the mailserver package on a web node for docker-mailserver, or link external mail hosts under Admin → Mail Hosts.',
            ],
            [
                'id' => 'webmail',
                'status' => Roundcube::isInstalled() ? 'ready' : 'external',
                'detail' => Roundcube::isInstalled()
                    ? 'Panel Roundcube is installed. Node webmail package adds per-node Roundcube when configured on mail hosts.'
                    : 'Use your mail host webmail URL or integrate Roundcube on a mail host.',
            ],
        ];
    }
}
