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
