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

use GuzzleHttp\Client;

/**
 * S3-compatible object store used for backups. The panel holds the keys and
 * hands Wings presigned URLs only; Wings never sees the credentials.
 */
final class S3ObjectStore
{
    /** S3 minimum part size (except the last part). */
    public const MIN_PART_SIZE = 5 * 1024 * 1024;

    /** S3 maximum number of parts in one multipart upload. */
    public const MAX_PARTS = 10000;

    private string $endpoint;
    private string $region;
    private string $bucket;
    private string $prefix;
    private bool $pathStyle;
    private S3SigV4 $signer;
    private Client $http;

    /**
     * @param array<string, mixed> $config endpoint, region, bucket, prefix, access_key, secret_key, path_style
     * @param array<string, mixed> $httpOptions extra Guzzle options (e.g. curl pinning from EndpointGuard)
     */
    public function __construct(array $config, array $httpOptions = [], ?Client $http = null)
    {
        $this->region = trim((string) ($config['region'] ?? '')) ?: 'us-east-1';
        $this->bucket = trim((string) ($config['bucket'] ?? ''));
        $this->prefix = trim((string) ($config['prefix'] ?? ''), '/');
        $accessKey = trim((string) ($config['access_key'] ?? ''));
        $secretKey = (string) ($config['secret_key'] ?? '');
        $pathStyle = $config['path_style'] ?? true;
        $this->pathStyle = is_bool($pathStyle) ? $pathStyle : in_array(strtolower((string) $pathStyle), ['1', 'true', 'yes', 'on'], true);
        $endpoint = trim((string) ($config['endpoint'] ?? ''));
        if ($endpoint === '') {
            $endpoint = 'https://s3.' . $this->region . '.amazonaws.com';
        }
        $this->endpoint = rtrim($endpoint, '/');
        if ($this->bucket === '' || $accessKey === '' || $secretKey === '') {
            throw new \InvalidArgumentException('S3 storage requires bucket, access key and secret key');
        }
        $scheme = strtolower((string) parse_url($this->endpoint, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true) || !parse_url($this->endpoint, PHP_URL_HOST)) {
            throw new \InvalidArgumentException('S3 endpoint must be an http(s) URL');
        }
        $this->signer = new S3SigV4($accessKey, $secretKey, $this->region);
        $this->http = $http ?? new Client(array_merge([
            'http_errors' => false,
            'timeout' => 60,
            'connect_timeout' => 10,
            'allow_redirects' => false,
        ], $httpOptions));
    }

    public function endpoint(): string
    {
        return $this->endpoint;
    }

    public function keyFor(string $relative): string
    {
        $relative = ltrim(str_replace('\\', '/', $relative), '/');

        return $this->prefix === '' ? $relative : $this->prefix . '/' . $relative;
    }

    public function objectUrl(string $key): string
    {
        $encoded = implode('/', array_map('rawurlencode', explode('/', $key)));
        if ($this->pathStyle) {
            return $this->endpoint . '/' . rawurlencode($this->bucket) . '/' . $encoded;
        }
        $scheme = parse_url($this->endpoint, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($this->endpoint, PHP_URL_HOST) ?: '';
        $port = parse_url($this->endpoint, PHP_URL_PORT);

        return $scheme . '://' . $this->bucket . '.' . $host . ($port ? ':' . $port : '') . '/' . $encoded;
    }

    /**
     * Pick a part size that respects S3 limits (>= 5 MiB, <= 10000 parts).
     */
    public static function choosePartSize(int $totalSize, int $preferred): int
    {
        $part = max(self::MIN_PART_SIZE, $preferred);
        if ($totalSize > 0 && (int) ceil($totalSize / $part) > self::MAX_PARTS) {
            $part = (int) ceil($totalSize / self::MAX_PARTS);
            // round up to 1 MiB
            $part = (int) (ceil($part / 1048576) * 1048576);
        }

        return $part;
    }

    public function createMultipartUpload(string $key, string $contentType = 'application/x-gzip'): string
    {
        $res = $this->send('POST', $key, ['uploads' => ''], ['content-type' => $contentType], '');
        $this->assertOk($res, 'CreateMultipartUpload');
        $xml = @simplexml_load_string((string) $res->getBody());
        $uploadId = $xml !== false && isset($xml->UploadId) ? (string) $xml->UploadId : '';
        if ($uploadId === '') {
            throw new \RuntimeException('S3 CreateMultipartUpload returned no UploadId');
        }

        return $uploadId;
    }

    public function presignUploadPart(string $key, string $uploadId, int $partNumber, int $ttl): string
    {
        return $this->signer->presign('PUT', $this->objectUrl($key), [
            'partNumber' => (string) $partNumber,
            'uploadId' => $uploadId,
        ], $ttl);
    }

    /**
     * @param list<array{etag: string, part_number: int}> $parts
     */
    public function completeMultipartUpload(string $key, string $uploadId, array $parts): void
    {
        usort($parts, static fn (array $a, array $b): int => $a['part_number'] <=> $b['part_number']);
        $xml = '<CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">';
        foreach ($parts as $p) {
            $etag = '"' . trim((string) $p['etag'], '"') . '"';
            $xml .= '<Part><PartNumber>' . (int) $p['part_number'] . '</PartNumber><ETag>'
                . htmlspecialchars($etag, ENT_XML1) . '</ETag></Part>';
        }
        $xml .= '</CompleteMultipartUpload>';
        $res = $this->send('POST', $key, ['uploadId' => $uploadId], ['content-type' => 'application/xml'], $xml);
        $this->assertOk($res, 'CompleteMultipartUpload');
        // S3 can return 200 with an <Error> body.
        if (str_contains((string) $res->getBody(), '<Error>')) {
            throw new \RuntimeException('S3 CompleteMultipartUpload failed: ' . self::errorMessage((string) $res->getBody()));
        }
    }

    public function abortMultipartUpload(string $key, string $uploadId): void
    {
        $res = $this->send('DELETE', $key, ['uploadId' => $uploadId], [], '');
        if ($res->getStatusCode() !== 404) {
            $this->assertOk($res, 'AbortMultipartUpload');
        }
    }

    public function presignGet(string $key, int $ttl, ?string $downloadName = null): string
    {
        $query = [];
        if ($downloadName !== null && $downloadName !== '') {
            $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $downloadName) ?? 'backup.tar.gz';
            $query['response-content-disposition'] = 'attachment; filename="' . $safe . '"';
        }

        return $this->signer->presign('GET', $this->objectUrl($key), $query, $ttl);
    }

    public function deleteObject(string $key): void
    {
        $res = $this->send('DELETE', $key, [], [], '');
        if ($res->getStatusCode() !== 404) {
            $this->assertOk($res, 'DeleteObject');
        }
    }

    /**
     * Returns the object size in bytes or null when missing.
     */
    public function headObject(string $key): ?int
    {
        $res = $this->send('HEAD', $key, [], [], '');
        if ($res->getStatusCode() === 404) {
            return null;
        }
        $this->assertOk($res, 'HeadObject');

        return (int) $res->getHeaderLine('Content-Length');
    }

    /**
     * Round-trip check: write, read and delete a tiny probe object.
     */
    public function test(): void
    {
        $key = $this->keyFor('.featherpanel-probe-' . bin2hex(random_bytes(6)));
        $res = $this->send('PUT', $key, [], ['content-type' => 'text/plain'], 'ok');
        $this->assertOk($res, 'PutObject');
        $this->deleteObject($key);
    }

    /**
     * @param array<string, string> $query
     * @param array<string, string> $headers
     */
    private function send(string $method, string $key, array $query, array $headers, string $body): \Psr\Http\Message\ResponseInterface
    {
        $url = $this->objectUrl($key);
        $signed = $this->signer->signHeaders($method, $url, $query, $headers, $body);
        $qs = S3SigV4::canonicalQuery($query);
        // "uploads=" must be sent as bare "uploads" for some providers; both are accepted by AWS/MinIO.
        $full = $url . ($qs !== '' ? '?' . $qs : '');

        return $this->http->request($method, $full, [
            'headers' => $signed,
            'body' => $body,
        ]);
    }

    private function assertOk(\Psr\Http\Message\ResponseInterface $res, string $op): void
    {
        $code = $res->getStatusCode();
        if ($code < 200 || $code >= 300) {
            throw new \RuntimeException('S3 ' . $op . ' failed (HTTP ' . $code . '): ' . self::errorMessage((string) $res->getBody()));
        }
    }

    private static function errorMessage(string $body): string
    {
        $xml = @simplexml_load_string($body);
        if ($xml !== false && isset($xml->Code)) {
            return trim((string) $xml->Code . ': ' . (string) ($xml->Message ?? ''));
        }

        return mb_substr(trim(strip_tags($body)), 0, 200);
    }
}
