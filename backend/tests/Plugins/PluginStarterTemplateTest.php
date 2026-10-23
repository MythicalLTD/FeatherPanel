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
use App\Controllers\Admin\PluginManagerController;

/**
 * The starter template must generate Cron classes in the namespace that
 * storage/cron/runner.php resolves: App\Addons\{identifier}\Cron\{File}.
 */
class PluginStarterTemplateTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = sys_get_temp_dir() . '/fp_starter_' . uniqid();
        mkdir($this->root, 0755, true);
    }

    protected function tearDown(): void
    {
        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($this->root);
    }

    public function testExampleCronUsesAddonNamespace(): void
    {
        $identifier = 'starter' . uniqid();
        $className = 'StarterPlugin';

        $method = new ReflectionMethod(PluginManagerController::class, 'createExampleFiles');
        $method->invoke(new PluginManagerController(), $this->root, $identifier, $className);

        $cronFile = $this->root . '/Cron/' . $className . 'CronExample.php';
        $this->assertFileExists($cronFile);

        $content = (string) file_get_contents($cronFile);
        $this->assertStringContainsString("namespace App\\Addons\\{$identifier}\\Cron;", $content);
        $this->assertStringNotContainsString('namespace App\\Cron;', $content);

        // Same class name resolution as storage/cron/runner.php
        require_once $cronFile;
        $runnerClass = 'App\Addons\\' . $identifier . '\Cron\\' . basename($cronFile, '.php');
        $this->assertTrue(class_exists($runnerClass, false), "Runner could not resolve {$runnerClass}");
        $this->assertTrue(is_subclass_of($runnerClass, App\Cron\TimeTask::class));
    }
}
