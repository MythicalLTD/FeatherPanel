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

namespace App;

use RateLimit\Rate;
use App\Chat\Database;
use App\Helpers\XChaCha20;
use Random\RandomException;
use App\Helpers\ApiResponse;
use App\Config\ConfigFactory;
use App\Logger\LoggerFactory;
use App\Config\ConfigInterface;
use App\Helpers\RateLimitConfig;
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;
use App\Middleware\WingsMiddleware;
use App\Middleware\ServerMiddleware;
use Symfony\Component\Routing\Route;
use App\Plugins\Events\Events\AppEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\Exception\MethodNotAllowedException;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;

class App
{
    public static App $instance;
    public Database $db;
    public RouteCollection $routes;
    public array $middleware = [];
    private ?\Redis $redisConnection = null;

    public function __construct(bool $softBoot, bool $isCron = false, bool $isCli = false)
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

        // If running in test mode, skip Redis and plugin manager, just init DB
        if ($isCli) {
            $this->db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);

            return;
        }

        /**
         * Redis.
         */
        $redis = new FastChat\Redis();
        if (!$redis->testConnection()) {
            define('REDIS_ENABLED', false);
            $this->redisConnection = null;
        } else {
            define('REDIS_ENABLED', true);
            // Initialize Redis connection for rate limiting
            try {
                $this->redisConnection = new \Redis();
                $host = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
                $port = (int) ($_ENV['REDIS_PORT'] ?? 6379);
                $password = $_ENV['REDIS_PASSWORD'] ?? null;

                if ($password) {
                    $this->redisConnection->connect($host, $port);
                    $this->redisConnection->auth($password);
                } else {
                    $this->redisConnection->connect($host, $port);
                }
            } catch (\Exception $e) {
                self::getLogger()->error('Failed to initialize Redis connection for rate limiting: ' . $e->getMessage());
                $this->redisConnection = null;
            }
            $redis = $this->redisConnection;
        }

        /**
         * @global \App\Plugins\PluginManager $pluginManager
         * @global \App\Plugins\Events\PluginEvent $eventManager
         * @global \Redis $redis
         */
        global $pluginManager, $eventManager, $redis;

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
                'error_message' => 'Database connection failed',
            ]);
            exit;
        }

        /**
         * Initialize the plugin manager.
         */
        if (!defined('CRON_MODE')) {
            if (isset($pluginManager) && $pluginManager !== null) {
                $pluginManager->loadKernel();
            } else {
                self::getLogger()->warning('Plugin manager was not initialized. Skipping kernel load.');
            }
            define('LOGGER', $this->getLogger());
        }

        if ($isCron) {
            return;
        }

        $timezone = $this->getConfig()->getSetting(ConfigInterface::APP_TIMEZONE, 'UTC');
        if (!@date_default_timezone_set($timezone)) {
            self::getLogger()->warning("Invalid timezone '$timezone', falling back to UTC.");
            date_default_timezone_set('UTC');
        }

        $this->routes = new RouteCollection();
        $this->registerApiRoutes($this->routes);
        $eventManager->emit(
            AppEvent::onRouterReady(),
            [
                'router' => $this->routes,
            ]
        );
        $this->dispatchSymfonyRouter();
    }

    /**
     * Register all api endpoints using Symfony Routing.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance
     */
    public function registerApiRoutes(RouteCollection $routes): void
    {
        // Load core application routes
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

        // Load plugin routes from backend/storage/addons/*/routes/
        $addonsDir = __DIR__ . '/../storage/addons';
        if (is_dir($addonsDir)) {
            $pluginDirs = new \DirectoryIterator($addonsDir);
            foreach ($pluginDirs as $pluginDir) {
                if ($pluginDir->isDir() && !$pluginDir->isDot()) {
                    $pluginRoutesDir = $pluginDir->getPathname() . '/Routes';
                    if (is_dir($pluginRoutesDir)) {
                        $pluginIterator = new \RecursiveIteratorIterator(
                            new \RecursiveDirectoryIterator($pluginRoutesDir, \FilesystemIterator::SKIP_DOTS),
                            \RecursiveIteratorIterator::SELF_FIRST
                        );

                        foreach ($pluginIterator as $file) {
                            if ($file->isFile() && $file->getExtension() === 'php') {
                                try {
                                    $register = require $file->getPathname();
                                    if (is_callable($register)) {
                                        $register($routes);
                                    }
                                } catch (\Exception $e) {
                                    self::getLogger()->error('Failed to load plugin routes from ' . $file->getPathname() . ': ' . $e->getMessage());
                                }
                            }
                        }
                    }
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

        // Log all registered routes at startup
        $routeList = [];
        foreach ($this->routes as $name => $route) {
            $routeList[] = [
                'name' => $name,
                'path' => $route->getPath(),
                'methods' => $route->getMethods(),
            ];
        }
        try {
            $parameters = $matcher->match($request->getPathInfo());
            $controller = $parameters['_controller'];
            unset($parameters['_controller'], $parameters['_route']);

            // Set route parameters as request attributes
            // - Special keys (starting with '_') are stored without the underscore (e.g., '_permission' -> 'permission')
            // - Regular route params (e.g., 'uuidShort') are stored as-is for middleware/controllers to consume
            foreach ($parameters as $key => $value) {
                if (str_starts_with($key, '_')) {
                    $request->attributes->set(ltrim($key, '_'), $value);
                } else {
                    $request->attributes->set($key, $value);
                }
            }

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
                // Remove special keys
                unset($parameters['_controller'], $parameters['_route'], $parameters['_middleware']);

                // Always pass parameters as a single associative array after the request
                return call_user_func($controller, $request, $parameters);
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
            // Log all registered routes for debugging
            $allRoutes = [];
            foreach ($this->routes as $name => $route) {
                $allRoutes[] = $route->getPath();
            }
            $response = ApiResponse::error('The api route does not exist! [' . $request->getPathInfo() . ']', 'API_ROUTE_NOT_FOUND', 404, null);
        } catch (MethodNotAllowedException $e) {
            $response = ApiResponse::error('Method not allowed for this route. Allowed: ' . implode(', ', $e->getAllowedMethods()), 'METHOD_NOT_ALLOWED', 405, null);
        } catch (\Exception $e) {
            self::getLogger()->error(
                'Exception in router: [' . get_class($e) . '] ' .
                'Message: ' . $e->getMessage() .
                ' Code: ' . $e->getCode() .
                ' File: ' . $e->getFile() .
                ' Line: ' . $e->getLine() .
                ' Trace: ' . $e->getTraceAsString()
            );
            $response = ApiResponse::exception('An error occurred: ' . $e->getMessage(), $e->getCode(), $e->getTrace());
        }
        $response->send();
    }

    /**
     * Register an admin route that requires a specific permission.
     *
     * This helper will automatically add both the AuthMiddleware and AdminMiddleware to the route,
     * and set the required permission as a route attribute.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/admin/dashboard')
     * @param callable $controller The controller to handle the request
     * @param Permissions|string $permission The permission node required to access this route
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     */
    public function registerAdminRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        Permissions | string $permission,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [
            AuthMiddleware::class,
            AdminMiddleware::class,
        ];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
            '_permission' => $permission,
        ];

        // Get rate limit from config (admin can override) or use default
        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

        // Add rate limiting if configured
        if ($rateLimitConfig !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = $rateLimitConfig;
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register an auth route.
     *
     * This route requires the user to be logged in!
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/user/profile')
     * @param callable $controller The controller to handle the request
     * @param array $methods the HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     *
     * This will automatically add the AuthMiddleware to the route, ensuring only authenticated users can access it
     */
    public function registerAuthRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [AuthMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        // Get rate limit from config (admin can override) or use default
        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

        // Add rate limiting if configured
        if ($rateLimitConfig !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = $rateLimitConfig;
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register a server route.
     *
     * This route requires the user to be logged in!
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/server/data')
     * @param callable $controller The controller to handle the request
     * @param string $serverShortUuid The server short UUID
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     */
    public function registerServerRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        string $serverShortUuid,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [AuthMiddleware::class, ServerMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
            '_server' => $serverShortUuid,
        ];

        // Get rate limit from config (admin can override) or use default
        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

        // Add rate limiting if configured
        if ($rateLimitConfig !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = $rateLimitConfig;
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register a public API route.
     *
     * This route does not require authentication or any middleware by default.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/public/data')
     * @param callable $controller The controller to handle the request
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     */
    public function registerApiRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        // Get rate limit from config (admin can override) or use default
        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

        // Add rate limiting if configured
        if ($rateLimitConfig !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = $rateLimitConfig;
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register a Wings route.
     *
     * This route does not require authentication or any middleware by default.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/wings/data')
     * @param callable $controller The controller to handle the request
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     */
    public function registerWingsRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [WingsMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        // Get rate limit from config (admin can override) or use default
        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

        // Add rate limiting if configured
        if ($rateLimitConfig !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = $rateLimitConfig;
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Load the environment variables.
     */
    public function loadEnv(): void
    {
        try {
            if (file_exists(__DIR__ . '/../storage/config/.env')) {
                $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../storage/config');
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
        $envFile = __DIR__ . '/../storage/config/.env'; // Path to your .env file
        if (!file_exists($envFile)) {
            return false; // Return false if .env file doesn't exist
        }

        // Read the .env file into an array of lines (preserve all lines including empty and comments)
        $lines = file($envFile, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            $this->getLogger()->error('Failed to read .env file');

            return false;
        }

        $updated = false;
        foreach ($lines as &$line) {
            // Skip comments and empty lines - preserve them as is
            if (empty(trim($line)) || strpos(trim($line), '#') === 0) {
                continue;
            }

            // Only process lines that contain '='
            if (strpos($line, '=') === false) {
                continue;
            }

            // Split the line into key and value
            [$envKey, $envValue] = explode('=', $line, 2);

            // Trim whitespace from the key
            if (trim($envKey) === $key) {
                // Update the value while preserving the original format
                $line = "$key=\"$value\"";
                $updated = true;
                break; // Exit loop once we find and update the key
            }
        }

        // If the key doesn't exist, add it at the end
        if (!$updated) {
            $lines[] = "$key=\"$value\"";
        }

        // Check if we have write permissions
        if (!is_writable($envFile)) {
            $this->getLogger()->error('Cannot write to .env file - insufficient permissions');

            return false;
        }

        // Create a backup of the original .env file before writing
        $backupFile = $envFile . '.backup.' . date('Y-m-d_H-i-s');
        if (!copy($envFile, $backupFile)) {
            $this->getLogger()->error('Failed to create backup of .env file');

            return false;
        }

        // Try to write the file with proper line endings
        try {
            $content = implode(PHP_EOL, $lines);
            if (file_put_contents($envFile, $content) === false) {
                // Restore from backup if write fails
                copy($backupFile, $envFile);
                $this->getLogger()->error('Failed to write to .env file - restored from backup');

                return false;
            }

            // Clean up backup file after successful write
            unlink($backupFile);

            return true;
        } catch (\Exception $e) {
            // Restore from backup if an exception occurs
            if (file_exists($backupFile)) {
                copy($backupFile, $envFile);
                unlink($backupFile);
            }
            $this->getLogger()->error('Failed to write to .env file: ' . $e->getMessage() . ' - restored from backup');

            return false;
        }
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
        return new LoggerFactory(__DIR__ . '/../storage/logs/App.fplog');
    }

    /**
     * Get the web server logger factory.
     */
    public function getWebServerLogger(): LoggerFactory
    {
        return new LoggerFactory(__DIR__ . '/../storage/logs/featherpanel-web.fplog');
    }

    /**
     * Get the instance of the App class.
     */
    public static function getInstance(bool $softBoot, bool $isCron = false, bool $testMode = false): App
    {
        if (!isset(self::$instance)) {
            self::$instance = new self($softBoot, $isCron, $testMode);
        }

        return self::$instance;
    }

    /**
     * Generate a random code.
     */
    public function generateCode(): string
    {
        try {
            $code = base64_encode(random_bytes(64));
            $code = str_replace('=', '', $code);
            $code = str_replace('+', '', $code);

            return str_replace('/', '', $code);
        } catch (RandomException) {
            $this->getLogger()->error('Failed to generate code: ' . $code);

            return '';
        }
    }

    /**
     * Generate a random pin.
     *
     * @throws RandomException
     */
    public function generatePin(): int
    {
        return random_int(100000, 999999);
    }

    public function addMiddleware($middleware): void
    {
        $this->middleware[] = $middleware;
    }

    public function getEnvValue(string $key): string
    {
        return $_ENV[$key];
    }

    public function encryptValue(string $value): string
    {
        return XChaCha20::encrypt($value, $_ENV['DATABASE_ENCRYPTION_KEY'], true);
    }

    public function decryptValue(string $value): string
    {
        // Ensure the nonce is the correct length before decryption
        $data = base64_decode($value);
        $nonceLength = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES;
        $nonce = mb_substr($data, 0, $nonceLength, '8bit');
        if (strlen($nonce) !== $nonceLength) {
            return $value;
        }

        return XChaCha20::decrypt($value, $_ENV['DATABASE_ENCRYPTION_KEY'], true);
    }

    public function getBaseUrl(): string
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
          || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        $protocol = $https ? 'https' : 'http';

        // Detect host (prefer forwarded headers if behind proxy)
        $host = $_SERVER['HTTP_X_FORWARDED_HOST']
            ?? $_SERVER['HTTP_HOST']
            ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');

        // Build final URL
        $baseUrl = sprintf('%s://%s', $protocol, $host);

        return rtrim($baseUrl, '/');
    }

    /**
     * Get the Redis connection instance.
     *
     * @return \Redis|null The Redis connection or null if not available
     */
    public function getRedisConnection(): ?\Redis
    {
        return $this->redisConnection;
    }

    /**
     * Get the rate limiter instance (for backward compatibility).
     * Note: Rate limiters are now created per-route with specific rates.
     *
     * @return null Always returns null as rate limiters are created per-route
     */
    public function getRateLimiter(): ?object
    {
        // Rate limiters are now created per-route, so we return null here
        // The middleware will create the rate limiter as needed
        return null;
    }

    /**
     * Register an admin route with rate limiting.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/admin/dashboard')
     * @param callable $controller The controller to handle the request
     * @param Permissions|string $permission The permission node required to access this route
     * @param Rate|null $rateLimit The rate limit for this route (e.g., Rate::perMinute(60))
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param string|null $rateLimitNamespace Optional namespace for rate limiting (default: 'rate_limit')
     */
    public function registerAdminRouteWithRateLimit(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        Permissions | string $permission,
        ?Rate $rateLimit = null,
        array $methods = ['GET'],
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [
            AuthMiddleware::class,
            AdminMiddleware::class,
        ];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
            '_permission' => $permission,
        ];

        // Add rate limiting if configured
        if ($rateLimit !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = [
                'rate' => $rateLimit,
                'namespace' => $rateLimitNamespace ?? 'rate_limit',
            ];
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register an auth route with rate limiting.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/user/profile')
     * @param callable $controller The controller to handle the request
     * @param Rate|null $rateLimit The rate limit for this route (e.g., Rate::perMinute(60))
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param string|null $rateLimitNamespace Optional namespace for rate limiting (default: 'rate_limit')
     */
    public function registerAuthRouteWithRateLimit(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        ?Rate $rateLimit = null,
        array $methods = ['GET'],
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [AuthMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        // Add rate limiting if configured
        if ($rateLimit !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = [
                'rate' => $rateLimit,
                'namespace' => $rateLimitNamespace ?? 'rate_limit',
            ];
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register a public API route with rate limiting.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/public/data')
     * @param callable $controller The controller to handle the request
     * @param Rate|null $rateLimit The rate limit for this route (e.g., Rate::perMinute(60))
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param string|null $rateLimitNamespace Optional namespace for rate limiting (default: 'rate_limit')
     */
    public function registerApiRouteWithRateLimit(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        ?Rate $rateLimit = null,
        array $methods = ['GET'],
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        // Add rate limiting if configured
        if ($rateLimit !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = [
                'rate' => $rateLimit,
                'namespace' => $rateLimitNamespace ?? 'rate_limit',
            ];
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Register a route with custom rate limiting configuration.
     *
     * This method allows you to register any route with flexible rate limiting options.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route
     * @param callable $controller The controller to handle the request
     * @param array $middleware Array of middleware class names
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit The rate limit for this route (e.g., Rate::perMinute(60))
     * @param string|null $rateLimitNamespace Optional namespace for rate limiting (default: 'rate_limit')
     * @param string|null $rateLimitIdentifier Optional custom identifier for rate limiting (default: client IP)
     * @param array $routeAttributes Additional route attributes (e.g., '_permission', '_server')
     */
    public function registerRouteWithRateLimit(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        array $middleware = [],
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
        ?string $rateLimitIdentifier = null,
        array $routeAttributes = [],
    ): void {
        $routeAttributes['_controller'] = $controller;
        $routeAttributes['_middleware'] = $middleware;

        // Add rate limiting if configured
        if ($rateLimit !== null) {
            $middleware[] = Middleware\RateLimitMiddleware::class;
            $routeAttributes['_middleware'] = $middleware;
            $routeAttributes['_rate_limit'] = [
                'rate' => $rateLimit,
                'namespace' => $rateLimitNamespace ?? 'rate_limit',
                'identifier' => $rateLimitIdentifier, // null means use client IP
            ];
        }

        $routes->add($name, new Route(
            $path,
            $routeAttributes,
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            $methods
        ));
    }

    /**
     * Get rate limit configuration for a route.
     * Rate limits are OPT-IN only - they must be explicitly configured in ratelimit.json.
     * Developer defaults are only used to auto-populate the config file for admin visibility.
     *
     * @param string $routeName The route name
     * @param Rate|null $defaultRate The default rate limit from developer (used for auto-population only)
     * @param string|null $defaultNamespace The default namespace
     *
     * @return array|null Returns ['rate' => Rate, 'namespace' => string] or null if no rate limit configured
     */
    private function getRouteRateLimit(string $routeName, ?Rate $defaultRate = null, ?string $defaultNamespace = null): ?array
    {
        // Check if route exists in admin config
        $config = RateLimitConfig::getRateLimit($routeName, null, $defaultNamespace);

        // If route has config, use it
        if ($config !== null) {
            return $config;
        }

        // If route doesn't exist in config but has a default rate limit, auto-add it to config
        // This ensures new routes automatically appear in the admin panel for configuration
        // Routes are enabled by default if they have values (admin can disable individually)
        if ($defaultRate !== null && !RateLimitConfig::routeExistsInConfig($routeName)) {
            try {
                // Convert Rate object to config format
                $rateConfig = RateLimitConfig::rateToConfig($defaultRate);
                if ($rateConfig) {
                    $routeConfig = [
                        ...$rateConfig,
                        'namespace' => $defaultNamespace ?? 'rate_limit',
                        // Don't set _enabled - routes with values are enabled by default
                    ];

                    // Auto-save to config file (silently fail if file is not writable)
                    RateLimitConfig::updateRouteConfig($routeName, $routeConfig);
                    RateLimitConfig::reloadConfig();
                }
            } catch (\Exception $e) {
                // Log error but don't fail
                self::getLogger()->warning('Failed to auto-add route to rate limit config: ' . $e->getMessage());
            }
        }

        // Return null - rate limiting is disabled by default unless explicitly configured
        return null;
    }
}
