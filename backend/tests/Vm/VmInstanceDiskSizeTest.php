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
use App\Services\Vm\VmInstanceUtil;

class VmInstanceDiskSizeTest extends TestCase
{
    public function testPrimaryDiskKeyForQemuPrefersScsi0ThenOthers(): void
    {
        $this->assertSame('scsi0', VmInstanceUtil::primaryDiskKey(['scsi0' => 'local:1,size=10G', 'virtio0' => 'x'], 'qemu'));
        $this->assertSame('virtio0', VmInstanceUtil::primaryDiskKey(['virtio0' => 'local:1,size=10G', 'scsi1' => 'x'], 'qemu'));
        $this->assertNull(VmInstanceUtil::primaryDiskKey(['scsi1' => 'local:1,size=10G'], 'qemu'));
    }

    public function testPrimaryDiskKeyForLxcIsRootfs(): void
    {
        $this->assertSame('rootfs', VmInstanceUtil::primaryDiskKey(['rootfs' => 'local:1,size=8G', 'mp0' => 'x'], 'lxc'));
        $this->assertNull(VmInstanceUtil::primaryDiskKey(['mp0' => 'x'], 'lxc'));
    }

    public function testDiskSizeGbFromSpec(): void
    {
        $this->assertSame(40, VmInstanceUtil::diskSizeGbFromSpec('local-lvm:vm-100-disk-0,size=40G'));
        $this->assertSame(32, VmInstanceUtil::diskSizeGbFromSpec('local-lvm:vm-100-disk-0,iothread=1,size=32g'));
        $this->assertSame(2, VmInstanceUtil::diskSizeGbFromSpec('local:100/vm.qcow2,size=1500M'));
        $this->assertSame(2048, VmInstanceUtil::diskSizeGbFromSpec('ceph:vm-1,size=2T'));
        $this->assertSame(12, VmInstanceUtil::diskSizeGbFromSpec('local:100/vm.raw,size=12'));
        $this->assertNull(VmInstanceUtil::diskSizeGbFromSpec('local:100/vm.raw'));
        $this->assertNull(VmInstanceUtil::diskSizeGbFromSpec('local:100/vm.raw,size=abc'));
    }

    public function testDiskSizeGbAfterResize(): void
    {
        $this->assertSame(40, VmInstanceUtil::diskSizeGbAfterResize('40G', 10));
        $this->assertSame(15, VmInstanceUtil::diskSizeGbAfterResize('+5G', 10));
        $this->assertSame(15, VmInstanceUtil::diskSizeGbAfterResize('+5', 10));
        $this->assertSame(12, VmInstanceUtil::diskSizeGbAfterResize('+1536M', 10));
        $this->assertSame(1034, VmInstanceUtil::diskSizeGbAfterResize('+1T', 10));
        $this->assertNull(VmInstanceUtil::diskSizeGbAfterResize('-5G', 10));
        $this->assertNull(VmInstanceUtil::diskSizeGbAfterResize('big', 10));
    }
}
