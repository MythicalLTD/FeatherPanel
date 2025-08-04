<?php

/*
 * This file is part of MythicalPanel.
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

class AuthEvent implements PluginEvent
{
    public static function onAuthLoginSuccess(): string
    {
        return 'auth::LoginSuccess';
    }

    public static function onAuthLogout(): string
    {
        return 'auth::Logout';
    }

    public static function onAuthRegisterSuccess(): string
    {
        return 'auth::RegisterSuccess';
    }

    public static function onAuthForgotPassword(): string
    {
        return 'auth::ForgotPassword';
    }

    public static function onAuthResetPasswordSuccess(): string
    {
        return 'auth::ResetPasswordSuccess';
    }

    public static function onAuth2FAVerifySuccess(): string
    {
        return 'auth::2FAVerifySuccess';
    }
}
