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

use App\App;
use App\Routing\RouteCache;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\Matcher\CompiledUrlMatcher;
use Symfony\Component\Routing\RequestContext as RoutingContext;

class RouteCacheTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/fp-route-cache-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->dir);
    }

    public function testSkeletonKeepsMatchDataAndDropsHandlers(): void
    {
        $routes = new RouteCollection();
        $routes->add('a', new Route('/api/a/{id}', ['_controller' => static fn () => null, '_middleware' => ['auth'], 'kind' => 'x'], ['id' => '\d+'], [], '', [], ['GET']));

        $skeleton = RouteCache::skeleton($routes, ['a' => 3]);

        $this->assertNotNull($skeleton);
        $route = $skeleton->get('a');
        $this->assertSame('/api/a/{id}', $route->getPath());
        $this->assertSame(['GET'], $route->getMethods());
        $this->assertSame('\d+', $route->getRequirement('id'));
        $this->assertSame(['kind' => 'x', RouteCache::SOURCE_KEY => 3], $route->getDefaults());
    }

    public function testSkeletonRefusesRoutesItCannotExport(): void
    {
        $routes = new RouteCollection();
        $routes->add('a', new Route('/a', ['handler' => new stdClass()]));
        $this->assertNull(RouteCache::skeleton($routes, ['a' => 0]), 'objects outside "_" defaults cannot be cached');

        $routes = new RouteCollection();
        $routes->add('b', new Route('/b'));
        $this->assertNull(RouteCache::skeleton($routes, []), 'a route without a known source file cannot be cached');
    }

    public function testBuildLoadAndInvalidation(): void
    {
        $file = $this->dir . '-routes.php';
        file_put_contents($file, '<?php return static function () {};');

        try {
            $routes = new RouteCollection();
            $routes->add('ping', new Route('/api/ping', [], [], [], '', [], ['GET']));

            $store = new RouteCache($this->dir);
            $fingerprint = RouteCache::fingerprint([$file], '1.0.0');
            $this->assertNull($store->load($fingerprint));

            $built = $store->build($fingerprint, $routes, [$file], ['ping' => 0]);
            $this->assertNotNull($built);
            $this->assertSame($built, $store->load($fingerprint));

            $context = new RoutingContext();
            $match = (new CompiledUrlMatcher($built['compiled'], $context))->match('/api/ping');
            $this->assertSame('ping', $match['_route']);
            $this->assertSame(0, $match[RouteCache::SOURCE_KEY]);

            // A new version, a changed route file or another file list is another cache.
            $this->assertNotSame($fingerprint, RouteCache::fingerprint([$file], '1.0.1'));
            $this->assertNotSame($fingerprint, RouteCache::fingerprint([$file, $file . '.plugin'], '1.0.0'));
            clearstatcache();
            touch($file, time() + 5);
            clearstatcache();
            $changed = RouteCache::fingerprint([$file], '1.0.0');
            $this->assertNotSame($fingerprint, $changed);

            // Writing a new fingerprint removes the old file.
            $store->build($changed, $routes, [$file], ['ping' => 0]);
            $this->assertNull($store->load($fingerprint));
            $this->assertCount(1, glob($this->dir . '/routes-*.php') ?: []);

            $store->clear();
            $this->assertNull($store->load($changed));
        } finally {
            @unlink($file);
        }
    }

    public function testDisableSwitch(): void
    {
        $previous = $_SERVER['FEATHERPANEL_ROUTE_CACHE'] ?? null;
        try {
            unset($_SERVER['FEATHERPANEL_ROUTE_CACHE']);
            $this->assertTrue(RouteCache::isEnabled());
            foreach (['false', '0', 'off', 'NO'] as $value) {
                $_SERVER['FEATHERPANEL_ROUTE_CACHE'] = $value;
                $this->assertFalse(RouteCache::isEnabled(), $value);
            }
            $_SERVER['FEATHERPANEL_ROUTE_CACHE'] = 'true';
            $this->assertTrue(RouteCache::isEnabled());
        } finally {
            if ($previous === null) {
                unset($_SERVER['FEATHERPANEL_ROUTE_CACHE']);
            } else {
                $_SERVER['FEATHERPANEL_ROUTE_CACHE'] = $previous;
            }
        }
    }

    /**
     * Every real route, matched through the cache and resolved from its route
     * file, gives the same route, path and parameters as the full collection.
     * Needs the test database (the app boots).
     */
    public function testCachedRoutesResolveLikeTheFullCollection(): void
    {
        $app = $this->bootApp();
        $files = $app->getRouteFiles();

        $build = new ReflectionMethod(App::class, 'buildRouteCache');
        $cache = $build->invoke($app, new RouteCache($this->dir), 'test', $files);
        $this->assertIsArray($cache, 'the core routes can be cached');

        $full = new RouteCollection();
        $app->registerApiRoutes($full);
        $resolve = new ReflectionMethod(App::class, 'resolveCachedRoute');

        $checked = 0;
        foreach ($full->all() as $name => $route) {
            $method = $route->getMethods()[0] ?? 'GET';
            $path = (string) preg_replace('/\{[^}]+\}/', '1', $route->getPath());
            $context = new RoutingContext();
            $context->setMethod($method);

            $expected = $this->normalise((new UrlMatcher($full, $context))->match($path));
            $resolved = $resolve->invoke($app, (new CompiledUrlMatcher($cache['compiled'], $context))->match($path), $cache['files']);
            $this->assertIsArray($resolved, "route {$name} resolves from its file");
            $this->assertSame($expected, $this->normalise($resolved[0]), "route {$name} ({$method} {$path})");
            $this->assertSame($full->get($expected['_route'])->getPath(), $resolved[1]);
            ++$checked;
        }
        $this->assertGreaterThan(500, $checked);
    }

    /**
     * Closures are re-created when a route file is loaded again: compare them by type.
     *
     * @param array<string, mixed> $parameters
     *
     * @return array<string, mixed>
     */
    private function normalise(array $parameters): array
    {
        ksort($parameters);

        return array_map(fn ($v) => $this->normaliseValue($v), $parameters);
    }

    private function normaliseValue(mixed $value): mixed
    {
        if ($value instanceof Closure) {
            return 'Closure';
        }
        if (is_object($value)) {
            return [get_class($value) => $this->normaliseValue((array) $value)];
        }
        if (is_array($value)) {
            return array_map(fn ($v) => $this->normaliseValue($v), $value);
        }

        return $value;
    }

    private function bootApp(): App
    {
        $backend = dirname(__DIR__, 2);
        foreach ([
            'APP_PUBLIC' => $backend . '/public',
            'APP_DIR' => $backend . '/',
            'APP_CRON_DIR' => $backend . '/storage/cron',
            'APP_LOGS_DIR' => $backend . '/storage/logs',
            'APP_SOURCECODE_DIR' => $backend . '/app',
            'APP_ROUTES_DIR' => $backend . '/app/Api',
            'APP_DEBUG' => false,
            'APP_VERSION' => 'test',
            'APP_UPSTREAM' => 'test',
            'TELEMETRY' => false,
            'SYSTEM_OS_NAME' => 'test',
            'SYSTEM_KERNEL_NAME' => 'test',
            'RATE_LIMIT' => 500000,
        ] as $name => $value) {
            if (!defined($name)) {
                define($name, $value);
            }
        }

        $previousLog = ini_set('error_log', '/dev/null');
        try {
            return App::$instance ?? new App(false, false, false, false);
        } finally {
            ini_set('error_log', (string) $previousLog);
        }
    }
}
