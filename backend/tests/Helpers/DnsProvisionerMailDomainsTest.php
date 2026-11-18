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

use App\Helpers\DnsProvisioner;
use PHPUnit\Framework\TestCase;

class DnsProvisionerMailDomainsTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function space(): array
    {
        return [
            'domains' => ['Example.com', 'www.example.com', 'shop.example.org'],
            'domain_routes' => [
                ['domain' => 'example.com', 'type' => 'redirect'],
                ['domain' => 'www.example.com', 'type' => 'primary'],
                ['domain' => 'shop.example.org', 'type' => 'alias'],
            ],
        ];
    }

    public function testMailDomainsIncludeRedirectRoutes(): void
    {
        $domains = DnsProvisioner::collectMailDomains($this->space());

        $this->assertContains('example.com', $domains, 'a redirect apex can still receive mail');
        $this->assertContains('www.example.com', $domains);
        $this->assertContains('shop.example.org', $domains);
    }

    public function testWebProvisioningStillSkipsRedirectRoutes(): void
    {
        $domains = DnsProvisioner::collectProvisionDomains($this->space());

        $this->assertNotContains('example.com', $domains, 'A records for the web node must not change');
        $this->assertSame(['www.example.com', 'shop.example.org'], $domains);
    }

    public function testMailDomainsAreLowercasedAndUnique(): void
    {
        $domains = DnsProvisioner::collectMailDomains($this->space());

        $this->assertSame($domains, array_values(array_unique($domains)));
        $this->assertSame(array_map('strtolower', $domains), $domains);
        $this->assertCount(3, $domains);
    }

    public function testMailDomainsWorkWithoutRoutes(): void
    {
        $domains = DnsProvisioner::collectMailDomains(['domains' => [' Example.NET ', '', 'example.net']]);

        $this->assertSame(['example.net'], $domains);
    }

    public function testMailDomainsForEmptySpace(): void
    {
        $this->assertSame([], DnsProvisioner::collectMailDomains([]));
    }

    public function testRouteDomainsWithoutFlatListAreKept(): void
    {
        $domains = DnsProvisioner::collectMailDomains([
            'domain_routes' => [
                ['domain' => 'a.example.com', 'type' => 'redirect'],
                'not-an-array',
                ['domain' => '', 'type' => 'alias'],
            ],
        ]);

        $this->assertSame(['a.example.com'], $domains);
    }
}
