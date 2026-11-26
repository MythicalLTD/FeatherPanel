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

namespace App\Helpers;

/**
 * Holds an external-ID lock for as long as the object lives. Keep it in a local
 * variable: the lock is released when the request handler returns or throws.
 */
final class ExternalIdLock
{
    private bool $released = false;

    private function __construct(private string $scope, private string $externalId)
    {
    }

    public function __destruct()
    {
        $this->release();
    }

    public static function acquire(string $scope, string $externalId, int $timeoutSeconds = 10): ?self
    {
        return ExternalId::lock($scope, $externalId, $timeoutSeconds) ? new self($scope, $externalId) : null;
    }

    public function release(): void
    {
        if (!$this->released) {
            $this->released = true;
            ExternalId::unlock($this->scope, $this->externalId);
        }
    }
}
