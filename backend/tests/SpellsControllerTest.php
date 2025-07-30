<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\SpellsController;
use Symfony\Component\HttpFoundation\Request;

class SpellsControllerTest extends TestCase
{
    private SpellsController $controller;
    private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
    private string $adminEmail = 'testadmin@example.com';
    private int $testRealmId;

    protected function setUp(): void
    {
        $this->controller = new SpellsController();
        // Ensure DB connection is initialized in test mode
        App::getInstance(false, true, true);

        // Ensure test admin user exists
        $existing = User::getUserByUuid($this->adminUuid);
        if (!$existing) {
            User::createUser([
                'uuid' => $this->adminUuid,
                'username' => 'testadmin',
                'first_name' => 'Test',
                'last_name' => 'Admin',
                'email' => $this->adminEmail,
                'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
                'role_id' => 4,
                'avatar' => 'https://github.com/mythicalltd.png',
                'remember_token' => bin2hex(random_bytes(16)),
            ]);
        }

        // Create test realm
        $realmId = Realm::create([
            'name' => 'Test Realm for Spells',
            'description' => 'Test realm for spell unit tests',
            'logo' => 'https://github.com/mythicalltd.png',
            'author' => $this->adminEmail,
        ]);
        $this->testRealmId = $realmId;
    }

    protected function tearDown(): void
    {
        // Clean up test spells
        $spells = Spell::getSpellsByRealmId($this->testRealmId);
        foreach ($spells as $spell) {
            Spell::hardDeleteSpell($spell['id']);
        }

        // Remove test realm
        $realm = Realm::getById($this->testRealmId);
        if ($realm) {
            Realm::delete($this->testRealmId);
        }

        // Remove test admin user
        $admin = User::getUserByUuid($this->adminUuid);
        if ($admin) {
            User::hardDeleteUser($admin['id']);
        }
    }

    public function testIndexReturnsSuccess()
    {
        $request = Request::create('/api/admin/spells', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('spells', $data['data']);
        $this->assertArrayHasKey('pagination', $data['data']);
    }

    public function testIndexWithRealmFilter()
    {
        $request = Request::create('/api/admin/spells?realm_id=' . $this->testRealmId, 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('spells', $data['data']);
    }

    public function testShowReturnsNotFoundForInvalidId()
    {
        $request = Request::create('/api/admin/spells/999999', 'GET');
        $response = $this->controller->show($request, 999999);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('SPELL_NOT_FOUND', $data['error_code']);
    }

    public function testCreateValidationFails()
    {
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode([]));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('MISSING_REQUIRED_FIELDS', $data['error_code']);
    }

    public function testCreateValidationFailsWithInvalidRealm()
    {
        $payload = [
            'realm_id' => 999999,
            'name' => 'Test Spell',
            'author' => 'test@example.com',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('REALM_NOT_FOUND', $data['error_code']);
    }

    public function testCreateAndDeleteSpell()
    {
        // Create
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell',
            'author' => 'test@example.com',
            'description' => 'Test spell for unit tests',
            'script_container' => 'alpine:3.4',
            'script_entry' => 'ash',
            'script_is_privileged' => true,
            'force_outgoing_ip' => false,
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('spell', $data['data']);
        $spellId = $data['data']['spell']['id'];

        // Update
        $updatePayload = ['name' => 'Test Spell Updated'];
        $updateRequest = Request::create('/api/admin/spells/' . $spellId, 'PATCH', [], [], [], [], json_encode($updatePayload));
        $updateRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $updateResponse = $this->controller->update($updateRequest, $spellId);
        $updateData = json_decode($updateResponse->getContent(), true);
        $this->assertTrue($updateData['success']);
        $this->assertEquals('Test Spell Updated', $updateData['data']['spell']['name']);

        // Delete
        $deleteRequest = Request::create('/api/admin/spells/' . $spellId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $deleteResponse = $this->controller->delete($deleteRequest, $spellId);
        $deleteData = json_decode($deleteResponse->getContent(), true);
        $this->assertTrue($deleteData['success']);
    }

    public function testCreateSpellWithJsonFields()
    {
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell with JSON',
            'author' => 'test@example.com',
            'features' => json_encode(['feature1', 'feature2']),
            'docker_images' => json_encode(['Java 8' => 'ghcr.io/parkervcp/yolks:java_8']),
            'file_denylist' => json_encode(['file1.txt', 'file2.txt']),
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
    }

    public function testCreateSpellWithInvalidJson()
    {
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell',
            'author' => 'test@example.com',
            'features' => 'invalid json',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('INVALID_JSON_FIELD', $data['error_code']);
    }

    public function testUpdateSpellValidationFails()
    {
        // First create a spell
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell for Update',
            'author' => 'test@example.com',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $spellId = $data['data']['spell']['id'];

        // Try to update with invalid data
        $updatePayload = ['name' => 123]; // Should be string
        $updateRequest = Request::create('/api/admin/spells/' . $spellId, 'PATCH', [], [], [], [], json_encode($updatePayload));
        $updateResponse = $this->controller->update($updateRequest, $spellId);
        $updateData = json_decode($updateResponse->getContent(), true);
        $this->assertFalse($updateData['success']);
        $this->assertEquals('INVALID_DATA_TYPE', $updateData['error_code']);

        // Clean up
        $deleteRequest = Request::create('/api/admin/spells/' . $spellId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $this->controller->delete($deleteRequest, $spellId);
    }

    public function testGetByRealm()
    {
        $request = Request::create('/api/admin/spells/realm/' . $this->testRealmId, 'GET');
        $response = $this->controller->getByRealm($request, $this->testRealmId);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('spells', $data['data']);
        $this->assertArrayHasKey('realm', $data['data']);
    }

    public function testGetByRealmNotFound()
    {
        $request = Request::create('/api/admin/spells/realm/999999', 'GET');
        $response = $this->controller->getByRealm($request, 999999);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('REALM_NOT_FOUND', $data['error_code']);
    }

    public function testImportSpell()
    {
        // Create test JSON file content
        $jsonData = [
            'name' => 'Imported Test Spell',
            'author' => 'test@example.com',
            'description' => 'Imported spell for testing',
            'features' => ['feature1', 'feature2'],
            'docker_images' => ['Java 8' => 'ghcr.io/parkervcp/yolks:java_8'],
            'variables' => [
                [
                    'name' => 'Test Variable',
                    'description' => 'Test variable description',
                    'env_variable' => 'TEST_VAR',
                    'default_value' => 'default',
                    'user_viewable' => true,
                    'user_editable' => true,
                    'field_type' => 'text',
                ],
            ],
            'meta' => ['update_url' => 'https://example.com'],
            'config' => [
                'files' => '{"server.properties": {}}',
                'startup' => '{"done": "text"}',
                'logs' => '{}',
                'stop' => 'stop',
            ],
            'startup' => 'java -jar server.jar',
            'scripts' => [
                'installation' => [
                    'container' => 'alpine:3.4',
                    'entrypoint' => 'ash',
                    'script' => '#!/bin/bash\necho "test"',
                ],
            ],
        ];

        // Create temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'spell_import_');
        file_put_contents($tempFile, json_encode($jsonData));

        // Create request with file upload
        $request = Request::create('/api/admin/spells/import', 'POST');
        $request->request->set('realm_id', $this->testRealmId);
        $request->files->set('file', new Symfony\Component\HttpFoundation\File\UploadedFile(
            $tempFile,
            'test_spell.json',
            'application/json',
            null,
            true
        ));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);

        $response = $this->controller->import($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);

        // Clean up temp file
        unlink($tempFile);
    }

    public function testImportSpellValidationFails()
    {
        $request = Request::create('/api/admin/spells/import', 'POST');
        $request->request->set('realm_id', 'invalid');
        $response = $this->controller->import($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('INVALID_REALM_ID', $data['error_code']);
    }

    public function testListVariables()
    {
        // First create a spell
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell for Variables',
            'author' => 'test@example.com',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $spellId = $data['data']['spell']['id'];

        // Test listing variables
        $listRequest = Request::create('/api/admin/spells/' . $spellId . '/variables', 'GET');
        $listResponse = $this->controller->listVariables($listRequest, $spellId);
        $listData = json_decode($listResponse->getContent(), true);
        $this->assertTrue($listData['success']);
        $this->assertArrayHasKey('variables', $listData['data']);

        // Clean up
        $deleteRequest = Request::create('/api/admin/spells/' . $spellId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $this->controller->delete($deleteRequest, $spellId);
    }

    public function testCreateAndDeleteVariable()
    {
        // First create a spell
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell for Variable CRUD',
            'author' => 'test@example.com',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $spellId = $data['data']['spell']['id'];

        // Create variable
        $variablePayload = [
            'name' => 'Test Variable',
            'description' => 'Test variable description',
            'env_variable' => 'TEST_VAR',
            'default_value' => 'default',
            'user_viewable' => 'true',
            'user_editable' => 'true',
        ];
        $createRequest = Request::create('/api/admin/spells/' . $spellId . '/variables', 'POST', [], [], [], [], json_encode($variablePayload));
        $createResponse = $this->controller->createVariable($createRequest, $spellId);
        $createData = json_decode($createResponse->getContent(), true);
        $this->assertTrue($createData['success']);
        $this->assertArrayHasKey('variable', $createData['data']);
        $variableId = $createData['data']['variable']['id'];

        // Update variable
        $updatePayload = ['name' => 'Updated Test Variable'];
        $updateRequest = Request::create('/api/admin/spell-variables/' . $variableId, 'PATCH', [], [], [], [], json_encode($updatePayload));
        $updateResponse = $this->controller->updateVariable($updateRequest, $variableId);
        $updateData = json_decode($updateResponse->getContent(), true);
        $this->assertTrue($updateData['success']);

        // Delete variable
        $deleteRequest = Request::create('/api/admin/spell-variables/' . $variableId, 'DELETE');
        $deleteResponse = $this->controller->deleteVariable($deleteRequest, $variableId);
        $deleteData = json_decode($deleteResponse->getContent(), true);
        $this->assertTrue($deleteData['success']);

        // Clean up spell
        $deleteSpellRequest = Request::create('/api/admin/spells/' . $spellId, 'DELETE');
        $deleteSpellRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $this->controller->delete($deleteSpellRequest, $spellId);
    }

    public function testCreateVariableValidationFails()
    {
        // First create a spell
        $payload = [
            'realm_id' => $this->testRealmId,
            'name' => 'Test Spell for Variable Validation',
            'author' => 'test@example.com',
        ];
        $request = Request::create('/api/admin/spells', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $spellId = $data['data']['spell']['id'];

        // Try to create variable with missing required fields
        $variablePayload = [
            'name' => 'Test Variable',
            // Missing required fields
        ];
        $createRequest = Request::create('/api/admin/spells/' . $spellId . '/variables', 'POST', [], [], [], [], json_encode($variablePayload));
        $createResponse = $this->controller->createVariable($createRequest, $spellId);
        $createData = json_decode($createResponse->getContent(), true);
        $this->assertFalse($createData['success']);
        $this->assertEquals('MISSING_REQUIRED_FIELD', $createData['error_code']);

        // Clean up
        $deleteRequest = Request::create('/api/admin/spells/' . $spellId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $this->controller->delete($deleteRequest, $spellId);
    }
}
