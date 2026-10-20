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
use App\Chat\Role;
use App\Cache\Cache;
use App\Chat\Database;
use App\Chat\Permission;
use App\Runtime\RequestContext;
use PHPUnit\Framework\TestCase;
use App\Helpers\PermissionHelper;
use App\Runtime\RequestLifecycle;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\Matcher\CompiledUrlMatcher;
use Symfony\Component\Routing\RequestContext as RoutingContext;
use Symfony\Component\Routing\Matcher\Dumper\CompiledUrlMatcherDumper;

/**
 * Several requests handled by one long-lived process, the way a FrankenPHP
 * worker runs them. Needs the test database.
 */
class WorkerSafeAppTest extends TestCase
{
    private static ?App $app = null;

    public static function setUpBeforeClass(): void
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
            self::$app = new App(false, false, false, false);
        } finally {
            ini_set('error_log', (string) $previousLog);
        }
    }

    public function testBackToBackRequestsGetTheirOwnContext(): void
    {
        $generation = RequestContext::generation();

        [$first, $firstBody] = $this->handle('/api/system/health');
        [$missing] = $this->handle('/api/does-not-exist');
        [$third, $thirdBody] = $this->handle('/api/system/health');

        $this->assertSame(200, $first->getStatusCode());
        $this->assertSame('classic', $firstBody['data']['php_mode'] ?? null);
        $this->assertSame(404, $missing->getStatusCode());
        $this->assertSame(200, $third->getStatusCode(), 'later requests are routed by the compiled matcher');
        $this->assertSame($firstBody['data'], $thirdBody['data']);

        $ids = array_map(static fn (Response $r) => $r->headers->get('X-Request-ID'), [$first, $missing, $third]);
        $this->assertCount(3, array_unique(array_filter($ids)), 'every request gets its own X-Request-ID');
        $this->assertSame($generation + 3, RequestContext::generation());
    }

    public function testCompiledMatcherRoutesLikeTheDynamicMatcher(): void
    {
        $routes = self::$app->routes;
        $compiled = new CompiledUrlMatcher((new CompiledUrlMatcherDumper($routes))->getCompiledRoutes(), new RoutingContext());
        $dynamic = new UrlMatcher($routes, new RoutingContext());

        $checked = 0;
        foreach ($routes->all() as $name => $route) {
            $method = $route->getMethods()[0] ?? 'GET';
            $path = (string) preg_replace('/\{[^}]+\}/', '1', $route->getPath());
            $this->assertSame(
                $this->matchRoute($dynamic, $method, $path),
                $this->matchRoute($compiled, $method, $path),
                "route {$name} ({$method} {$path})"
            );
            ++$checked;
        }
        $this->assertGreaterThan(100, $checked);
    }

    public function testRevokedPermissionIsNotServedFromTheRequestMemo(): void
    {
        $roleId = Role::createRole(['name' => 'worker_test_' . bin2hex(random_bytes(4)), 'display_name' => 'Worker test', 'color' => '#000000']);
        $this->assertIsInt($roleId);

        try {
            $permissionId = Permission::createPermission(['role_id' => $roleId, 'permission' => 'admin.users.list']);
            $this->assertIsInt($permissionId);

            RequestContext::begin();
            $this->assertContains('admin.users.list', PermissionHelper::getPermissionNodesForRole($roleId));

            // Another worker revokes it: the row and the shared cache entry are
            // gone, but this worker still has the role memoised.
            Database::getPdoConnection()->prepare('DELETE FROM featherpanel_permissions WHERE id = ?')->execute([$permissionId]);
            Cache::forget('role_permissions:' . $roleId);
            $this->assertContains('admin.users.list', PermissionHelper::getPermissionNodesForRole($roleId), 'memo lives for one request');

            RequestContext::begin();
            $this->assertNotContains('admin.users.list', PermissionHelper::getPermissionNodesForRole($roleId), 'the next request sees the revoke');
        } finally {
            Role::deleteRole($roleId);
        }
    }

    public function testOpenTransactionIsRolledBackWhenTheRequestEnds(): void
    {
        $pdo = Database::getPdoConnection();
        $name = 'worker_test_' . bin2hex(random_bytes(6));

        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO featherpanel_settings (name, value) VALUES (?, ?)')->execute([$name, 'x']);

        $previousLog = ini_set('error_log', '/dev/null');
        try {
            RequestLifecycle::terminate(500);
        } finally {
            ini_set('error_log', (string) $previousLog);
        }

        $this->assertFalse($pdo->inTransaction());
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_settings WHERE name = ?');
        $stmt->execute([$name]);
        $this->assertSame(0, (int) $stmt->fetchColumn());
        $this->assertTrue(Database::lastRequestFailed());
    }

    public function testKilledDatabaseConnectionIsReplacedBeforeTheNextRequest(): void
    {
        $old = self::$app->db->getPdo();
        $connectionId = (int) $old->query('SELECT CONNECTION_ID()')->fetchColumn();

        // Models share the application's connection (other tests may have left their own behind).
        (new ReflectionProperty(Database::class, 'sharedPdo'))->setValue(null, null);
        $this->assertSame($old, Database::getPdoConnection());

        // Kill it from a second connection, like a database restart or wait_timeout would.
        $killer = (new Database(
            (string) App::env('DATABASE_HOST', '127.0.0.1'),
            (string) App::env('DATABASE_DATABASE', ''),
            (string) App::env('DATABASE_USER', ''),
            (string) App::env('DATABASE_PASSWORD', ''),
            (int) App::env('DATABASE_PORT', '3306'),
        ))->getPdo();
        $killer->exec('KILL ' . $connectionId);
        usleep(100000);
        $this->assertFalse(Database::isAlive($old));

        // Pretend the worker was idle long enough for the connection check to run.
        $finishedAt = new ReflectionProperty(Database::class, 'lastRequestFinishedAt');
        $finishedAt->setValue(null, microtime(true) - 10);

        [$response] = $this->handle('/api/system/health');

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotSame($old, self::$app->db->getPdo());
        $this->assertTrue(Database::isAlive(self::$app->db->getPdo()));
        $this->assertSame(self::$app->db->getPdo(), Database::getPdoConnection(), 'models follow the reconnected connection');
    }

    /**
     * @return array{0: Response, 1: array<string, mixed>}
     */
    private function handle(string $path): array
    {
        ob_start();
        try {
            $response = self::$app->handle(Request::create($path));
        } finally {
            $body = (string) ob_get_clean();
        }

        return [$response, (array) json_decode($body, true)];
    }

    private function matchRoute(object $matcher, string $method, string $path): string
    {
        $context = new RoutingContext();
        $context->setMethod($method);
        $matcher->setContext($context);
        try {
            return (string) $matcher->match($path)['_route'];
        } catch (Throwable $e) {
            return get_class($e);
        }
    }
}
