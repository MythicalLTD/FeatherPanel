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

use App\Cron\Cron;
use PHPUnit\Framework\TestCase;

class CronTest extends TestCase
{
    private string $testCacheDir;

    protected function setUp(): void
    {
        // Define APP_CACHE_DIR if not already defined
        if (!defined('APP_CACHE_DIR')) {
            $this->testCacheDir = sys_get_temp_dir() . '/featherpanel_test_' . uniqid();
            define('APP_CACHE_DIR', $this->testCacheDir);
        } else {
            $this->testCacheDir = APP_CACHE_DIR;
        }

        // Mark that we're running PHPUnit to suppress error_log in Cron
        if (!defined('PHPUNIT_RUNNING')) {
            define('PHPUNIT_RUNNING', true);
        }
    }

    protected function tearDown(): void
    {
        // Clean up test cron files
        if (is_dir($this->testCacheDir . '/cron')) {
            $files = glob($this->testCacheDir . '/cron/*.fptj');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
        }
    }

    public function testCronAcceptsValidIntervalFormats()
    {
        $cron = new Cron('test-cron', '30M');
        $this->assertInstanceOf(Cron::class, $cron);

        $cron = new Cron('test-cron-2', '1H');
        $this->assertInstanceOf(Cron::class, $cron);

        $cron = new Cron('test-cron-3', '7D');
        $this->assertInstanceOf(Cron::class, $cron);
    }

    public function testCronThrowsExceptionForInvalidInterval()
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Invalid interval format');
        new Cron('test-cron', 'invalid');
    }

    public function testCronThrowsExceptionForInvalidTimeUnit()
    {
        $this->expectException(Exception::class);
        new Cron('test-cron', '30X');
    }

    public function testShouldRunReturnsTrueForFirstRun()
    {
        $cron = new Cron('test-first-run-' . uniqid(), '1H');
        $this->assertTrue($cron->shouldRun());
    }

    public function testShouldRunReturnsFalseAfterRecentRun()
    {
        $identifier = 'test-recent-' . uniqid();
        $cron = new Cron($identifier, '1H');
        $cron->markAsRun();

        // Should not run again immediately
        $cron2 = new Cron($identifier, '1H');
        $this->assertFalse($cron2->shouldRun());
    }

    public function testMarkAsRunCreatesTimestampFile()
    {
        $identifier = 'test-mark-' . uniqid();
        $cron = new Cron($identifier, '30M');
        $cron->markAsRun();

        $lastRunTime = $cron->getLastRunTime();
        $this->assertInstanceOf(DateTime::class, $lastRunTime);
    }

    public function testGetLastRunTimeReturnsNullForNeverRun()
    {
        $cron = new Cron('test-never-run-' . uniqid(), '1H');
        $this->assertNull($cron->getLastRunTime());
    }

    public function testGetNextRunTimeReturnsCorrectTime()
    {
        $identifier = 'test-next-' . uniqid();
        $cron = new Cron($identifier, '1H');
        $cron->markAsRun();

        $nextRun = $cron->getNextRunTime();
        $this->assertInstanceOf(DateTime::class, $nextRun);
    }

    public function testRunIfDueExecutesCallback()
    {
        $executed = false;
        $cron = new Cron('test-execute-' . uniqid(), '1M');

        $result = $cron->runIfDue(function () use (&$executed) {
            $executed = true;
        });

        $this->assertTrue($result);
        $this->assertTrue($executed);
    }

    public function testRunIfDueDoesNotExecuteIfNotDue()
    {
        $executed = false;
        $identifier = 'test-not-due-' . uniqid();
        $cron = new Cron($identifier, '1H');
        $cron->markAsRun();

        $cron2 = new Cron($identifier, '1H');
        $result = $cron2->runIfDue(function () use (&$executed) {
            $executed = true;
        });

        $this->assertFalse($result);
        $this->assertFalse($executed);
    }

    public function testRunIfDueWithForceParameter()
    {
        $executed = false;
        $identifier = 'test-force-' . uniqid();
        $cron = new Cron($identifier, '1H');
        $cron->markAsRun();

        $cron2 = new Cron($identifier, '1H');
        $result = $cron2->runIfDue(function () use (&$executed) {
            $executed = true;
        }, true); // Force run

        $this->assertTrue($result);
        $this->assertTrue($executed);
    }

    public function testRunIfDueReturnsFalseOnException()
    {
        $cron = new Cron('test-exception-' . uniqid(), '1M');

        $result = $cron->runIfDue(function () {
            throw new Exception('Test exception');
        });

        $this->assertFalse($result);
    }
}
