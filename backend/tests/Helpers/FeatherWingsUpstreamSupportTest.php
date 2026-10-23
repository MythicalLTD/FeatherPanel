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
use App\Chat\Node;
use App\Helpers\DaemonCapabilities;
use PHPUnit\Framework\TestCase;

class FeatherWingsUpstreamSupportTest extends TestCase
{
    public function testNewFeaturesAreFeatherWingsOnly(): void
    {
        $fw = DaemonCapabilities::forType(DaemonCapabilities::TYPE_FEATHERWINGS);
        $rs = DaemonCapabilities::forType(DaemonCapabilities::TYPE_WINGS_RS);
        foreach ([
            DaemonCapabilities::FEATURE_INSTALL_EXIT_CODE,
            DaemonCapabilities::FEATURE_CPU_SHARES,
            DaemonCapabilities::FEATURE_CREDENTIAL_PROPAGATION,
        ] as $feature) {
            $this->assertContains($feature, DaemonCapabilities::ALL_FEATURES);
            $this->assertTrue($fw->supports($feature), $feature);
            $this->assertFalse($rs->supports($feature), $feature);
        }
    }

    public function testPanelConfigurationPayloadCarriesNewTokens(): void
    {
        $payload = Node::buildPanelConfigurationPayload([
            'uuid' => 'node-uuid',
            'daemon_token_id' => 'new-id',
            'daemon_token' => 'new-token',
            'daemonListen' => 8080,
            'scheme' => 'http',
            'fqdn' => 'node.example.com',
            'upload_size' => 250,
            'daemonSFTP' => 2222,
        ]);

        $this->assertSame('new-id', $payload['token_id']);
        $this->assertSame('new-token', $payload['token']);
        $this->assertSame('node-uuid', $payload['uuid']);
        $this->assertSame(8080, $payload['api']['port']);
        $this->assertFalse($payload['api']['ssl']['enabled']);
        $this->assertSame(250, $payload['api']['upload_limit']);
        $this->assertSame(2222, $payload['system']['sftp']['bind_port']);
    }

    public function testNodeValidationRejectsInvalidCpuShares(): void
    {
        $this->assertNotEmpty(array_filter(
            Node::validateNodeData(['wings_cpu_shares' => -1]),
            static fn (string $e): bool => str_contains($e, 'CPU shares'),
        ));
    }
}
