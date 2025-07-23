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

namespace App;

use App\Helpers\ApiResponse;
use RateLimit\Rate;
use App\Chat\Database;
use RateLimit\RedisRateLimiter;
use App\Config\ConfigFactory;
use App\Logger\LoggerFactory;
use RateLimit\Exception\LimitExceeded;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\AppEvent;
use App\Hooks\MythicalSystems\Utils\XChaCha20;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class App
{
	public static App $instance;
	public Database $db;
	public RouteCollection $routes;
	public array $middleware = [];

	public function __construct(bool $softBoot, bool $isCron = false)
	{
		/**
		 * Load the environment variables.
		 */
		$this->loadEnv();

		/**
		 * Instance.
		 */
		self::$instance = $this;

		/**
		 * Soft boot.
		 *
		 * If the soft boot is true, we do not want to initialize the database connection or the router.
		 *
		 * This is useful for commands or other things that do not require the database connection.
		 *
		 * This is also a lite way to boot the application without initializing the database connection or the router!.
		 */
		if ($softBoot) {
			return;
		}

		if ($isCron) {
			define('CRON_MODE', true);
		}

		/**
		 * @global \App\Plugins\PluginManager $pluginManager
		 * @global \App\Plugins\Events\PluginEvent $eventManager
		 */
		global $pluginManager, $eventManager;

		/**
		 * Redis.
		 */
		$redis = new FastChat\Redis();
		if ($redis->testConnection() == false) {
			define('REDIS_ENABLED', false);
		} else {
			define('REDIS_ENABLED', true);
		}

		if (!defined('CRON_MODE')) {
			// @phpstan-ignore-next-line
			$rateLimiter = new RedisRateLimiter(Rate::perMinute($_ENV['firewall_rate_limit']), new \Redis(), 'rate_limiting');
			try {
				$rateLimiter->limit(CloudFlareRealIP::getRealIP());
			} catch (LimitExceeded $e) {
				self::getLogger()->error('User: ' . $e->getMessage());
				http_response_code(429);
				header('Content-Type: application/json');
				header('Cache-Control: no-cache, private');
				echo json_encode([
					'status' => 'error',
					'message' => 'You are being rate limited!',
					'exception' => $e->getMessage(),
					'success' => false,
					'error_code' => 'RATE_LIMIT_EXCEEDED',
					'error_message' => 'You are being rate limited!'
				]);
				exit;
			}
		}

		/**
		 * Database Connection.
		 */
		try {
			$this->db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);
		} catch (\Exception $e) {
			self::getLogger()->error('Database connection failed: ' . $e->getMessage());
			http_response_code(500);
			header('Content-Type: application/json');
			header('Cache-Control: no-cache, private');
			echo json_encode([
				'status' => 'error',
				'message' => 'Database connection failed',
				'exception' => $e->getMessage(),
				'success' => false,
				'error_code' => 'DATABASE_CONNECTION_FAILED',
				'error_message' => 'Database connection failed'
			]);
			exit;
		}

		/**
		 * Initialize the plugin manager.
		 */
		if (!defined('CRON_MODE')) {
			$pluginManager->loadKernel();
			define('LOGGER', $this->getLogger());
		}

		if ($isCron) {
			return;
		}

		$timezone = $this->getConfig()->getSetting(ConfigInterface::APP_TIMEZONE, "UTC");
		if (!@date_default_timezone_set($timezone)) {
			self::getLogger()->warning("Invalid timezone '$timezone', falling back to UTC.");
			date_default_timezone_set("UTC");
		}
		
		$this->routes = new RouteCollection();
		$this->registerApiRoutes($this->routes);
		$this->dispatchSymfonyRouter();
	}

	/**
	 * Register all api endpoints using Symfony Routing.
	 *
	 * @param RouteCollection $routes The Symfony RouteCollection instance
	 */
	public function registerApiRoutes(RouteCollection $routes): void
	{
		$routesDir = __DIR__ . '/routes';

		$iterator = new \RecursiveIteratorIterator(
			new \RecursiveDirectoryIterator($routesDir, \FilesystemIterator::SKIP_DOTS),
			\RecursiveIteratorIterator::SELF_FIRST
		);

		foreach ($iterator as $file) {
			if ($file->isFile() && $file->getExtension() === 'php') {
				$register = require $file->getPathname();
				if (is_callable($register)) {
					$register($routes);
				}
			}
		}
	}

	/**
	 * Dispatch the request using Symfony Routing and handle middleware.
	 */
	public function dispatchSymfonyRouter(): void
	{
		$request = Request::createFromGlobals();
		$context = new RequestContext();
		$context->fromRequest($request);
		$matcher = new UrlMatcher($this->routes, $context);
		try {
			$parameters = $matcher->match($request->getPathInfo());
			$controller = $parameters['_controller'];
			unset($parameters['_controller'], $parameters['_route']);

			// Per-route middleware support
			$routeMiddleware = [];
			if (isset($parameters['_middleware']) && is_array($parameters['_middleware'])) {
				foreach ($parameters['_middleware'] as $middlewareClass) {
					$routeMiddleware[] = new $middlewareClass();
				}
			}

			// Use route middleware if defined, otherwise global
			$middlewareStack = $routeMiddleware ?: $this->middleware;
			$middlewareStack[] = function ($request) use ($controller, $parameters) {
				return call_user_func_array($controller, [$request, ...array_values($parameters)]);
			};

			$response = array_reduce(
				array_reverse($middlewareStack),
				function ($next, $middleware) {
					return function ($request) use ($middleware, $next) {
						if (is_object($middleware) && method_exists($middleware, 'handle')) {
							return $middleware->handle($request, $next);
						}
						return $middleware($request, $next);
					};
				},
				function ($request) {
					return new Response('No controller found', 500);
				}
			)($request);

			if (!$response instanceof Response) {
				$response = new Response($response);
			}
		} catch (ResourceNotFoundException $e) {
			$response = ApiResponse::error('The api route does not exist!', 'API_ROUTE_NOT_FOUND', 404, null);
		} catch (\Exception $e) {
			$response = ApiResponse::exception('An error occurred', $e->getMessage());
		}
		$response->send();
	}

	/**
	 * Load the environment variables.
	 */
	public function loadEnv(): void
	{
		try {
			if (file_exists(__DIR__ . '/../storage/.env')) {
				$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../storage/');
				$dotenv->load();

			} else {
				echo 'No .env file found';
				exit;
			}
		} catch (\Exception $e) {
			echo $e->getMessage();
			exit;
		}
	}

	/**
	 * Update the value of an environment variable.
	 *
	 * @param string $key The key of the environment variable
	 * @param string $value The value of the environment variable
	 * @param bool $encode If the value should be encoded
	 *
	 * @return bool If the value was updated
	 */
	public function updateEnvValue(string $key, string $value, bool $encode): bool
	{
		$envFile = __DIR__ . '/../storage/.env'; // Path to your .env file
		if (!file_exists($envFile)) {
			return false; // Return false if .env file doesn't exist
		}

		// Read the .env file into an array of lines
		$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

		$updated = false;
		foreach ($lines as &$line) {
			// Skip comments and lines that don't contain '='
			if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) {
				continue;
			}

			// Split the line into key and value
			[$envKey, $envValue] = explode('=', $line, 2);

			// Trim whitespace from the key
			if (trim($envKey) === $key) {
				// Update the value
				$line = "$key=\"$value\"";
				$updated = true;
			}
		}

		// If the key doesn't exist, add it
		if (!$updated) {
			$lines[] = "$key=$value";
		}

		// Write the updated lines back to the .env file
		return file_put_contents($envFile, implode(PHP_EOL, $lines)) !== false;
	}

	/**
	 * Get the config factory.
	 */
	public function getConfig(): ConfigFactory
	{
		if (isset(self::$instance->db)) {
			return new ConfigFactory(self::$instance->db->getPdo());
		}
		throw new \Exception('Database connection is not initialized.');
	}

	/**
	 * Get the database.
	 */
	public function getDatabase(): Database
	{
		return $this->db;
	}

	/**
	 * Get the logger factory.
	 */
	public function getLogger(): LoggerFactory
	{
		return new LoggerFactory(__DIR__ . '/../storage/logs/App.log');
	}

	/**
	 * Get the web server logger factory.
	 */
	public function getWebServerLogger(): LoggerFactory
	{
		return new LoggerFactory(__DIR__ . '/../storage/logs/mythicalpanel-web.log');
	}

	/**
	 * Get the instance of the App class.
	 */
	public static function getInstance(bool $softBoot, bool $isCron = false): App
	{
		if (!isset(self::$instance)) {
			self::$instance = new self($softBoot, $isCron);
		}

		return self::$instance;
	}

	/**
	 * Encrypt the data.
	 *
	 * @param string $data The data to encrypt
	 */
	public function encrypt(string $data): string
	{
		return XChaCha20::encrypt($data, $_ENV['DATABASE_ENCRYPTION_KEY'], true);
	}

	/**
	 * Decrypt the data.
	 *
	 * @param string $data The data to decrypt
	 *
	 * @return void
	 */
	public function decrypt(string $data): string
	{
		return XChaCha20::decrypt($data, $_ENV['DATABASE_ENCRYPTION_KEY'], true);
	}

	/**
	 * Generate a random code.
	 */
	public function generateCode(): string
	{
		$code = base64_encode(random_bytes(64));
		$code = str_replace('=', '', $code);
		$code = str_replace('+', '', $code);
		$code = str_replace('/', '', $code);

		return $code;
	}

	/**
	 * Generate a random pin.
	 */
	public function generatePin(): int
	{
		return random_int(100000, 999999);
	}

	public function addMiddleware($middleware): void
	{
		$this->middleware[] = $middleware;
	}
}
