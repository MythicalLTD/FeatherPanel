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

namespace App\Services\Dns\Providers;

use App\Services\Dns\DnsProviderInterface;
use App\Services\Dns\MailRecordCapableInterface;

/**
 * Base class for DNS providers that are driven with a plain API token.
 *
 * A provider only describes four things: how to authenticate, how to list its zones, how to read one record set
 * and how to write one record set. The record logic that is the same everywhere (what to keep, what counts as a
 * conflict, dry run) lives here, so it is written and tested once.
 *
 * Record sets: a record set is every record with the same name and type. Names are always fully qualified
 * (`www.example.com`), providers convert them to their own relative form.
 */
abstract class AbstractApiDnsProvider implements DnsProviderInterface, MailRecordCapableInterface
{
    /** @var (callable(string, string, array<string, string>, ?array<mixed>): array{status: int, body: mixed})|null */
    private $transport;

    private bool $dryRun = false;

    /** @var (callable(int): void)|null */
    private $sleeper = null;

    /** @var list<array{id: string, name: string}>|null */
    private ?array $zoneCache = null;

    /**
     * @param (callable(string, string, array<string, string>, ?array<mixed>): array{status: int, body: mixed})|null $transport
     *                                                                                                                          test seam, null uses Guzzle
     */
    public function __construct(protected string $token, ?callable $transport = null)
    {
        $this->transport = $transport;
    }

    /**
     * Stable identifier used in the API (`cloudflare`, `hetzner`, ...).
     */
    abstract public static function id(): string;

    abstract public static function label(): string;

    /**
     * Where the customer gets the token and which rights it needs (shown in the UI, plain text).
     */
    abstract public static function help(): string;

    public function setDryRun(bool $dryRun): void
    {
        $this->dryRun = $dryRun;
    }

    /**
     * Test seam: replaces the real sleep used while waiting out a rate limit.
     *
     * @param callable(int): void $sleeper receives the number of seconds to wait
     */
    public function setSleeper(callable $sleeper): void
    {
        $this->sleeper = $sleeper;
    }

    public function listZones(): array
    {
        return array_map(static fn (array $z): array => ['id' => $z['id'], 'name' => $z['name'], 'status' => 'active'], $this->zones());
    }

    public function resolveZoneId(string $zoneName): ?string
    {
        $zoneName = strtolower(trim($zoneName, ". \t"));
        foreach ($this->zones() as $zone) {
            if ($zone['name'] === $zoneName) {
                return $zone['id'];
            }
        }

        return null;
    }

    /**
     * The zone that contains $domain: the longest zone name the domain equals or ends with.
     *
     * @return array{id: string, name: string}|null
     */
    public function findZoneForDomain(string $domain): ?array
    {
        $domain = strtolower(trim($domain, ". \t"));
        $best = null;
        foreach ($this->zones() as $zone) {
            $name = $zone['name'];
            if ($name === '') {
                continue;
            }
            if ($domain === $name || str_ends_with($domain, '.' . $name)) {
                if ($best === null || strlen($name) > strlen($best['name'])) {
                    $best = $zone;
                }
            }
        }

        return $best;
    }

    public function listRecords(string $zoneId, ?string $type = null, ?string $name = null, int $page = 1, int $perPage = 100): array
    {
        if ($type === null || $name === null) {
            throw new \BadMethodCallException('Listing a whole zone is not supported for API-key providers');
        }
        $set = $this->fetchRrset($zoneId, $this->zoneName($zoneId), strtoupper($type), strtolower(trim($name, '.')));
        $records = [];
        foreach ($set['records'] as $record) {
            $records[] = [
                'id' => $record['id'] ?? '',
                'type' => strtoupper($type),
                'name' => strtolower(trim($name, '.')),
                'content' => $record['content'],
                'priority' => $record['priority'],
                'ttl' => $set['ttl'],
            ];
        }

        return ['records' => $records, 'page' => 1, 'per_page' => max(1, $perPage), 'total_count' => count($records)];
    }

    public function createRecord(string $zoneId, array $payload): array
    {
        throw new \BadMethodCallException('Editing single records is not supported for API-key providers');
    }

    public function updateRecord(string $zoneId, string $recordId, array $payload): array
    {
        throw new \BadMethodCallException('Editing single records is not supported for API-key providers');
    }

    public function deleteRecord(string $zoneId, string $recordId): void
    {
        throw new \BadMethodCallException('Editing single records is not supported for API-key providers');
    }

    public function upsertARecord(string $zoneId, string $name, string $ip, int $ttl = 300, bool $proxied = false): array
    {
        return $this->upsertSingle($zoneId, filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? 'AAAA' : 'A', $name, $ip, null, $ttl, false);
    }

    /**
     * Same as upsertARecord but lets the caller decide what happens to an existing different record.
     *
     * @return array<string, mixed>
     */
    public function upsertAddress(string $zoneId, string $name, string $ip, int $ttl = 300, bool $overwrite = false): array
    {
        return $this->upsertSingle($zoneId, filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? 'AAAA' : 'A', $name, $ip, null, $ttl, $overwrite);
    }

    public function upsertMxRecord(string $zoneId, string $name, string $target, int $priority = 10, int $ttl = 300, bool $overwrite = true): array
    {
        return $this->upsertSingle($zoneId, 'MX', $name, strtolower(rtrim(trim($target), '.')), $priority, $ttl, $overwrite);
    }

    public function upsertTxtRecord(string $zoneId, string $name, string $content, int $ttl = 300, bool $overwrite = true): array
    {
        try {
            $zoneName = $this->zoneName($zoneId);
            $fqdn = $this->fqdn($name, $zoneName);
            $content = trim($content);
            if ($content === '') {
                return ['ok' => false, 'action' => 'error', 'error' => 'TXT value is empty'];
            }
            $existing = $this->fetchRrset($zoneId, $zoneName, 'TXT', $fqdn);
            $values = array_map(static fn (array $r): string => $r['content'], $existing['records']);

            // Values of the same kind (another SPF, DKIM or DMARC) that differ from the wanted one. There must be at
            // most one of each kind on a name (two SPF records make SPF fail), so they are a conflict even when the
            // wanted value is already present, for example after an earlier run that could not remove the old one.
            $tag = self::txtTag($content);
            $others = [];
            if ($tag !== null) {
                foreach ($values as $i => $value) {
                    if ($value !== $content && self::txtTag($value) === $tag) {
                        $others[] = $i;
                    }
                }
            }
            $present = in_array($content, $values, true);

            if ($others === [] && $present) {
                return ['ok' => true, 'action' => 'unchanged'];
            }
            if ($others !== [] && !$overwrite) {
                return ['ok' => false, 'action' => 'conflict', 'error' => 'A different ' . $tag . ' record already exists (kept)', 'existing' => $values[$others[0]]];
            }

            $next = [];
            $placed = $present;
            foreach ($values as $i => $value) {
                if (in_array($i, $others, true)) {
                    if (!$placed) {
                        $next[] = $content;
                        $placed = true;
                    }
                    continue;
                }
                $next[] = $value;
            }
            if (!$placed) {
                $next[] = $content;
            }
            $action = $values === [] ? 'created' : 'updated';
            if ($this->dryRun) {
                return ['ok' => true, 'action' => 'would_' . ($action === 'created' ? 'create' : 'update')];
            }

            $desired = array_map(static fn (string $v): array => ['content' => $v, 'priority' => null], $next);
            $this->storeRrset($zoneId, $zoneName, 'TXT', $fqdn, $desired, max(60, $ttl), $existing);

            return ['ok' => true, 'action' => $action];
        } catch (\Throwable $e) {
            return ['ok' => false, 'action' => 'error', 'error' => $this->clean($e->getMessage())];
        }
    }

    /**
     * Test seam and ACME helper: adds or replaces one TXT value.
     *
     * @return array<string, mixed>
     */
    public function createTxtRecord(string $zoneId, string $name, string $content, int $ttl = 120): array
    {
        return $this->upsertTxtRecord($zoneId, $name, $content, max(60, $ttl), true);
    }

    /**
     * `v=spf1`, `v=DKIM1`, `v=DMARC1`, ... : the part that says what kind of TXT record it is.
     */
    public static function txtTag(string $value): ?string
    {
        if (preg_match('/^\s*v=([A-Za-z0-9]+)/', $value, $m) === 1) {
            return strtolower($m[1]);
        }
        // "v=DKIM1" is optional (RFC 6376 3.6.1): a key record is recognised by its "p=" tag.
        if (preg_match('/(?:^|;)\s*p=[A-Za-z0-9+\/=\s]*(?:;|$)/', $value) === 1) {
            return 'dkim1';
        }

        return null;
    }

    /**
     * @return array<string, string>
     */
    abstract protected function authHeaders(): array;

    /**
     * @return list<array{id: string, name: string}>
     */
    abstract protected function fetchZones(): array;

    /**
     * Reads one record set. Content is normalised: TXT without quotes, MX host without trailing dot.
     *
     * @return array{ttl: ?int, records: list<array{content: string, priority: ?int, id: ?string}>}
     */
    abstract protected function fetchRrset(string $zoneId, string $zoneName, string $type, string $fqdn): array;

    /**
     * Makes the record set equal to $desired (empty = remove the set).
     *
     * @param list<array{content: string, priority: ?int}> $desired
     * @param array{ttl: ?int, records: list<array{content: string, priority: ?int, id: ?string}>} $existing
     */
    abstract protected function storeRrset(string $zoneId, string $zoneName, string $type, string $fqdn, array $desired, int $ttl, array $existing): void;

    /**
     * @return list<array{id: string, name: string}>
     */
    protected function zones(): array
    {
        if ($this->zoneCache === null) {
            $zones = [];
            foreach ($this->fetchZones() as $zone) {
                $name = strtolower(trim((string) $zone['name'], '.'));
                if ($name !== '') {
                    $zones[] = ['id' => (string) $zone['id'], 'name' => $name];
                }
            }
            $this->zoneCache = $zones;
        }

        return $this->zoneCache;
    }

    protected function zoneName(string $zoneId): string
    {
        foreach ($this->zones() as $zone) {
            if ($zone['id'] === $zoneId) {
                return $zone['name'];
            }
        }

        throw new \RuntimeException('Unknown zone');
    }

    /**
     * `@` and relative labels become fully qualified names.
     */
    protected function fqdn(string $name, string $zoneName): string
    {
        $name = strtolower(trim($name, '. '));
        if ($name === '' || $name === '@' || $name === $zoneName) {
            return $zoneName;
        }
        if (str_ends_with($name, '.' . $zoneName)) {
            return $name;
        }

        return $name . '.' . $zoneName;
    }

    /**
     * Name relative to the zone (`@` for the apex), as most provider APIs want it.
     */
    protected function relative(string $fqdn, string $zoneName): string
    {
        if ($fqdn === $zoneName) {
            return '@';
        }

        return substr($fqdn, 0, -strlen('.' . $zoneName));
    }

    /**
     * Provider output -> plain value: strips the quotes and joins the 255-byte chunks.
     */
    protected function unquoteTxt(string $value): string
    {
        $value = trim($value);
        if (preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $value, $m) >= 1 && preg_replace('/"(?:[^"\\\\]|\\\\.)*"|\s+/', '', $value) === '') {
            // Zone file escapes: "\DDD" is a decimal byte value, "\X" is X itself.
            return (string) preg_replace_callback(
                '/\\\\(\d{3}|.)/s',
                static fn (array $e): string => strlen($e[1]) === 3 ? chr(min(255, (int) $e[1])) : $e[1],
                implode('', $m[1]),
            );
        }

        return $value;
    }

    /**
     * Plain value -> zone file form: quoted, split in chunks of at most 255 bytes.
     */
    protected function quoteTxt(string $value): string
    {
        // Each chunk holds at most 255 bytes of the value; escaping happens per byte so a chunk never ends in the
        // middle of an escape sequence.
        $chunks = [''];
        $bytes = 0;
        $length = strlen($value);
        for ($i = 0; $i < $length; ++$i) {
            if ($bytes === 255) {
                $chunks[] = '';
                $bytes = 0;
            }
            $char = $value[$i];
            $chunks[count($chunks) - 1] .= ($char === '\\' || $char === '"') ? '\\' . $char : $char;
            ++$bytes;
        }

        return '"' . implode('" "', $chunks) . '"';
    }

    /**
     * @param array<mixed>|null $json
     * @param list<int> $okStatuses extra statuses that are not an error (404 for "not found" reads)
     *
     * @return array{status: int, body: mixed}
     */
    protected function call(string $method, string $url, ?array $json = null, array $okStatuses = []): array
    {
        $headers = array_merge(['Accept' => 'application/json'], $this->authHeaders());
        if ($json !== null) {
            $headers['Content-Type'] = 'application/json';
        }
        // A rate limit (429) rejects the request before anything is changed, so asking again is safe. deSEC allows
        // only a few writes per second and the mail setup writes four records in a row.
        $attempt = 0;
        while (true) {
            ++$attempt;
            try {
                $response = $this->send($method, $url, $headers, $json);
            } catch (\Throwable $e) {
                throw new \RuntimeException($this->clean('Request to the DNS provider failed: ' . $e->getMessage()));
            }
            if ((int) $response['status'] !== 429 || in_array(429, $okStatuses, true) || $attempt >= self::MAX_ATTEMPTS) {
                break;
            }
            $this->wait($this->retryDelay($response));
        }
        $status = (int) $response['status'];
        if (($status === 401 || $status === 403) && !in_array($status, $okStatuses, true)) {
            throw new \RuntimeException(static::label() . ' rejected the API token or it lacks the DNS rights (HTTP ' . $status . ')');
        }
        if ($status >= 400 && !in_array($status, $okStatuses, true)) {
            throw new \RuntimeException($this->clean(static::label() . ' answered ' . $status . ': ' . $this->errorText($response['body'])));
        }

        return ['status' => $status, 'body' => $response['body']];
    }

    private const MAX_ATTEMPTS = 4;

    /**
     * Seconds to wait before asking again: the provider's own number if it gives one, else 2, kept within 1 to 10.
     *
     * @param array{status: int, body: mixed, retry_after?: int|null} $response
     */
    private function retryDelay(array $response): int
    {
        $seconds = isset($response['retry_after']) ? (int) $response['retry_after'] : 0;
        if ($seconds <= 0) {
            $text = is_array($response['body']) ? (string) json_encode($response['body']) : (string) $response['body'];
            if (preg_match('/in\s+(\d+(?:\.\d+)?)\s+second/i', $text, $m) === 1) {
                $seconds = (int) ceil((float) $m[1]);
            }
        }

        return max(1, min(10, $seconds > 0 ? $seconds : 2));
    }

    private function wait(int $seconds): void
    {
        if ($this->sleeper !== null) {
            ($this->sleeper)($seconds);

            return;
        }
        sleep($seconds);
    }

    protected function errorText(mixed $body): string
    {
        if (is_array($body)) {
            foreach (['errors', 'error', 'message', 'detail', 'id'] as $key) {
                if (isset($body[$key])) {
                    $value = $body[$key];

                    // Scrub before shortening, a cut through the token could not be matched any more.
                    return mb_substr($this->scrub(is_string($value) ? $value : (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)), 0, 300);
                }
            }

            return mb_substr($this->scrub((string) json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)), 0, 300);
        }

        return mb_substr($this->scrub((string) $body), 0, 300);
    }

    /**
     * Keeps the token out of every message that can reach a log or a response.
     */
    protected function clean(string $message): string
    {
        return mb_substr($this->scrub($message), 0, 400);
    }

    /**
     * Replaces the token, also in its JSON-escaped form, without shortening the text.
     */
    private function scrub(string $message): string
    {
        if ($this->token === '') {
            return $message;
        }
        $forms = array_unique([$this->token, trim((string) json_encode($this->token), '"'), trim((string) json_encode($this->token, JSON_UNESCAPED_SLASHES), '"')]);

        return str_replace($forms, '***', $message);
    }

    /**
     * @param array<string, string> $headers
     * @param array<mixed>|null $json
     *
     * @return array{status: int, body: mixed, retry_after?: int|null}
     */
    private function send(string $method, string $url, array $headers, ?array $json): array
    {
        if ($this->transport !== null) {
            return ($this->transport)($method, $url, $headers, $json);
        }

        $client = new \GuzzleHttp\Client([
            'timeout' => 20,
            'connect_timeout' => 8,
            'http_errors' => false,
            'allow_redirects' => false,
        ]);
        $options = ['headers' => $headers];
        if ($json !== null) {
            $options['json'] = $json;
        }
        $response = $client->request($method, $url, $options);
        $raw = (string) $response->getBody();
        $decoded = $raw === '' ? null : json_decode($raw, true);

        $retryAfter = $response->getHeaderLine('Retry-After');

        return [
            'status' => $response->getStatusCode(),
            'body' => $decoded ?? ($raw === '' ? null : $raw),
            'retry_after' => ctype_digit($retryAfter) ? (int) $retryAfter : null,
        ];
    }

    /**
     * Records with one value that the customer owns (A, AAAA, MX): create, keep, or replace on request.
     *
     * @return array<string, mixed>
     */
    private function upsertSingle(string $zoneId, string $type, string $name, string $content, ?int $priority, int $ttl, bool $overwrite): array
    {
        try {
            $zoneName = $this->zoneName($zoneId);
            $fqdn = $this->fqdn($name, $zoneName);
            $existing = $this->fetchRrset($zoneId, $zoneName, $type, $fqdn);
            $current = $existing['records'];

            foreach ($current as $record) {
                if (strtolower(rtrim($record['content'], '.')) === strtolower(rtrim($content, '.')) && ($priority === null || (int) $record['priority'] === $priority)) {
                    return ['ok' => true, 'action' => 'unchanged'];
                }
            }

            if ($current !== [] && !$overwrite) {
                return [
                    'ok' => false,
                    'action' => 'conflict',
                    'error' => 'A different ' . $type . ' record already exists (kept)',
                    'existing' => array_map(static fn (array $r): string => $r['content'], $current),
                ];
            }

            $action = $current === [] ? 'created' : 'updated';
            if ($this->dryRun) {
                return ['ok' => true, 'action' => 'would_' . ($action === 'created' ? 'create' : 'update')];
            }

            $this->storeRrset($zoneId, $zoneName, $type, $fqdn, [['content' => $content, 'priority' => $priority]], max(60, $ttl), $existing);

            return ['ok' => true, 'action' => $action];
        } catch (\Throwable $e) {
            return ['ok' => false, 'action' => 'error', 'error' => $this->clean($e->getMessage())];
        }
    }
}
