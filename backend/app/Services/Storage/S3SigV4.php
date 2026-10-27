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

namespace App\Services\Storage;

/**
 * Minimal AWS Signature Version 4 implementation for S3 (header signing and
 * query-string presigning). Works with AWS, MinIO, R2, Backblaze B2, Wasabi.
 */
final class S3SigV4
{
    public const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

    public function __construct(
        private readonly string $accessKey,
        private readonly string $secretKey,
        private readonly string $region,
    ) {
    }

    /**
     * Build a presigned URL (X-Amz-* query auth, host-only signed headers).
     *
     * @param array<string, string> $query extra query params (partNumber, uploadId, ...)
     */
    public function presign(string $method, string $url, array $query, int $expiresSeconds, ?int $now = null): string
    {
        $expiresSeconds = max(1, min(604800, $expiresSeconds));
        $now ??= time();
        $amzDate = gmdate('Ymd\THis\Z', $now);
        $dateStamp = gmdate('Ymd', $now);
        $scope = $dateStamp . '/' . $this->region . '/s3/aws4_request';
        $parts = parse_url($url);
        $host = self::hostHeader($parts);

        $query['X-Amz-Algorithm'] = 'AWS4-HMAC-SHA256';
        $query['X-Amz-Credential'] = $this->accessKey . '/' . $scope;
        $query['X-Amz-Date'] = $amzDate;
        $query['X-Amz-Expires'] = (string) $expiresSeconds;
        $query['X-Amz-SignedHeaders'] = 'host';

        $canonicalQuery = self::canonicalQuery($query);
        $canonicalRequest = implode("\n", [
            strtoupper($method),
            $parts['path'] ?? '/',
            $canonicalQuery,
            'host:' . $host . "\n",
            'host',
            self::UNSIGNED_PAYLOAD,
        ]);
        $signature = $this->signature($canonicalRequest, $amzDate, $dateStamp, $scope);

        $base = ($parts['scheme'] ?? 'https') . '://' . $host . ($parts['path'] ?? '/');

        return $base . '?' . $canonicalQuery . '&X-Amz-Signature=' . $signature;
    }

    /**
     * Sign a request with an Authorization header.
     *
     * @param array<string, string> $query
     * @param array<string, string> $headers
     *
     * @return array<string, string> headers to send
     */
    public function signHeaders(string $method, string $url, array $query, array $headers, string $payload, ?int $now = null): array
    {
        $now ??= time();
        $amzDate = gmdate('Ymd\THis\Z', $now);
        $dateStamp = gmdate('Ymd', $now);
        $scope = $dateStamp . '/' . $this->region . '/s3/aws4_request';
        $parts = parse_url($url);
        $payloadHash = hash('sha256', $payload);

        $headers['host'] = self::hostHeader($parts);
        $headers['x-amz-date'] = $amzDate;
        $headers['x-amz-content-sha256'] = $payloadHash;
        $normalized = [];
        foreach ($headers as $k => $v) {
            $normalized[strtolower((string) $k)] = trim(preg_replace('/\s+/', ' ', (string) $v) ?? '');
        }
        ksort($normalized);
        $canonicalHeaders = '';
        foreach ($normalized as $k => $v) {
            $canonicalHeaders .= $k . ':' . $v . "\n";
        }
        $signedHeaders = implode(';', array_keys($normalized));
        $canonicalRequest = implode("\n", [
            strtoupper($method),
            $parts['path'] ?? '/',
            self::canonicalQuery($query),
            $canonicalHeaders,
            $signedHeaders,
            $payloadHash,
        ]);
        $signature = $this->signature($canonicalRequest, $amzDate, $dateStamp, $scope);
        $normalized['authorization'] = 'AWS4-HMAC-SHA256 Credential=' . $this->accessKey . '/' . $scope
            . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $signature;
        unset($normalized['host']);

        return $normalized;
    }

    /**
     * @param array<string, string> $query
     */
    public static function canonicalQuery(array $query): string
    {
        $encoded = [];
        foreach ($query as $k => $v) {
            $encoded[rawurlencode((string) $k)] = rawurlencode((string) $v);
        }
        ksort($encoded, SORT_STRING);
        $out = [];
        foreach ($encoded as $k => $v) {
            $out[] = $k . '=' . $v;
        }

        return implode('&', $out);
    }

    /**
     * @param array<string, mixed> $parts
     */
    private static function hostHeader(array $parts): string
    {
        $host = (string) ($parts['host'] ?? '');
        $scheme = (string) ($parts['scheme'] ?? 'https');
        if (isset($parts['port'])) {
            $port = (int) $parts['port'];
            if (!($scheme === 'https' && $port === 443) && !($scheme === 'http' && $port === 80)) {
                $host .= ':' . $port;
            }
        }

        return $host;
    }

    private function signature(string $canonicalRequest, string $amzDate, string $dateStamp, string $scope): string
    {
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $amzDate,
            $scope,
            hash('sha256', $canonicalRequest),
        ]);
        $kDate = hash_hmac('sha256', $dateStamp, 'AWS4' . $this->secretKey, true);
        $kRegion = hash_hmac('sha256', $this->region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);

        return hash_hmac('sha256', $stringToSign, $kSigning);
    }
}
