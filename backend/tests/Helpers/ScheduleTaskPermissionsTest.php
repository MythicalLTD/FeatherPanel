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

namespace Tests\Helpers;

use PHPUnit\Framework\TestCase;
use App\SubuserPermissions as P;
use App\Helpers\ScheduleTaskPermissions;
use App\Helpers\SubuserPermissionChecker as C;

final class ScheduleTaskPermissionsTest extends TestCase
{
    private const SERVER = 10;
    private const OWNER = 1;
    private const SCHEDULER = 2;
    private const OPERATOR = 3;

    protected function setUp(): void
    {
        C::$ownerResolver = fn (int $sid): ?int => $sid === self::SERVER ? self::OWNER : null;
        C::$subuserResolver = fn (int $uid, int $sid): ?array => match (true) {
            $sid !== self::SERVER => null,
            $uid === self::SCHEDULER => ['permissions' => json_encode([P::SCHEDULE_READ, P::SCHEDULE_UPDATE, P::SCHEDULE_CREATE])],
            $uid === self::OPERATOR => ['permissions' => json_encode([P::SCHEDULE_UPDATE, P::CONTROL_CONSOLE, P::CONTROL_RESTART])],
            default => null,
        };
        C::$roleNodesResolver = fn (int $uid): array => [];
    }

    protected function tearDown(): void
    {
        C::$ownerResolver = C::$subuserResolver = C::$roleNodesResolver = null;
    }

    public function testEachActionMapsToTheDirectActionPermission(): void
    {
        $this->assertSame([P::CONTROL_CONSOLE], ScheduleTaskPermissions::required('command', 'say hi'));
        $this->assertSame([P::CONTROL_CONSOLE], ScheduleTaskPermissions::required('container_shell', 'ls'));
        $this->assertSame([P::CONTROL_START], ScheduleTaskPermissions::required('start'));
        $this->assertSame([P::CONTROL_STOP], ScheduleTaskPermissions::required('stop'));
        $this->assertSame([P::CONTROL_RESTART], ScheduleTaskPermissions::required('restart'));
        $this->assertSame([P::CONTROL_CONSOLE], ScheduleTaskPermissions::required('kill'));
        $this->assertSame([P::CONTROL_RESTART], ScheduleTaskPermissions::required('power', 'restart'));
        $this->assertSame([P::CONTROL_STOP], ScheduleTaskPermissions::required('power', ' stop '));
        $this->assertSame([P::BACKUP_CREATE], ScheduleTaskPermissions::required('backup'));
        $this->assertSame([P::BACKUP_CREATE], ScheduleTaskPermissions::required('database_backup', '{}'));
        $this->assertSame([P::SETTINGS_REINSTALL], ScheduleTaskPermissions::required('install'));
        $this->assertSame([P::SETTINGS_REINSTALL], ScheduleTaskPermissions::required('update'));
        $this->assertSame([], ScheduleTaskPermissions::required('something-else'));
    }

    public function testUnknownPowerPayloadNeedsEveryPowerPermission(): void
    {
        $required = ScheduleTaskPermissions::required('power', 'reboot');
        foreach ([P::CONTROL_START, P::CONTROL_STOP, P::CONTROL_RESTART, P::CONTROL_CONSOLE] as $permission) {
            $this->assertContains($permission, $required);
        }
    }

    public function testScheduleOnlySubuserCannotCreateDangerousTasks(): void
    {
        foreach ([['command', 'op me'], ['power', 'stop'], ['kill', ''], ['backup', ''], ['install', ''], ['update', '']] as [$action, $payload]) {
            $this->assertNotNull(ScheduleTaskPermissions::missing(self::SCHEDULER, self::SERVER, $action, $payload), $action);
        }
    }

    public function testSubuserWithMatchingPermissionsMayCreateTheTask(): void
    {
        $this->assertNull(ScheduleTaskPermissions::missing(self::OPERATOR, self::SERVER, 'command', 'save-all'));
        $this->assertNull(ScheduleTaskPermissions::missing(self::OPERATOR, self::SERVER, 'power', 'restart'));
        $this->assertSame(P::CONTROL_STOP, ScheduleTaskPermissions::missing(self::OPERATOR, self::SERVER, 'power', 'stop'));
    }

    public function testOwnerMayCreateAnyTask(): void
    {
        foreach (['command', 'power', 'backup', 'install', 'update', 'kill'] as $action) {
            $this->assertNull(ScheduleTaskPermissions::missing(self::OWNER, self::SERVER, $action, 'restart'), $action);
        }
    }

    public function testRunningAScheduleNeedsEveryTaskPermission(): void
    {
        $tasks = [
            ['action' => 'command', 'payload' => 'save-all'],
            ['action' => 'power', 'payload' => 'stop'],
        ];

        $this->assertSame(P::CONTROL_STOP, ScheduleTaskPermissions::missingForTasks(self::OPERATOR, self::SERVER, $tasks));
        $this->assertSame(P::CONTROL_CONSOLE, ScheduleTaskPermissions::missingForTasks(self::SCHEDULER, self::SERVER, $tasks));
        $this->assertNull(ScheduleTaskPermissions::missingForTasks(self::OWNER, self::SERVER, $tasks));
        $this->assertNull(ScheduleTaskPermissions::missingForTasks(self::OPERATOR, self::SERVER, [['action' => 'power', 'payload' => 'restart']]));
        $this->assertNull(ScheduleTaskPermissions::missingForTasks(self::SCHEDULER, self::SERVER, []));
    }

    public function testRunNowAndEnablingCheckTaskPermissions(): void
    {
        $src = (string) file_get_contents(dirname(__DIR__, 2) . '/app/Controllers/User/Server/ServerScheduleController.php');
        $this->assertMatchesRegularExpression('/function runNow\(.*?getTasksByScheduleId\(\$scheduleId\).*?checkTaskPermissions\(\$request, \$server, \$tasks\).*?updateSchedule\(\$scheduleId/s', $src);
        $this->assertMatchesRegularExpression('/function toggleScheduleStatus\(.*?checkTaskPermissions\(.*?toggleActiveStatus\(/s', $src);
        $this->assertMatchesRegularExpression('/function updateSchedule\(.*?is_active.*?checkTaskPermissions\(/s', $src);
        $this->assertStringContainsString('ScheduleTaskPermissions::missingForTasks(', $src);
    }
}
