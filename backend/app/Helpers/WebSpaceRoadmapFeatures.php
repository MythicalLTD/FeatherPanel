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
                'status' => 'alternative',
                'detail' => 'SFTP (including extra accounts with subdirectory jails) is available; classic FTP server provisioning is not built in.',
            ],
            [
                'id' => 'builtin_mail',
                'status' => 'ready',
                'detail' => 'Install the mailserver package on a web node for docker-mailserver, or link external mail hosts under Admin → Mail Hosts.',
            ],
            [
                'id' => 'webmail',
                'status' => 'external',
                'detail' => 'Use your mail host webmail URL or integrate Roundcube on a mail host.',
            ],
        ];
    }
}
