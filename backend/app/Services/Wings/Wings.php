<?php

namespace App\Services\Wings;

use App\Services\Wings\Services\SystemService;
use App\Services\Wings\Services\ServerService;
use App\Services\Wings\Services\FileService;
use App\Services\Wings\Services\BackupService;
use App\Services\Wings\Services\TransferService;
use App\Services\Wings\Services\WebSocketService;

/**
 * Main Wings API Client
 * 
 * This is the main entry point for the Wings API client.
 * It provides access to different service classes for different API areas.
 */
class Wings
{
	private WingsConnection $connection;
	private SystemService $system;
	private ServerService $server;
	private FileService $file;
	private BackupService $backup;
	private TransferService $transfer;
	private WebSocketService $websocket;

	/**
	 * Create a new Wings client instance
	 * 
	 * @param string $host The Wings server hostname/IP
	 * @param int $port The Wings server port (default: 8080)
	 * @param string $protocol The protocol to use (http/https)
	 * @param string $authToken The authentication token for Wings
	 * @param int $timeout Request timeout in seconds (default: 30)
	 */
	public function __construct(
		string $host,
		int $port = 8080,
		string $protocol = 'http',
		string $authToken = '',
		int $timeout = 30
	) {
		$this->connection = new WingsConnection($host, $port, $protocol, $authToken, $timeout);

		// Initialize service classes
		$this->system = new SystemService($this->connection);
		$this->server = new ServerService($this->connection);
		$this->file = new FileService($this->connection);
		$this->backup = new BackupService($this->connection);
		$this->transfer = new TransferService($this->connection);
		$this->websocket = new WebSocketService($this->connection);
	}

	/**
	 * Get the system service
	 * 
	 * @return SystemService
	 */
	public function getSystem(): SystemService
	{
		return $this->system;
	}

	/**
	 * Get the server service
	 * 
	 * @return ServerService
	 */
	public function getServer(): ServerService
	{
		return $this->server;
	}

	/**
	 * Get the file service
	 * 
	 * @return FileService
	 */
	public function getFile(): FileService
	{
		return $this->file;
	}

	/**
	 * Get the backup service
	 * 
	 * @return BackupService
	 */
	public function getBackup(): BackupService
	{
		return $this->backup;
	}

	/**
	 * Get the transfer service
	 * 
	 * @return TransferService
	 */
	public function getTransfer(): TransferService
	{
		return $this->transfer;
	}

	/**
	 * Get the WebSocket service
	 * 
	 * @return WebSocketService
	 */
	public function getWebSocket(): WebSocketService
	{
		return $this->websocket;
	}

	/**
	 * Get the underlying connection
	 * 
	 * @return WingsConnection
	 */
	public function getConnection(): WingsConnection
	{
		return $this->connection;
	}

	/**
	 * Test the connection to Wings
	 * 
	 * @return bool
	 */
	public function testConnection(): bool
	{
		return $this->connection->testConnection();
	}

	/**
	 * Set the authentication token
	 * 
	 * @param string $token
	 * @return void
	 */
	public function setAuthToken(string $token): void
	{
		$this->connection->setAuthToken($token);
	}

	/**
	 * Get the authentication token
	 * 
	 * @return string
	 */
	public function getAuthToken(): string
	{
		return $this->connection->getAuthToken();
	}

	/**
	 * Get the base URL
	 * 
	 * @return string
	 */
	public function getBaseUrl(): string
	{
		return $this->connection->getBaseUrl();
	}

	/**
	 * Get the token generator
	 * 
	 * @return Utils\TokenGenerator
	 */
	public function getTokenGenerator(): Utils\TokenGenerator
	{
		return $this->connection->getTokenGenerator();
	}
}