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
