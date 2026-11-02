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

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use App\Helpers\WebSpaceWafSettings;

class WebSpaceWafSettingsTest extends TestCase
{
    private function apply(array $patch): array
    {
        return WebSpaceWafSettings::apply(WebSpaceWafSettings::defaults(), $patch);
    }

    public function testDefaultsAreValidAndRoundTrip(): void
    {
        $d = WebSpaceWafSettings::defaults();
        $this->assertSame($d, WebSpaceWafSettings::withDefaults([]));
        foreach (['rate_limit', 'anti_bot', 'engine', 'geo', 'http', 'headers', 'hotlink', 'login', 'block_page'] as $k) {
            $r = $this->apply([$k => $d[$k]]);
            $this->assertNull($r['error'], $k . ': ' . ($r['error'] ?? ''));
        }
    }

    public function testWithDefaultsFillsMissingAndDropsUnknownKeys(): void
    {
        $s = WebSpaceWafSettings::withDefaults([
            'rate_limit' => ['enabled' => true],
            'engine' => ['categories' => ['sqli' => false, 'bogus' => true]],
            'evil' => 1,
        ]);
        $this->assertTrue($s['rate_limit']['enabled']);
        $this->assertSame(240, $s['rate_limit']['per_minute']);
        $this->assertFalse($s['engine']['categories']['sqli']);
        $this->assertTrue($s['engine']['categories']['xss']);
        $this->assertArrayNotHasKey('bogus', $s['engine']['categories']);
        $this->assertArrayNotHasKey('evil', $s);
    }

    public function testUnknownKeyAndPartialPatchLeavesOthersAlone(): void
    {
        $this->assertNotNull($this->apply(['nope' => 1])['error']);
        $r = $this->apply(['mode' => 'block']);
        $this->assertNull($r['error']);
        $this->assertSame('block', $r['settings']['mode']);
        $this->assertSame(WebSpaceWafSettings::defaults()['http'], $r['settings']['http']);
    }

    /** @return array<string, array{string, bool}> */
    public static function ipProvider(): array
    {
        return [
            'v4' => ['203.0.113.7', true], 'v4 cidr' => ['198.51.100.0/24', true], 'v6' => ['2001:db8::1', true],
            'v6 cidr' => ['2001:db8::/32', true], 'bad prefix' => ['10.0.0.0/33', false], 'v6 bad prefix' => ['::1/129', false],
            'text' => ['keine-ip!', false], 'empty' => ['', false], 'octet' => ['256.1.1.1', false], 'neg' => ['10.0.0.0/-1', false],
            'injection' => ["1.1.1.1\nrespond 200", false],
        ];
    }

    #[DataProvider('ipProvider')]
    public function testIpValidation(string $ip, bool $ok): void
    {
        $this->assertSame($ok, WebSpaceWafSettings::isValidIp($ip));
    }

    /** @return array<string, array{string, bool}> */
    public static function pathProvider(): array
    {
        return [
            'ok' => ['/wp-admin/install.php', true], 'root' => ['/', true], 'no slash' => ['admin', false],
            'space' => ['/a b', false], 'quote' => ['/a"b', false], 'newline' => ["/a\nb", false], 'brace' => ['/a`b', false],
            'backslash' => ['/a\\b', false], 'too long' => ['/' . str_repeat('a', 200), false],
        ];
    }

    #[DataProvider('pathProvider')]
    public function testPathValidation(string $path, bool $ok): void
    {
        $this->assertSame($ok, WebSpaceWafSettings::isValidPath($path));
    }

    public function testDenyListsDedupeAndReject(): void
    {
        $r = $this->apply(['deny_ips' => ['203.0.113.7', '203.0.113.7', '198.51.100.0/24']]);
        $this->assertSame(['203.0.113.7', '198.51.100.0/24'], $r['settings']['deny_ips']);
        $this->assertSame('deny_ips', $this->apply(['deny_ips' => ['nope']])['field']);
        $this->assertNotNull($this->apply(['deny_paths' => ['nope']])['error']);
    }

    public function testNumbersMustBeIntegersInRange(): void
    {
        $rl = fn (array $v) => $this->apply(['rate_limit' => $v]);
        $this->assertNull($rl(['enabled' => true, 'per_minute' => 240, 'ban_minutes' => 15])['error']);
        $this->assertNotNull($rl(['enabled' => true, 'per_minute' => 5, 'ban_minutes' => 15])['error']);
        $this->assertNotNull($rl(['enabled' => true, 'per_minute' => 240.5, 'ban_minutes' => 15])['error'], 'fractions must not be truncated');
        $this->assertNotNull($rl(['enabled' => true, 'per_minute' => true, 'ban_minutes' => 15])['error']);
        $this->assertNotNull($rl(['enabled' => 'yes', 'per_minute' => 240, 'ban_minutes' => 15])['error']);
        $this->assertNotNull($rl(['enabled' => true, 'per_minute' => 240, 'ban_minutes' => 99999])['error']);
    }

    public function testExceptionsRejectRootAndUnknownCategories(): void
    {
        $ok = $this->apply(['exceptions' => [['id' => 'a', 'path' => '/wp-login.php', 'categories' => ['scanner']]]]);
        $this->assertNull($ok['error']);
        $this->assertSame('a', $ok['settings']['exceptions'][0]['id']);
        $this->assertNotNull($this->apply(['exceptions' => [['path' => '/', 'categories' => []]]])['error']);
        $this->assertNotNull($this->apply(['exceptions' => [['path' => '/x', 'categories' => ['nope']]]])['error']);
        $dup = $this->apply(['exceptions' => [['path' => '/x', 'categories' => []], ['path' => '/x', 'categories' => []]]]);
        $this->assertNotNull($dup['error']);
    }

    public function testCustomRules(): void
    {
        $rule = ['target' => 'path', 'op' => 'starts', 'value' => '/old-admin', 'action' => 'block', 'enabled' => true];
        $r = $this->apply(['custom_rules' => [$rule]]);
        $this->assertNull($r['error']);
        $this->assertSame(16, strlen($r['settings']['custom_rules'][0]['id']), 'server generates an id');
        $this->assertSame('/old-admin', $r['settings']['custom_rules'][0]['name']);

        $this->assertNotNull($this->apply(['custom_rules' => [['op' => 'nope'] + $rule]])['error']);
        $this->assertNotNull($this->apply(['custom_rules' => [['value' => ''] + $rule]])['error']);
        $this->assertNotNull($this->apply(['custom_rules' => [['value' => "a\x00b"] + $rule]])['error']);
        $this->assertNotNull($this->apply(['custom_rules' => array_fill(0, 31, $rule)])['error']);
    }

    /** @return array<string, array{string, bool}> */
    public static function regexProvider(): array
    {
        return [
            'plain' => ['wp-(admin|content)/.*\.php$', true], 'class' => ['^/[a-z]{2,5}$', true], 'unclosed' => ['([unclosed', false],
            'lookahead' => ['a(?=b)', false], 'neg lookahead' => ['a(?!b)', false], 'lookbehind' => ['(?<=a)b', false],
            'backref' => ['(a)\1', false], 'atomic' => ['(?>a+)b', false], 'empty' => ['', false], 'long' => [str_repeat('a', 201), false],
            'tilde' => ['a~b', true], 'escaped plus' => ['\++', true],
        ];
    }

    #[DataProvider('regexProvider')]
    public function testRegexMustBeRe2Compatible(string $re, bool $ok): void
    {
        $this->assertSame($ok, WebSpaceWafSettings::isValidRegex($re));
    }

    public function testGeoHttpHeadersHotlinkBlockPage(): void
    {
        $this->assertNull($this->apply(['geo' => ['mode' => 'deny', 'countries' => ['RU', 'RU', 'KP']]])['error']);
        $this->assertSame(['RU', 'KP'], $this->apply(['geo' => ['mode' => 'deny', 'countries' => ['RU', 'RU', 'KP']]])['settings']['geo']['countries']);
        $this->assertNotNull($this->apply(['geo' => ['mode' => 'deny', 'countries' => ['ru']]])['error']);
        $this->assertNotNull($this->apply(['geo' => ['mode' => 'x', 'countries' => []]])['error']);

        $http = ['methods' => ['GET', 'POST'], 'max_body_mb' => 10, 'max_url_length' => 2048];
        $this->assertNull($this->apply(['http' => $http])['error']);
        $this->assertNotNull($this->apply(['http' => ['methods' => []] + $http])['error']);
        $this->assertNotNull($this->apply(['http' => ['methods' => ['TRACE']] + $http])['error']);
        $this->assertNotNull($this->apply(['http' => ['max_body_mb' => 0] + $http])['error']);

        $this->assertNotNull($this->apply(['headers' => ['frame' => 'allowall']])['error']);
        $this->assertNull($this->apply(['headers' => ['hsts' => true]])['error']);

        $hot = ['enabled' => true, 'allowed_hosts' => ['partner.example.com'], 'extensions' => ['jpg']];
        $this->assertNull($this->apply(['hotlink' => $hot])['error']);
        $this->assertNotNull($this->apply(['hotlink' => ['allowed_hosts' => ["x.com\nrespond 200"]] + $hot])['error']);
        $this->assertNotNull($this->apply(['hotlink' => ['extensions' => ['../x']] + $hot])['error']);

        $this->assertNull($this->apply(['block_page' => ['status' => 429, 'message' => 'Slow down', 'html' => '<h1>{{status}}</h1>']])['error']);
        $this->assertNotNull($this->apply(['block_page' => ['status' => 200]])['error']);
        $this->assertNotNull($this->apply(['block_page' => ['html' => str_repeat('x', 65537)]])['error']);
        $this->assertNotNull($this->apply(['block_page' => ['html' => "\xff\xfe"]])['error']);
    }

    public function testAntiBotAndLogin(): void
    {
        $this->assertNull($this->apply(['anti_bot' => ['custom_agents' => ['BadBot/1.0']]])['error']);
        $this->assertNotNull($this->apply(['anti_bot' => ['custom_agents' => ['a']]])['error']);
        $this->assertNotNull($this->apply(['anti_bot' => ['custom_agents' => ["x\ny"]]])['error']);
        $this->assertNotNull($this->apply(['login' => ['enabled' => true, 'per_minute' => 10, 'ban_minutes' => 30, 'paths' => ['login']]])['error']);
        $this->assertNull($this->apply(['login' => ['enabled' => true, 'per_minute' => 10, 'ban_minutes' => 30, 'paths' => ['/login']]])['error']);
    }
}
