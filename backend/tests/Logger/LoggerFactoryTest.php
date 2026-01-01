<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
