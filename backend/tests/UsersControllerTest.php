<?php

use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\UsersController;
use Symfony\Component\HttpFoundation\Request;
use App\App;
use App\Chat\User;

class UsersControllerTest extends TestCase
{
	private UsersController $controller;
	private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
	private string $adminEmail = 'testadmin@example.com';

	protected function setUp(): void
	{
		$this->controller = new UsersController();
		// Ensure DB connection is initialized
		$app = new App(false, false, true);
		$app->getDatabase();
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
		$request = Request::create('/api/admin/users', 'GET');
		$response = $this->controller->index($request);
		$data = json_decode($response->getContent(), true);
		$this->assertTrue($data['success']);
		$this->assertArrayHasKey('users', $data['data']);
	}

	public function testShowReturnsNotFoundForInvalidUuid()
	{
		$request = Request::create('/api/admin/users/invalid-uuid', 'GET');
		$response = $this->controller->show($request, 'invalid-uuid');
		$data = json_decode($response->getContent(), true);
		$this->assertFalse($data['success']);
		$this->assertEquals('USER_NOT_FOUND', $data['error_code']);
	}

	public function testCreateValidationFails()
	{
		$request = Request::create('/api/admin/users', 'PUT', [], [], [], [], json_encode([]));
		$response = $this->controller->create($request);
		$data = json_decode($response->getContent(), true);
		$this->assertFalse($data['success']);
		$this->assertEquals('MISSING_REQUIRED_FIELDS', $data['error_code']);
	}

	public function testCreateAndDeleteUser()
	{
		// Create
		$payload = [
			'username' => 'testuser_' . uniqid(),
			'first_name' => 'Test',
			'last_name' => 'User',
			'email' => 'testuser_' . uniqid() . '@example.com',
			'password' => 'TestPassword123',
		];
		$request = Request::create('/api/admin/users', 'PUT', [], [], [], [], json_encode($payload));
		$request->attributes->set('user', ['uuid' => $this->adminUuid]);
		$response = $this->controller->create($request);
		$data = json_decode($response->getContent(), true);
		$this->assertTrue($data['success']);
		$this->assertArrayHasKey('user_id', $data['data']);

		// Fetch user by UUID
		$userUuid = null;
		if (isset($data['data']['user_id'])) {
			// We need to fetch the user by searching, as the API returns user_id, not uuid
			$indexRequest = Request::create('/api/admin/users', 'GET', ['search' => $payload['username']]);
			$indexResponse = $this->controller->index($indexRequest);
			$indexData = json_decode($indexResponse->getContent(), true);
			$found = false;
			foreach ($indexData['data']['users'] as $user) {
				if ($user['username'] === $payload['username']) {
					$userUuid = $user['uuid'];
					$found = true;
					break;
				}
			}
			$this->assertTrue($found, 'Created user should be found in user list');
		}
		$this->assertNotNull($userUuid);

		// Update
		$updatePayload = ['first_name' => 'UpdatedName'];
		$updateRequest = Request::create('/api/admin/users/' . $userUuid, 'PATCH', [], [], [], [], json_encode($updatePayload));
		$updateRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
		$updateResponse = $this->controller->update($updateRequest, $userUuid);
		$updateData = json_decode($updateResponse->getContent(), true);
		$this->assertTrue($updateData['success']);

		// Delete
		$deleteRequest = Request::create('/api/admin/users/' . $userUuid, 'DELETE');
		$deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
		$deleteResponse = $this->controller->delete($deleteRequest, $userUuid);
		$deleteData = json_decode($deleteResponse->getContent(), true);
		$this->assertTrue($deleteData['success']);
	}
}