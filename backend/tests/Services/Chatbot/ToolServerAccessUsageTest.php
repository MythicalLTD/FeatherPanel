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

namespace Tests\Services\Chatbot;

use PHPUnit\Framework\TestCase;

/**
 * Every assistant tool that acts on a game server must check the same subuser permission as the
 * matching REST endpoint, not only that the user can open the server.
 */
final class ToolServerAccessUsageTest extends TestCase
{
    /**
     * Tools that only check server access, followed by their own explicit permission check, or that
     * only read the basic server overview every subuser can see.
     */
    private const OWN_CHECK = [
        'DeleteFilesTool.php',
        'GetDatabaseCredentialsTool.php',
        'GetFileContentTool.php',
        'WriteFileTool.php',
        'GetServerDetailsTool.php',
        'GetServerStatusTool.php',
    ];

    public function testServerToolsCheckSubuserPermissions(): void
    {
        $dir = dirname(__DIR__, 3) . '/app/Services/Chatbot/Tools';
        $checked = 0;
        foreach (glob($dir . '/*Tool.php') ?: [] as $file) {
            $source = (string) file_get_contents($file);
            $name = basename($file);
            if (!str_contains($source, 'canUserAccessServer') && !str_contains($source, 'ToolServerAccess::allowed')) {
                continue;
            }
            ++$checked;
            if (in_array($name, self::OWN_CHECK, true)) {
                continue;
            }
            $this->assertStringNotContainsString('canUserAccessServer', $source, $name . ' checks server access without a subuser permission');
            $this->assertMatchesRegularExpression('/ToolServerAccess::allowed\(\$user, \$server, \S/', $source, $name . ' must name a permission');
        }
        $this->assertGreaterThan(30, $checked);
    }
}
