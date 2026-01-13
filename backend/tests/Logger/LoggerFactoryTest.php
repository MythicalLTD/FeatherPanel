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

use App\Logger\LoggerFactory;
use PHPUnit\Framework\TestCase;

class LoggerFactoryTest extends TestCase
{
    private string $testLogFile;

    protected function setUp(): void
    {
        // Define APP_DEBUG if not already defined
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
        }

        $this->testLogFile = sys_get_temp_dir() . '/test_logger_' . uniqid() . '.log';
    }

    protected function tearDown(): void
    {
        // Clean up test log file
        if (file_exists($this->testLogFile)) {
            unlink($this->testLogFile);
        }
    }

    public function testLoggerCreatesLogFile()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $this->assertFileExists($this->testLogFile);
    }

    public function testInfoWritesToLog()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->info('Test info message');

        $content = file_get_contents($this->testLogFile);
        $this->assertStringContainsString('[INFO]', $content);
        $this->assertStringContainsString('Test info message', $content);
    }

    public function testWarningWritesToLog()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->warning('Test warning message');

        $content = file_get_contents($this->testLogFile);
        $this->assertStringContainsString('[WARNING]', $content);
        $this->assertStringContainsString('Test warning message', $content);
    }

    public function testErrorWritesToLog()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->error('Test error message');

        $content = file_get_contents($this->testLogFile);
        $this->assertStringContainsString('[ERROR]', $content);
        $this->assertStringContainsString('Test error message', $content);
    }

    public function testCriticalWritesToLog()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->critical('Test critical message');

        $content = file_get_contents($this->testLogFile);
        $this->assertStringContainsString('[CRITICAL]', $content);
        $this->assertStringContainsString('Test critical message', $content);
    }

    public function testGetLogsReturnsLogEntries()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->info('First message');
        $logger->warning('Second message');

        $logs = $logger->getLogs(true);
        $this->assertIsArray($logs);
        $this->assertGreaterThanOrEqual(2, count($logs));
    }

    public function testGetLogsFiltersDebugEntriesWhenNotWebServer()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->info('Info message');
        $logger->debug('Debug message');

        $logs = $logger->getLogs(false);
        $debugLogs = array_filter($logs, fn ($log) => str_contains($log, '[DEBUG]'));

        // Debug logs should be filtered out
        $this->assertCount(0, $debugLogs);
    }

    public function testLogEntriesContainTimestamp()
    {
        $logger = new LoggerFactory($this->testLogFile);
        $logger->info('Timestamped message');

        $content = file_get_contents($this->testLogFile);
        // Should contain date pattern
        $this->assertMatchesRegularExpression('/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/', $content);
    }
}
