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
use App\Services\Wings\WingsConnection;
use App\Services\Wings\Services\ServerService;
use App\Services\Wings\Exceptions\WingsRequestException;

/**
 * The file manager tells a missing folder apart from other daemon failures by the 404 status.
 */
class WingsListDirectoryStatusTest extends TestCase
{
    public function testMissingFolderKeepsThe404(): void
    {
        $response = $this->serviceThrowing(404)->listDirectory('uuid', '/plugins/plugins', true);

        $this->assertFalse($response->isSuccessful());
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testOtherDaemonFailuresStay500(): void
    {
        foreach ([400, 403, 500, 502] as $status) {
            $response = $this->serviceThrowing($status)->listDirectory('uuid', '/plugins', true);
            $this->assertSame(500, $response->getStatusCode(), "status {$status}");
        }
    }

    public function testListingSucceeds(): void
    {
        $connection = $this->createMock(WingsConnection::class);
        $connection->method('isWingsRs')->willReturn(false);
        $connection->method('get')->willReturn([['name' => 'plugins']]);

        $response = (new ServerService($connection))->listDirectory('uuid', '/', true);

        $this->assertTrue($response->isSuccessful());
        $this->assertSame(200, $response->getStatusCode());
    }

    private function serviceThrowing(int $status): ServerService
    {
        $connection = $this->createMock(WingsConnection::class);
        $connection->method('isWingsRs')->willReturn(false);
        $connection->method('get')->willThrowException(
            new WingsRequestException("Wings request failed ({$status})", $status)
        );

        return new ServerService($connection);
    }
}
