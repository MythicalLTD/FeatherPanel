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

use PHPUnit\Framework\TestCase;
use App\Cli\Utils\PluginCommandLocator;

class PluginCommandLocatorTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = sys_get_temp_dir() . '/fp_cmd_locator_' . uniqid();
        mkdir($this->root, 0755, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->root);
    }

    public function testAddonDirectoriesIncludeAppAddonsDirRegardlessOfCwd(): void
    {
        // Docker runs `php cli` from /var/www/html, which has no backend/ subfolder.
        $dirs = PluginCommandLocator::getAddonDirectories('/var/www/html');

        $this->assertNotEmpty($dirs);
        $this->assertSame(realpath(APP_ADDONS_DIR), $dirs[0]);
    }

    public function testAddonDirectoriesKeepLegacyCwdLookupWithoutDuplicates(): void
    {
        $legacy = $this->root . '/backend/storage/addons';
        mkdir($legacy, 0755, true);

        $dirs = PluginCommandLocator::getAddonDirectories($this->root);
        $this->assertContains(realpath($legacy), $dirs);
        $this->assertSame(array_values(array_unique($dirs)), $dirs);

        // The repository root case (cwd/backend/storage/addons === APP_ADDONS_DIR) must not be listed twice.
        $repoRoot = dirname(__DIR__, 2);
        $dirs = PluginCommandLocator::getAddonDirectories($repoRoot);
        $this->assertSame(1, count(array_keys($dirs, realpath(APP_ADDONS_DIR), true)));
    }

    public function testFindsCommandCaseInsensitively(): void
    {
        $plugin = 'fplocator' . uniqid();
        $this->writeCommand($this->root, $plugin, 'HelloLocator');

        $commands = PluginCommandLocator::listCommandFiles([$this->root]);
        $this->assertCount(1, $commands);
        $this->assertSame($plugin, $commands[0]['plugin']);
        $this->assertSame('HelloLocator', $commands[0]['name']);

        $class = PluginCommandLocator::findCommand('hellolocator', [$this->root]);
        $this->assertSame("App\\Addons\\{$plugin}\\Commands\\HelloLocator", $class);
        $this->assertNull(PluginCommandLocator::findCommand('doesnotexist', [$this->root]));
        $this->assertNull(PluginCommandLocator::findCommand('', [$this->root]));
    }

    public function testSkipsNonPhpFilesAndObsoleteAddons(): void
    {
        $plugin = 'fplocator' . uniqid();
        $this->writeCommand($this->root, $plugin, 'RealCommand');
        file_put_contents($this->root . '/' . $plugin . '/Commands/readme.txt', 'not a command');
        $this->writeCommand($this->root, 'whitelabel', 'ObsoleteCommand', false);

        $names = array_column(PluginCommandLocator::listCommandFiles([$this->root]), 'name');
        $this->assertSame(['RealCommand'], $names);
    }

    public function testFirstDirectoryWinsForDuplicatePlugins(): void
    {
        $plugin = 'fplocator' . uniqid();
        $first = $this->root . '/first';
        $second = $this->root . '/second';
        mkdir($first);
        mkdir($second);
        $this->writeCommand($first, $plugin, 'DupCommand');
        $this->writeCommand($second, $plugin, 'DupCommand', false);

        $commands = PluginCommandLocator::listCommandFiles([$first, $second]);
        $this->assertCount(1, $commands);
        $this->assertStringStartsWith($first, $commands[0]['file']);
    }

    private function writeCommand(string $dir, string $plugin, string $class, bool $validPhp = true): void
    {
        $commandsDir = $dir . '/' . $plugin . '/Commands';
        if (!is_dir($commandsDir)) {
            mkdir($commandsDir, 0755, true);
        }
        $body = $validPhp
            ? "<?php\nnamespace App\\Addons\\{$plugin}\\Commands;\n\nclass {$class} implements \\App\\Cli\\CommandBuilder\n{\n    public static function getDescription(): string { return 'test'; }\n    public static function getSubCommands(): array { return []; }\n    public static function execute(array \$args): void {}\n}\n"
            : "<?php\nthrow new \\RuntimeException('should not be loaded');\n";
        file_put_contents($commandsDir . '/' . $class . '.php', $body);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
