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

use App\App;
use Cose\Algorithm\Manager;
use Webauthn\CredentialRecord;
use App\Config\ConfigInterface;
use Symfony\Component\Uid\Uuid;
use Webauthn\TrustPath\EmptyTrustPath;
use Cose\Algorithm\Signature\RSA\RS256;
use Cose\Algorithm\Signature\ECDSA\ES256;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\Denormalizer\WebauthnSerializerFactory;
use Symfony\Component\Serializer\SerializerInterface;
use Webauthn\CeremonyStep\CeremonyStepManagerFactory;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\AttestationStatement\PackedAttestationStatementSupport;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;

/**
 * WebAuthn / passkey configuration derived from APP_URL and serializer factories.
 */
final class WebAuthnHelper
{
    private static ?SerializerInterface $serializer = null;

    private static ?CeremonyStepManagerFactory $assertionFactory = null;

    private static ?CeremonyStepManagerFactory $creationFactory = null;

    public static function getSerializer(): SerializerInterface
    {
        if (self::$serializer instanceof SerializerInterface) {
            return self::$serializer;
        }
        $algorithmManager = Manager::create()->add(ES256::create(), RS256::create());
        $attestationManager = new AttestationStatementSupportManager([
            new NoneAttestationStatementSupport(),
            new PackedAttestationStatementSupport($algorithmManager),
        ]);
        self::$serializer = (new WebauthnSerializerFactory($attestationManager))->create();

        return self::$serializer;
    }

    public static function getRpId(): string
    {
        $appUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'http://localhost');
        $host = parse_url($appUrl, PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            return 'localhost';
        }

        return $host;
    }

    /**
     * @return string[]
     */
    public static function getAllowedOrigins(): array
    {
        $appUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'http://localhost');
        if (!is_string($appUrl) || $appUrl === '') {
            return ['http://localhost'];
        }

        return [$appUrl];
    }

    public static function getRpEntity(): PublicKeyCredentialRpEntity
    {
        // PublicKeyCredentialRpEntity::create(string $name, ?string $id) — first is display name, second is RP id (hostname).
        $displayName = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $displayName = is_string($displayName) && $displayName !== '' ? $displayName : 'FeatherPanel';

        return PublicKeyCredentialRpEntity::create($displayName, self::getRpId());
    }

    public static function uuidToUserHandle(string $uuid): string
    {
        $hex = str_replace('-', '', strtolower($uuid));
        $bin = @hex2bin($hex);

        return is_string($bin) && strlen($bin) === 16 ? $bin : '';
    }

    public static function userHandleToUuid(string $binary): ?string
    {
        if (strlen($binary) !== 16) {
            return null;
        }
        $hex = bin2hex($binary);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }

    public static function getAssertionCeremonyFactory(): CeremonyStepManagerFactory
    {
        if (self::$assertionFactory instanceof CeremonyStepManagerFactory) {
            return self::$assertionFactory;
        }
        $factory = new CeremonyStepManagerFactory();
        $factory->setAllowedOrigins(self::getAllowedOrigins(), false);
        self::$assertionFactory = $factory;

        return self::$assertionFactory;
    }

    public static function getCreationCeremonyFactory(): CeremonyStepManagerFactory
    {
        if (self::$creationFactory instanceof CeremonyStepManagerFactory) {
            return self::$creationFactory;
        }
        $factory = new CeremonyStepManagerFactory();
        $factory->setAllowedOrigins(self::getAllowedOrigins(), false);
        self::$creationFactory = $factory;

        return self::$creationFactory;
    }

    /**
     * @param array<string, mixed> $row from featherpanel_user_passkeys
     */
    public static function credentialRecordFromRow(array $row): CredentialRecord
    {
        $transports = [];
        if (isset($row['transports']) && is_string($row['transports']) && $row['transports'] !== '') {
            $decoded = json_decode($row['transports'], true);
            $transports = is_array($decoded) ? $decoded : [];
        }
        $aaguidStr = isset($row['aaguid']) && is_string($row['aaguid']) && $row['aaguid'] !== ''
            ? $row['aaguid']
            : '00000000-0000-0000-0000-000000000000';
        try {
            $aaguid = Uuid::fromString($aaguidStr);
        } catch (\Throwable) {
            $aaguid = Uuid::fromString('00000000-0000-0000-0000-000000000000');
        }

        return CredentialRecord::create(
            (string) $row['credential_id'],
            'public-key',
            $transports,
            (string) ($row['attestation_type'] ?? 'none'),
            EmptyTrustPath::create(),
            $aaguid,
            (string) $row['public_key'],
            self::uuidToUserHandle((string) $row['user_uuid']),
            (int) $row['sign_count'],
            null,
            isset($row['backup_eligible']) && $row['backup_eligible'] !== null ? (bool) (int) $row['backup_eligible'] : null,
            isset($row['backup_status']) && $row['backup_status'] !== null ? (bool) (int) $row['backup_status'] : null,
            isset($row['uv_initialized']) && $row['uv_initialized'] !== null ? (bool) (int) $row['uv_initialized'] : null,
        );
    }
}
