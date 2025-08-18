<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App;

use RateLimit\Rate;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Config\ConfigFactory;
use App\Logger\LoggerFactory;
use App\Config\ConfigInterface;
use RateLimit\RedisRateLimiter;
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;
use App\Middleware\WingsMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Middleware\ServerMiddleware;
use Symfony\Component\Routing\Route;
use RateLimit\Exception\LimitExceeded;
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

    public function __construct(bool $softBoot, bool $isCron = false, bool $testMode = false)
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
        if ($testMode) {
            $this->db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);

            return;
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
            $rateLimiter = new RedisRateLimiter(Rate::perMinute(999999999), new \Redis(), 'rate_limiting');
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
                    'error_message' => 'You are being rate limited!',
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
                'error_message' => 'Database connection failed',
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

        $timezone = $this->getConfig()->getSetting(ConfigInterface::APP_TIMEZONE, 'UTC');
        if (!@date_default_timezone_set($timezone)) {
            self::getLogger()->warning("Invalid timezone '$timezone', falling back to UTC.");
            date_default_timezone_set('UTC');
        }

        $this->routes = new RouteCollection();
        $this->registerApiRoutes($this->routes);
        $eventManager->emit(
            AppEvent::onRouterReady(),
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

        // Log all registered routes at startup
        $routeList = [];
        foreach ($this->routes as $name => $route) {
            $routeList[] = [
                'name' => $name,
                'path' => $route->getPath(),
                'methods' => $route->getMethods(),
            ];
        }
        self::getLogger()->debug('Registered routes: ' . json_encode($routeList));

        // Log the incoming request
        self::getLogger()->debug('Attempting to match route: ' . $request->getMethod() . ' ' . $request->getPathInfo());

        try {
            $parameters = $matcher->match($request->getPathInfo());
            self::getLogger()->debug('Matched route: ' . ($parameters['_route'] ?? 'unknown') . ' with params: ' . json_encode($parameters));

            $controller = $parameters['_controller'];
            unset($parameters['_controller'], $parameters['_route']);

            // Set route parameters (like _permission) as request attributes
            foreach ($parameters as $key => $value) {
                if (str_starts_with($key, '_')) {
                    $request->attributes->set(ltrim($key, '_'), $value);
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
     */
    public function registerAdminRoute(RouteCollection $routes, string $name, string $path, callable $controller, Permissions|string $permission, array $methods = ['GET']): void
    {
        $routes->add($name, new Route(
            $path,
            [
                '_controller' => $controller,
                '_middleware' => [
                    AuthMiddleware::class,
                    AdminMiddleware::class,
                ],
                '_permission' => $permission,
            ],
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
     *
     * This will automatically add the AuthMiddleware to the route, ensuring only authenticated users can access it
     */
    public function registerAuthRoute(RouteCollection $routes, string $name, string $path, callable $controller, array $methods = ['GET']): void
    {
        $routes->add($name, new Route(
            $path,
            [
                '_controller' => $controller,
                '_middleware' => [AuthMiddleware::class],
            ],
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
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     */
    public function registerServerRoute(RouteCollection $routes, string $name, string $path, callable $controller, string $serverShortUuid, array $methods = ['GET']): void
    {
        $routes->add($name, new Route(
            $path,
            [
                '_controller' => $controller,
                '_middleware' => [AuthMiddleware::class, ServerMiddleware::class],
                '_server' => $serverShortUuid,
            ],
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
     */
    public function registerApiRoute(RouteCollection $routes, string $name, string $path, callable $controller, array $methods = ['GET']): void
    {
        $routes->add($name, new Route(
            $path,
            [
                '_controller' => $controller,
                '_middleware' => [],
            ],
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
     */
    public function registerWingsRoute(RouteCollection $routes, string $name, string $path, callable $controller, array $methods = ['GET']): void
    {
        $routes->add($name, new Route(
            $path,
            [
                '_controller' => $controller,
                '_middleware' => [WingsMiddleware::class],
            ],
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
        return new LoggerFactory(__DIR__ . '/../storage/logs/featherpanel-web.log');
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
