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

/**
 * frontendv2/icanhas/plugins/events.md lists every plugin event by hand.
 * This test keeps that list in sync with the event classes.
 */
class EventsDocTest extends TestCase
{
    public function testEveryEventIsListedInTheEventsDoc(): void
    {
        $docPath = dirname(__DIR__, 3) . '/frontendv2/icanhas/plugins/events.md';
        if (!is_file($docPath)) {
            $this->markTestSkipped('frontendv2/icanhas is not part of this checkout');
        }
        $doc = (string) file_get_contents($docPath);

        $eventsDir = dirname(__DIR__, 2) . '/app/Plugins/Events/Events';
        $files = glob($eventsDir . '/*Event.php') ?: [];
        $this->assertNotEmpty($files);

        $missing = [];
        $count = 0;
        foreach ($files as $file) {
            $class = 'App\\Plugins\\Events\\Events\\' . basename($file, '.php');
            $reflection = new ReflectionClass($class);
            if ($reflection->isInterface()) {
                continue;
            }
            foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC | ReflectionMethod::IS_STATIC) as $method) {
                if ($method->getDeclaringClass()->getName() !== $class || $method->getNumberOfParameters() > 0) {
                    continue;
                }
                $id = $method->invoke(null);
                if (!is_string($id)) {
                    continue;
                }
                ++$count;
                $row = '| `' . $reflection->getShortName() . '::' . $method->getName() . '()` | `' . $id . '` |';
                if (!str_contains($doc, $row)) {
                    $missing[] = $row;
                }
            }
        }

        $this->assertSame([], $missing, 'Add these rows to frontendv2/icanhas/plugins/events.md');
        $this->assertStringContainsString('There are ' . $count . ' events', $doc);
    }
}
