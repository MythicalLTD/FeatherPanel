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

namespace App\Services\NodeBackup;

use GuzzleHttp\Client;

/**
 * Minimal S3-compatible client (PutObject / ListObjectsV2 / DeleteObject) with SigV4.
 *
 * Credentials: endpoint?, region, bucket, prefix?, access_key, secret_key, path_style?
 */
class S3DestinationClient implements DestinationClientInterface
{
    private string $endpoint;
    private string $region;
    private string $bucket;
    private string $prefix;
    private string $accessKey;
    private string $secretKey;
    private bool $pathStyle;
    private Client $http;

    /**
     * @param array<string, mixed> $credentials
     */
    public function __construct(array $credentials)
    {
        $this->region = trim((string) ($credentials['region'] ?? 'us-east-1'));
        $this->bucket = trim((string) ($credentials['bucket'] ?? ''));
        $this->prefix = trim((string) ($credentials['prefix'] ?? ''), '/');
        $this->accessKey = (string) ($credentials['access_key'] ?? '');
        $this->secretKey = (string) ($credentials['secret_key'] ?? '');
        $this->pathStyle = (bool) ($credentials['path_style'] ?? true);
        $endpoint = trim((string) ($credentials['endpoint'] ?? ''));
        if ($endpoint === '') {
            $endpoint = 'https://s3.' . $this->region . '.amazonaws.com';
        }
        $this->endpoint = rtrim($endpoint, '/');

        if ($this->bucket === '' || $this->accessKey === '' || $this->secretKey === '') {
            throw new \InvalidArgumentException('S3 destination requires bucket, access_key, and secret_key');
        }

        $this->http = new Client([
            'http_errors' => false,
            'timeout' => 600,
            'verify' => true,
        ]);
    }

    public function upload(string $localPath, string $remotePath): void
    {
        $key = $this->objectKey($remotePath);
        $body = fopen($localPath, 'r');
        if ($body === false) {
            throw new \RuntimeException('Unable to open local file for S3 upload');
        }
        try {
            $headers = [
                'Content-Type' => 'application/gzip',
                'x-amz-content-sha256' => 'UNSIGNED-PAYLOAD',
            ];
            $url = $this->objectUrl($key);
            $signed = $this->sign('PUT', $url, $headers, 'UNSIGNED-PAYLOAD');
            $response = $this->http->request('PUT', $url, [
                'headers' => $signed,
                'body' => $body,
            ]);
            $code = $response->getStatusCode();
            if ($code < 200 || $code >= 300) {
                throw new \RuntimeException('S3 upload failed (' . $code . '): ' . (string) $response->getBody());
            }
        } finally {
            if (is_resource($body)) {
                fclose($body);
            }
        }
    }

    public function test(): void
    {
        $key = $this->objectKey('.featherpanel_node_backup_probe');
        $tmp = tempnam(sys_get_temp_dir(), 'fpnb');
        if ($tmp === false) {
            throw new \RuntimeException('Unable to create temp probe file');
        }
        file_put_contents($tmp, 'ok');
        try {
            $this->upload($tmp, '.featherpanel_node_backup_probe');
            $this->delete('.featherpanel_node_backup_probe');
        } finally {
            @unlink($tmp);
        }
        unset($key);
    }

    public function listObjects(string $prefix = ''): array
    {
        $fullPrefix = $this->objectKey($prefix);
        $query = [
            'list-type' => '2',
            'prefix' => $fullPrefix,
        ];
        $url = $this->bucketUrl() . '?' . http_build_query($query);
        $headers = ['x-amz-content-sha256' => hash('sha256', '')];
        $signed = $this->sign('GET', $url, $headers, hash('sha256', ''));
        $response = $this->http->request('GET', $url, ['headers' => $signed]);
        if ($response->getStatusCode() >= 400) {
            throw new \RuntimeException('S3 list failed: ' . (string) $response->getBody());
        }
        $xml = @simplexml_load_string((string) $response->getBody());
        if ($xml === false) {
            return [];
        }
        $items = [];
        foreach ($xml->Contents ?? [] as $content) {
            $key = (string) $content->Key;
            $rel = $this->prefix !== '' && str_starts_with($key, $this->prefix . '/')
                ? substr($key, strlen($this->prefix) + 1)
                : $key;
            $items[] = [
                'path' => $rel,
                'mtime' => strtotime((string) $content->LastModified) ?: 0,
                'size' => (int) $content->Size,
            ];
        }

        return $items;
    }

    public function delete(string $remotePath): void
    {
        $key = $this->objectKey($remotePath);
        $url = $this->objectUrl($key);
        $headers = ['x-amz-content-sha256' => hash('sha256', '')];
        $signed = $this->sign('DELETE', $url, $headers, hash('sha256', ''));
        $response = $this->http->request('DELETE', $url, ['headers' => $signed]);
        $code = $response->getStatusCode();
        if ($code >= 300 && $code !== 404) {
            throw new \RuntimeException('S3 delete failed (' . $code . '): ' . (string) $response->getBody());
        }
    }

    private function objectKey(string $remotePath): string
    {
        $remotePath = ltrim(str_replace('\\', '/', $remotePath), '/');
        if ($this->prefix === '') {
            return $remotePath;
        }

        return $this->prefix . '/' . $remotePath;
    }

    private function bucketUrl(): string
    {
        if ($this->pathStyle) {
            return $this->endpoint . '/' . rawurlencode($this->bucket);
        }
        $host = parse_url($this->endpoint, PHP_URL_HOST) ?: '';
        $scheme = parse_url($this->endpoint, PHP_URL_SCHEME) ?: 'https';

        return $scheme . '://' . $this->bucket . '.' . $host;
    }

    private function objectUrl(string $key): string
    {
        $encoded = implode('/', array_map('rawurlencode', explode('/', $key)));

        return $this->bucketUrl() . '/' . $encoded;
    }

    /**
     * @param array<string, string> $headers
     *
     * @return array<string, string>
     */
    private function sign(string $method, string $url, array $headers, string $payloadHash): array
    {
        $parts = parse_url($url);
        $host = $parts['host'] ?? '';
        if (isset($parts['port'])) {
            $host .= ':' . $parts['port'];
        }
        $headers['Host'] = $host;
        $amzDate = gmdate('Ymd\THis\Z');
        $dateStamp = gmdate('Ymd');
        $headers['x-amz-date'] = $amzDate;
        $headers['x-amz-content-sha256'] = $payloadHash;

        $canonicalHeaders = '';
        $signedHeadersList = [];
        $normalized = [];
        foreach ($headers as $k => $v) {
            $lk = strtolower($k);
            $normalized[$lk] = trim($v);
        }
        ksort($normalized);
        foreach ($normalized as $k => $v) {
            $canonicalHeaders .= $k . ':' . $v . "\n";
            $signedHeadersList[] = $k;
        }
        $signedHeaders = implode(';', $signedHeadersList);
        $canonicalQuery = '';
        if (!empty($parts['query'])) {
            parse_str($parts['query'], $q);
            ksort($q);
            $canonicalQuery = http_build_query($q);
        }
        $canonicalUri = $parts['path'] ?? '/';
        $canonicalRequest = implode("\n", [
            $method,
            $canonicalUri,
            $canonicalQuery,
            $canonicalHeaders,
            $signedHeaders,
            $payloadHash,
        ]);
        $credentialScope = $dateStamp . '/' . $this->region . '/s3/aws4_request';
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $amzDate,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);
        $kDate = hash_hmac('sha256', $dateStamp, 'AWS4' . $this->secretKey, true);
        $kRegion = hash_hmac('sha256', $this->region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);
        $headers['Authorization'] = 'AWS4-HMAC-SHA256 Credential=' . $this->accessKey . '/' . $credentialScope
            . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $signature;

        return $headers;
    }
}
