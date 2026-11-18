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
use App\Helpers\DnsProvisioner;
use App\Services\Dns\Providers\DnsProviderRegistry;
use App\Services\Dns\Providers\AbstractApiDnsProvider;

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

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testASecondSpfLeftOverFromAnEarlierRunIsAConflictAndIsRemovedOnRequest(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'v=spf1 include:old.example ~all'], ['content' => self::SPF], ['content' => 'google-site-verification=abc']]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('conflict', $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, false)['action']);
        $this->assertSame('updated', $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, true)['action']);
        $values = array_column($fake->state('example.com', 'TXT', 'example.com'), 'content');
        sort($values);
        $this->assertSame(['google-site-verification=abc', self::SPF], $values);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testDkimKeyWithoutVersionTagIsRecognised(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'mail._domainkey.example.com', [['content' => 'k=rsa; p=OLDKEY']]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('conflict', $p->upsertTxtRecord($z, 'mail._domainkey.example.com', 'v=DKIM1; k=rsa; p=NEWKEY', 300, false)['action']);
        $this->assertSame('updated', $p->upsertTxtRecord($z, 'mail._domainkey.example.com', 'v=DKIM1; k=rsa; p=NEWKEY', 300, true)['action']);
        $this->assertSame([['content' => 'v=DKIM1; k=rsa; p=NEWKEY']], $fake->state('example.com', 'TXT', 'mail._domainkey.example.com'));
    }

    public function testIonosEnablesADisabledRecordInsteadOfAddingASecondOne(): void
    {
        $fake = new FakeDnsApi('ionos', ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => self::SPF, 'disabled' => true]]);
        $p = DnsProviderRegistry::create('ionos', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];

        $this->assertSame('created', $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, false)['action']);
        $this->assertSame([['content' => self::SPF]], $fake->state('example.com', 'TXT', 'example.com'));
        $this->assertSame('unchanged', $p->upsertTxtRecord($z, 'example.com', self::SPF, 300, false)['action']);
    }

    public function testHetznerWaitsForTheWriteActionAndReportsAFailedOne(): void
    {
        $fake = new FakeDnsApi('hetzner', ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'google-site-verification=abc']]);
        $fake->hetznerActionStatus = 'success';
        $p = DnsProviderRegistry::create('hetzner', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $this->assertSame('updated', $p->upsertTxtRecord($z, 'example.com', self::SPF)['action']);
        $this->assertSame(1, $fake->hetznerActionPolls);

        $fake2 = new FakeDnsApi('hetzner', ['example.com']);
        $fake2->seed('example.com', 'TXT', 'example.com', [['content' => 'google-site-verification=abc']]);
        $fake2->hetznerActionStatus = 'error';
        $p2 = DnsProviderRegistry::create('hetzner', 'tok', $fake2);
        $res = $p2->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertFalse($res['ok']);
        $this->assertStringContainsString('record value is invalid', (string) $res['error']);
    }

    public function testZoneFileEscapesAreDecimal(): void
    {
        $p = DnsProviderRegistry::create('desec', 'tok', new FakeDnsApi('desec', ['example.com']));
        $unquote = Closure::bind(fn (string $v): string => $this->unquoteTxt($v), $p, $p);

        $this->assertSame('verification=ABC', $unquote('"verification=\\065BC"'));
        $this->assertSame('say "hi" \\ ok', $unquote('"say \\"hi\\" \\\\ ok"'));
    }

    public function testTokenIsScrubbedBeforeTheErrorTextIsShortened(): void
    {
        $secret = 'tok/' . str_repeat('S', 40);
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $fake->failWith = 400;
        $fake->echoHeadersInError = true;
        $fake->errorPrefix = str_repeat('x', 200);
        $p = DnsProviderRegistry::create('cloudflare', $secret, $fake);

        try {
            $p->findZoneForDomain('example.com');
            $this->fail('expected an exception');
        } catch (Throwable $e) {
            $this->assertStringNotContainsString(str_repeat('S', 10), $e->getMessage());
            $this->assertStringContainsString('***', $e->getMessage());
        }
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

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testRateLimitedWriteIsRetriedAfterTheWaitTheProviderNames(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $waits = [];
        $p->setSleeper(function (int $s) use (&$waits): void {
            $waits[] = $s;
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleWrites = 2;

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertTrue($r['ok'], json_encode($r));
        $this->assertSame('created', $r['action']);
        $this->assertSame(2, $fake->throttled);
        $this->assertSame([3, 3], $waits, 'the number in the provider message is used');
        $this->assertSame(self::SPF, $fake->state('example.com', 'TXT', 'example.com')[0]['content'], 'written exactly once');
    }

    public function testRetryAfterHeaderWinsAndTheWaitIsCapped(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $p = DnsProviderRegistry::create('cloudflare', 'tok', $fake);
        $waits = [];
        $p->setSleeper(function (int $s) use (&$waits): void {
            $waits[] = $s;
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleWrites = 2;
        $fake->retryAfterHeader = 2;
        $this->assertTrue($p->upsertMxRecord($z, 'example.com', 'mail.example.net')['ok']);
        $this->assertSame([2, 2], $waits);

        $fake->throttleWrites = 1;
        $fake->retryAfterHeader = 600;
        $waits = [];
        $this->assertTrue($p->upsertMxRecord($z, 'example.com', 'mail2.example.net', 10, 300, true)['ok']);
        $this->assertSame([10], $waits, 'a long Retry-After is capped');
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testValueAddedByAnotherClientDuringTheWaitIsKept(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'google-site-verification=abc']]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleWrites = 1;
        // While the provider says "wait", somebody else adds a TXT value to the same name.
        $p->setSleeper(function (int $s) use ($fake): void {
            $now = $fake->state('example.com', 'TXT', 'example.com');
            $now[] = ['content' => 'added-meanwhile=1'];
            $fake->seed('example.com', 'TXT', 'example.com', $now);
        });

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertTrue($r['ok'], json_encode($r));
        $this->assertEqualsCanonicalizing(
            ['google-site-verification=abc', 'added-meanwhile=1', self::SPF],
            array_column($fake->state('example.com', 'TXT', 'example.com'), 'content'),
            'the retry must be computed from a fresh read, not replay the old write'
        );
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testThrottledReadsAreRetriedToo(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $p->setSleeper(function (int $s): void {
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleReads = 2;

        $this->assertSame('created', $p->upsertMxRecord($z, 'example.com', 'mail.example.net')['action']);
        $this->assertSame(2, $fake->throttled);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testRateLimitThatNeverEndsGivesUpAfterFourAttempts(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $waits = [];
        $p->setSleeper(function (int $s) use (&$waits): void {
            $waits[] = $s;
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleWrites = 100;

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertFalse($r['ok']);
        $this->assertSame('error', $r['action']);
        $this->assertStringContainsString('429', $r['error']);
        $this->assertSame(4, $fake->throttled, 'one try and three retries');
        $this->assertCount(3, $waits);
        $this->assertSame([], $fake->state('example.com', 'TXT', 'example.com'), 'nothing half written');
    }

    #[PHPUnit\Framework\Attributes\DataProvider('recordProviders')]
    public function testThrottledDeleteAfterTheCreateStillRemovesTheOldRecord(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'MX', 'example.com', [['content' => 'old.example.net', 'priority' => 10]]);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $p->setSleeper(function (int $s): void {
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        // The new MX is created, then deleting the old one is throttled: the retry must finish the replacement.
        $fake->throttleDeletes = 1;

        $r = $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10, 300, true);
        $this->assertTrue($r['ok'], json_encode($r));
        $this->assertSame(1, $fake->throttled);
        $this->assertSame([['content' => 'mail.example.net', 'priority' => 10]], $fake->state('example.com', 'MX', 'example.com'));

        // A complete replacement is still reported as unchanged on the next run.
        $this->assertSame('unchanged', $p->upsertMxRecord($z, 'example.com', 'mail.example.net', 10, 300, true)['action']);
    }

    public function testIonosDoesNotReuseADisabledRecordThatWasChangedDuringTheWait(): void
    {
        $fake = new FakeDnsApi('ionos', ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => self::SPF, 'disabled' => true, 'id' => 'kept1']]);
        $p = DnsProviderRegistry::create('ionos', 'tok', $fake);
        $z = $p->findZoneForDomain('example.com')['id'];
        // Enabling the disabled record is throttled; meanwhile another client enables it with a different value.
        $fake->throttleWrites = 1;
        $p->setSleeper(function (int $s) use ($fake): void {
            $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'other=1', 'id' => 'kept1']]);
        });

        $r = $p->upsertTxtRecord($z, 'example.com', self::SPF);
        $this->assertTrue($r['ok'], json_encode($r));
        $this->assertEqualsCanonicalizing(
            ['other=1', self::SPF],
            array_column($fake->state('example.com', 'TXT', 'example.com'), 'content'),
            'the record changed by the other client must not be overwritten'
        );
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testAllWaitsOfOneRequestStayWithinTheBudget(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $waits = [];
        $p->setSleeper(function (int $s) use (&$waits): void {
            $waits[] = $s;
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->throttleWrites = 1000;
        $fake->retryAfterHeader = 10;

        // The mail setup writes four records; a provider that never stops throttling must not hold it for minutes.
        foreach (['example.com' => self::SPF, '_dmarc.example.com' => self::DMARC, 'mail._domainkey.example.com' => 'v=DKIM1; k=rsa; p=KEY'] as $name => $value) {
            $this->assertFalse($p->upsertTxtRecord($z, $name, $value)['ok']);
        }
        $this->assertFalse($p->upsertMxRecord($z, 'example.com', 'mail.example.net')['ok']);
        $this->assertLessThanOrEqual(30, array_sum($waits));
        $this->assertSame([10, 10, 10], $waits);
    }

    public function testRetryAfterAcceptsSecondsAndHttpDates(): void
    {
        $now = 1_700_000_000;
        $this->assertSame(5, AbstractApiDnsProvider::parseRetryAfter('5', $now));
        $this->assertSame(0, AbstractApiDnsProvider::parseRetryAfter('0', $now));
        $this->assertSame(7, AbstractApiDnsProvider::parseRetryAfter(gmdate('D, d M Y H:i:s', $now + 7) . ' GMT', $now));
        $this->assertSame(0, AbstractApiDnsProvider::parseRetryAfter(gmdate('D, d M Y H:i:s', $now - 60) . ' GMT', $now));
        $this->assertNull(AbstractApiDnsProvider::parseRetryAfter('', $now));
        $this->assertNull(AbstractApiDnsProvider::parseRetryAfter('soon', $now));
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testOtherErrorsAreNotRetried(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $p = DnsProviderRegistry::create($id, 'tok', $fake);
        $waits = [];
        $p->setSleeper(function (int $s) use (&$waits): void {
            $waits[] = $s;
        });
        $z = $p->findZoneForDomain('example.com')['id'];
        $fake->failWith = 500;

        $this->assertFalse($p->upsertTxtRecord($z, 'example.com', self::SPF)['ok']);
        $this->assertSame([], $waits);
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
     * @return array{provider: mixed, zone_id: string}
     */
    private function webContext(string $id, FakeDnsApi $fake): array
    {
        $p = DnsProviderRegistry::create($id, 'tok', $fake);

        return ['provider' => $p, 'zone_id' => $p->findZoneForDomain('example.com')['id']];
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testWebRecordsPointTheDomainAtTheNodeAndTouchNothingElse(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'TXT', 'example.com', [['content' => 'google-site-verification=abc']]);
        $fake->seed('example.com', 'MX', 'example.com', [['content' => 'mail.example.net', 'priority' => 10]]);
        $ctx = $this->webContext($id, $fake);
        $node = ['public_ip' => '192.0.2.10', 'ip' => '2001:db8::10'];

        $r = DnsProvisioner::provisionWebRecords($node, 'Example.com.', $ctx);

        $this->assertTrue($r['ok']);
        $this->assertSame(['A', 'AAAA'], array_column($r['results'], 'type'));
        $this->assertSame(['created', 'created'], array_column($r['results'], 'action'));
        $this->assertSame('192.0.2.10', $fake->state('example.com', 'A', 'example.com')[0]['content']);
        $this->assertSame('2001:db8::10', $fake->state('example.com', 'AAAA', 'example.com')[0]['content']);
        $this->assertSame('google-site-verification=abc', $fake->state('example.com', 'TXT', 'example.com')[0]['content']);
        $this->assertSame('mail.example.net', $fake->state('example.com', 'MX', 'example.com')[0]['content']);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testWebRecordsSecondRunChangesNothing(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $ctx = $this->webContext($id, $fake);
        $node = ['public_ip' => '192.0.2.10'];
        DnsProvisioner::provisionWebRecords($node, 'example.com', $ctx);

        $r = DnsProvisioner::provisionWebRecords($node, 'example.com', $ctx);

        $this->assertTrue($r['ok']);
        $this->assertSame(['A'], array_column($r['results'], 'type'), 'no AAAA when the node has no IPv6 address');
        $this->assertSame(['unchanged'], array_column($r['results'], 'action'));
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testWebRecordsKeepADifferentAddressUnlessOverwriteIsAsked(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'A', 'example.com', [['content' => '198.51.100.7']]);
        $ctx = $this->webContext($id, $fake);
        $node = ['public_ip' => '192.0.2.10'];

        $kept = DnsProvisioner::provisionWebRecords($node, 'example.com', $ctx);
        $this->assertFalse($kept['ok']);
        $this->assertSame('conflict', $kept['results'][0]['action']);
        $this->assertSame(['198.51.100.7'], $kept['results'][0]['existing']);
        $this->assertSame('198.51.100.7', $fake->state('example.com', 'A', 'example.com')[0]['content']);

        $replaced = DnsProvisioner::provisionWebRecords($node, 'example.com', $ctx, true);
        $this->assertTrue($replaced['ok']);
        $this->assertSame('updated', $replaced['results'][0]['action']);
        $this->assertSame('192.0.2.10', $fake->state('example.com', 'A', 'example.com')[0]['content']);
    }

    #[PHPUnit\Framework\Attributes\DataProvider('providers')]
    public function testWebRecordsDryRunWritesNothing(string $id): void
    {
        $fake = new FakeDnsApi($id, ['example.com']);
        $fake->seed('example.com', 'A', 'www.example.com', [['content' => '198.51.100.7']]);
        $ctx = $this->webContext($id, $fake);

        $r = DnsProvisioner::provisionWebRecords(['public_ip' => '192.0.2.10'], 'example.com', $ctx, true, true);

        $this->assertTrue($r['ok']);
        $this->assertSame('would_create', $r['results'][0]['action']);
        $this->assertSame([], $fake->state('example.com', 'A', 'example.com'));
        $this->assertSame('198.51.100.7', $fake->state('example.com', 'A', 'www.example.com')[0]['content'], 'other names are never touched');
    }

    public function testWebRecordsNeedAResolvableNodeAddress(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $ctx = $this->webContext('cloudflare', $fake);

        $r = DnsProvisioner::provisionWebRecords([], 'example.com', $ctx);

        $this->assertFalse($r['ok']);
        $this->assertSame([], $r['results']);
        $this->assertNotEmpty($r['error']);
        $this->assertSame([], $fake->state('example.com', 'A', 'example.com'));
    }

    public function testWebRecordsRejectAnEmptyDomain(): void
    {
        $fake = new FakeDnsApi('cloudflare', ['example.com']);
        $r = DnsProvisioner::provisionWebRecords(['public_ip' => '192.0.2.10'], ' . ', $this->webContext('cloudflare', $fake));

        $this->assertFalse($r['ok']);
        $this->assertSame([], $r['results']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function providers(): array
    {
        return ['cloudflare' => ['cloudflare'], 'hetzner' => ['hetzner'], 'ionos' => ['ionos'], 'digitalocean' => ['digitalocean'], 'desec' => ['desec']];
    }

    /** Providers that change a record set by creating and deleting single records. */
    public static function recordProviders(): array
    {
        return ['cloudflare' => ['cloudflare'], 'ionos' => ['ionos'], 'digitalocean' => ['digitalocean']];
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
    /** Number of next write requests that are answered with 429 before one is accepted. */
    public int $throttleWrites = 0;
    public int $throttled = 0;
    /** Number of next read requests (not the zone list) that are answered with 429. */
    public int $throttleReads = 0;
    public ?int $retryAfterHeader = null;
    /** Number of next DELETE requests that are answered with 429. */
    public int $throttleDeletes = 0;
    public bool $echoHeadersInError = false;
    /** Hetzner: final status of write actions ('success' or 'error'); null answers without a running action */
    public ?string $hetznerActionStatus = null;
    public int $hetznerActionPolls = 0;
    public string $errorPrefix = '';
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
            return ['status' => $this->failWith, 'body' => ['error' => $this->errorPrefix . 'denied' . ($this->echoHeadersInError ? ' for ' . json_encode($headers) : '')]];
        }
        if (!$isWrite && $this->throttleReads > 0 && !preg_match('#/(zones|domains)/?$#', $path)) {
            --$this->throttleReads;
            ++$this->throttled;

            return ['status' => 429, 'body' => ['detail' => 'Request was throttled. Expected available in 1 second.']];
        }
        if ($method === 'DELETE' && $this->throttleDeletes > 0) {
            --$this->throttleDeletes;
            ++$this->throttled;

            return ['status' => 429, 'body' => ['detail' => 'Request was throttled. Expected available in 1 second.']];
        }
        if ($isWrite && $this->throttleWrites > 0) {
            --$this->throttleWrites;
            ++$this->throttled;
            $res = ['status' => 429, 'body' => ['detail' => 'Request was throttled. Expected available in 3 seconds.']];
            if ($this->retryAfterHeader !== null) {
                $res['retry_after'] = $this->retryAfterHeader;
            }

            return $res;
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
            $r['id'] ??= 'r' . $this->nextId++;
        }
        unset($r);
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
            if (!empty($r['disabled'])) {
                $row['disabled'] = true;
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
                    $row = ['id' => $r['id'], 'name' => $fqdn, 'type' => $type, 'content' => $content, 'ttl' => 300, 'disabled' => !empty($r['disabled'])];
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
        if ($method === 'PUT') {
            foreach ($this->store as $k => $rows) {
                foreach ($rows as $i => $r) {
                    if ($r['id'] === $m[2]) {
                        $this->store[$k][$i]['disabled'] = (bool) ($json['disabled'] ?? false);
                        $this->store[$k][$i]['content'] = str_contains($k, '|TXT|') ? $this->stripQuotes((string) $json['content']) : (string) $json['content'];
                    }
                }
            }

            return ['status' => 200, 'body' => null];
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
        if (preg_match('#^/v1/zones/([^/]+)/actions/(\d+)$#', $path, $m) && $method === 'GET') {
            ++$this->hetznerActionPolls;
            $action = ['id' => (int) $m[2], 'status' => $this->hetznerActionStatus];
            if ($this->hetznerActionStatus === 'error') {
                $action['error'] = ['code' => 'invalid_input', 'message' => 'record value is invalid'];
            }

            return ['status' => 200, 'body' => ['action' => $action]];
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
                if ($this->hetznerActionStatus === 'error') {
                    // The action fails later, nothing changes.
                    return ['status' => 201, 'body' => ['action' => ['id' => 7, 'status' => 'running']]];
                }
                $this->raw[$key] = array_column($json['records'], 'value');
                $this->syncFromRaw($m[1], $m[3], $m[2]);

                return ['status' => 201, 'body' => ['action' => $this->hetznerActionStatus === null ? [] : ['id' => 7, 'status' => 'running']]];
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
