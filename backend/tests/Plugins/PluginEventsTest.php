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

use App\Plugins\PluginEvents;
use PHPUnit\Framework\TestCase;

class PluginEventsTest extends TestCase
{
    public function testGetInstanceReturnsSingleton()
    {
        $instance1 = PluginEvents::getInstance();
        $instance2 = PluginEvents::getInstance();

        $this->assertInstanceOf(PluginEvents::class, $instance1);
        $this->assertSame($instance1, $instance2);
    }

    public function testOnAddsListener()
    {
        $events = new PluginEvents();
        $executed = false;

        $result = $events->on('test.event', function () use (&$executed) {
            $executed = true;
        });

        // Should return the instance for chaining
        $this->assertInstanceOf(PluginEvents::class, $result);
    }

    public function testOnAllowsChaining()
    {
        $events = new PluginEvents();

        $result = $events
            ->on('event1', function () {
            })
            ->on('event2', function () {
            });

        $this->assertInstanceOf(PluginEvents::class, $result);
    }

    public function testEmitCallsListeners()
    {
        $events = new PluginEvents();
        $callCount = 0;

        $events->on('test.event', function () use (&$callCount) {
            ++$callCount;
        });

        $events->on('test.event', function () use (&$callCount) {
            ++$callCount;
        });

        $events->emit('test.event');

        $this->assertEquals(2, $callCount);
    }

    public function testEmitPassesDataToListeners()
    {
        $events = new PluginEvents();
        $receivedData = null;

        $events->on('test.event', function ($data) use (&$receivedData) {
            $receivedData = $data;
        });

        // emit converts associative arrays to indexed arrays via array_values()
        $testData = ['value1', 'value2'];
        $events->emit('test.event', $testData);

        // First argument should be the first value
        $this->assertEquals('value1', $receivedData);
    }

    public function testEmitPassesMultipleArgumentsToListeners()
    {
        $events = new PluginEvents();
        $receivedArgs = [];

        $events->on('test.event', function ($arg1, $arg2, $arg3) use (&$receivedArgs) {
            $receivedArgs = [$arg1, $arg2, $arg3];
        });

        $events->emit('test.event', ['first', 'second', 'third']);

        $this->assertEquals(['first', 'second', 'third'], $receivedArgs);
    }

    public function testEmitDoesNothingForUnregisteredEvent()
    {
        $events = new PluginEvents();
        // Should not throw exception
        $events->emit('unregistered.event');
        $this->assertTrue(true);
    }

    public function testRemoveListenerRemovesSpecificListener()
    {
        $events = new PluginEvents();
        $callCount = 0;

        $listener = function () use (&$callCount) {
            ++$callCount;
        };

        $events->on('test.event', $listener);
        $events->emit('test.event');
        $this->assertEquals(1, $callCount);

        $events->removeListener('test.event', $listener);
        $events->emit('test.event');
        // Should still be 1, not 2
        $this->assertEquals(1, $callCount);
    }
}
