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
