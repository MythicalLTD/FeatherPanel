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

namespace Tests\Telemetry;

use GuzzleHttp\Client;
use GuzzleHttp\Middleware;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use App\Telemetry\UmamiTelemetry;
use App\Telemetry\UmamiStatistics;
use GuzzleHttp\Handler\MockHandler;
use App\Telemetry\UmamiTelemetryState;

final class UmamiTelemetryTest extends TestCase
{
    private const WEBSITE_ID = '7a9af041-907b-4b08-b4fc-c8936b45c913';
    private const INSTALLATION_ID = 'eaec090b-e252-4f2b-b8ea-dfa5b2825880';
    private string $directory;
    private array $requests = [];
    private UmamiTelemetryState $state;

    protected function setUp(): void
    {
        $this->directory = sys_get_temp_dir() . '/fp-umami-' . bin2hex(random_bytes(8));
        mkdir($this->directory);
        $db = new \PDO('sqlite:' . $this->directory . '/state.sqlite');
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $sql = file_get_contents(__DIR__ . '/../../storage/migrations/2026-10-06.20.00-umami-telemetry-state.sql');
        $sql = preg_replace('/\) ENGINE=.*?;/s', ');', $sql);
        $db->exec(str_replace('INSERT IGNORE', 'INSERT OR IGNORE', $sql));
        $this->state = new UmamiTelemetryState($db);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->directory);
    }

    public function testEventContainsOnlyRealCountsWithoutAnInstallationIdentity(): void
    {
        $db = new \PDO('sqlite::memory:');
        $db->exec('CREATE TABLE featherpanel_users (email TEXT)');
        $db->exec("INSERT INTO featherpanel_users VALUES ('private@example.com'), ('other@example.com')");
        $db->exec('CREATE TABLE featherpanel_servers (name TEXT)');
        $db->exec("INSERT INTO featherpanel_servers VALUES ('secret-server')");
        $collector = new UmamiStatistics($db);
        $telemetry = $this->telemetry([self::receipt(), self::receipt()], true, $collector->collect(...));
        self::assertTrue($telemetry->report());
        self::assertTrue($telemetry->report());
        foreach ($this->requests as $request) {
            $body = (string) $request['request']->getBody();
            $event = json_decode($body, true, flags: JSON_THROW_ON_ERROR);
            self::assertSame(self::WEBSITE_ID, $event['payload']['website']);
            self::assertArrayNotHasKey('id', $event['payload']);
            self::assertSame(['website', 'hostname', 'url', 'name', 'language', 'data'], array_keys($event['payload']));
            self::assertSame('telemetry.daily', $event['payload']['name']);
            self::assertSame(2, $event['payload']['data']['users']);
            self::assertSame(1, $event['payload']['data']['servers']);
            self::assertArrayNotHasKey('web_nodes', $event['payload']['data']);
            self::assertStringNotContainsString('private@example.com', $body);
            self::assertStringNotContainsString('secret-server', $body);
            self::assertStringEndsWith('/api/send', (string) $request['request']->getUri());
            self::assertSame(5.0, $request['options']['timeout']);
            self::assertFalse($request['options']['allow_redirects']);
            foreach ($event['payload']['data'] as $value) {
                self::assertTrue(is_int($value));
                self::assertGreaterThanOrEqual(0, $value);
            }
        }
    }

    public function testCollectorCannotInjectIdentifiersOrNonCountMetadata(): void
    {
        $telemetry = $this->telemetry([self::receipt()], true, static fn () => [
            'users' => 12, 'servers' => 3, 'backups' => -1, 'nodes' => '7', 'extensions' => 1,
            'email' => 'private@example.com', 'id' => self::INSTALLATION_ID,
            'panel_version' => 'v1.4.0', 'uptime_seconds' => 123, 'url' => '/account/private',
        ]);
        self::assertTrue($telemetry->report());
        $body = json_decode((string) $this->requests[0]['request']->getBody(), true);
        self::assertSame(['users' => 12, 'servers' => 3, 'extensions' => 1], $body['payload']['data']);
        self::assertArrayNotHasKey('id', $body['payload']);
    }

    public function testFeatureCountsUseDistinctResourcesAndRetainedThirtyDayActivity(): void
    {
        $db = new \PDO('sqlite::memory:');
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $db->exec('CREATE TABLE featherpanel_server_backups (server_id INTEGER, deleted_at TEXT, is_successful INTEGER, created_at TEXT, completed_at TEXT)');
        $db->exec("INSERT INTO featherpanel_server_backups VALUES
            (1, NULL, 1, '2026-10-01 00:00:00', '2026-10-01 01:00:00'),
            (1, NULL, 0, '2026-10-02 00:00:00', '2026-10-02 01:00:00'),
            (2, NULL, 0, '2026-09-01 00:00:00', NULL),
            (2, NULL, 0, '2026-10-06 10:00:00', NULL),
            (3, '2026-10-04 00:00:00', 0, '2026-10-03 00:00:00', '2026-10-03 01:00:00')");
        $db->exec('CREATE TABLE featherpanel_server_schedules (server_id INTEGER, is_active INTEGER, last_run_at TEXT)');
        $db->exec("INSERT INTO featherpanel_server_schedules VALUES
            (1, 1, '2026-10-05 00:00:00'), (1, 0, '2026-08-01 00:00:00'), (2, 1, NULL)");
        $db->exec('CREATE TABLE featherpanel_server_activities (event TEXT, timestamp TEXT, metadata TEXT)');
        $db->exec("INSERT INTO featherpanel_server_activities VALUES
            ('file_written', '2026-10-05 00:00:00', 'private-path'),
            ('archive_decompressed', '2026-10-05 00:00:00', 'private-archive'),
            ('file_written', '2026-08-01 00:00:00', 'old-private-path'),
            ('schedule_run_now', '2026-10-05 00:00:00', 'private-name'),
            ('schedule_executed', '2026-10-05 00:01:00', 'private-name'),
            ('unrecognized-private-event', '2026-10-05 00:00:00', 'private-data')");
        $db->exec('CREATE TABLE featherpanel_vm_tasks (task_type TEXT, status TEXT, created_at TEXT)');
        $db->exec("INSERT INTO featherpanel_vm_tasks VALUES
            ('backup', 'completed', '2026-10-01 00:00:00'),
            ('restore', 'failed', '2026-10-02 00:00:00'),
            ('backup', 'failed', '2026-08-01 00:00:00')");
        $counts = (new UmamiStatistics($db))->collect(new \DateTimeImmutable('2026-10-06 12:00:00 UTC'));
        foreach ([
            'servers_with_backups' => 2, 'backups_successful' => 1, 'backups_failed' => 1,
            'backups_pending' => 2, 'backups_stale' => 1, 'backups_created_30d' => 4,
            'backups_failed_30d' => 2, 'schedules' => 3, 'schedules_active' => 2,
            'servers_with_schedules' => 2, 'schedules_used_30d' => 1,
            'file_operations_30d' => 2, 'schedule_runs_30d' => 1,
            'vm_backup_tasks_30d' => 1, 'vm_restore_tasks_30d' => 1, 'vm_failed_tasks_30d' => 1,
        ] as $metric => $expected) {
            self::assertSame($expected, $counts[$metric], $metric);
        }
        self::assertArrayNotHasKey('metadata', $counts);
        self::assertStringNotContainsString('private', json_encode($counts));
        self::assertSame($counts, UmamiStatistics::sanitizeCounts($counts));
    }

    public function testEmptyFeaturesReportZeroAndUnavailableSchemasAreOmitted(): void
    {
        $db = new \PDO('sqlite::memory:');
        $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $db->exec('CREATE TABLE featherpanel_server_schedules (server_id INTEGER, is_active INTEGER, last_run_at TEXT)');
        $db->exec('CREATE TABLE featherpanel_users (email TEXT)');
        $counts = (new UmamiStatistics($db))->collect();
        self::assertSame(0, $counts['users']);
        self::assertSame(0, $counts['schedules']);
        self::assertSame(0, $counts['schedules_active']);
        self::assertSame(0, $counts['servers_with_schedules']);
        self::assertArrayNotHasKey('users_with_2fa', $counts);
        self::assertArrayNotHasKey('vm_backups', $counts);
        self::assertSame(['schedules' => 0], UmamiStatistics::sanitizeCounts([
            'schedules' => 0, 'users_with_2fa' => '2', 'vm_backups' => -1,
            'schedule_runs_30d' => ['name' => 'private'], 'custom_count' => 42,
        ]));
    }

    public function testDisabledDoesNotCollectOrSend(): void
    {
        $telemetry = $this->telemetry([], false, static function (): array {
            throw new \LogicException('Disabled telemetry must not collect data.');
        });
        self::assertFalse($telemetry->report());
        self::assertFalse($telemetry->enabled());
        self::assertSame([], $this->requests);
    }

    public function testFailuresAndBotResponsesAreNotReportedAsSuccess(): void
    {
        $telemetry = $this->telemetry([
            new Response(500),
            new Response(200, [], '{"beep":"boop"}'),
            new Response(200, [], 'not-json'),
            new Response(302, ['Location' => 'https://other.invalid']),
            new \RuntimeException('Connection failed'),
        ]);
        for ($i = 0; $i < 5; ++$i) {
            self::assertFalse($telemetry->report());
        }
        $telemetry = $this->telemetry([], true, static function (): array {
            throw new \TypeError('Collector failed');
        });
        self::assertFalse($telemetry->report());
    }

    public function testSuccessfulReportsAreDailyAndReadSettingsOnEveryRun(): void
    {
        $state = $this->state;
        $telemetry = $this->telemetry([self::receipt(), self::receipt()]);
        $enabled = true;
        $factory = static function () use (&$enabled, $telemetry): ?UmamiTelemetry {
            return $enabled ? $telemetry : null;
        };
        $now = 200000;
        self::assertTrue(UmamiTelemetry::runScheduled($state, $factory, $now));
        self::assertFalse(UmamiTelemetry::runScheduled($state, $factory, $now + 3600));
        $enabled = false;
        self::assertFalse(UmamiTelemetry::runScheduled($state, $factory, $now + 86400));
        $enabled = true;
        self::assertTrue(UmamiTelemetry::runScheduled($state, $factory, $now + 86400));
        self::assertCount(2, $this->requests);
    }

    public function testFailedReportsRetryHourlyAndPreserveLastSuccess(): void
    {
        $state = $this->state;
        $telemetry = $this->telemetry([self::receipt(), new Response(503), self::receipt()]);
        $factory = static fn () => $telemetry;
        $now = 200000;
        self::assertTrue(UmamiTelemetry::runScheduled($state, $factory, $now));
        self::assertFalse(UmamiTelemetry::runScheduled($state, $factory, $now + 86400));
        $stored = $state->status();
        self::assertSame($now, $stored['last_success']);
        self::assertSame('failed', $stored['last_result']);
        self::assertFalse(UmamiTelemetry::runScheduled($state, $factory, $now + 89999));
        self::assertTrue(UmamiTelemetry::runScheduled($state, $factory, $now + 90000));
        self::assertCount(3, $this->requests);
    }

    public function testOverlappingCronDoesNotCollectOrSend(): void
    {
        $now = time();
        $token = $this->state->claim($now);
        self::assertNotNull($token);
        $other = new UmamiTelemetryState(new \PDO('sqlite:' . $this->directory . '/state.sqlite'));
        self::assertFalse(UmamiTelemetry::runScheduled($other, static function () {
            throw new \LogicException('Factory must not run while leased.');
        }, $now));
        $this->state->release($token);
        self::assertNotNull($other->claim($now));
    }

    public function testCrashedWorkersExpireAndCannotOverwriteNewWorker(): void
    {
        $now = time();
        $old = $this->state->claim($now);
        self::assertNotNull($old);
        self::assertNull($this->state->claim($now + 299));
        $new = $this->state->claim($now + 300);
        self::assertNotNull($new);
        self::assertFalse($this->state->attempt($old, $now + 300));
        $this->state->release($old);
        self::assertNull($this->state->claim($now + 300));
        self::assertTrue($this->state->attempt($new, $now + 300));
        $this->state->complete($old, $now + 301, true);
        self::assertNull($this->state->status()['last_success']);
        $this->state->complete($new, $now + 301, true);
        self::assertSame($now + 301, $this->state->status()['last_success']);
    }

    public function testDisabledFactoryLeavesNoAttemptAndReleasesLease(): void
    {
        $now = time();
        self::assertFalse(UmamiTelemetry::runScheduled($this->state, static fn () => null, $now));
        self::assertNull($this->state->status()['last_attempt']);
        self::assertNotNull($this->state->claim($now));
    }

    public function testSettingsApiRejectsDestinationOverridesBeforeSaving(): void
    {
        $controller = (new \ReflectionClass(\App\Controllers\Admin\SettingsController::class))->newInstanceWithoutConstructor();
        foreach (['umami_endpoint' => 'https://override.example.com', 'umami_website_id' => self::WEBSITE_ID] as $key => $value) {
            $request = \Symfony\Component\HttpFoundation\Request::create(
                '/api/admin/settings',
                'PATCH',
                content: json_encode(['telemetry' => 'false', $key => $value]),
            );
            $response = $controller->update($request);
            self::assertSame(400, $response->getStatusCode());
            self::assertStringContainsString('The telemetry destination cannot be changed', $response->getContent());
        }
    }

    public function testInvalidDestinationDoesNotSend(): void
    {
        $http = new Client(['handler' => new MockHandler([])]);
        foreach (['', 'ftp://example.com', 'https://user@example.com', 'https://example.com?token=secret'] as $endpoint) {
            self::assertFalse((new UmamiTelemetry($http, $endpoint, self::WEBSITE_ID))->report());
        }
        self::assertFalse((new UmamiTelemetry($http, 'https://example.com', 'bad-id'))->report());
    }

    private function telemetry(array $responses, bool $enabled = true, ?\Closure $collector = null): UmamiTelemetry
    {
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->requests));

        return new UmamiTelemetry(new Client(['handler' => $stack]), 'https://umami.example.com/', self::WEBSITE_ID, $enabled, $collector ?? static fn () => ['users' => 3]);
    }

    private static function receipt(): Response
    {
        return new Response(200, [], '{"sessionId":"session-id","visitId":"visit-id","cache":"cache-token"}');
    }
}
