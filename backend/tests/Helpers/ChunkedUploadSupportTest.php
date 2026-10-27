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

use PHPUnit\Framework\TestCase;
use App\Helpers\DaemonCapabilities;
use App\Controllers\User\Server\Files\ServerFilesController;

class ChunkedUploadSupportTest extends TestCase
{
    public function testChunkedUploadIsFeatherWingsOnly(): void
    {
        $this->assertContains(DaemonCapabilities::FEATURE_CHUNKED_UPLOAD, DaemonCapabilities::ALL_FEATURES);
        $this->assertTrue(DaemonCapabilities::forType(DaemonCapabilities::TYPE_FEATHERWINGS)->supports(DaemonCapabilities::FEATURE_CHUNKED_UPLOAD));
        $this->assertFalse(DaemonCapabilities::forType(DaemonCapabilities::TYPE_WINGS_RS)->supports(DaemonCapabilities::FEATURE_CHUNKED_UPLOAD));
    }

    public function testChunkSizeIsClampedUnderCloudflareLimit(): void
    {
        $mb = 1024 * 1024;
        $this->assertSame(50 * $mb, ServerFilesController::uploadChunkSizeBytes('50'));
        $this->assertSame(50 * $mb, ServerFilesController::uploadChunkSizeBytes('nope'));
        $this->assertSame(50 * $mb, ServerFilesController::uploadChunkSizeBytes(null));
        $this->assertSame(5 * $mb, ServerFilesController::uploadChunkSizeBytes('1'));
        $this->assertSame(90 * $mb, ServerFilesController::uploadChunkSizeBytes('500'));
    }
}
