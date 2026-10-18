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

namespace App\Runtime;

use Symfony\Component\HttpFoundation\Request;

/**
 * Restart signal for FrankenPHP workers.
 *
 * A worker boots the application (plugin kernels, routes, .env) once. Changes
 * that only take effect at boot (installing, updating or removing a plugin,
 * editing rate limits or the .env file) write a small stamp file. Every worker
 * checks the stamp between two requests and exits its loop when the stamp is
 * newer than its own boot, after which FrankenPHP starts a fresh copy. The
 * shipped Caddyfile also lets FrankenPHP `watch` the stamp directory, which
 * restarts idle workers right away.
 *
 * Writing the stamp is harmless in classic mode, where every request boots
 * the application anyway.
 */
final class WorkerRestart
{
    /** Admin endpoints whose successful writes change boot-time state. */
    private const ADMIN_PATH_PATTERN = '#^/api/admin/(plugins|plugin-manager|plugin-tools|rate-limits)(/|$)#';

    private static bool $workerMode = false;
    private static float $bootTime = 0.0;
    private static ?int $lastSeenMtime = null;

    /**
     * Path of the stamp file.
     */
    public static function stampPath(): string
    {
        return dirname(__DIR__, 2) . '/storage/caches/runtime/worker-restart.stamp';
    }

    /**
     * Called by the worker entry point once the application booted.
     */
    public static function markWorkerBoot(float $bootTime): void
    {
        self::$workerMode = true;
        self::$bootTime = $bootTime;
        self::$lastSeenMtime = null;
    }

    /**
     * Whether this process is a FrankenPHP worker.
     */
    public static function isWorkerMode(): bool
    {
        return self::$workerMode;
    }

    /**
     * Ask every worker to reload the application.
     *
     * @param string $reason short reason, written to the stamp for debugging
     */
    public static function request(string $reason): void
    {
        $path = self::stampPath();
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            error_log('Worker restart stamp directory is not writable: ' . $dir);

            return;
        }

        $reason = (string) preg_replace('/[^A-Za-z0-9 _.:\/-]/', '', substr($reason, 0, 120));
        if (@file_put_contents($path, sprintf('%.6f %s', microtime(true), $reason), LOCK_EX) === false) {
            error_log('Worker restart stamp is not writable: ' . $path);
        }
    }

    /**
     * Request a restart after a successful admin write that changes boot-time
     * state (plugin install/update/remove, plugin settings, rate limits).
     */
    public static function requestAfterAdminChange(Request $request): void
    {
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        $path = $request->getPathInfo();
        if (preg_match(self::ADMIN_PATH_PATTERN, $path) === 1) {
            self::request($request->getMethod() . ' ' . $path);
        }
    }

    /**
     * Whether a restart was requested after this worker booted. Costs one
     * stat() per call; the stamp is only read when its mtime changed.
     */
    public static function isRestartRequested(): bool
    {
        if (!self::$workerMode) {
            return false;
        }

        $path = self::stampPath();
        clearstatcache(true, $path);
        $mtime = @filemtime($path);
        // Skip the read when nothing changed (a stamp written within the last
        // second may share the previous mtime, so recent stamps are always read).
        if ($mtime === false || ($mtime === self::$lastSeenMtime && $mtime < time() - 1)) {
            return false;
        }
        self::$lastSeenMtime = $mtime;

        // filemtime() has a one-second resolution; the stamp carries the exact time.
        if ($mtime < (int) floor(self::$bootTime) - 1) {
            return false;
        }

        $content = @file_get_contents($path);
        if ($content === false) {
            return false;
        }
        $requestedAt = (float) strtok($content, ' ');

        return $requestedAt > self::$bootTime;
    }
}
