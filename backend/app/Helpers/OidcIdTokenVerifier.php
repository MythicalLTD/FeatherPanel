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

namespace App\Helpers;

use App\Cache\Cache;

/**
 * Verifies an OIDC `id_token` (FP-6).
 *
 * The signature is checked against the JWKS of the issuer (discovery document ->
 * `jwks_uri`, JWKS is cached) plus `exp`/`iat`/`nbf` with a small leeway. If the
 * already declared dependency `firebase/php-jwt` (= googleapis/php-jwt) is
 * installed it is used, otherwise verification is done with PHP built-ins
 * (`openssl_verify` for RS256/RS384/RS512 and ES256, `hash_hmac` plus
 * `hash_equals` for HS256/HS384/HS512).
 *
 * The verifier never throws for a broken/unreachable provider setup: the caller
 * gets a verdict and can keep the previous behaviour (with a loud log entry) when
 * a signature simply cannot be checked. A *failed* signature check on the other
 * hand is reported as invalid and must be rejected by the caller.
 */
final class OidcIdTokenVerifier
{
    /** Signature is valid (and time claims are fine). */
    public const VERDICT_VERIFIED = 'verified';

    /** Token could not be checked (no JWKS, unsupported algorithm, ...). */
    public const VERDICT_UNVERIFIABLE = 'unverifiable';

    /** Token was checked and is not acceptable (bad signature, expired, ...). */
    public const VERDICT_INVALID = 'invalid';

    /**
     * Algorithms this class is able to check.
     * ES384 is only checkable with the JWT library; without it the key material is
     * reported as unverifiable instead of silently accepting the token.
     */
    private const SUPPORTED_ALGS = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'HS256', 'HS384', 'HS512'];

    /** Tolerated clock skew for exp/iat/nbf in seconds. */
    private const LEEWAY_SECONDS = 60;

    private const JWKS_CACHE_MINUTES = 30;
    private const HTTP_CONNECT_TIMEOUT_SECONDS = 5;
    private const HTTP_TIMEOUT_SECONDS = 10;

    /** DER encoded OIDs used to build an EC/RSA public key from a JWK. */
    private const DER_OID_RSA_ENCRYPTION = "\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01";
    private const DER_OID_EC_PUBLIC_KEY = "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01";
    private const DER_OID_PRIME256V1 = "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";

    /**
     * Verify the given id_token.
     *
     * @param array $discovery the discovery document of the issuer (already fetched by the caller)
     *
     * @return array{verdict: string, claims: array|null, reason: string}
     */
    public static function verify(string $idToken, array $discovery, string $clientSecret): array
    {
        $segments = explode('.', $idToken);
        if (count($segments) !== 3) {
            return self::result(self::VERDICT_INVALID, null, 'malformed_id_token');
        }

        $header = self::decodeJsonSegment($segments[0]);
        $claims = self::decodeJsonSegment($segments[1]);
        if (!is_array($header) || !is_array($claims)) {
            return self::result(self::VERDICT_INVALID, null, 'undecodable_id_token');
        }

        $alg = isset($header['alg']) && is_string($header['alg']) ? $header['alg'] : '';
        if ($alg === '') {
            return self::result(self::VERDICT_INVALID, $claims, 'missing_alg');
        }
        if (!in_array($alg, self::SUPPORTED_ALGS, true)) {
            return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'unsupported_alg:' . $alg);
        }

        $timeReason = self::timeClaimReason($claims);
        if ($timeReason !== null) {
            return self::result(self::VERDICT_INVALID, $claims, $timeReason);
        }

        $advertisedAlgs = $discovery['id_token_signing_alg_values_supported'] ?? null;
        if (is_array($advertisedAlgs) && $advertisedAlgs !== [] && !in_array($alg, $advertisedAlgs, true)) {
            return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'alg_not_advertised:' . $alg);
        }

        $isHmac = str_starts_with($alg, 'HS');
        $jwks = null;
        if ($isHmac) {
            if ($clientSecret === '') {
                return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'missing_client_secret');
            }
        } else {
            $jwksUri = isset($discovery['jwks_uri']) && is_string($discovery['jwks_uri']) ? $discovery['jwks_uri'] : '';
            if ($jwksUri === '' || !preg_match('#^https?://#i', $jwksUri)) {
                return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'missing_jwks_uri');
            }
            $jwks = self::fetchJwks($jwksUri);
            if ($jwks === null) {
                return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'jwks_unreachable');
            }
        }

        try {
            if ($isHmac) {
                // HMAC (HS256/384/512) is always checked with hash_hmac/hash_equals:
                // that keeps the behaviour identical whether or not the JWT library
                // is installed and never depends on its key length policy.
                if (self::verifyHmacSignature($segments, $alg, $clientSecret) !== true) {
                    return self::result(self::VERDICT_INVALID, $claims, 'signature_invalid');
                }
            } elseif (self::jwtLibraryAvailable()) {
                \Firebase\JWT\JWT::$leeway = self::LEEWAY_SECONDS;
                $keySet = \Firebase\JWT\JWK::parseKeySet($jwks, $alg);
                \Firebase\JWT\JWT::decode($idToken, $keySet);
            } elseif (self::verifySignatureNative($header, $segments, $jwks ?? [], $alg) !== true) {
                return self::result(self::VERDICT_INVALID, $claims, 'signature_invalid');
            }
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            return self::result(self::VERDICT_INVALID, $claims, 'signature_invalid');
        } catch (\Firebase\JWT\ExpiredException $e) {
            return self::result(self::VERDICT_INVALID, $claims, 'id_token_expired');
        } catch (\Firebase\JWT\BeforeValidException $e) {
            return self::result(self::VERDICT_INVALID, $claims, 'id_token_not_yet_valid');
        } catch (\Throwable $e) {
            // Key material / JWKS / algorithm problems: cannot be checked.
            return self::result(self::VERDICT_UNVERIFIABLE, $claims, 'signature_unverifiable:' . $e->getMessage());
        }

        return self::result(self::VERDICT_VERIFIED, $claims, 'verified');
    }

    /**
     * Compare the nonce that was sent in the authorization request with the one in
     * the id_token (FP-16). Returns true when the login may continue.
     */
    public static function nonceMatches(?string $expectedNonce, ?string $tokenNonce): bool
    {
        if (!is_string($expectedNonce) || $expectedNonce === '') {
            return false;
        }
        if (!is_string($tokenNonce) || $tokenNonce === '') {
            return false;
        }

        return hash_equals($expectedNonce, $tokenNonce);
    }

    /**
     * Decode the payload (or header) of a JWT without verifying anything.
     */
    public static function decodeJsonSegment(string $segment): ?array
    {
        $decoded = self::base64UrlDecode($segment);
        if ($decoded === null) {
            return null;
        }
        $data = json_decode($decoded, true);

        return is_array($data) ? $data : null;
    }

    /**
     * Check exp/iat/nbf with the configured leeway. Returns a reason string when a
     * claim is not acceptable, null when the time claims are fine.
     */
    private static function timeClaimReason(array $claims): ?string
    {
        $now = time();

        if (array_key_exists('exp', $claims)) {
            if (!is_numeric($claims['exp'])) {
                return 'exp_not_numeric';
            }
            if (($now - self::LEEWAY_SECONDS) >= (float) $claims['exp']) {
                return 'id_token_expired';
            }
        }

        if (array_key_exists('nbf', $claims)) {
            if (!is_numeric($claims['nbf'])) {
                return 'nbf_not_numeric';
            }
            if ((float) $claims['nbf'] > ($now + self::LEEWAY_SECONDS)) {
                return 'id_token_not_yet_valid';
            }
        }

        if (array_key_exists('iat', $claims)) {
            if (!is_numeric($claims['iat'])) {
                return 'iat_not_numeric';
            }
            if ((float) $claims['iat'] > ($now + self::LEEWAY_SECONDS)) {
                return 'id_token_issued_in_future';
            }
        }

        return null;
    }

    private static function jwtLibraryAvailable(): bool
    {
        return class_exists(\Firebase\JWT\JWT::class) && class_exists(\Firebase\JWT\JWK::class) && class_exists(\Firebase\JWT\Key::class);
    }

    /**
     * Constant time HMAC signature check for HS256/HS384/HS512.
     */
    private static function verifyHmacSignature(array $segments, string $alg, string $clientSecret): bool
    {
        if ($clientSecret === '') {
            return false;
        }
        $signature = self::base64UrlDecode($segments[2]);
        if ($signature === null) {
            return false;
        }
        $expected = hash_hmac(self::hashAlgorithmFor($alg), $segments[0] . '.' . $segments[1], $clientSecret, true);

        return hash_equals($expected, $signature);
    }

    /**
     * Signature check with PHP built-ins (used when firebase/php-jwt is not available).
     * Returns false only for a real signature mismatch; throws for material /
     * algorithm problems so the caller can report "unverifiable".
     *
     * @param array $segments the three raw JWT segments
     * @param array $jwks     the key set of the issuer
     */
    private static function verifySignatureNative(array $header, array $segments, array $jwks, string $alg): bool
    {
        $signedData = $segments[0] . '.' . $segments[1];
        $signature = self::base64UrlDecode($segments[2]);
        if ($signature === null) {
            return false;
        }

        $kid = isset($header['kid']) && is_string($header['kid']) ? $header['kid'] : null;
        $jwk = self::selectJwk($jwks, $kid);
        if ($jwk === null) {
            throw new \RuntimeException('no matching JWK for kid');
        }

        $pem = self::publicKeyPemFromJwk($jwk, $alg);
        if ($pem === null) {
            throw new \RuntimeException('unsupported JWK for algorithm ' . $alg);
        }

        if ($alg === 'ES256') {
            $der = self::ecdsaRawSignatureToDer($signature);
            if ($der === null) {
                return false;
            }
            $signature = $der;
        }

        $key = openssl_pkey_get_public($pem);
        if ($key === false) {
            throw new \RuntimeException('unable to load public key: ' . (openssl_error_string() ?: 'unknown'));
        }

        $result = openssl_verify($signedData, $signature, $key, self::opensslAlgorithmFor($alg));
        if ($result === -1) {
            throw new \RuntimeException('openssl_verify failed: ' . (openssl_error_string() ?: 'unknown'));
        }

        return $result === 1;
    }

    /**
     * Pick the JWK that should have signed the token.
     */
    private static function selectJwk(array $jwks, ?string $kid): ?array
    {
        $keys = isset($jwks['keys']) && is_array($jwks['keys']) ? array_values($jwks['keys']) : [];
        if ($keys === []) {
            return null;
        }

        if ($kid !== null) {
            foreach ($keys as $key) {
                if (is_array($key) && isset($key['kid']) && hash_equals((string) $key['kid'], $kid)) {
                    return $key;
                }
            }
        }

        return count($keys) === 1 && is_array($keys[0]) ? $keys[0] : null;
    }

    /**
     * Build a PEM public key (SubjectPublicKeyInfo) from a JWK.
     */
    private static function publicKeyPemFromJwk(array $jwk, string $alg): ?string
    {
        $kty = isset($jwk['kty']) && is_string($jwk['kty']) ? $jwk['kty'] : '';

        if ($kty === 'RSA') {
            $modulus = isset($jwk['n']) && is_string($jwk['n']) ? self::base64UrlDecode($jwk['n']) : null;
            $exponent = isset($jwk['e']) && is_string($jwk['e']) ? self::base64UrlDecode($jwk['e']) : null;
            if ($modulus === null || $modulus === '' || $exponent === null || $exponent === '') {
                return null;
            }

            // SubjectPublicKeyInfo { AlgorithmIdentifier(rsaEncryption), BIT STRING(PKCS#1 key) }
            $algorithm = self::derSequence(self::DER_OID_RSA_ENCRYPTION . "\x05\x00");
            $rsaPublicKey = self::derSequence(self::derInteger($modulus) . self::derInteger($exponent));
            $bitString = "\x03" . self::derLength(strlen($rsaPublicKey) + 1) . "\x00" . $rsaPublicKey;

            return self::pemFromDer(self::derSequence($algorithm . $bitString));
        }

        if ($kty === 'EC' && $alg === 'ES256') {
            $curve = isset($jwk['crv']) && is_string($jwk['crv']) ? $jwk['crv'] : '';
            if ($curve !== 'P-256') {
                return null;
            }
            $x = isset($jwk['x']) && is_string($jwk['x']) ? self::base64UrlDecode($jwk['x']) : null;
            $y = isset($jwk['y']) && is_string($jwk['y']) ? self::base64UrlDecode($jwk['y']) : null;
            if ($x === null || $y === null || strlen($x) !== 32 || strlen($y) !== 32) {
                return null;
            }

            $algorithm = self::derSequence(self::DER_OID_EC_PUBLIC_KEY . self::DER_OID_PRIME256V1);
            $point = "\x04" . $x . $y;
            $bitString = "\x03" . self::derLength(strlen($point) + 1) . "\x00" . $point;

            return self::pemFromDer(self::derSequence($algorithm . $bitString));
        }

        return null;
    }

    private static function pemFromDer(string $der): string
    {
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    /**
     * Convert a JOSE ECDSA signature (r||s) into the ASN.1 DER sequence OpenSSL expects.
     */
    private static function ecdsaRawSignatureToDer(string $signature): ?string
    {
        if (strlen($signature) !== 64) {
            return null;
        }
        $r = ltrim(substr($signature, 0, 32), "\x00");
        $s = ltrim(substr($signature, 32, 32), "\x00");

        return self::derSequence(self::derInteger($r) . self::derInteger($s));
    }

    private static function derInteger(string $bytes): string
    {
        if ($bytes === '') {
            $bytes = "\x00";
        }
        if ((ord($bytes[0]) & 0x80) !== 0) {
            $bytes = "\x00" . $bytes;
        }

        return "\x02" . self::derLength(strlen($bytes)) . $bytes;
    }

    private static function derSequence(string $value): string
    {
        return "\x30" . self::derLength(strlen($value)) . $value;
    }

    private static function derLength(int $length): string
    {
        if ($length < 0x80) {
            return chr($length);
        }
        $bytes = '';
        while ($length > 0) {
            $bytes = chr($length & 0xFF) . $bytes;
            $length >>= 8;
        }

        return chr(0x80 | strlen($bytes)) . $bytes;
    }

    private static function hashAlgorithmFor(string $alg): string
    {
        return match ($alg) {
            'HS384', 'RS384' => 'sha384',
            'HS512', 'RS512' => 'sha512',
            default => 'sha256',
        };
    }

    private static function opensslAlgorithmFor(string $alg): int
    {
        return match ($alg) {
            'RS384' => OPENSSL_ALGO_SHA384,
            'RS512' => OPENSSL_ALGO_SHA512,
            default => OPENSSL_ALGO_SHA256,
        };
    }

    /**
     * Fetch (and cache) the JWK set of the issuer.
     */
    private static function fetchJwks(string $jwksUri): ?array
    {
        $cacheKey = 'oidc_jwks:' . hash('sha256', $jwksUri);

        try {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && isset($cached['keys']) && is_array($cached['keys']) && $cached['keys'] !== []) {
                return $cached;
            }
        } catch (\Throwable $e) {
            // Cache is best effort only.
        }

        $data = self::httpGetJson($jwksUri);
        if ($data === null || !isset($data['keys']) || !is_array($data['keys']) || $data['keys'] === []) {
            return null;
        }

        try {
            Cache::put($cacheKey, $data, self::JWKS_CACHE_MINUTES);
        } catch (\Throwable $e) {
            // Cache is best effort only.
        }

        return $data;
    }

    private static function httpGetJson(string $url): ?array
    {
        try {
            $ch = curl_init($url);
            if ($ch === false) {
                return null;
            }
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, self::HTTP_CONNECT_TIMEOUT_SECONDS);
            curl_setopt($ch, CURLOPT_TIMEOUT, self::HTTP_TIMEOUT_SECONDS);
            curl_setopt($ch, CURLOPT_FAILONERROR, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_errno($ch);
            $ch = null;
        } catch (\Throwable $e) {
            return null;
        }

        if ($curlErr !== 0 || $response === false || $httpCode < 200 || $httpCode >= 300) {
            return null;
        }

        $data = json_decode((string) $response, true);

        return is_array($data) ? $data : null;
    }

    private static function base64UrlDecode(string $value): ?string
    {
        if ($value === '') {
            return null;
        }
        $normalized = strtr($value, '-_', '+/');
        $decoded = base64_decode($normalized, true);
        if ($decoded === false) {
            // Tolerate missing padding like the previous decoder did.
            $decoded = base64_decode(str_pad($normalized, (int) (ceil(strlen($normalized) / 4) * 4), '='), true);
        }

        return $decoded === false ? null : $decoded;
    }

    /**
     * @return array{verdict: string, claims: array|null, reason: string}
     */
    private static function result(string $verdict, ?array $claims, string $reason): array
    {
        return ['verdict' => $verdict, 'claims' => $claims, 'reason' => $reason];
    }
}
