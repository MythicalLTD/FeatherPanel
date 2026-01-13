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

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class AuthEvent implements PluginEvent
{
    /**
     * Callback: array user info.
     */
    public static function onAuthLoginSuccess(): string
    {
        return 'featherpanel:auth:login:success';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthLoginFailed(): string
    {
        return 'featherpanel:auth:login:failed';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthLogout(): string
    {
        return 'featherpanel:auth:logout';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthRegisterSuccess(): string
    {
        return 'featherpanel:auth:register:success';
    }

    /**
     * Callback: array user info, string reset_url, string reset_token.
     */
    public static function onAuthForgotPassword(): string
    {
        return 'featherpanel:auth:forgot:password';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthResetPasswordSuccess(): string
    {
        return 'featherpanel:auth:reset:password:success';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuth2FASetup(): string
    {
        return 'featherpanel:auth:2fa:setup';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuth2FAEnabled(): string
    {
        return 'featherpanel:auth:2fa:enabled';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuth2FAVerified(): string
    {
        return 'featherpanel:auth:2fa:verified';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuth2FAFailed(): string
    {
        return 'featherpanel:auth:2fa:failed';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthPasswordChanged(): string
    {
        return 'featherpanel:auth:password:changed';
    }

    /**
     * Callback: array user info, string email.
     */
    public static function onAuthEmailChanged(): string
    {
        return 'featherpanel:auth:email:changed';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthAccountLocked(): string
    {
        return 'featherpanel:auth:account:locked';
    }

    /**
     * Callback: array user info.
     */
    public static function onAuthAccountUnlocked(): string
    {
        return 'featherpanel:auth:account:unlocked';
    }

    /**
     * Callback: string email, string reason.
     */
    public static function onAuthRegistrationFailed(): string
    {
        return 'featherpanel:auth:registration:failed';
    }

    /**
     * Callback: string email, string reason.
     */
    public static function onAuthPasswordResetFailed(): string
    {
        return 'featherpanel:auth:password:reset:failed';
    }

    /**
     * Callback: string email, string reason.
     */
    public static function onAuthForgotPasswordFailed(): string
    {
        return 'featherpanel:auth:forgot:password:failed';
    }
}
