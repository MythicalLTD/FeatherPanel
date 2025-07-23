<?php

/*
 * This file is part of App.
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

class RedeemEvent implements PluginEvent
{
    public static function onRedeemAlreadyRedeemed(): string
    {
        return 'redeem::onRedeemAlreadyRedeemed';
    }

    public static function onRedeemFailed(): string
    {
        return 'redeem::onRedeemFailed';
    }

    public static function onRedeemSuccess(): string
    {
        return 'redeem::onRedeemSuccess';
    }

    public static function onRedeemCreate(): string
    {
        return 'redeem::onRedeemCreate';
    }

    public static function onRedeemUpdate(): string
    {
        return 'redeem::onRedeemUpdate';
    }

    public static function onRedeemDelete(): string
    {
        return 'redeem::onRedeemDelete';
    }
}
