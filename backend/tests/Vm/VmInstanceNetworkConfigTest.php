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

use App\Services\Vm\VmInstanceUtil;
use PHPUnit\Framework\TestCase;

class VmInstanceNetworkConfigTest extends TestCase
{
    /**
     * @return array<int, array<string, mixed>>
     */
    private function assignment(int $cidr = 27): array
    {
        return [[
            'network_key' => 'net0',
            'ip' => '203.0.113.2',
            'cidr' => $cidr,
            'gateway' => '203.0.113.1',
            'bridge' => 'vmbr0',
            'interface_name' => 'eth0',
            'is_primary' => true,
        ]];
    }

    public function testQemuIpconfigUsesPoolCidrInsteadOf24(): void
    {
        $result = VmInstanceUtil::buildNetworkConfig('qemu', $this->assignment(27), []);
        $this->assertSame('ip=203.0.113.2/27,gw=203.0.113.1', $result['config']['ipconfig0']);
        $this->assertSame('virtio,bridge=vmbr0', $result['config']['net0']);
    }

    public function testLxcNetUsesPoolCidrInsteadOf24(): void
    {
        $result = VmInstanceUtil::buildNetworkConfig('lxc', $this->assignment(27), []);
        $this->assertSame(
            'name=eth0,bridge=vmbr0,ip=203.0.113.2/27,gw=203.0.113.1',
            $result['config']['net0']
        );
    }

    public function testMissingCidrDefaultsTo24(): void
    {
        $assignments = $this->assignment(27);
        unset($assignments[0]['cidr']);
        $result = VmInstanceUtil::buildNetworkConfig('qemu', $assignments, []);
        $this->assertSame('ip=203.0.113.2/24,gw=203.0.113.1', $result['config']['ipconfig0']);
    }
}
