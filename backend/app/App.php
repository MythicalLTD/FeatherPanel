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
use App\Routing\RouteCache;
use Random\RandomException;
use App\Helpers\ApiResponse;
use App\Config\ConfigFactory;
use App\Logger\LoggerFactory;
use App\Runtime\WorkerRestart;
use App\Config\ConfigInterface;
use App\Plugins\ObsoleteAddons;
use App\Runtime\RequestContext;
use App\Helpers\RateLimitConfig;
use App\Runtime\RequestLifecycle;
use App\Middleware\AuthMiddleware;
use App\Telemetry\SentryTelemetry;
use App\Middleware\AdminMiddleware;
use App\Middleware\WingsMiddleware;
use App\Middleware\ServerMiddleware;
use Symfony\Component\Routing\Route;
use App\Plugins\Events\Events\AppEvent;
use App\Middleware\FeatherQuilldMiddleware;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\Matcher\CompiledUrlMatcher;
use Symfony\Component\Routing\Matcher\UrlMatcherInterface;
use Symfony\Component\Routing\RequestContext as RoutingContext;
use Symfony\Component\Routing\Exception\MethodNotAllowedException;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\Routing\Matcher\Dumper\CompiledUrlMatcherDumper;

class App
{
    /** Seconds a connection may sit idle between requests before it is pinged. */
    private const CONNECTION_CHECK_IDLE_SECONDS = 2.0;

    public static App $instance;
    public Database $db;
    public RouteCollection $routes;
    public array $middleware = [];
    private ?\Redis $redisConnection = null;
    private bool $redisAvailable = false;
    private float $redisRetryAt = 0.0;
    private float $redisRetryDelay = 5.0;

    /** Whether the HTTP boot (database, plugin kernels, routes) completed. */
    private bool $httpBooted = false;
    private ?\Throwable $bootError = null;
    private int $handledRequests = 0;
    private array | false | null $compiledRoutes = null;
    private int $compiledRouteCount = 0;

    /**
     * Route cache state (see App\Routing\RouteCache): false = not usable in
     * this process, null = not loaded yet.
     *
     * @var array{files: list<string>, compiled: array}|false|null
     */
    private array | false | null $routeCache = null;

    /** @var list<string>|null route files of this boot, in registration order */
    private ?array $routeFiles = null;

    /** @var array<string, RouteCollection> routes of single route files, loaded on demand */
    private array $routeFileCollections = [];

    /**
     * Boot the application.
     *
     * @param bool $softBoot only load the environment (no database, no router)
     * @param bool $isCron boot for cron jobs (database, no plugins, no router)
     * @param bool $isCli boot for CLI commands and tests (database only)
     * @param bool $dispatch handle the current request right away (classic entry
     *                       points); the FrankenPHP worker boots once with false and
     *                       calls handle() for every request instead
     */
    public function __construct(bool $softBoot, bool $isCron = false, bool $isCli = false, bool $dispatch = true)
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

        if ($isCron && !defined('CRON_MODE')) {
            define('CRON_MODE', true);
        }

        // If running in test mode, skip Redis and plugin manager, just init DB
        if ($isCli) {
            $this->connectDatabase();

            return;
        }

        /**
         * Redis.
         */
        $this->connectRedis();

        if ($isCron) {
            try {
                $this->connectDatabase();
            } catch (\Exception $e) {
                SentryTelemetry::captureException($e);
                self::getLogger()->error('Database connection failed: ' . $e->getMessage(), false);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Database connection failed',
                    'exception' => $e->getMessage(),
                    'success' => false,
                    'error_code' => 'DATABASE_CONNECTION_FAILED',
                    'error_message' => 'Database connection failed',
                ]);
                exit(1);
            }

            return;
        }

        $this->bootHttp();

        if ($dispatch) {
            $this->handle();
        }
    }

    /**
     * Connect the database, load the plugin kernels and register the routes.
     *
     * Idempotent: once it succeeded it returns right away. When the database was
     * unreachable it can be called again later (a FrankenPHP worker retries on
     * the next request instead of dying).
     *
     * @return bool true when the application is ready to route requests
     */
    public function bootHttp(): bool
    {
        if ($this->httpBooted) {
            return true;
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
            $this->connectDatabase();
        } catch (\Exception $e) {
            $this->bootError = $e;
            SentryTelemetry::captureException($e);
            self::getLogger()->error('Database connection failed: ' . $e->getMessage(), false);

            return false;
        }

        /**
         * Initialize the plugin manager.
         */
        if (!defined('CRON_MODE')) {
            if (isset($pluginManager)) {
                $pluginManager->loadKernel();
            } else {
                self::getLogger()->warning('Plugin manager was not initialized. Skipping kernel load.');
            }
            if (!defined('LOGGER')) {
                define('LOGGER', $this->getLogger());
            }
        }

        // Force PHP's default timezone to UTC for the entire request.
        //
        // Every datetime that gets persisted to the database is generated from
        // PHP's `date()`/`DateTime`/`->format(...)` family of helpers, all of
        // which honour `date_default_timezone_set`. If we leave this on the
        // admin-configured panel timezone (e.g. Europe/Paris), those helpers
        // emit local-time literals, MySQL stores them verbatim into DATETIME
        // columns, and the frontend which now correctly interprets every API
        // datetime as UTC ends up displaying them shifted by the panel
        // offset (e.g. a row created "now" gets labelled "in 2 hours").
        //
        // The `app_timezone` setting is retained as a display fallback in the
        // frontend, where it belongs. Storage is always UTC.
        date_default_timezone_set('UTC');

        // With the route cache the full collection is only built when
        // something asks for it (a plugin listening to onRouterReady that
        // touches the router, or code reading App::$routes); requests are
        // matched against the compiled cache instead.
        $this->routeFiles = null;
        $this->routeFileCollections = [];
        $this->routeCache = RouteCache::isEnabled() ? null : false;
        if ($this->routeCache === null) {
            $this->routes = self::lazyRouteCollection(function (RouteCollection $routes): void {
                $this->registerApiRoutes($routes);
            });
        } else {
            $this->routes = new RouteCollection();
            $this->registerApiRoutes($this->routes);
        }
        if (isset($eventManager)) {
            $eventManager->emit(
                AppEvent::onRouterReady(),
                [
                    'router' => $this->routes,
                ]
            );
        }

        $this->compiledRoutes = null;
        $this->bootError = null;
        $this->httpBooted = true;

        return true;
    }

    /**
     * Handle one HTTP request: route it, send the response and run the
     * per-request cleanup. Used by public/index.php (once per process) and by
     * the FrankenPHP worker (once per request).
     *
     * @param Request|null $request the request, built from the superglobals when null
     * @param float|null $startTime microtime(true) at which the request started
     */
    public function handle(?Request $request = null, ?float $startTime = null): Response
    {
        RequestContext::begin($startTime);
        if (!defined('REQUEST_ID')) {
            // Backwards compatibility for plugins; core code uses RequestContext::id().
            define('REQUEST_ID', RequestContext::id());
        }
        RequestLifecycle::reset();

        $response = $this->dispatch($request ?? Request::createFromGlobals());
        $response->send();

        RequestLifecycle::terminate($response->getStatusCode());

        return $response;
    }

    /**
     * Whether Redis is reachable right now (re-evaluated between requests,
     * unlike the REDIS_ENABLED constant which keeps its boot-time value).
     */
    public function isRedisEnabled(): bool
    {
        return $this->redisAvailable && $this->redisConnection !== null;
    }

    /**
     * Register all api endpoints using Symfony Routing.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance
     */
    public function registerApiRoutes(RouteCollection $routes): void
    {
        foreach ($this->getRouteFiles() as $file) {
            $this->registerRouteFile($routes, $file);
        }
    }

    /**
     * Every route file in registration order: the core routes, then the routes
     * of each addon (backend/storage/addons/<addon>/Routes/).
     *
     * @return list<string>
     */
    public function getRouteFiles(): array
    {
        if ($this->routeFiles !== null) {
            return $this->routeFiles;
        }

        $files = [];

        // Core application routes
        $routesDir = __DIR__ . '/routes';
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($routesDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        // Plugin routes from backend/storage/addons/*/Routes/
        $addonsDir = __DIR__ . '/../storage/addons';
        if (is_dir($addonsDir)) {
            $addonIdentifiers = [];
            foreach (new \DirectoryIterator($addonsDir) as $entry) {
                if ($entry->isDir() && !$entry->isDot()) {
                    $addonIdentifiers[$entry->getBasename()] = true;
                }
            }

            $pluginDirs = new \DirectoryIterator($addonsDir);
            foreach ($pluginDirs as $pluginDir) {
                if ($pluginDir->isDir() && !$pluginDir->isDot()) {
                    $currentAddonId = $pluginDir->getBasename();
                    if (ObsoleteAddons::isObsolete($currentAddonId)) {
                        continue;
                    }
                    $pluginRoutesDir = $pluginDir->getPathname() . '/Routes';
                    if (is_dir($pluginRoutesDir)) {
                        $pluginIterator = new \RecursiveIteratorIterator(
                            new \RecursiveDirectoryIterator($pluginRoutesDir, \FilesystemIterator::SKIP_DOTS),
                            \RecursiveIteratorIterator::SELF_FIRST
                        );

                        foreach ($pluginIterator as $file) {
                            if ($file->isFile() && $file->getExtension() === 'php') {
                                $routeBasename = $file->getBasename('.php');
                                if (
                                    isset($addonIdentifiers[$routeBasename])
                                    && $routeBasename !== $currentAddonId
                                ) {
                                    self::getLogger()->warning(
                                        'Skipping addon route file whose name matches another addon identifier '
                                        . "(likely a mistaken copy): {$file->getPathname()}"
                                    );

                                    continue;
                                }
                                $files[] = $file->getPathname();
                            }
                        }
                    }
                }
            }
        }

        return $this->routeFiles = $files;
    }

    /**
     * Run one route file against a collection. A broken plugin route file is
     * logged and skipped; a broken core route file is a bug and throws.
     */
    public function registerRouteFile(RouteCollection $routes, string $file): void
    {
        $isCore = str_starts_with($file, __DIR__ . '/routes');
        try {
            $register = require $file;
            if (is_callable($register)) {
                $register($routes);
            }
        } catch (\Throwable $e) {
            if ($isCore) {
                throw $e;
            }
            self::getLogger()->error('Failed to load plugin routes from ' . $file . ': ' . $e->getMessage());
        }
    }

    /**
     * Dispatch the request using Symfony Routing and handle middleware.
     *
     * @deprecated use handle(), which also runs the per-request lifecycle hooks
     */
    public function dispatchSymfonyRouter(): void
    {
        $this->handle();
    }

    /**
     * Route a request through the middleware stack and return the response
     * without sending it.
     */
    public function dispatch(Request $request): Response
    {
        if (!$this->bootHttp() || !$this->ensureConnections()) {
            $response = $this->databaseUnavailableResponse();
            $response->headers->set('X-Request-ID', RequestContext::id());

            return $response;
        }

        ++$this->handledRequests;
        $context = new RoutingContext();
        $context->fromRequest($request);

        try {
            [$parameters, $routePath] = $this->matchRoute($context, $request->getPathInfo());
            SentryTelemetry::startRequest($request, $routePath);
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
                    }
                    ;
                },
                function ($request) {
                    return new Response('No controller found', 500);
                }
            )($request);

            if (!$response instanceof Response) {
                $response = new Response($response);
            }
        } catch (ResourceNotFoundException $e) {
            $response = ApiResponse::error('The api route does not exist! [' . $request->getPathInfo() . ']', 'API_ROUTE_NOT_FOUND', 404, null);
        } catch (MethodNotAllowedException $e) {
            $response = ApiResponse::error('Method not allowed for this route. Allowed: ' . implode(', ', $e->getAllowedMethods()), 'METHOD_NOT_ALLOWED', 405, null);
        } catch (BadRequestException $e) {
            // Malformed client input (e.g. ?search[]=x where a scalar is expected) is a 400, not a server error.
            $response = ApiResponse::error('Invalid request: ' . $e->getMessage(), 'INVALID_REQUEST', 400, null);
        } catch (\Throwable $e) {
            $eventId = SentryTelemetry::captureException($e);
            self::getLogger()->error(
                'Exception in router: [' . get_class($e) . '] ' .
                'Message: ' . $e->getMessage() .
                ' Code: ' . $e->getCode() .
                ' File: ' . $e->getFile() .
                ' Line: ' . $e->getLine() .
                ' Trace: ' . $e->getTraceAsString(),
                false
            );
            $response = ApiResponse::error('Internal server error', 'INTERNAL_SERVER_ERROR', 500, [
                'request_id' => RequestContext::id(),
                'event_id' => $eventId,
            ]);
        }
        $response->headers->set('X-Request-ID', RequestContext::id());
        SentryTelemetry::finishRequest($response->getStatusCode());

        if ($response->getStatusCode() < 400) {
            WorkerRestart::requestAfterAdminChange($request);
        }

        return $response;
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
     * Register a VM instance route (requires authentication and VM instance access).
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/user/vm-instances/{id}')
     * @param callable $controller The controller to handle the request
     * @param string $vmInstanceId The VM instance ID parameter name
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route (e.g., Rate::perMinute(60))
     *                             Admin can override this in ratelimit.json
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting (default: 'rate_limit')
     */
    public function registerVmInstanceRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        string $vmInstanceId,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [AuthMiddleware::class, Middleware\VmInstanceMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
            '_vmInstance' => $vmInstanceId,
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
     * Register a FeatherQuilld remote route (web hosting daemons only).
     *
     * Uses FeatherQuilldMiddleware — game node (FeatherWings) tokens are rejected.
     *
     * @param RouteCollection $routes The Symfony RouteCollection instance to add the route to
     * @param string $name The name of the route
     * @param string $path The URL path for the route (e.g. '/api/quilld-remote/config')
     * @param callable $controller The controller to handle the request
     * @param array $methods The HTTP methods allowed for this route (default: ['GET'])
     * @param Rate|null $rateLimit Optional default rate limit for this route
     * @param string|null $rateLimitNamespace Optional default namespace for rate limiting
     */
    public function registerQuilldRoute(
        RouteCollection $routes,
        string $name,
        string $path,
        callable $controller,
        array $methods = ['GET'],
        ?Rate $rateLimit = null,
        ?string $rateLimitNamespace = null,
    ): void {
        $middleware = [FeatherQuilldMiddleware::class];

        $routeAttributes = [
            '_controller' => $controller,
            '_middleware' => $middleware,
        ];

        $rateLimitConfig = $this->getRouteRateLimit($name, $rateLimit, $rateLimitNamespace);

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
                // Unsafe: also populate $_ENV (immutable only writes $_SERVER / putenv).
                $dotenv = \Dotenv\Dotenv::createUnsafeImmutable(__DIR__ . '/../storage/config');
                $dotenv->safeLoad();
            } else {
                throw new \RuntimeException('No .env file found');
            }
        } catch (\Dotenv\Exception\ExceptionInterface $e) {
            throw new \RuntimeException('Failed to load the .env file: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Read an environment variable from $_ENV, $_SERVER, or getenv().
     */
    public static function env(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        if ($value === false || $value === null) {
            return $default;
        }

        if (!is_string($value)) {
            return $default;
        }

        $trimmed = trim($value, " \t\"'");

        return $trimmed === '' ? $default : $trimmed;
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

            // Workers read the .env file once at boot.
            WorkerRestart::request('env:' . $key);

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

    public function getIPIntoFBIFormat(): string
    {
        $ip = '153.31.xxx.xx';
        $ip = str_replace('xxx', random_int(0, 255), $ip);
        $ip = str_replace('xx', random_int(0, 255), $ip);

        return $ip;
    }

    public function isDemoMode(): bool
    {
        return $this->getConfig()->getSetting(ConfigInterface::APP_DEMO_YES, 'false') === 'true';
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
        return (string) self::env($key, '');
    }

    public function encryptValue(string $value): string
    {
        return XChaCha20::encrypt($value, $this->getDatabaseEncryptionKey(), true);
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

        return XChaCha20::decrypt($value, $this->getDatabaseEncryptionKey(), true);
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
     * Match a path to a route.
     *
     * @return array{0: array<string, mixed>, 1: string} the route parameters and the route path
     */
    private function matchRoute(RoutingContext $context, string $path): array
    {
        $cache = $this->getRouteCache();
        if ($cache !== null) {
            $parameters = (new CompiledUrlMatcher($cache['compiled'], $context))->match($path);
            $resolved = $this->resolveCachedRoute($parameters, $cache['files']);
            if ($resolved !== null) {
                return $resolved;
            }

            // The route file no longer defines the cached route: stop trusting the cache in this process.
            self::getLogger()->warning('Route cache is out of date for route ' . ($parameters['_route'] ?? '?') . ', using the full route collection.');
            $this->routeCache = false;
        }

        $parameters = $this->getUrlMatcher($context)->match($path);

        return [$parameters, (string) $this->routes->get($parameters['_route'])?->getPath()];
    }

    /**
     * The compiled route cache, or null when this process uses the full route collection.
     *
     * @return array{files: list<string>, compiled: array}|null
     */
    private function getRouteCache(): ?array
    {
        if ($this->routeCache === false) {
            return null;
        }
        if (!self::isUninitializedLazyObject($this->routes)) {
            // A plugin listening to onRouterReady (or other code) used the
            // full collection; it may have changed it, so match against it.
            $this->routeCache = false;

            return null;
        }
        if (is_array($this->routeCache)) {
            return $this->routeCache;
        }

        $files = $this->getRouteFiles();
        $fingerprint = RouteCache::fingerprint($files, defined('APP_VERSION') ? (string) APP_VERSION : '');
        $store = RouteCache::default();

        $cache = $store->load($fingerprint);
        if ($cache === null) {
            try {
                $cache = $this->buildRouteCache($store, $fingerprint, $files);
            } catch (\Throwable $e) {
                self::getLogger()->warning('Building the route cache failed, using the full route collection: ' . $e->getMessage());
                $cache = null;
            }
        }

        $this->routeCache = $cache ?? false;

        return $cache;
    }

    /**
     * Register every route file, remember which file registered which route
     * and write the compiled cache.
     *
     * @param list<string> $files
     *
     * @return array{files: list<string>, compiled: array}|null
     */
    private function buildRouteCache(RouteCache $store, string $fingerprint, array $files): ?array
    {
        $routes = new RouteCollection();
        $sources = [];
        foreach ($files as $index => $file) {
            $fileRoutes = new RouteCollection();
            $this->registerRouteFile($fileRoutes, $file);
            foreach (array_keys($fileRoutes->all()) as $name) {
                $sources[$name] = $index;
            }
            $routes->addCollection($fileRoutes);
        }

        // Route files are loaded one at a time when matching, so the result
        // must not depend on what other files registered before (a file that
        // removes or reads another file's routes). Compare with a normal build.
        $reference = new RouteCollection();
        $this->registerApiRoutes($reference);
        if (self::routeSignature($reference) !== self::routeSignature($routes)) {
            self::getLogger()->warning('Route files depend on each other, the route cache is disabled.');

            return null;
        }

        return $store->build($fingerprint, $routes, $files, $sources);
    }

    /**
     * @return list<string>
     */
    private static function routeSignature(RouteCollection $routes): array
    {
        $signature = [];
        foreach ($routes->all() as $name => $route) {
            $signature[] = $name . ' ' . implode('|', $route->getMethods()) . ' ' . $route->getHost() . $route->getPath();
        }

        return $signature;
    }

    /**
     * Turn a match from the compiled cache into the parameters of the real
     * route: its controller and middleware come from its route file, loaded
     * once per process.
     *
     * @param array<string, mixed> $parameters
     * @param list<string> $files
     *
     * @return array{0: array<string, mixed>, 1: string}|null null when the route file does not define the route
     */
    private function resolveCachedRoute(array $parameters, array $files): ?array
    {
        $index = $parameters[RouteCache::SOURCE_KEY] ?? null;
        $name = $parameters['_route'] ?? null;
        if (!is_int($index) || !isset($files[$index]) || !is_string($name)) {
            return null;
        }

        $file = $files[$index];
        if (!isset($this->routeFileCollections[$file])) {
            $collection = new RouteCollection();
            $this->registerRouteFile($collection, $file);
            $this->routeFileCollections[$file] = $collection;
        }
        $route = $this->routeFileCollections[$file]->get($name);
        if ($route === null) {
            return null;
        }

        unset($parameters[RouteCache::SOURCE_KEY]);
        // Same merge as Symfony's matchers: matched values win over defaults.
        $resolved = $route->getDefaults();
        foreach ($parameters as $key => $value) {
            if ($value !== null) {
                $resolved[$key] = $value;
            }
        }

        return [$resolved, $route->getPath()];
    }

    /**
     * A RouteCollection that registers the routes the first time it is used.
     *
     * @param \Closure(RouteCollection): void $initializer
     */
    private static function lazyRouteCollection(\Closure $initializer): RouteCollection
    {
        return (new \ReflectionClass(RouteCollection::class))->newLazyGhost($initializer);
    }

    private static function isUninitializedLazyObject(object $object): bool
    {
        return (new \ReflectionClass($object))->isUninitializedLazyObject($object);
    }

    /**
     * The URL matcher for the registered routes.
     *
     * A process that serves more than one request (FrankenPHP worker) compiles
     * the route collection once, which makes matching much cheaper than the
     * linear UrlMatcher. A single-request process (classic mode) skips the
     * compilation because it would cost more than it saves.
     */
    private function getUrlMatcher(RoutingContext $context): UrlMatcherInterface
    {
        if ($this->handledRequests > 1 && $this->compiledRoutes !== false) {
            $routeCount = $this->routes->count();
            if ($this->compiledRoutes === null || $this->compiledRouteCount !== $routeCount) {
                try {
                    $this->compiledRoutes = (new CompiledUrlMatcherDumper($this->routes))->getCompiledRoutes();
                    $this->compiledRouteCount = $routeCount;
                } catch (\Throwable $e) {
                    self::getLogger()->warning('Route compilation failed, using the uncompiled matcher: ' . $e->getMessage());
                    $this->compiledRoutes = false;
                }
            }
            if (is_array($this->compiledRoutes)) {
                return new CompiledUrlMatcher($this->compiledRoutes, $context);
            }
        }

        return new UrlMatcher($this->routes, $context);
    }

    /**
     * Make sure the database and Redis connections survived the idle time
     * since the previous request (database or Redis restarts, wait_timeout).
     * Only processes that already served a request check, so classic mode
     * never pays for it.
     *
     * @return bool false when the database is unreachable
     */
    private function ensureConnections(): bool
    {
        $idle = Database::secondsSinceLastRequest();
        if ($idle === null || ($idle < self::CONNECTION_CHECK_IDLE_SECONDS && !Database::lastRequestFailed())) {
            return true;
        }

        Database::dropDeadSharedConnection();
        try {
            $this->db->ensureConnected();
        } catch (\Exception $e) {
            self::getLogger()->error('Database reconnect failed: ' . $e->getMessage(), false);
            $this->bootError = $e;

            return false;
        }

        $this->ensureRedis();

        return true;
    }

    /**
     * The response returned while the database is unreachable.
     */
    private function databaseUnavailableResponse(): Response
    {
        return new Response(
            (string) json_encode([
                'status' => 'error',
                'message' => 'Database connection failed',
                'exception' => $this->bootError?->getMessage() ?? 'Database connection failed',
                'success' => false,
                'error_code' => 'DATABASE_CONNECTION_FAILED',
                'error_message' => 'Database connection failed',
            ]),
            500,
            [
                'Content-Type' => 'application/json',
                'Cache-Control' => 'no-cache, private',
            ]
        );
    }

    /**
     * Connect (or reconnect) the application database.
     */
    private function connectDatabase(): void
    {
        $this->db = new Database(
            (string) self::env('DATABASE_HOST', '127.0.0.1'),
            (string) self::env('DATABASE_DATABASE', ''),
            (string) self::env('DATABASE_USER', ''),
            (string) self::env('DATABASE_PASSWORD', ''),
            (int) self::env('DATABASE_PORT', '3306'),
        );
    }

    /**
     * Connect Redis (used for rate limiting and, optionally, the cache).
     */
    private function connectRedis(): void
    {
        $this->redisConnection = null;
        $this->redisAvailable = false;

        $host = (string) self::env('REDIS_HOST', '127.0.0.1');
        $port = (int) self::env('REDIS_PORT', '6379');
        $password = self::env('REDIS_PASSWORD', null);

        if (class_exists(\Redis::class)) {
            try {
                $connection = new \Redis();
                if ($connection->connect($host, $port, 2.0)) {
                    if ($password !== null && $password !== '' && $connection->auth($password) === false) {
                        throw new \RuntimeException('Redis authentication failed');
                    }
                    $this->redisConnection = $connection;
                    $this->redisAvailable = true;
                }
            } catch (\Throwable $e) {
                self::getLogger()->error('Failed to connect to Redis: ' . $e->getMessage());
                $this->redisConnection = null;
            }
        } else {
            $this->redisAvailable = (new FastChat\Redis())->testConnection();
        }

        if (!defined('REDIS_ENABLED')) {
            // Backwards compatibility: boot-time value only, see isRedisEnabled().
            define('REDIS_ENABLED', $this->redisAvailable);
        }

        if ($this->redisAvailable) {
            $this->redisRetryDelay = 5.0;
        } else {
            $this->redisRetryAt = microtime(true) + $this->redisRetryDelay;
            $this->redisRetryDelay = min(60.0, $this->redisRetryDelay * 2);
        }
    }

    /**
     * Ping Redis and reconnect after a Redis restart, retrying an unreachable
     * Redis with a growing back-off so requests do not wait on connect timeouts.
     */
    private function ensureRedis(): void
    {
        if ($this->redisConnection !== null) {
            try {
                $this->redisConnection->ping();

                return;
            } catch (\Throwable) {
                $this->redisConnection = null;
                $this->redisAvailable = false;
                $this->redisRetryAt = 0.0;
                $this->redisRetryDelay = 5.0;
            }
        }

        if (class_exists(\Redis::class) && microtime(true) >= $this->redisRetryAt) {
            $this->connectRedis();
        }
    }

    /**
     * Resolve DATABASE_ENCRYPTION_KEY from $_ENV, $_SERVER, or getenv().
     *
     * Dotenv immutable loads into $_SERVER; PHP-FPM may not mirror keys into $_ENV.
     */
    private function getDatabaseEncryptionKey(): string
    {
        $key = self::env('DATABASE_ENCRYPTION_KEY');
        if ($key === null || $key === '') {
            throw new \RuntimeException('DATABASE_ENCRYPTION_KEY is not configured');
        }

        return $key;
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
