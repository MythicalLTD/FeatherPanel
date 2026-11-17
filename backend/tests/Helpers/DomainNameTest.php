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

use App\Chat\WebSpace;
use App\Chat\WebSpaceDomain;
use App\Helpers\DomainName;
use PHPUnit\Framework\TestCase;

class DomainNameTest extends TestCase
{
    protected function setUp(): void
    {
        if (!function_exists('idn_to_ascii')) {
            $this->markTestSkipped('The intl extension is required for IDN conversion.');
        }
    }

    public function testUmlautDomainBecomesPunycode(): void
    {
        $this->assertSame('xn--grtnerei-0za.example.com', DomainName::toAscii('gärtnerei.example.com'));
    }

    public function testUppercaseUmlautIsFoldedBeforeConversion(): void
    {
        $this->assertSame('xn--grtnerei-0za.example.com', DomainName::toAscii('GÄRTNEREI.Example.COM'));
    }

    public function testSharpSMapsToItsOwnLabelNotToSs(): void
    {
        $this->assertSame('xn--strae-oqa.de', DomainName::toAscii('Straße.de'));
    }

    public function testAsciiNamesAreOnlyTrimmedAndLowercased(): void
    {
        $this->assertSame('www.example.com', DomainName::toAscii("  WWW.Example.COM.  "));
        $this->assertSame('xn--grtnerei-0za.example.com', DomainName::toAscii('xn--grtnerei-0za.example.com'));
        $this->assertSame('*.example.com', DomainName::toAscii('*.Example.com'));
    }

    public function testEmptyStaysEmpty(): void
    {
        $this->assertSame('', DomainName::toAscii('  . '));
        $this->assertSame('', DomainName::toAscii(''));
    }

    public function testUnconvertibleNameIsReturnedLowercasedSoValidationStillRejectsIt(): void
    {
        $out = DomainName::toAscii("bad\u{0000}name.EXAMPLE.com");
        $this->assertSame(strtolower("bad\u{0000}name.example.com"), $out);
    }

    public function testRoutesAreStoredInAsciiForm(): void
    {
        $routes = WebSpaceDomain::normalizeRoutes([
            ['domain' => 'Gärtnerei.example.com', 'type' => 'primary'],
            ['domain' => 'www.gärtnerei.example.com', 'type' => 'alias'],
        ]);

        $this->assertSame(
            ['xn--grtnerei-0za.example.com', 'www.xn--grtnerei-0za.example.com'],
            array_column($routes, 'domain')
        );
    }

    public function testSameNameInUnicodeAndPunycodeIsOneRoute(): void
    {
        $routes = WebSpaceDomain::normalizeRoutes([
            ['domain' => 'gärtnerei.example.com', 'type' => 'primary'],
            ['domain' => 'xn--grtnerei-0za.example.com', 'type' => 'alias'],
        ]);

        $this->assertCount(1, $routes);
    }

    public function testApexOfWwwUnicodeDomain(): void
    {
        $this->assertSame('xn--grtnerei-0za.example.com', WebSpaceDomain::apexFromDomain('www.gärtnerei.example.com'));
    }

    public function testFlatDomainListIsStoredInAsciiForm(): void
    {
        $method = new ReflectionMethod(WebSpace::class, 'encodeDomains');
        $encoded = $method->invoke(null, ['gärtnerei.example.com', 'xn--grtnerei-0za.example.com', ' Example.com. ']);

        $this->assertSame(['xn--grtnerei-0za.example.com', 'example.com'], json_decode($encoded, true));
    }
}
