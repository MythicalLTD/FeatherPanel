<?php

use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\RealmsController;
use Symfony\Component\HttpFoundation\Request;
use App\App;
use App\Chat\User;

class RealmsControllerTest extends TestCase
{
	private RealmsController $controller;
	private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
	private string $adminEmail = 'testadmin@example.com';

	protected function setUp(): void
	{
		$this->controller = new RealmsController();
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
	}

	protected function tearDown(): void
	{
		// Remove test admin user
		$admin = User::getUserByUuid($this->adminUuid);
		if ($admin) {
			User::hardDeleteUser($admin['id']);
		}
	}

	public function testIndexReturnsSuccess()
	{
		$request = Request::create('/api/admin/realms', 'GET');
		$response = $this->controller->index($request);
		$data = json_decode($response->getContent(), true);
		$this->assertTrue($data['success']);
		$this->assertArrayHasKey('realms', $data['data']);
	}

	public function testShowReturnsNotFoundForInvalidId()
	{
		$request = Request::create('/api/admin/realms/999999', 'GET');
		$response = $this->controller->show($request, 999999);
		$data = json_decode($response->getContent(), true);
		$this->assertFalse($data['success']);
		$this->assertEquals('REALM_NOT_FOUND', $data['error_code']);
	}

	public function testCreateValidationFails()
	{
		$request = Request::create('/api/admin/realms', 'PUT', [], [], [], [], json_encode([]));
		$response = $this->controller->create($request);
		$data = json_decode($response->getContent(), true);
		$this->assertFalse($data['success']);
		$this->assertEquals('MISSING_REQUIRED_FIELDS', $data['error_code']);
	}

	public function testCreateAndDeleteRealm()
	{
		// Create
		$payload = [
			'name' => 'Test Realm',
			'description' => 'Unit test realm',
			'logo' => 'https://github.com/mythicalltd.png',
			'author' => 'testadmin@example.com',
		];
		$request = Request::create('/api/admin/realms', 'PUT', [], [], [], [], json_encode($payload));
		$request->attributes->set('user', ['uuid' => $this->adminUuid]);
		$response = $this->controller->create($request);
		$data = json_decode($response->getContent(), true);
		$this->assertTrue($data['success']);
		$this->assertArrayHasKey('realm', $data['data']);
		$realmId = $data['data']['realm']['id'];

		// Update
		$updatePayload = ['name' => 'Test Realm Updated'];
		$updateRequest = Request::create('/api/admin/realms/' . $realmId, 'PATCH', [], [], [], [], json_encode($updatePayload));
		$updateRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
		$updateResponse = $this->controller->update($updateRequest, $realmId);
		$updateData = json_decode($updateResponse->getContent(), true);
		$this->assertTrue($updateData['success']);
		$this->assertEquals('Test Realm Updated', $updateData['data']['realm']['name']);

		// Delete
		$deleteRequest = Request::create('/api/admin/realms/' . $realmId, 'DELETE');
		$deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
		$deleteResponse = $this->controller->delete($deleteRequest, $realmId);
		$deleteData = json_decode($deleteResponse->getContent(), true);
		$this->assertTrue($deleteData['success']);
	}
}