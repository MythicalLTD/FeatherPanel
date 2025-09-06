<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
