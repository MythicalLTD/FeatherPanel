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
use App\Helpers\MailDeliverabilityChecker;

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

    public function testALegacyFlatDomainWithoutARouteIsNotAMailDomain(): void
    {
        // other.org stayed in the flat list but became no route of this space (another WebSpace owns it).
        $space = [
            'domains' => ['example.com', 'other.org'],
            'domain_routes' => [['domain' => 'example.com', 'type' => 'primary']],
        ];

        $this->assertSame(['example.com'], DnsProvisioner::collectMailDomains($space));
    }

    public function testAnotherWebSpacesDomainIsNotAMailDomain(): void
    {
        $space = ['domains' => ['example.com'], 'domain_routes' => [['domain' => 'example.com', 'type' => 'primary']]];

        $this->assertNotContains('other.org', DnsProvisioner::collectMailDomains($space));
    }

    public function testEachMailDomainPassesDkimWithItsOwnKey(): void
    {
        // The mail host row holds the key of the domain provisioned last (example.com), www has its own key.
        $mailHost = [
            'mx_host' => 'mail.example.com',
            'hostname' => 'mail.example.com',
            'spf_record' => 'v=spf1 mx -all',
            'dkim_selector' => 'dkim',
            'dkim_record' => 'v=DKIM1;k=rsa;p=APEXKEY',
        ];
        $zone = [
            ['type' => 'TXT', 'name' => 'dkim._domainkey.example.com', 'content' => 'v=DKIM1;k=rsa;p=APEXKEY'],
            ['type' => 'TXT', 'name' => 'dkim._domainkey.www.example.com.', 'content' => '"v=DKIM1; k=rsa; " "p=WWWKEY"'],
        ];

        $this->assertSame('pass', $this->dkimStatus('example.com', $mailHost, $zone));
        $this->assertSame('pass', $this->dkimStatus('www.example.com', $mailHost, $zone));
    }

    public function testDkimFailsWithoutAKeyForThatDomain(): void
    {
        $mailHost = ['mx_host' => 'mail.example.com', 'hostname' => 'mail.example.com', 'dkim_selector' => 'dkim', 'dkim_record' => 'v=DKIM1;p=APEXKEY'];
        $zone = [
            ['type' => 'TXT', 'name' => 'dkim._domainkey.example.com', 'content' => 'v=DKIM1;p=APEXKEY'],
            // Not a key: empty p= (revoked) and a key under another selector.
            ['type' => 'TXT', 'name' => 'dkim._domainkey.shop.example.com', 'content' => 'v=DKIM1; p='],
            ['type' => 'TXT', 'name' => 'other._domainkey.www.example.com', 'content' => 'v=DKIM1;p=WWWKEY'],
        ];

        $this->assertSame('fail', $this->dkimStatus('www.example.com', $mailHost, $zone));
        $this->assertSame('fail', $this->dkimStatus('shop.example.com', $mailHost, $zone));
    }

    /**
     * @param array<string, mixed> $mailHost
     * @param list<array<string, string>> $zone
     */
    private function dkimStatus(string $domain, array $mailHost, array $zone): string
    {
        $result = MailDeliverabilityChecker::assessDomain([], $domain, $mailHost, $zone);
        foreach ($result['checks'] as $check) {
            if ($check['id'] === 'dkim') {
                return $check['status'];
            }
        }

        return 'missing';
    }
}
