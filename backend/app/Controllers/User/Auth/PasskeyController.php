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

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Cache\Cache;
use App\Permissions;
use Cose\Algorithms;
use App\Chat\UserPasskey;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Helpers\WebAuthnHelper;
use App\Helpers\PermissionHelper;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialUserEntity;
use Webauthn\AuthenticatorSelectionCriteria;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\Exception\AuthenticatorResponseVerificationException;

class PasskeyController
{
    private const CHALLENGE_CACHE_MINUTES = 5;

    public function postStatus(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        $id = is_array($data) ? ($data['username_or_email'] ?? null) : null;
        if (!is_string($id) || trim($id) === '') {
            return ApiResponse::error('Missing username_or_email', 'MISSING_REQUIRED_FIELDS', 400);
        }
        $user = $this->resolveUserFromUsernameOrEmail($id);
        if ($user === null) {
            return ApiResponse::success(['has_passkeys' => false], 'OK', 200);
        }

        return ApiResponse::success([
            'has_passkeys' => UserPasskey::countByUserUuid($user['uuid']) > 0,
        ], 'OK', 200);
    }

    public function postAuthenticationOptions(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }
        $usernameOrEmail = isset($data['username_or_email']) && is_string($data['username_or_email'])
            ? trim($data['username_or_email'])
            : '';
        $mediation = isset($data['mediation']) && is_string($data['mediation']) ? $data['mediation'] : '';

        $serializer = WebAuthnHelper::getSerializer();
        $challenge = random_bytes(32);
        $rpId = WebAuthnHelper::getRpId();

        $allowCredentials = [];
        $user = null;
        if ($usernameOrEmail !== '') {
            $user = $this->resolveUserFromUsernameOrEmail($usernameOrEmail);
            if ($user === null) {
                return ApiResponse::success([
                    'has_passkeys' => false,
                    'options' => null,
                    'challenge_token' => null,
                ], 'OK', 200);
            }
            $policy = $this->passkeyLoginPolicyBlock($user);
            if ($policy instanceof Response) {
                return $policy;
            }
            if (UserPasskey::countByUserUuid($user['uuid']) === 0) {
                return ApiResponse::success([
                    'has_passkeys' => false,
                    'options' => null,
                    'challenge_token' => null,
                ], 'OK', 200);
            }
            $rows = UserPasskey::listByUserUuid($user['uuid']);
            foreach ($rows as $row) {
                $cid = $row['credential_id'] ?? '';
                if (is_string($cid) && $cid !== '') {
                    $transports = [];
                    if (isset($row['transports']) && is_string($row['transports']) && $row['transports'] !== '') {
                        $t = json_decode($row['transports'], true);
                        $transports = is_array($t) ? $t : [];
                    }
                    $allowCredentials[] = PublicKeyCredentialDescriptor::create(
                        PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                        $cid,
                        $transports
                    );
                }
            }
        }

        $uv = PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_REQUIRED;
        $options = PublicKeyCredentialRequestOptions::create(
            $challenge,
            $rpId,
            $allowCredentials,
            $uv,
            120000,
            null,
            [],
        );

        $optionsJson = $serializer->serialize($options, 'json');
        $token = bin2hex(random_bytes(32));
        Cache::put(
            'webauthn:assert:' . $token,
            [
                'options_json' => $optionsJson,
                'username_hint' => $usernameOrEmail !== '' ? $usernameOrEmail : null,
            ],
            self::CHALLENGE_CACHE_MINUTES
        );

        return ApiResponse::success([
            'options' => json_decode($optionsJson, true),
            'challenge_token' => $token,
            'has_passkeys' => $usernameOrEmail === '' ? null : ($user !== null && UserPasskey::countByUserUuid($user['uuid']) > 0),
            'mediation' => $mediation === 'conditional' ? 'conditional' : 'optional',
        ], 'OK', 200);
    }

    public function postAuthenticationVerify(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['challenge_token'], $data['credential'])) {
            return ApiResponse::error('Missing challenge_token or credential', 'MISSING_REQUIRED_FIELDS', 400);
        }
        $token = is_string($data['challenge_token']) ? $data['challenge_token'] : '';
        if ($token === '' || strlen($token) < 32) {
            return ApiResponse::error('Invalid challenge token', 'INVALID_CHALLENGE', 400);
        }
        $cached = Cache::get('webauthn:assert:' . $token);
        if (!is_array($cached) || !isset($cached['options_json']) || !is_string($cached['options_json'])) {
            return ApiResponse::error('Challenge expired or invalid', 'INVALID_CHALLENGE', 400);
        }
        Cache::forget('webauthn:assert:' . $token);

        $serializer = WebAuthnHelper::getSerializer();
        try {
            /** @var PublicKeyCredentialRequestOptions $pkOptions */
            $pkOptions = $serializer->deserialize(
                $cached['options_json'],
                PublicKeyCredentialRequestOptions::class,
                'json'
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WebAuthn deserialize options failed: ' . $e->getMessage());

            return ApiResponse::error('Invalid authentication state', 'WEBAUTHN_INVALID', 400);
        }

        try {
            $credJson = json_encode($data['credential'], JSON_THROW_ON_ERROR);
            /** @var PublicKeyCredential $pkc */
            $pkc = $serializer->deserialize($credJson, PublicKeyCredential::class, 'json');
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WebAuthn deserialize credential failed: ' . $e->getMessage());

            return ApiResponse::error('Invalid credential payload', 'WEBAUTHN_INVALID', 400);
        }

        $response = $pkc->response;
        if (!$response instanceof \Webauthn\AuthenticatorAssertionResponse) {
            return ApiResponse::error('Invalid credential type', 'WEBAUTHN_INVALID', 400);
        }

        $credentialIdBinary = $pkc->getPublicKeyCredentialDescriptor()->id;
        $row = UserPasskey::getByCredentialIdBinary($credentialIdBinary);
        if ($row === null) {
            return ApiResponse::error('Unknown passkey', 'PASSKEY_UNKNOWN', 400);
        }
        $userInfo = User::getUserByUuid($row['user_uuid']);
        if ($userInfo === null) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $policy = $this->passkeyLoginPolicyBlock($userInfo);
        if ($policy instanceof Response) {
            return $policy;
        }

        $hint = isset($cached['username_hint']) && is_string($cached['username_hint']) ? trim($cached['username_hint']) : '';
        if ($hint !== '') {
            $hintUser = $this->resolveUserFromUsernameOrEmail($hint);
            if ($hintUser === null || ($hintUser['uuid'] ?? '') !== $userInfo['uuid']) {
                return ApiResponse::error('Passkey does not match this account', 'PASSKEY_MISMATCH', 400);
            }
        }

        $credentialRecord = WebAuthnHelper::credentialRecordFromRow($row);
        $factory = WebAuthnHelper::getAssertionCeremonyFactory();
        $validator = AuthenticatorAssertionResponseValidator::create($factory->requestCeremony());

        try {
            $updated = $validator->check(
                $credentialRecord,
                $response,
                $pkOptions,
                WebAuthnHelper::getRpId(),
                null
            );
        } catch (AuthenticatorResponseVerificationException $e) {
            App::getInstance(true)->getLogger()->warning('WebAuthn assertion failed: ' . $e->getMessage());

            return ApiResponse::error('Passkey verification failed', 'WEBAUTHN_VERIFICATION_FAILED', 400);
        }

        UserPasskey::updateSignState(
            (int) $row['id'],
            $updated->counter,
            $updated->backupEligible,
            $updated->backupStatus,
            $updated->uvInitialized
        );

        if (isset($userInfo['two_fa_enabled']) && $userInfo['two_fa_enabled'] === 'true') {
            return ApiResponse::error('2FA required', 'TWO_FACTOR_REQUIRED', 401, [
                'email' => $userInfo['email'],
            ]);
        }

        return (new LoginController())->completeLogin($userInfo);
    }

    public function getList(Request $request): Response
    {
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return ApiResponse::error('Not authenticated', 'NOT_AUTHENTICATED', 401);
        }
        $rows = UserPasskey::listByUserUuid($user['uuid']);
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => (int) $row['id'],
                'label' => $row['label'],
                'created_at' => $row['created_at'],
                'aaguid' => $row['aaguid'],
            ];
        }

        return ApiResponse::success(['passkeys' => $out], 'OK', 200);
    }

    public function postRegistrationOptions(Request $request): Response
    {
        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            return ApiResponse::error('Demo mode is enabled', 'DEMO_MODE_ENABLED');
        }
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return ApiResponse::error('Not authenticated', 'NOT_AUTHENTICATED', 401);
        }
        if (UserPasskey::countByUserUuid($user['uuid']) >= UserPasskey::MAX_PASSKEYS_PER_USER) {
            return ApiResponse::error('Maximum number of passkeys reached', 'PASSKEY_LIMIT', 400);
        }

        $serializer = WebAuthnHelper::getSerializer();
        $challenge = random_bytes(32);
        $userEntity = PublicKeyCredentialUserEntity::create(
            (string) $user['username'],
            WebAuthnHelper::uuidToUserHandle((string) $user['uuid']),
            trim((string) $user['first_name'] . ' ' . (string) $user['last_name'])
        );
        $pubKeyParams = [
            PublicKeyCredentialParameters::createPk(Algorithms::COSE_ALGORITHM_ES256),
        ];
        $selection = new AuthenticatorSelectionCriteria(
            null,
            AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_REQUIRED,
            AuthenticatorSelectionCriteria::RESIDENT_KEY_REQUIREMENT_REQUIRED
        );
        $exclude = [];
        foreach (UserPasskey::listByUserUuid($user['uuid']) as $row) {
            $cid = $row['credential_id'] ?? '';
            if (is_string($cid) && $cid !== '') {
                $transports = [];
                if (isset($row['transports']) && is_string($row['transports']) && $row['transports'] !== '') {
                    $t = json_decode($row['transports'], true);
                    $transports = is_array($t) ? $t : [];
                }
                $exclude[] = PublicKeyCredentialDescriptor::create(
                    PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                    $cid,
                    $transports
                );
            }
        }

        $options = PublicKeyCredentialCreationOptions::create(
            WebAuthnHelper::getRpEntity(),
            $userEntity,
            $challenge,
            $pubKeyParams,
            $selection,
            PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE,
            $exclude,
            120000,
        );
        $optionsJson = $serializer->serialize($options, 'json');
        $token = bin2hex(random_bytes(32));
        Cache::put(
            'webauthn:attest:' . $token,
            [
                'options_json' => $optionsJson,
                'user_uuid' => $user['uuid'],
            ],
            self::CHALLENGE_CACHE_MINUTES
        );

        return ApiResponse::success([
            'options' => json_decode($optionsJson, true),
            'challenge_token' => $token,
        ], 'OK', 200);
    }

    public function postRegistrationVerify(Request $request): Response
    {
        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            return ApiResponse::error('Demo mode is enabled', 'DEMO_MODE_ENABLED');
        }
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return ApiResponse::error('Not authenticated', 'NOT_AUTHENTICATED', 401);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['challenge_token'], $data['credential'])) {
            return ApiResponse::error('Missing challenge_token or credential', 'MISSING_REQUIRED_FIELDS', 400);
        }
        $token = is_string($data['challenge_token']) ? $data['challenge_token'] : '';
        if ($token === '' || strlen($token) < 32) {
            return ApiResponse::error('Invalid challenge token', 'INVALID_CHALLENGE', 400);
        }
        $cached = Cache::get('webauthn:attest:' . $token);
        if (!is_array($cached) || !isset($cached['options_json'], $cached['user_uuid'])) {
            return ApiResponse::error('Challenge expired or invalid', 'INVALID_CHALLENGE', 400);
        }
        if ((string) $cached['user_uuid'] !== (string) $user['uuid']) {
            return ApiResponse::error('Challenge user mismatch', 'INVALID_CHALLENGE', 400);
        }
        Cache::forget('webauthn:attest:' . $token);

        $serializer = WebAuthnHelper::getSerializer();
        try {
            /** @var PublicKeyCredentialCreationOptions $creationOptions */
            $creationOptions = $serializer->deserialize(
                (string) $cached['options_json'],
                PublicKeyCredentialCreationOptions::class,
                'json'
            );
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WebAuthn deserialize creation options failed: ' . $e->getMessage());

            return ApiResponse::error('Invalid registration state', 'WEBAUTHN_INVALID', 400);
        }

        try {
            $credJson = json_encode($data['credential'], JSON_THROW_ON_ERROR);
            /** @var PublicKeyCredential $pkc */
            $pkc = $serializer->deserialize($credJson, PublicKeyCredential::class, 'json');
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('WebAuthn deserialize registration credential failed: ' . $e->getMessage());

            return ApiResponse::error('Invalid credential payload', 'WEBAUTHN_INVALID', 400);
        }
        $attResponse = $pkc->response;
        if (!$attResponse instanceof \Webauthn\AuthenticatorAttestationResponse) {
            return ApiResponse::error('Invalid credential type', 'WEBAUTHN_INVALID', 400);
        }

        $factory = WebAuthnHelper::getCreationCeremonyFactory();
        $validator = AuthenticatorAttestationResponseValidator::create($factory->creationCeremony());
        try {
            $record = $validator->check($attResponse, $creationOptions, WebAuthnHelper::getRpId());
        } catch (AuthenticatorResponseVerificationException $e) {
            App::getInstance(true)->getLogger()->warning('WebAuthn attestation failed: ' . $e->getMessage());

            return ApiResponse::error('Passkey registration failed', 'WEBAUTHN_VERIFICATION_FAILED', 400);
        }

        if (UserPasskey::countByUserUuid($user['uuid']) >= UserPasskey::MAX_PASSKEYS_PER_USER) {
            return ApiResponse::error('Maximum number of passkeys reached', 'PASSKEY_LIMIT', 400);
        }

        $label = isset($data['label']) && is_string($data['label']) ? trim($data['label']) : null;
        if ($label !== null && strlen($label) > 191) {
            $label = substr($label, 0, 191);
        }

        $insert = [
            'user_uuid' => $user['uuid'],
            'credential_id' => $record->publicKeyCredentialId,
            'public_key' => $record->credentialPublicKey,
            'sign_count' => $record->counter,
            'attestation_type' => $record->attestationType,
            'transports' => json_encode($record->transports),
            'aaguid' => $record->aaguid->toRfc4122(),
            'label' => $label !== '' ? $label : null,
            'backup_eligible' => $record->backupEligible,
            'backup_status' => $record->backupStatus,
            'uv_initialized' => $record->uvInitialized,
        ];
        $id = UserPasskey::create($insert);
        if ($id === false) {
            return ApiResponse::error('Failed to save passkey', 'PASSKEY_SAVE_FAILED', 500);
        }

        return ApiResponse::success(['id' => $id], 'Passkey registered', 201);
    }

    public function delete(Request $request, array $parameters): Response
    {
        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            return ApiResponse::error('Demo mode is enabled', 'DEMO_MODE_ENABLED');
        }
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return ApiResponse::error('Not authenticated', 'NOT_AUTHENTICATED', 401);
        }
        $id = isset($parameters['id']) ? (int) $parameters['id'] : 0;
        if ($id <= 0) {
            return ApiResponse::error('Invalid passkey id', 'INVALID_ID', 400);
        }
        if (!UserPasskey::deleteByIdForUser($id, $user['uuid'])) {
            return ApiResponse::error('Passkey not found', 'PASSKEY_NOT_FOUND', 404);
        }

        return ApiResponse::success([], 'Passkey removed', 200);
    }

    public function patch(Request $request, array $parameters): Response
    {
        $app = App::getInstance(true);
        if ($app->isDemoMode()) {
            return ApiResponse::error('Demo mode is enabled', 'DEMO_MODE_ENABLED');
        }
        $user = $request->attributes->get('user');
        if (!is_array($user) || !isset($user['uuid'])) {
            return ApiResponse::error('Not authenticated', 'NOT_AUTHENTICATED', 401);
        }
        $id = isset($parameters['id']) ? (int) $parameters['id'] : 0;
        if ($id <= 0) {
            return ApiResponse::error('Invalid passkey id', 'INVALID_ID', 400);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('label', $data)) {
            return ApiResponse::error('Missing label', 'MISSING_REQUIRED_FIELDS', 400);
        }
        $labelRaw = $data['label'];
        if ($labelRaw !== null && !is_string($labelRaw)) {
            return ApiResponse::error('Label must be a string or null', 'INVALID_DATA_TYPE', 400);
        }
        $label = $labelRaw === null ? null : trim($labelRaw);
        if ($label !== null && strlen($label) > 191) {
            $label = substr($label, 0, 191);
        }
        if (!UserPasskey::updateLabelForUser($id, $user['uuid'], $label === '' ? null : $label)) {
            return ApiResponse::error('Passkey not found', 'PASSKEY_NOT_FOUND', 404);
        }

        return ApiResponse::success([], 'Passkey updated', 200);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveUserFromUsernameOrEmail(string $usernameOrEmail): ?array
    {
        $usernameOrEmail = trim($usernameOrEmail);
        if (strlen($usernameOrEmail) < 3) {
            return null;
        }
        $isEmail = filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL);
        $isUsername = (bool) preg_match('/^[a-zA-Z0-9_]+$/', $usernameOrEmail);
        if (!$isEmail && !$isUsername) {
            return null;
        }
        if ($isEmail) {
            $u = User::getUserByEmail($usernameOrEmail);
            if ($u !== null) {
                return $u;
            }
        }

        return User::getUserByUsername($usernameOrEmail);
    }

    /**
     * @param array<string, mixed> $userInfo
     */
    private function passkeyLoginPolicyBlock(?array $userInfo): ?Response
    {
        if ($userInfo === null) {
            return null;
        }
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::OIDC_DISABLE_LOCAL_LOGIN, 'false') === 'true') {
            if (!PermissionHelper::hasPermission($userInfo['uuid'], Permissions::ADMIN_ROOT)) {
                return ApiResponse::error('Local login is disabled', 'LOCAL_LOGIN_DISABLED', 403);
            }
        }
        if (($userInfo['banned'] ?? '') === 'true') {
            return ApiResponse::error('User is banned', 'USER_BANNED');
        }
        $requiresEmailVerification = $config->getSetting(ConfigInterface::REGISTRATION_REQUIRE_EMAIL_VERIFICATION, 'false') === 'true';
        $isEmailVerified = !isset($userInfo['mail_verify']) || $userInfo['mail_verify'] === null || trim((string) $userInfo['mail_verify']) === '';
        if ($requiresEmailVerification && !$isEmailVerified) {
            return ApiResponse::error('Email verification is required before login. Please verify your email first.', 'EMAIL_NOT_VERIFIED', 403);
        }

        return null;
    }
}
