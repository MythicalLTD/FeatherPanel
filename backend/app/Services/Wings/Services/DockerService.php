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

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Docker Service for Wings API.
 *
 * Handles all Docker-related API endpoints including:
 * - Docker disk usage information
 * - Docker image management and pruning
 * - Container and image statistics
 */
class DockerService
{
    private WingsConnection $connection;

    /**
     * Create a new DockerService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get Docker disk usage information.
     */
    public function getDockerDiskUsage(): array
    {
        return $this->connection->get('/api/system/docker/disk');
    }

    /**
     * Prune unused Docker images.
     */
    public function pruneDockerImages(): array
    {
        return $this->connection->delete('/api/system/docker/image/prune');
    }

    /**
     * Get containers size in bytes.
     */
    public function getContainersSize(): int
    {
        $diskUsage = $this->getDockerDiskUsage();

        return $diskUsage['containers_size'] ?? 0;
    }

    /**
     * Get total number of images.
     */
    public function getTotalImages(): int
    {
        $diskUsage = $this->getDockerDiskUsage();

        return $diskUsage['images_total'] ?? 0;
    }

    /**
     * Get number of active images.
     */
    public function getActiveImages(): int
    {
        $diskUsage = $this->getDockerDiskUsage();

        return $diskUsage['images_active'] ?? 0;
    }

    /**
     * Get number of inactive images.
     */
    public function getInactiveImages(): int
    {
        return $this->getTotalImages() - $this->getActiveImages();
    }

    /**
     * Get total images size in bytes.
     */
    public function getImagesSize(): int
    {
        $diskUsage = $this->getDockerDiskUsage();

        return $diskUsage['images_size'] ?? 0;
    }

    /**
     * Get build cache size in bytes.
     */
    public function getBuildCacheSize(): int
    {
        $diskUsage = $this->getDockerDiskUsage();

        return $diskUsage['build_cache_size'] ?? 0;
    }

    /**
     * Get total Docker disk usage in bytes.
     */
    public function getTotalDockerDiskUsage(): int
    {
        return $this->getContainersSize() + $this->getImagesSize() + $this->getBuildCacheSize();
    }

    /**
     * Get Docker disk usage percentage of active vs total images.
     */
    public function getActiveImagesPercent(): float
    {
        $total = $this->getTotalImages();
        $active = $this->getActiveImages();

        if ($total === 0) {
            return 0.0;
        }

        return round(($active / $total) * 100, 2);
    }

    /**
     * Get space reclaimed from last prune operation.
     */
    public function getLastPruneSpaceReclaimed(): int
    {
        try {
            $pruneResult = $this->pruneDockerImages();

            return $pruneResult['SpaceReclaimed'] ?? 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get deleted images from last prune operation.
     */
    public function getLastPruneDeletedImages(): ?array
    {
        try {
            $pruneResult = $this->pruneDockerImages();

            return $pruneResult['ImagesDeleted'] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Format bytes to human readable format.
     */
    public function formatBytes(int $bytes, int $precision = 2): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        $base = log($bytes, 1024);
        $pow = floor($base);
        $value = $bytes / pow(1024, $pow);

        return round($value, $precision) . ' ' . $units[$pow];
    }

    /**
     * Get formatted containers size.
     */
    public function getFormattedContainersSize(): string
    {
        return $this->formatBytes($this->getContainersSize());
    }

    /**
     * Get formatted images size.
     */
    public function getFormattedImagesSize(): string
    {
        return $this->formatBytes($this->getImagesSize());
    }

    /**
     * Get formatted build cache size.
     */
    public function getFormattedBuildCacheSize(): string
    {
        return $this->formatBytes($this->getBuildCacheSize());
    }

    /**
     * Get formatted total Docker disk usage.
     */
    public function getFormattedTotalDockerDiskUsage(): string
    {
        return $this->formatBytes($this->getTotalDockerDiskUsage());
    }

    /**
     * Get formatted Docker disk usage summary.
     */
    public function getFormattedDockerDiskUsage(): array
    {
        return [
            'containers_size' => $this->getFormattedContainersSize(),
            'images_size' => $this->getFormattedImagesSize(),
            'build_cache_size' => $this->getFormattedBuildCacheSize(),
            'total_size' => $this->getFormattedTotalDockerDiskUsage(),
            'images_total' => $this->getTotalImages(),
            'images_active' => $this->getActiveImages(),
            'images_inactive' => $this->getInactiveImages(),
            'active_images_percent' => $this->getActiveImagesPercent(),
        ];
    }

    /**
     * Get Docker statistics summary.
     */
    public function getDockerStats(): array
    {
        $diskUsage = $this->getDockerDiskUsage();

        return [
            'disk_usage' => $this->getFormattedDockerDiskUsage(),
            'raw_data' => $diskUsage,
        ];
    }

    /**
     * Check if there are inactive images that can be pruned.
     */
    public function hasInactiveImages(): bool
    {
        return $this->getInactiveImages() > 0;
    }

    /**
     * Check if build cache exists.
     */
    public function hasBuildCache(): bool
    {
        return $this->getBuildCacheSize() > 0;
    }

    /**
     * Get potential space savings from pruning (inactive images + build cache).
     */
    public function getPotentialSpaceSavings(): int
    {
        // This is an estimate - actual savings may vary
        return $this->getBuildCacheSize();
    }

    /**
     * Get formatted potential space savings.
     */
    public function getFormattedPotentialSpaceSavings(): string
    {
        return $this->formatBytes($this->getPotentialSpaceSavings());
    }

    /**
     * Perform a safe prune and return results.
     */
    public function performSafePrune(): array
    {
        $beforeStats = $this->getDockerDiskUsage();
        $pruneResult = $this->pruneDockerImages();

        try {
            $afterStats = $this->getDockerDiskUsage();
        } catch (\Exception $e) {
            $afterStats = $beforeStats; // Fallback to before stats if after fails
        }

        return [
            'before' => $beforeStats,
            'after' => $afterStats,
            'prune_result' => $pruneResult,
            'space_reclaimed' => $pruneResult['SpaceReclaimed'] ?? 0,
            'space_reclaimed_formatted' => $this->formatBytes($pruneResult['SpaceReclaimed'] ?? 0),
            'images_deleted' => $pruneResult['ImagesDeleted'] ?? null,
            'images_deleted_count' => is_array($pruneResult['ImagesDeleted'] ?? null) ? count($pruneResult['ImagesDeleted']) : 0,
        ];
    }
}
