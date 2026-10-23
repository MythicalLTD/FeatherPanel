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

namespace App\Cron;

use App\App;

class Cron
{
    /**
     * @var array<string, int> Supported time units and their length in seconds
     */
    private const TIME_UNITS = [
        'S' => 1,               // Seconds
        'M' => 60,              // Minutes
        'H' => 3600,            // Hours
        'D' => 86400,           // Days
        'W' => 604800,          // Weeks
        'MO' => 2592000,        // Months (approx. 30 days)
        'Y' => 31536000,        // Years (365 days)
    ];

    /**
     * @var string The unique identifier for this cron job
     */
    private string $identifier;

    /**
     * @var int Seconds between executions
     */
    private int $interval;

    /**
     * @var string Path to store last run timestamps
     */
    private string $storageFile;

    /**
     * Initialize a new Cron instance.
     *
     * @param string $identifier Unique identifier for this cron job
     * @param string $interval Interval string (e.g., "30S", "30M", "1H", "1D")
     *
     * @throws \Exception If interval format is invalid
     */
    public function __construct(string $identifier, string $interval)
    {
        $this->identifier = $identifier;
        $this->interval = $this->parseInterval($interval);
        $this->storageFile = $this->getStoragePath();

        // Ensure storage directory exists
        if (!is_dir(dirname($this->storageFile))) {
            mkdir(dirname($this->storageFile), 0755, true);
        }
    }

    /**
     * Check if the cron job should run.
     */
    public function shouldRun(): bool
    {
        if (!file_exists($this->storageFile)) {
            return true;
        }

        $lastRun = (int) file_get_contents($this->storageFile);

        return (time() - $lastRun) >= $this->interval;
    }

    /**
     * Mark the cron job as run.
     */
    public function markAsRun(): void
    {
        file_put_contents($this->storageFile, time());
    }

    /**
     * Get the last run time.
     */
    public function getLastRunTime(): ?\DateTime
    {
        if (!file_exists($this->storageFile)) {
            return null;
        }

        $timestamp = (int) file_get_contents($this->storageFile);

        return (new \DateTime())->setTimestamp($timestamp);
    }

    /**
     * Get the next scheduled run time.
     */
    public function getNextRunTime(): \DateTime
    {
        $lastRun = $this->getLastRunTime() ?? new \DateTime();
        $nextRun = clone $lastRun;

        return $nextRun->modify("+{$this->interval} seconds");
    }

    /**
     * Execute the cron job if it's due.
     *
     * @param callable $callback Function to execute
     *
     * @return bool Whether the job was executed
     */
    public function runIfDue(callable $callback, bool $force = false): bool
    {
        if (!$this->shouldRun() && !$force) {
            return false;
        }

        try {
            $callback();
            $this->markAsRun();

            return true;
        } catch (\Exception $e) {
            // Log the error but don't mark as run (skip logging in test environment)
            if (!defined('PHPUNIT_RUNNING') || !PHPUNIT_RUNNING) {
                App::getInstance(false, true)->getLogger()->error("Cron job {$this->identifier} failed: " . $e->getMessage());
            }

            return false;
        }
    }

    /**
     * Get the interval between executions in seconds.
     */
    public function getIntervalSeconds(): int
    {
        return $this->interval;
    }

    /**
     * Parse the interval string into seconds.
     *
     * Seconds are kept as whole seconds, so "30S" is 30 seconds and not
     * a fraction of a minute that gets truncated to 0.
     *
     * @param string $interval Interval string (e.g., "30S", "30M", "1H", "1D", "1MO", "1Y")
     *
     * @throws \Exception If interval format is invalid
     *
     * @return int Seconds
     */
    private function parseInterval(string $interval): int
    {
        if (!preg_match('/^(\d+)(MO|[SMHDWY])$/', $interval, $matches)) {
            throw new \Exception('Invalid interval format. Use number followed by S (seconds), M (minutes), H (hours), D (days), W (weeks), MO (months) or Y (years). Example: 30M');
        }

        $value = (int) $matches[1];
        $unit = $matches[2];

        if (!isset(self::TIME_UNITS[$unit])) {
            throw new \Exception('Invalid time unit. Use S, M, H, D, W, MO or Y');
        }

        return $value * self::TIME_UNITS[$unit];
    }

    /**
     * Get the storage path for this cron's last run time.
     */
    private function getStoragePath(): string
    {
        return \APP_CACHE_DIR . "/cron/{$this->identifier}.fptj";
    }
}
