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
use App\Services\Dns\Providers\DnsProviderRegistry;

/**
 * The providers are tested against an in-memory fake of each documented API. The fake keeps real state, so
 * a test can check what the zone looks like afterwards instead of which requests were sent.
 */
class ApiDnsProvidersTest extends TestCase
{
    private const SPF = 'v=spf1 mx a:mail.example.net ~all';
    private const DMARC = 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com';

    /** @var list<string> */
    private array $writes = [];

    protected function setUp(): void
    {
        $this->writes = [];
    }

    public function testEveryProviderIsRegisteredAndDescribed(): void
    {
        $ids = array_column(DnsProviderRegistry::describe(), 'id');
        sort($ids);
        $this->assertSame(['cloudflare', 'desec', 'digitalocean', 'hetzner', 'ionos'], $ids);
        foreach (DnsProviderRegistry::describe() as $p) {
            $this->assertNotSame('', $p['label']);
            $this->assertNotSame('', $p['help']);
        }
        $this->assertFalse(DnsProviderRegistry::has('nope'));
    }

    public function testZoneForDomainIsTheLongestMatchAndNeverASuffixOfAnotherLabel(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com', 'sub.example.com', 'ample.com']);
        $p = DnsProviderRegistry::create('cloudflare', 'tok', $fake);
        $this->assertSame('sub.example.com', $p->findZoneForDomain('mail.sub.example.com')['name']);
        $this->assertSame('example.com', $p->findZoneForDomain('www.example.com')['name']);
        $this->assertSame('example.com', $p->findZoneForDomain('EXAMPLE.com.')['name']);
        $this->assertNull($p->findZoneForDomain('notexample.com'));
        $this->assertNull($p->findZoneForDomain('other.org'));
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testMailRecordsAreCreatedAndKeepEveryOtherTxtValue(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'google-site-verification=abc']]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $zone = $p->findZoneForDomain('example.com');

        $this->assertSame('created', $p->upsertMxRecord($zone['id'], 'example.com', 'mail.example.net', 10)['action']);
        $this->assertSame('updated', $p->upsertTxtRecord($zone['id'], 'example.com', self::SPF)['action']);
        $this->assertSame('created', $p->upsertTxtRecord($zone['id'], '_dmarc.example.com', self::DMARC)['action']);

        $this->assertSame([['content' => 'mail.example.net', 'priority' => 10]], $fake->state('example.com', 'MX', 'example.com'));
        $this->assertEqualsCanonicalizing(
            ['google-site-verification=abc', self::SPF],
            array_column($fake->state('example.com', 'TXT', 'example.com'), 'content'),
            'the customer\'s own TXT value must survive'
        );
        $this->assertSame(self::DMARC, $fake->state('example.com', 'TXT', '_dmarc.example.com')[0]['content']);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testSecondRunChangesNothing(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10);
        $p->upsertTxtRecord($z, 'example.com', self::SPF);
        $fake->writes = 0;

        $this->assertSame('unchanged', $p->upsertMxRecord($z, 'example.com', 'mail.example.net.', 10)['action']);
        $this->assertSame('unchanged', $p->upsertTxtRecord($z, 'example.com', self::SPF)['action']);
        $this->assertSame(0, $fake->writes, 'an unchanged record must not cause a write');
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testDifferentSpfIsKeptUnlessOverwriteIsAsked(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'v=spf1 include:old.example.org -all'], ['content' => 'other=1']]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, false);
        $this->assertFalse($r['ok']);
        $this->assertSame('conflict', $r['action']);
        $this->assertSame('v=spf1 include:old.example.org -all', $r['existing']);
        $this->assertContains('v=spf1 include:old.example.org -all', array_column($fake->state('example.com', 'TXT', 'example.com'), 'content'));

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, true);
        $this->assertTrue($r['ok']);
        $values = array_column($fake->state('example.com', 'TXT', 'example.com'), 'content');
        $this->assertEqualsCanonicalizing([self::SPF, 'other=1'], $values);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testDifferentMxIsKeptWithoutOverwrite(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'MX', 'example.com', [['content' => 'mx.old.example.org', 'priority' => 5]]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('conflict', $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10, 300, false)['action']);
        $this->assertSame([['content' => 'mx.old.example.org', 'priority' => 5]], $fake->state('example.com', 'MX', 'example.com'));
        $this->assertSame('updated', $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10, 300, true)['action']);
        $this->assertSame([['content' => 'mail.example.net', 'priority' => 10]], $fake->state('example.com', 'MX', 'example.com'));
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testDryRunWritesNothing(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $p->setDryRun(true);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('would_create', $p->upsertMxRecord($z, 'example.com', 'mail.example.net')['action']);
        $this->assertSame('would_create', $p->upsertTxtRecord($z, 'example.com', self::SPF)['action']);
        $this->assertSame(0, $fake->writes);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testLongDkimValueSurvivesTheChunking(string $id): void
    {
        $dkim = 'v=DKIM1; k=rsa; p=' . str_repeat('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A', 22);
        $this->assertGreaterThan(255, strlen($dkim));
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('created', $p->upsertTxtRecord($z, 'mail._domainkey.example.com', $dkim)['action']);
        $this->assertSame('unchanged', $p->upsertTxtRecord($z, 'mail._domainkey.example.com', $dkim)['action'], 'reading it back must give the same value');
        $this->assertSame($dkim, $fake->state('example.com', 'TXT', 'mail._domainkey.example.com')[0]['content']);
    }

    public function testTxtChunksNeverSplitAnEscapeAndRoundTrip(): void
    {
        $p = DnsProviderRegistry::create('hetzner', 'tok', new FakeDnsApi('hetzner', ['example.com']));
        $quote = Closure::bind(fn (string $v): string => $this->quoteTxt($v), $p, $p);
        $unquote = Closure::bind(fn (string $v): string => $this->unquoteTxt($v), $p, $p);

        // A quote and a backslash right at the 255 byte boundary.
        $value = str_repeat('a', 254) . '"\\' . str_repeat('b', 300);
        $wire = $quote($value);
        $this->assertSame($value, $unquote($wire));
        preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $wire, $m);
        $this->assertCount(3, $m[1]);
        foreach ($m[1] as $chunk) {
            $this->assertLessThanOrEqual(255, strlen(stripcslashes($chunk)));
        }
        $this->assertSame('""', $quote(''));
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testTokenNeverAppearsInAnErrorMessage(string $id): void
    {
        $secret = 'SeCrEt-TOKEN-1234567890';
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->failWith = 403;
        $fake->echoHeadersInError = true;
        $p = DnsProviderRegistry::create($id, $secret, $fake);

        try {
            $p->findZoneForDomain('example.com');
            $this->fail('expected an exception');
        } catch (Throwable $e) {
            $this->assertStringNotContainsString($secret, $e->getMessage());
            $this->assertStringContainsString('403', $e->getMessage());
        }

        $fake2 = new FakeDnsApi($id, ['example.com']);
        $p2 = DnsProviderRegistry::create($id, $secret, $fake2);
        $z = $p2->findZoneForDomain('example.com')['id'];
        $fake2->failWith = 500;
        $fake2->echoHeadersInError = true;
        $r = $p2->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertFalse($r['ok']);
        $this->assertStringNotContainsString($secret, json_encode($r));
    }

    public function testHetznerUsesRecordSetsWithQuotedTxtAndTrailingDotMx(): void
    {
        $fake = new FakeDnsApi('hetzner', ['example.com']);
        $p = DnsProviderRegistry::create('hetzner', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10);
        $p->upsertTxtRecord($z, '_dmarc.example.com', self::DMARC);

        $raw = $fake->raw;
        $this->assertSame(['10 mail.example.net.'], $raw['example.com|MX|@']);
        $this->assertSame(['"' . self::DMARC . '"'], $raw['example.com|TXT|_dmarc']);
        $this->assertContains('POST /zones/example.com/rrsets', $fake->requests);
        $p->upsertTxtRecord($z, '_dmarc.example.com', 'v=DMARC1; p=reject');
        $this->assertContains('POST /zones/example.com/rrsets/_dmarc/TXT/actions/set_records', $fake->requests);
        $this->assertContains('GET /zones/example.com/rrsets/@/MX', $fake->requests, 'the apex is addressed as @');
    }

    public function testDesecUsesAnEmptySubnameForTheApexAndRespectsTheMinimumTtl(): void
    {
        $fake = new FakeDnsApi('desec', ['example.com']);
        $p = DnsProviderRegistry::create('desec', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10, 60);

        $this->assertSame('', $fake->lastBody[0]['subname']);
        $this->assertSame(3600, $fake->lastBody[0]['ttl'], 'a TTL below the zone minimum would be rejected by deSEC');
        $this->assertSame(['10 mail.example.net.'], $fake->lastBody[0]['records']);
    }

    public function testDigitalOceanUsesRelativeNamesAndTrailingDotMx(): void
    {
        $fake = new FakeDnsApi('digitalocean', ['example.com']);
        $p = DnsProviderRegistry::create('digitalocean', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10);
        $p->upsertTxtRecord($z, 'mail._domainkey.example.com', 'v=DKIM1; k=rsa; p=AAAA');

        $this->assertEquals(['name' => '@', 'type' => 'MX', 'data' => 'mail.example.net.', 'ttl' => 300, 'priority' => 10], $fake->created[0]);
        $this->assertSame('mail._domainkey', $fake->created[1]['name']);
    }

    public function testIonosSendsFullNamesAndTheKeyHeader(): void
    {
        $fake = new FakeDnsApi('ionos', ['example.com']);
        $p = DnsProviderRegistry::create('ionos', 'pub.sec', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10);

        $this->assertSame('pub.sec', $fake->lastHeaders['X-API-Key'] ?? null);
        $this->assertSame('example.com', $fake->lastBody[0]['name']);
        $this->assertSame(10, $fake->lastBody[0]['prio']);
    }

    public function testCloudflareSendsTheBearerTokenAndNeverProxiesMailNames(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $p = DnsProviderRegistry::create('cloudflare', 'cf-token', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $p->upsertAddress($z, 'mail.example.com', '192.0.2.10');

        $this->assertSame('Bearer cf-token', $fake->lastHeaders['Authorization']);
        $this->assertFalse($fake->lastBody['proxied']);
    }

    public function testUpsertARecordKeepsAnExistingDifferentAddress(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $fake->seed('example.com', 'A', 'www.example.com', [['content' => '198.51.100.7']]);
        $p = DnsProviderRegistry::create('cloudflare', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('conflict', $p->upsertARecord($z, 'www.example.com', '192.0.2.10')['action']);
        $this->assertSame('198.51.100.7', $fake->state('example.com', 'A', 'www.example.com')[0]['content']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function providers(): array
    {
        return ['cloudflare' => ['cloudflare'], 'hetzner' => ['hetzner'], 'ionos' => ['ionos'], 'digitalocean' => ['digitalocean'], 'desec' => ['desec']];
    }
}

/**
 * In-memory fake of the five provider APIs. It speaks the documented wire format of each one and keeps the
 * zone content in $store (zone|type|fqdn => list of records) so tests can look at the result.
 */
class FakeDnsApi
{
    public int $writes = 0;
    public int $failWith = 0;
    public bool $echoHeadersInError = false;
    /** @var list<string> */
    public array $requests = [];
    /** @var array<string, list<string>> raw provider values (Hetzner/deSEC style) */
    public array $raw = [];
    /** @var list<array<string, mixed>> */
    public array $created = [];
    public $lastBody;
    /** @var array<string, string> */
    public array $lastHeaders = [];
    /** @var array<string, list<array{content: string, priority?: int, id?: string}>> */
    private array $store = [];
    private int $nextId = 1;

    /**
     * @param list<string> $zones
     */
    public function __construct(private string $provider, private array $zones)
    {
    }

    /**
     * @param array<string, string> $headers
     * @param array<mixed>|null $json
     *
     * @return array{status: int, body: mixed}
     */
    public function __invoke(string $method, string $url, array $headers, ?array $json): array
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
        $this->lastHeaders = $headers;
        if ($json !== null) {
            $this->lastBody = $json;
        }
        $isWrite = $method !== 'GET';
        $this->requests[] = $method . ' ' . preg_replace('#^/(client/v4|v1|dns/v1|api/v1|v2)#', '', rawurldecode($path));
        if ($this->failWith > 0) {
            return ['status' => $this->failWith, 'body' => ['error' => 'denied' . ($this->echoHeadersInError ? ' for ' . json_encode($headers) : '')]];
        }
        if ($isWrite) {
            ++$this->writes;
        }

        return match ($this->provider) {
            'cloudflare' => $this->cloudflare($method, $path, $q, $json),
            'digitalocean' => $this->digitalocean($method, $path, $q, $json),
            'ionos' => $this->ionos($method, $path, $json),
            'hetzner' => $this->hetzner($method, rawurldecode($path), $json),
            'desec' => $this->desec($method, rawurldecode($path), $json),
        };
    }

    /**
     * @param list<array{content: string, priority?: int}> $records
     */
    public function seed(string $zone, string $type, string $fqdn, array $records): void
    {
        foreach ($records as &$r) {
            $r['id'] = 'r' . $this->nextId++;
        }
        $this->store["$zone|$type|$fqdn"] = $records;
        $this->syncRaw($zone, $type, $fqdn);
    }

    /**
     * @return list<array{content: string, priority: int}|array{content: string}>
     */
    public function state(string $zone, string $type, string $fqdn): array
    {
        $out = [];
        foreach ($this->store["$zone|$type|$fqdn"] ?? [] as $r) {
            $row = ['content' => $r['content']];
            if (isset($r['priority'])) {
                $row['priority'] = $r['priority'];
            }
            $out[] = $row;
        }

        return $out;
    }

    private function key(string $zone, string $type, string $fqdn): string
    {
        return "$zone|$type|$fqdn";
    }

    private function syncRaw(string $zone, string $type, string $fqdn): void
    {
        if ($this->provider !== 'hetzner' && $this->provider !== 'desec') {
            return;
        }
        $name = $fqdn === $zone ? '@' : substr($fqdn, 0, -strlen('.' . $zone));
        $values = [];
        foreach ($this->store["$zone|$type|$fqdn"] ?? [] as $r) {
            $values[] = $type === 'MX' ? ($r['priority'] ?? 10) . ' ' . $r['content'] . '.' : ($type === 'TXT' ? '"' . $r['content'] . '"' : $r['content']);
        }
        $this->raw["$zone|$type|$name"] = $values;
    }

    private function cloudflare(string $method, string $path, array $q, ?array $json): array
    {
        if ($path === '/client/v4/zones') {
            return ['status' => 200, 'body' => ['result' => array_map(fn ($z) => ['id' => 'id-' . $z, 'name' => $z], $this->zones), 'result_info' => ['total_pages' => 1]]];
        }
        preg_match('#^/client/v4/zones/id-([^/]+)/dns_records(?:/(.+))?$#', $path, $m);
        $zone = $m[1];
        if ($method === 'GET') {
            $rows = [];
            foreach ($this->store[$this->key($zone, $q['type'], $q['name'])] ?? [] as $r) {
                $content = $q['type'] === 'TXT' ? '"' . $r['content'] . '"' : $r['content'];
                if ($q['type'] === 'TXT' && strlen($r['content']) > 255) {
                    $content = '"' . implode('" "', str_split($r['content'], 255)) . '"';
                }
                $rows[] = ['id' => $r['id'], 'type' => $q['type'], 'name' => $q['name'], 'content' => $content, 'priority' => $r['priority'] ?? null, 'ttl' => 300];
            }

            return ['status' => 200, 'body' => ['success' => true, 'result' => $rows]];
        }
        if ($method === 'POST') {
            $id = 'r' . $this->nextId++;
            $content = $json['content'];
            if ($json['type'] === 'TXT') {
                $content = $this->stripQuotes($content);
            }
            $rec = ['content' => $content, 'id' => $id];
            if (isset($json['priority'])) {
                $rec['priority'] = $json['priority'];
            }
            $this->store[$this->key($zone, $json['type'], $json['name'])][] = $rec;
            $this->lastBody = $json;

            return ['status' => 200, 'body' => ['success' => true, 'result' => ['id' => $id]]];
        }
        if ($method === 'DELETE') {
            foreach ($this->store as $k => $rows) {
                foreach ($rows as $i => $r) {
                    if ($r['id'] === $m[2]) {
                        unset($this->store[$k][$i]);
                        $this->store[$k] = array_values($this->store[$k]);
                    }
                }
            }

            return ['status' => 200, 'body' => ['result' => ['id' => $m[2]]]];
        }

        return ['status' => 400, 'body' => 'bad'];
    }

    private function digitalocean(string $method, string $path, array $q, ?array $json): array
    {
        if ($path === '/v2/domains') {
            return ['status' => 200, 'body' => ['domains' => array_map(fn ($z) => ['name' => $z], $this->zones), 'links' => []]];
        }
        preg_match('#^/v2/domains/([^/]+)/records(?:/(.+))?$#', $path, $m);
        $zone = $m[1];
        if ($method === 'GET') {
            $rows = [];
            foreach ($this->store as $k => $recs) {
                [$z, $type, $fqdn] = explode('|', $k);
                if ($z !== $zone || $type !== $q['type']) {
                    continue;
                }
                foreach ($recs as $r) {
                    $rel = $fqdn === $zone ? '@' : substr($fqdn, 0, -strlen('.' . $zone));
                    $data = $type === 'MX' ? $r['content'] . '.' : $r['content'];
                    $rows[] = ['id' => (int) substr($r['id'], 1), 'type' => $type, 'name' => $rel, 'data' => $data, 'priority' => $r['priority'] ?? null, 'ttl' => 300];
                }
            }
            // the fake honours the documented name filter (a fully qualified name)
            $rows = array_values(array_filter($rows, fn ($r) => ($r['name'] === '@' ? $zone : $r['name'] . '.' . $zone) === $q['name']));

            return ['status' => 200, 'body' => ['domain_records' => $rows]];
        }
        if ($method === 'POST') {
            $this->created[] = $json;
            $fqdn = $json['name'] === '@' ? $zone : $json['name'] . '.' . $zone;
            $rec = ['content' => rtrim($json['data'], $json['type'] === 'MX' ? '.' : "\0"), 'id' => 'r' . $this->nextId++];
            if (isset($json['priority'])) {
                $rec['priority'] = $json['priority'];
            }
            $this->store[$this->key($zone, $json['type'], $fqdn)][] = $rec;

            return ['status' => 201, 'body' => ['domain_record' => ['id' => 1]]];
        }
        if ($method === 'DELETE') {
            $id = 'r' . $m[2];
            foreach ($this->store as $k => $rows) {
                foreach ($rows as $i => $r) {
                    if ($r['id'] === $id) {
                        unset($this->store[$k][$i]);
                        $this->store[$k] = array_values($this->store[$k]);
                    }
                }
            }

            return ['status' => 204, 'body' => null];
        }

        return ['status' => 400, 'body' => 'bad'];
    }

    private function ionos(string $method, string $path, ?array $json): array
    {
        if ($path === '/dns/v1/zones') {
            return ['status' => 200, 'body' => array_map(fn ($z) => ['id' => 'id-' . $z, 'name' => $z, 'type' => 'NATIVE'], $this->zones)];
        }
        preg_match('#^/dns/v1/zones/id-([^/]+)(?:/records(?:/(.+))?)?$#', $path, $m);
        $zone = $m[1];
        if ($method === 'GET') {
            $records = [];
            foreach ($this->store as $k => $recs) {
                [$z, $type, $fqdn] = explode('|', $k);
                if ($z !== $zone) {
                    continue;
                }
                foreach ($recs as $r) {
                    $content = $type === 'TXT' ? '"' . $r['content'] . '"' : $r['content'];
                    $row = ['id' => $r['id'], 'name' => $fqdn, 'type' => $type, 'content' => $content, 'ttl' => 300, 'disabled' => false];
                    if (isset($r['priority'])) {
                        $row['prio'] = $r['priority'];
                    }
                    $records[] = $row;
                }
            }

            return ['status' => 200, 'body' => ['id' => 'id-' . $zone, 'name' => $zone, 'records' => $records]];
        }
        if ($method === 'POST') {
            foreach ($json as $rec) {
                $content = $rec['content'];
                $row = ['content' => $rec['type'] === 'TXT' ? $this->stripQuotes($content) : $content, 'id' => 'r' . $this->nextId++];
                if (isset($rec['prio'])) {
                    $row['priority'] = $rec['prio'];
                }
                $this->store[$this->key($zone, $rec['type'], $rec['name'])][] = $row;
            }

            return ['status' => 201, 'body' => []];
        }
        if ($method === 'DELETE') {
            foreach ($this->store as $k => $rows) {
                foreach ($rows as $i => $r) {
                    if ($r['id'] === $m[2]) {
                        unset($this->store[$k][$i]);
                        $this->store[$k] = array_values($this->store[$k]);
                    }
                }
            }

            return ['status' => 200, 'body' => null];
        }

        return ['status' => 400, 'body' => 'bad'];
    }

    private function hetzner(string $method, string $path, ?array $json): array
    {
        if ($path === '/v1/zones') {
            return ['status' => 200, 'body' => ['zones' => array_map(fn ($z) => ['id' => $z, 'name' => $z], $this->zones), 'meta' => ['pagination' => ['next_page' => null]]]];
        }
        if (preg_match('#^/v1/zones/([^/]+)/rrsets$#', $path, $m) && $method === 'POST') {
            $this->raw[$m[1] . '|' . $json['type'] . '|' . $json['name']] = array_column($json['records'], 'value');
            $this->syncFromRaw($m[1], $json['type'], $json['name']);

            return ['status' => 201, 'body' => ['rrset' => []]];
        }
        if (preg_match('#^/v1/zones/([^/]+)/rrsets/([^/]+)/([A-Z]+)(/actions/set_records)?$#', $path, $m)) {
            $key = $m[1] . '|' . $m[3] . '|' . $m[2];
            if ($method === 'GET') {
                if (!isset($this->raw[$key])) {
                    return ['status' => 404, 'body' => ['error' => ['code' => 'not_found']]];
                }

                return ['status' => 200, 'body' => ['rrset' => ['ttl' => 300, 'records' => array_map(fn ($v) => ['value' => $v], $this->raw[$key])]]];
            }
            if ($method === 'POST' && !empty($m[4])) {
                $this->raw[$key] = array_column($json['records'], 'value');
                $this->syncFromRaw($m[1], $m[3], $m[2]);

                return ['status' => 201, 'body' => ['action' => []]];
            }
            if ($method === 'DELETE') {
                unset($this->raw[$key]);
                $this->store[$this->key($m[1], $m[3], $m[2] === '@' ? $m[1] : $m[2] . '.' . $m[1])] = [];

                return ['status' => 200, 'body' => []];
            }
        }

        return ['status' => 400, 'body' => 'bad'];
    }

    private function desec(string $method, string $path, ?array $json): array
    {
        if ($path === '/api/v1/domains/') {
            return ['status' => 200, 'body' => array_map(fn ($z) => ['name' => $z, 'minimum_ttl' => 3600], $this->zones)];
        }
        if (preg_match('#^/api/v1/domains/([^/]+)/rrsets/([^/]*)/([A-Z]+)/$#', $path, $m) && $method === 'GET') {
            $key = $m[1] . '|' . $m[3] . '|' . $m[2];
            if (!isset($this->raw[$key])) {
                return ['status' => 404, 'body' => ['detail' => 'Not found.']];
            }

            return ['status' => 200, 'body' => ['ttl' => 3600, 'records' => $this->raw[$key]]];
        }
        if (preg_match('#^/api/v1/domains/([^/]+)/rrsets/$#', $path, $m) && $method === 'PUT') {
            foreach ($json as $set) {
                if ($set['ttl'] < 3600) {
                    return ['status' => 400, 'body' => ['ttl' => 'Ensure this value is greater than or equal to 3600.']];
                }
                $sub = $set['subname'] === '' ? '@' : $set['subname'];
                $this->raw[$m[1] . '|' . $set['type'] . '|' . $sub] = $set['records'];
                $this->syncFromRaw($m[1], $set['type'], $sub);
            }

            return ['status' => 200, 'body' => []];
        }

        return ['status' => 400, 'body' => 'bad'];
    }

    private function syncFromRaw(string $zone, string $type, string $name): void
    {
        $fqdn = $name === '@' ? $zone : $name . '.' . $zone;
        $rows = [];
        foreach ($this->raw[$zone . '|' . $type . '|' . $name] ?? [] as $value) {
            if ($type === 'MX' && preg_match('/^(\d+) (\S+)$/', $value, $m)) {
                $rows[] = ['content' => rtrim($m[2], '.'), 'priority' => (int) $m[1], 'id' => 'r' . $this->nextId++];
            } else {
                $rows[] = ['content' => $type === 'TXT' ? $this->stripQuotes($value) : $value, 'id' => 'r' . $this->nextId++];
            }
        }
        $this->store[$this->key($zone, $type, $fqdn)] = $rows;
    }

    /**
     * What a DNS server does with a quoted TXT value: remove the quotes and join the chunks.
     */
    private function stripQuotes(string $value): string
    {
        if (preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $value, $m) >= 1) {
            return stripcslashes(implode('', $m[1]));
        }

        return $value;
    }
}
