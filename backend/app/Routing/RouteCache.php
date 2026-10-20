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

namespace App\Routing;

use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Matcher\Dumper\CompiledUrlMatcherDumper;

/**
 * Compiled route cache.
 *
 * Route files register closures as controllers, which cannot be written to
 * disk. The cache therefore stores a "skeleton" of every route (path,
 * requirements, methods, host and the scalar defaults that act as path
 * placeholders) compiled with CompiledUrlMatcherDumper, plus the route file
 * that registered it. Matching a request then needs neither the 1,100+ Route
 * objects nor the compilation: the matched route's file is required on its own
 * to get the real controller and middleware (see App::dispatch()).
 *
 * The cache file name is a fingerprint of every route file (path, size,
 * mtime, inode) and the panel version, so installing, updating or removing a
 * plugin, editing a route file or upgrading the panel picks a new file;
 * nothing has to be invalidated by hand. Opcache keeps the cache file in
 * shared memory, so loading it costs next to nothing.
 *
 * FEATHERPANEL_ROUTE_CACHE=false disables it.
 */
final class RouteCache
{
    /** Default added to every skeleton route: index of its route file. */
    public const SOURCE_KEY = '_fp_route_source';

    private const FORMAT_VERSION = 1;

    public function __construct(private readonly string $directory)
    {
    }

    /** The cache in storage/caches/routes. */
    public static function default(): self
    {
        return new self((defined('APP_CACHE_DIR') ? APP_CACHE_DIR : dirname(__DIR__, 2) . '/storage/caches') . '/routes');
    }

    public static function isEnabled(): bool
    {
        $value = $_SERVER['FEATHERPANEL_ROUTE_CACHE'] ?? $_ENV['FEATHERPANEL_ROUTE_CACHE'] ?? getenv('FEATHERPANEL_ROUTE_CACHE');
        if ($value === false || $value === '') {
            return true;
        }

        return !in_array(strtolower(trim((string) $value)), ['0', 'false', 'no', 'off'], true);
    }

    /**
     * @param list<string> $files route files in registration order
     */
    public static function fingerprint(array $files, string $version): string
    {
        $context = hash_init('xxh128');
        hash_update($context, self::FORMAT_VERSION . "\0" . $version . "\0" . PHP_VERSION . "\0");
        foreach ($files as $file) {
            $stat = @stat($file);
            hash_update($context, $file . "\0" . ($stat === false ? '-' : $stat['size'] . ':' . $stat['mtime'] . ':' . $stat['ino']) . "\n");
        }

        return hash_final($context);
    }

    /**
     * @return array{files: list<string>, compiled: array}|null
     */
    public function load(string $fingerprint): ?array
    {
        $path = $this->path($fingerprint);
        if (!is_file($path)) {
            return null;
        }

        try {
            $data = include $path;
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($data) || ($data['fingerprint'] ?? null) !== $fingerprint || !is_array($data['files'] ?? null) || !is_array($data['compiled'] ?? null)) {
            return null;
        }

        return ['files' => $data['files'], 'compiled' => $data['compiled']];
    }

    /**
     * Compile the routes and write the cache file.
     *
     * @param list<string> $files route files, indexed as in $sources
     * @param array<string, int> $sources route name => index into $files
     *
     * @return array{files: list<string>, compiled: array}|null null when a route cannot be cached
     */
    public function build(string $fingerprint, RouteCollection $routes, array $files, array $sources): ?array
    {
        $skeleton = self::skeleton($routes, $sources);
        if ($skeleton === null) {
            return null;
        }

        $compiled = (new CompiledUrlMatcherDumper($skeleton))->getCompiledRoutes();
        $data = ['fingerprint' => $fingerprint, 'files' => array_values($files), 'compiled' => $compiled];
        $this->write($fingerprint, $data);

        return ['files' => $data['files'], 'compiled' => $compiled];
    }

    /**
     * Remove every cache file (e.g. from the admin "clear cache" action).
     */
    public function clear(): void
    {
        foreach (glob($this->directory . '/routes-*.php') ?: [] as $file) {
            @unlink($file);
        }
    }

    /**
     * A copy of the collection that can be compiled and exported: closures,
     * objects and the internal "_" defaults are left out (they are loaded from
     * the route file at match time).
     *
     * @param array<string, int> $sources
     */
    public static function skeleton(RouteCollection $routes, array $sources): ?RouteCollection
    {
        $skeleton = new RouteCollection();
        foreach ($routes->all() as $name => $route) {
            if (!isset($sources[$name])) {
                return null;
            }
            $defaults = [];
            foreach ($route->getDefaults() as $key => $value) {
                if (str_starts_with((string) $key, '_')) {
                    continue;
                }
                if (!self::isExportable($value)) {
                    return null;
                }
                $defaults[$key] = $value;
            }
            if (!self::isExportable($route->getOptions())) {
                return null;
            }
            $defaults[self::SOURCE_KEY] = $sources[$name];

            $skeleton->add($name, new Route(
                $route->getPath(),
                $defaults,
                $route->getRequirements(),
                $route->getOptions(),
                $route->getHost(),
                $route->getSchemes(),
                $route->getMethods(),
                $route->getCondition(),
            ));
        }

        return $skeleton;
    }

    private static function isExportable(mixed $value): bool
    {
        if ($value === null || is_scalar($value)) {
            return true;
        }
        if (is_array($value)) {
            foreach ($value as $item) {
                if (!self::isExportable($item)) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    private function path(string $fingerprint): string
    {
        return $this->directory . '/routes-' . $fingerprint . '.php';
    }

    private function write(string $fingerprint, array $data): void
    {
        if (!is_dir($this->directory) && !@mkdir($this->directory, 0775, true) && !is_dir($this->directory)) {
            return;
        }

        $path = $this->path($fingerprint);
        $tmp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
        $code = "<?php\n\n// Generated by FeatherPanel (App\\Routing\\RouteCache). Safe to delete.\n\nreturn " . var_export($data, true) . ";\n";
        if (@file_put_contents($tmp, $code, LOCK_EX) === false) {
            return;
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);

            return;
        }

        // Older fingerprints are dead files now.
        foreach (glob($this->directory . '/routes-*.php') ?: [] as $file) {
            if ($file !== $path) {
                @unlink($file);
            }
        }
    }
}
