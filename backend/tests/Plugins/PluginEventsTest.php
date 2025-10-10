<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
            ->on('event1', function () {})
            ->on('event2', function () {});

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
