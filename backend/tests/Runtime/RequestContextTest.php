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

use App\Runtime\RequestContext;
use PHPUnit\Framework\TestCase;

class RequestContextTest extends TestCase
{
    public function testBeginStartsAFreshRequest(): void
    {
        RequestContext::begin(1000.5);
        $firstId = RequestContext::id();
        $firstGeneration = RequestContext::generation();

        $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $firstId);
        $this->assertSame(1000.5, RequestContext::startTime());
        $this->assertSame($firstId, RequestContext::id(), 'id is stable within one request');

        RequestContext::begin();

        $this->assertNotSame($firstId, RequestContext::id());
        $this->assertSame($firstGeneration + 1, RequestContext::generation());
        $this->assertEqualsWithDelta(microtime(true), RequestContext::startTime(), 5.0);
    }
}
