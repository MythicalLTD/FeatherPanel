<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
