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

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class SpellsEvent implements PluginEvent
{
    // Spells Management Events
    /**
     * Callback: array spells list.
     */
    public static function onSpellsRetrieved(): string
    {
        return 'featherpanel:admin:spells:retrieved';
    }

    /**
     * Callback: int spell id, array spell data.
     */
    public static function onSpellRetrieved(): string
    {
        return 'featherpanel:admin:spells:spell:retrieved';
    }

    /**
     * Callback: array spell data.
     */
    public static function onSpellCreated(): string
    {
        return 'featherpanel:admin:spells:spell:created';
    }

    /**
     * Callback: int spell id, array old data, array new data.
     */
    public static function onSpellUpdated(): string
    {
        return 'featherpanel:admin:spells:spell:updated';
    }

    /**
     * Callback: int spell id, array spell data.
     */
    public static function onSpellDeleted(): string
    {
        return 'featherpanel:admin:spells:spell:deleted';
    }

    /**
     * Callback: int realm id, array spells.
     */
    public static function onSpellsByRealmRetrieved(): string
    {
        return 'featherpanel:admin:spells:by:realm:retrieved';
    }

    /**
     * Callback: array import data, array results.
     */
    public static function onSpellsImported(): string
    {
        return 'featherpanel:admin:spells:spells:imported';
    }

    /**
     * Callback: int spell id, array export data.
     */
    public static function onSpellExported(): string
    {
        return 'featherpanel:admin:spells:spell:exported';
    }

    // Spell Variables Events
    /**
     * Callback: int spell id, array variables.
     */
    public static function onSpellVariablesRetrieved(): string
    {
        return 'featherpanel:admin:spells:variables:retrieved';
    }

    /**
     * Callback: int spell id, array variable data.
     */
    public static function onSpellVariableCreated(): string
    {
        return 'featherpanel:admin:spells:variable:created';
    }

    /**
     * Callback: int variable id, array old data, array new data.
     */
    public static function onSpellVariableUpdated(): string
    {
        return 'featherpanel:admin:spells:variable:updated';
    }

    /**
     * Callback: int variable id, array variable data.
     */
    public static function onSpellVariableDeleted(): string
    {
        return 'featherpanel:admin:spells:variable:deleted';
    }

    // Spells Error Events
    /**
     * Callback: string error message, array context.
     */
    public static function onSpellsError(): string
    {
        return 'featherpanel:admin:spells:error';
    }

    /**
     * Callback: int spell id, string error message.
     */
    public static function onSpellNotFound(): string
    {
        return 'featherpanel:admin:spells:spell:not:found';
    }
}
