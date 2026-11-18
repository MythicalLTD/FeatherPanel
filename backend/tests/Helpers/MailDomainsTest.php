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

class MailDomainsTest extends TestCase
{
    public function testRedirectApexIsAMailDomainButGetsNoWebRecords(): void
    {
        $space = [
            'domains' => ['www.example.com', 'example.com', 'shop.example.com'],
            'domain_routes' => [
                ['domain' => 'www.example.com', 'type' => 'primary'],
                ['domain' => 'example.com', 'type' => 'redirect', 'redirect_target' => 'https://www.example.com'],
                ['domain' => 'shop.example.com', 'type' => 'alias'],
            ],
        ];

        $this->assertSame(['www.example.com', 'shop.example.com'], DnsProvisioner::collectProvisionDomains($space));
        $this->assertSame(['www.example.com', 'example.com', 'shop.example.com'], DnsProvisioner::collectMailDomains($space));
    }

    public function testMailDomainsAreNormalisedAndUnique(): void
    {
        $space = [
            'domains' => ['Example.COM '],
            'domain_routes' => [
                ['domain' => ' example.com', 'type' => 'redirect'],
                ['domain' => '', 'type' => 'alias'],
                'not a route',
            ],
        ];

        $this->assertSame(['example.com'], DnsProvisioner::collectMailDomains($space));
        $this->assertSame([], DnsProvisioner::collectProvisionDomains($space));
    }

    public function testWithoutRoutesTheFlatDomainListIsUsed(): void
    {
        $space = ['domains' => ['a.example.com', 'b.example.com']];

        $this->assertSame(['a.example.com', 'b.example.com'], DnsProvisioner::collectMailDomains($space));
        $this->assertSame(['a.example.com', 'b.example.com'], DnsProvisioner::collectProvisionDomains($space));
    }

    public function testAnotherWebSpacesDomainIsNotAMailDomain(): void
    {
        $space = ['domains' => ['example.com'], 'domain_routes' => [['domain' => 'example.com', 'type' => 'primary']]];

        $this->assertNotContains('other.org', DnsProvisioner::collectMailDomains($space));
    }
}
