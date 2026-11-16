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
     * @param list<array{content: string, priority: ?int}>                           $desired
     * @param array{ttl: ?int, records: list<array{content: string, priority: ?int, id: ?string}>} $existing
     */
    abstract protected function storeRrset(string $zoneId, string $zoneName, string $type, string $fqdn, array $desired, int $ttl, array $existing): void;

    public function setDryRun(bool $dryRun): void
    {
        $this->dryRun = $dryRun;
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

            if (in_array($content, $values, true)) {
                return ['ok' => true, 'action' => 'unchanged'];
            }

            $tag = self::txtTag($content);
            $sameTag = null;
            if ($tag !== null) {
                foreach ($values as $i => $value) {
                    if (self::txtTag($value) === $tag) {
                        $sameTag = $i;
                        break;
                    }
                }
            }

            if ($sameTag !== null && !$overwrite) {
                return ['ok' => false, 'action' => 'conflict', 'error' => 'A different ' . $tag . ' record already exists (kept)', 'existing' => $values[$sameTag]];
            }

            $next = $values;
            if ($sameTag !== null) {
                $next[$sameTag] = $content;
            } else {
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
     * `v=spf1`, `v=DKIM1`, `v=DMARC1`, ... : the part that says what kind of TXT record it is.
     */
    public static function txtTag(string $value): ?string
    {
        if (preg_match('/^\s*v=([A-Za-z0-9]+)/', $value, $m) === 1) {
            return strtolower($m[1]);
        }

        return null;
    }

    /**
     * Provider output -> plain value: strips the quotes and joins the 255-byte chunks.
     */
    protected function unquoteTxt(string $value): string
    {
        $value = trim($value);
        if (preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $value, $m) >= 1 && preg_replace('/"(?:[^"\\\\]|\\\\.)*"|\s+/', '', $value) === '') {
            return stripcslashes(implode('', $m[1]));
        }

        return $value;
    }

    /**
     * Plain value -> zone file form: quoted, split in chunks of at most 255 bytes.
     */
    protected function quoteTxt(string $value): string
    {
        $chunks = str_split(str_replace(['\\', '"'], ['\\\\', '\\"'], $value), 250) ?: [''];

        return '"' . implode('" "', $chunks) . '"';
    }

    /**
     * @param array<string, string>  $headers
     * @param array<mixed>|null      $json
     * @param list<int>              $okStatuses  extra statuses that are not an error (404 for "not found" reads)
     *
     * @return array{status: int, body: mixed}
     */
    protected function call(string $method, string $url, ?array $json = null, array $okStatuses = []): array
    {
        $headers = array_merge(['Accept' => 'application/json'], $this->authHeaders());
        if ($json !== null) {
            $headers['Content-Type'] = 'application/json';
        }
        try {
            $response = $this->send($method, $url, $headers, $json);
        } catch (\Throwable $e) {
            throw new \RuntimeException($this->clean('Request to the DNS provider failed: ' . $e->getMessage()));
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

    protected function errorText(mixed $body): string
    {
        if (is_array($body)) {
            foreach (['errors', 'error', 'message', 'detail', 'id'] as $key) {
                if (isset($body[$key])) {
                    $value = $body[$key];

                    return mb_substr(is_string($value) ? $value : (string) json_encode($value), 0, 300);
                }
            }

            return mb_substr((string) json_encode($body), 0, 300);
        }

        return mb_substr((string) $body, 0, 300);
    }

    /**
     * Keeps the token out of every message that can reach a log or a response.
     */
    protected function clean(string $message): string
    {
        if ($this->token !== '') {
            $message = str_replace($this->token, '***', $message);
        }

        return mb_substr($message, 0, 400);
    }

    /**
     * @param array<string, string> $headers
     * @param array<mixed>|null     $json
     *
     * @return array{status: int, body: mixed}
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

        return ['status' => $response->getStatusCode(), 'body' => $decoded ?? ($raw === '' ? null : $raw)];
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
