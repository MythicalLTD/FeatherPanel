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

use App\App;
use RateLimit\Rate;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Controllers\User\Vds\VmUserExtrasController;
use App\Controllers\User\Vds\VmUserAutomationController;

return function (RouteCollection $routes): void {
    $register = static function (string $name, string $path, callable $handler, array $methods, Rate $rate) use ($routes): void {
        App::getInstance(true)->registerVmInstanceRoute(
            $routes,
            $name,
            $path,
            static fn (Request $request, array $args) => $handler($request, (int) ($args['id'] ?? 0), $args),
            'id',
            $methods,
            $rate
        );
    };
    $c = static fn () => new VmUserExtrasController();

    $register('user-vm-instance-features', '/api/user/vm-instances/{id}/features', static fn (Request $r, int $id) => $c()->getFeatures($r, $id), ['GET'], Rate::perMinute(60));
    $register('user-vm-instance-rrd', '/api/user/vm-instances/{id}/rrd', static fn (Request $r, int $id) => $c()->getRrd($r, $id), ['GET'], Rate::perMinute(60));
    $register('user-vm-instance-isos', '/api/user/vm-instances/{id}/isos', static fn (Request $r, int $id) => $c()->listIsos($r, $id), ['GET'], Rate::perMinute(20));
    $register('user-vm-instance-iso-mount', '/api/user/vm-instances/{id}/iso-mount', static fn (Request $r, int $id) => $c()->mountIso($r, $id), ['POST'], Rate::perMinute(5));
    $register('user-vm-instance-boot-order-get', '/api/user/vm-instances/{id}/boot-order', static fn (Request $r, int $id) => $c()->getBootOrder($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-boot-order-set', '/api/user/vm-instances/{id}/boot-order', static fn (Request $r, int $id) => $c()->setBootOrder($r, $id), ['PUT'], Rate::perMinute(10));
    $register('user-vm-instance-isos-upload', '/api/user/vm-instances/{id}/isos/upload', static fn (Request $r, int $id) => $c()->uploadUserIso($r, $id), ['POST'], Rate::perMinute(2));
    $register('user-vm-instance-isos-url', '/api/user/vm-instances/{id}/isos/url', static fn (Request $r, int $id) => $c()->fetchUserIso($r, $id), ['POST'], Rate::perMinute(3));
    $register('user-vm-instance-isos-delete', '/api/user/vm-instances/{id}/isos/{isoId}', static fn (Request $r, int $id, array $a) => $c()->deleteUserIso($r, $id, (int) ($a['isoId'] ?? 0)), ['DELETE'], Rate::perMinute(10));
    $register('user-vm-instance-rescue-get', '/api/user/vm-instances/{id}/rescue', static fn (Request $r, int $id) => $c()->getRescue($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-rescue-set', '/api/user/vm-instances/{id}/rescue', static fn (Request $r, int $id) => $c()->setRescue($r, $id), ['POST'], Rate::perMinute(3));
    $register('user-vm-instance-snapshots-list', '/api/user/vm-instances/{id}/snapshots', static fn (Request $r, int $id) => $c()->listSnapshots($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-snapshots-create', '/api/user/vm-instances/{id}/snapshots', static fn (Request $r, int $id) => $c()->createSnapshot($r, $id), ['POST'], Rate::perMinute(5));
    $register('user-vm-instance-snapshot-rollback', '/api/user/vm-instances/{id}/snapshots/{name}/rollback', static fn (Request $r, int $id, array $a) => $c()->rollbackSnapshot($r, $id, (string) ($a['name'] ?? '')), ['POST'], Rate::perMinute(3));
    $register('user-vm-instance-snapshot-delete', '/api/user/vm-instances/{id}/snapshots/{name}', static fn (Request $r, int $id, array $a) => $c()->deleteSnapshot($r, $id, (string) ($a['name'] ?? '')), ['DELETE'], Rate::perMinute(10));

    $a = static fn () => new VmUserAutomationController();
    $register('user-vm-instance-firewall', '/api/user/vm-instances/{id}/firewall', static fn (Request $r, int $id) => $a()->getFirewall($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-firewall-options', '/api/user/vm-instances/{id}/firewall/options', static fn (Request $r, int $id) => $a()->setFirewallOptions($r, $id), ['PUT'], Rate::perMinute(10));
    $register('user-vm-instance-firewall-rule-add', '/api/user/vm-instances/{id}/firewall/rules', static fn (Request $r, int $id) => $a()->addFirewallRule($r, $id), ['POST'], Rate::perMinute(20));
    $register('user-vm-instance-firewall-rule-delete', '/api/user/vm-instances/{id}/firewall/rules/{pos}', static fn (Request $r, int $id, array $x) => $a()->deleteFirewallRule($r, $id, (int) ($x['pos'] ?? -1)), ['DELETE'], Rate::perMinute(20));
    $register('user-vm-instance-firewall-preset', '/api/user/vm-instances/{id}/firewall/presets/{preset}', static fn (Request $r, int $id, array $x) => $a()->applyFirewallPreset($r, $id, (string) ($x['preset'] ?? '')), ['POST'], Rate::perMinute(10));
    $register('user-vm-instance-bandwidth', '/api/user/vm-instances/{id}/bandwidth', static fn (Request $r, int $id) => $a()->getBandwidth($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-schedules-list', '/api/user/vm-instances/{id}/schedules', static fn (Request $r, int $id) => $a()->listSchedules($r, $id), ['GET'], Rate::perMinute(30));
    $register('user-vm-instance-schedules-create', '/api/user/vm-instances/{id}/schedules', static fn (Request $r, int $id) => $a()->createSchedule($r, $id), ['POST'], Rate::perMinute(10));
    $register('user-vm-instance-schedules-update', '/api/user/vm-instances/{id}/schedules/{scheduleId}', static fn (Request $r, int $id, array $x) => $a()->updateSchedule($r, $id, (int) ($x['scheduleId'] ?? 0)), ['PATCH'], Rate::perMinute(20));
    $register('user-vm-instance-schedules-delete', '/api/user/vm-instances/{id}/schedules/{scheduleId}', static fn (Request $r, int $id, array $x) => $a()->deleteSchedule($r, $id, (int) ($x['scheduleId'] ?? 0)), ['DELETE'], Rate::perMinute(20));
};
