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

use App\Chat\MailHost;
use PHPUnit\Framework\TestCase;

class MailHostNormalizeTest extends TestCase
{
    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private function normalize(array $data): array
    {
        $m = new \ReflectionMethod(MailHost::class, 'normalize');
        $m->setAccessible(true);

        return $m->invoke(null, $data);
    }

    public function testPartialUpdateDoesNotResetProvisionModeOrPorts(): void
    {
        // What DnsProvisioner passes after a successful DNS run.
        $out = $this->normalize([
            'mx_host' => 'web.example.test',
            'spf_record' => 'v=spf1 mx -all',
        ]);

        $this->assertArrayNotHasKey('provision_mode', $out);
        $this->assertArrayNotHasKey('imap_port', $out);
        $this->assertArrayNotHasKey('smtp_port', $out);
        $this->assertArrayNotHasKey('pop_port', $out);
        $this->assertSame('web.example.test', $out['mx_host']);
    }

    public function testExplicitValuesAreStillNormalized(): void
    {
        $out = $this->normalize(['provision_mode' => ' NODE ', 'imap_port' => '0', 'smtp_port' => 2525]);

        $this->assertSame('node', $out['provision_mode']);
        $this->assertSame(1, $out['imap_port']);
        $this->assertSame(2525, $out['smtp_port']);
    }

    public function testUnknownProvisionModeFallsBackToInventory(): void
    {
        $this->assertSame('inventory', $this->normalize(['provision_mode' => 'bogus'])['provision_mode']);
    }

    public function testWebNodeIdZeroBecomesNull(): void
    {
        $this->assertNull($this->normalize(['web_node_id' => 0])['web_node_id']);
        $this->assertSame(7, $this->normalize(['web_node_id' => '7'])['web_node_id']);
    }
}
