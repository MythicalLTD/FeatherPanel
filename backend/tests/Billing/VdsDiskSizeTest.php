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

namespace App\Tests\Billing;

use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\VmInstancesController;

/**
 * After a resize the panel keeps disk_gb in step with the VDS boot disk, so billing
 * upgrades and the panel show the real size.
 */
class VdsDiskSizeTest extends TestCase
{
    public function testPrimaryDiskFollowsQemuBootOrder(): void
    {
        $config = ['boot' => 'order=ide2;virtio0;net0', 'ide2' => 'local:iso/x.iso,media=cdrom', 'virtio0' => 'local-lvm:vm-1-disk-0,size=32G'];
        $this->assertSame('virtio0', $this->call('primaryDiskKey', 'qemu', $config));
    }

    public function testPrimaryDiskFallsBackToScsi0AndRootfs(): void
    {
        $this->assertSame('scsi0', $this->call('primaryDiskKey', 'qemu', []));
        $this->assertSame('sata0', $this->call('primaryDiskKey', 'qemu', ['bootdisk' => 'sata0']));
        $this->assertSame('rootfs', $this->call('primaryDiskKey', 'lxc', ['boot' => 'order=scsi0', 'scsi0' => 'x,size=1G']));
    }

    public function testDiskSizeUnits(): void
    {
        $this->assertSame(60, $this->call('diskSizeGb', 'local-lvm:vm-100-disk-0,size=60G'));
        $this->assertSame(2048, $this->call('diskSizeGb', 'ceph:vm-100-disk-0,discard=on,size=2T'));
        $this->assertSame(8, $this->call('diskSizeGb', 'local:100/vm-100-disk-0.qcow2,size=8192M,ssd=1'));
        $this->assertNull($this->call('diskSizeGb', 'local-lvm:vm-100-disk-0'));
    }

    private function call(string $method, mixed ...$args): mixed
    {
        $ref = new \ReflectionMethod(VmInstancesController::class, $method);

        return $ref->invoke(null, ...$args);
    }
}
