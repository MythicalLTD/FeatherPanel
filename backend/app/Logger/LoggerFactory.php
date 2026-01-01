<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Logger;

class LoggerFactory
{
    public $logFile;

    public function __construct(string $logFile)
    {
        $this->logFile = $logFile;
        if (!$this->doesLogFileExist()) {
            $this->createLogFile();
        }
    }

    public function info(string $message): void
    {
        $caller = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]['class'] ?? 'unknown';
        $this->appendLog('[INFO] [' . $caller . '] ' . $message);
    }

    public function warning(string $message, bool $sendTelemetry = false): void
    {
        $caller = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]['class'] ?? 'unknown';
        // $eventID = null;
        if ($sendTelemetry) {
            // $eventID = \Sentry\captureMessage($message, \Sentry\Severity::warning(), null);
        }
        $this->appendLog('[WARNING] [' . $caller . '] ' . $message);
    }

    public function error(string $message, bool $sendTelemetry = false): void
    {
        $caller = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]['class'] ?? 'unknown';
        // $eventID = null;
        if ($sendTelemetry) {
            // $eventID = \Sentry\captureMessage($message, \Sentry\Severity::error(), null);
        }
        $this->appendLog('[ERROR]  [' . $caller . '] ' . $message);
    }

    public function critical(string $message, bool $sendTelemetry = false): void
    {
        $caller = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]['class'] ?? 'unknown';
        // $eventID = null;
        if ($sendTelemetry) {
            // $eventID = \Sentry\captureMessage($message, \Sentry\Severity::fatal(), null);
        }
        $this->appendLog('[CRITICAL]  [' . $caller . '] ' . $message);
    }

    public function debug(string $message): void
    {
        if (APP_DEBUG == true) {
            $caller = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]['class'] ?? 'unknown';
            $this->appendLog('[DEBUG] [' . $caller . '] ' . $message);
        }
    }

    public function getLogs(bool $isWebServer = false): array
    {
        $logs = file($this->logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if (!$isWebServer) {
            return array_filter($logs, function ($log) {
                return !str_contains($log, '[DEBUG]');
            });
        }

        return $logs;
    }

    private function getFormattedDate(): string
    {
        return date('Y-m-d H:i:s');
    }

    private function appendLog(string $message): void
    {
        file_put_contents($this->logFile, '| (' . $this->getFormattedDate() . ') ' . $message . PHP_EOL, FILE_APPEND);
    }

    private function createLogFile(): void
    {
        if (!$this->doesLogFileExist()) {
            file_put_contents($this->logFile, '');
        }
    }

    private function doesLogFileExist(): bool
    {
        return file_exists($this->logFile);
    }
}
