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

namespace App\Services\Subdomain;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use Cloudflare\API\Auth\APIKey;
use Cloudflare\API\Endpoints\DNS;
use Cloudflare\API\Adapter\Guzzle;
use Cloudflare\API\Endpoints\Zones;
use GuzzleHttp\Exception\GuzzleException;

class CloudflareSubdomainService
{
    private Zones $zones;
    private DNS $dns;
    private bool $available = false;
    private ?string $accountId = null;
    private ?Client $httpClient = null;

    public function __construct(?string $email, ?string $apiKey, ?string $accountId)
    {
        $email = $email !== null ? trim($email) : '';
        $apiKey = $apiKey !== null ? trim($apiKey) : '';
        $accountId = $accountId !== null ? trim($accountId) : '';

        if ($email === '' || $apiKey === '' || $accountId === '') {
            return;
        }

        $this->accountId = $accountId;

        $headers = [
            'Content-Type' => 'application/json',
            'X-Auth-Email' => $email,
            'X-Auth-Key' => $apiKey,
        ];

        $this->httpClient = new Client([
            'base_uri' => 'https://api.cloudflare.com/client/v4/',
            'headers' => $headers,
            'timeout' => 15,
        ]);

        $adapter = new Guzzle(new APIKey($email, $apiKey));
        $this->zones = new Zones($adapter);
        $this->dns = new DNS($adapter);
        $this->available = true;
    }

    public static function fromConfig(?string $accountId = null): self
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        return new self(
            $config->getSetting(ConfigInterface::SUBDOMAIN_CF_EMAIL, ''),
            $config->getSetting(ConfigInterface::SUBDOMAIN_CF_API_KEY, ''),
            $accountId
        );
    }

    public function isAvailable(): bool
    {
        return $this->available;
    }

    public function resolveZoneId(string $domain): ?string
    {
        if (!$this->available || $this->httpClient === null || $this->accountId === null) {
            return null;
        }

        try {
            $response = $this->httpClient->get('zones', [
                'query' => [
                    'name' => $domain,
                    'account.id' => $this->accountId,
                    'page' => 1,
                    'per_page' => 1,
                    'status' => 'active',
                ],
            ]);

            $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);

            if (($body['success'] ?? false) === true && !empty($body['result'][0]['id'])) {
                return (string) $body['result'][0]['id'];
            }

            App::getInstance(true)->getLogger()->warning(
                'Cloudflare zone resolve returned no results for domain ' . $domain . ' within account ' . $this->accountId
            );
        } catch (GuzzleException | \JsonException $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare zone resolve failed: ' . $exception->getMessage());
        }

        return null;
    }

    public function ensureRecordDoesNotExist(string $zoneId, string $type, string $name): bool
    {
        if (!$this->available) {
            return false;
        }

        try {
            $response = $this->dns->listRecords($zoneId, $type, $name);
            $records = $response->result ?? [];

            App::getInstance(true)
                ->getLogger()
                ->debug(sprintf(
                    'Cloudflare ensureRecordDoesNotExist: zone=%s type=%s name=%s matches=%d',
                    $zoneId,
                    $type,
                    $name,
                    \is_countable($records) ? \count($records) : 0
                ));

            return \is_countable($records) ? \count($records) === 0 : empty($records);
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare list records failed: ' . $exception->getMessage());

            return false;
        }
    }

    public function createCnameRecord(string $zoneId, string $fqdn, string $target, int $ttl = 120): ?string
    {
        if (!$this->available) {
            return null;
        }

        $payload = [
            'type' => 'CNAME',
            'name' => $fqdn,
            'content' => $target,
            'ttl' => $ttl,
            'proxied' => false,
        ];

        $recordId = $this->createRecord($zoneId, $payload);
        if ($recordId !== null) {
            return $recordId;
        }

        try {
            $records = $this->dns->listRecords($zoneId, 'CNAME', $fqdn)->result;
            if (!empty($records)) {
                return $records[0]->id;
            }
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare CNAME creation failed: ' . $exception->getMessage());
        }

        return null;
    }

    public function createAddressRecord(string $zoneId, string $fqdn, string $ip, string $type = 'A', int $ttl = 120): ?string
    {
        if (!$this->available) {
            return null;
        }

        $payload = [
            'type' => $type,
            'name' => $fqdn,
            'content' => $ip,
            'ttl' => $ttl,
            'proxied' => false,
        ];

        $recordId = $this->createRecord($zoneId, $payload);
        if ($recordId !== null) {
            return $recordId;
        }

        try {
            $records = $this->dns->listRecords($zoneId, $type, $fqdn)->result;
            if (!empty($records)) {
                return $records[0]->id;
            }
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error(sprintf('Cloudflare %s creation failed: %s', $type, $exception->getMessage()));
        }

        return null;
    }

    public function createSrvRecord(
        string $zoneId,
        string $service,
        string $protocol,
        string $subdomainLabel,
        string $domain,
        string $target,
        int $port,
        int $priority = 1,
        int $weight = 1,
        int $ttl = 120,
    ): ?string {
        if (!$this->available) {
            return null;
        }

        $payload = [
            'type' => 'SRV',
            'name' => $service . '._' . $protocol . '.' . $subdomainLabel . '.' . $domain,
            'ttl' => $ttl,
            'data' => [
                'service' => $service,
                'proto' => '_' . $protocol,
                'name' => $subdomainLabel . '.' . $domain,
                'priority' => $priority,
                'weight' => $weight,
                'port' => $port,
                'target' => $target,
            ],
        ];

        $recordId = $this->createRecord($zoneId, $payload);
        if ($recordId !== null) {
            return $recordId;
        }

        try {
            $records = $this->dns->listRecords($zoneId, 'SRV', $payload['name'])->result;
            if (!empty($records)) {
                return $records[0]->id;
            }
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare SRV creation failed: ' . $exception->getMessage());
        }

        return null;
    }

    public function deleteRecord(string $zoneId, string $recordId): bool
    {
        if (!$this->available) {
            return false;
        }

        try {
            return $this->dns->deleteRecord($zoneId, $recordId) === true;
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare record deletion failed: ' . $exception->getMessage());

            return false;
        }
    }

    public function deleteRecordByName(string $zoneId, string $type, string $name): bool
    {
        if (!$this->available) {
            return false;
        }

        try {
            $records = $this->dns->listRecords($zoneId, $type, $name)->result;
            if (!empty($records)) {
                return $this->dns->deleteRecord($zoneId, $records[0]->id) === true;
            }
        } catch (\Exception $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare record deletion by name failed: ' . $exception->getMessage());
        }

        return false;
    }

    private function createRecord(string $zoneId, array $payload): ?string
    {
        if ($this->httpClient === null) {
            return null;
        }

        try {
            $response = $this->httpClient->post(
                sprintf('zones/%s/dns_records', $zoneId),
                ['json' => $payload]
            );
            $body = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);

            if (($body['success'] ?? false) === true && isset($body['result']['id'])) {
                return (string) $body['result']['id'];
            }

            App::getInstance(true)->getLogger()->warning('Cloudflare record creation returned unexpected response: ' . json_encode($body));
        } catch (GuzzleException | \JsonException $exception) {
            App::getInstance(true)->getLogger()->error('Cloudflare record creation failed: ' . $exception->getMessage());
        }

        return null;
    }
}
