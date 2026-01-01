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

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class UserEvent implements PluginEvent
{
    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyCreated(): string
    {
        return 'featherpanel:user:api:create';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyUpdated(): string
    {
        return 'featherpanel:user:api:update';
    }

    /**
     * Callback: string user uuid, string api key id.
     */
    public static function onUserApiKeyDeleted(): string
    {
        return 'featherpanel:user:api:delete';
    }

    /**
     * Callback: string user uuid.
     */
    public static function onUserUpdate(): string
    {
        return 'featherpanel:user:update';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyCreated(): string
    {
        return 'featherpanel:user:ssh:create';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyUpdated(): string
    {
        return 'featherpanel:user:ssh:update';
    }

    /**
     * Callback: string user uuid, string ssh key id.
     */
    public static function onUserSshKeyDeleted(): string
    {
        return 'featherpanel:user:ssh:delete';
    }

    /**
     * Callback: array user data, int user id, array created by.
     */
    public static function onUserCreated(): string
    {
        return 'featherpanel:user:created';
    }

    /**
     * Callback: array user data, array updated data, array updated by.
     */
    public static function onUserUpdated(): string
    {
        return 'featherpanel:user:updated';
    }

    /**
     * Callback: array user data, array deleted by.
     */
    public static function onUserDeleted(): string
    {
        return 'featherpanel:user:deleted';
    }
}
