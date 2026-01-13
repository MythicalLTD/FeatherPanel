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

// Set up error handler to filter vendor deprecations
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    // Only filter deprecations (E_DEPRECATED = 8192)
    if ($errno === E_DEPRECATED) {
        // Check if the error is from a vendor/package directory
        $vendorPaths = [
            'storage/packages',
            'vendor',
        ];

        foreach ($vendorPaths as $vendorPath) {
            if (strpos($errfile, $vendorPath) !== false) {
                // Check if deprecation logging is enabled
                // Enabled by default; set TEST_LOG_DEPRECATIONS=0 to disable
                $envValue = getenv('TEST_LOG_DEPRECATIONS');
                $shouldLog = $envValue === false || ($envValue !== '0' && $envValue !== 'false');

                if ($shouldLog) {
                    // Get backtrace for context (limit depth to avoid huge logs)
                    $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5);
                    $backtraceStr = '';
                    if (!empty($backtrace)) {
                        $backtraceStr = "\nBacktrace:\n";
                        foreach ($backtrace as $index => $trace) {
                            $file = $trace['file'] ?? 'unknown';
                            $line = $trace['line'] ?? 0;
                            $function = $trace['function'] ?? 'unknown';
                            $class = isset($trace['class']) ? $trace['class'] . $trace['type'] : '';
                            $backtraceStr .= sprintf(
                                "  #%d %s%s() in %s:%d\n",
                                $index,
                                $class,
                                $function,
                                $file,
                                $line
                            );
                        }
                    }

                    // Format log entry
                    $logEntry = sprintf(
                        "[%s] DEPRECATED (suppressed) from vendor code\n" .
                        "  Error: %s\n" .
                        "  File: %s\n" .
                        "  Line: %d\n" .
                        "  Errno: %d%s\n\n",
                        date('Y-m-d H:i:s'),
                        $errstr,
                        $errfile,
                        $errline,
                        $errno,
                        $backtraceStr
                    );

                    // Write to test deprecation log file or stderr
                    $logFile = __DIR__ . '/../storage/logs/test-deprecations.log';
                    $logDir = dirname($logFile);

                    // Ensure log directory exists
                    if (!is_dir($logDir)) {
                        @mkdir($logDir, 0755, true);
                    }

                    // Try to write to file, fallback to stderr
                    if (is_writable($logDir) || is_writable($logFile)) {
                        @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
                    } else {
                        @fwrite(STDERR, $logEntry);
                    }
                }

                // Suppress vendor deprecations
                return true;
            }
        }
    }

    // Let other errors through
    return false;
}, E_DEPRECATED);

// Load the main autoloader
require_once __DIR__ . '/../storage/packages/autoload.php';
