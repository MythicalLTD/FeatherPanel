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

namespace App\Config;

interface ConfigInterface
{
    /**
     * App.
     */
    public const APP_NAME = 'app_name';
    public const APP_URL = 'app_url';
    public const APP_TIMEZONE = 'app_timezone';
    public const APP_LOGO = 'app_logo';
    public const APP_SUPPORT_URL = 'app_support_url';
    /**
     * Turnstile.
     */
    public const TURNSTILE_ENABLED = 'turnstile_enabled';
    public const TURNSTILE_KEY_PUB = 'turnstile_key_pub';
    public const TURNSTILE_KEY_PRIV = 'turnstile_key_priv';
    /**
     * SMTP.
     */
    public const SMTP_ENABLED = 'smtp_enabled';
    public const SMTP_HOST = 'smtp_host';
    public const SMTP_PORT = 'smtp_port';
    public const SMTP_USER = 'smtp_user';
    public const SMTP_PASS = 'smtp_pass';
    public const SMTP_FROM = 'smtp_from';
    public const SMTP_ENCRYPTION = 'smtp_encryption';
    /**
     * Legal Values.
     */
    public const LEGAL_TOS = 'legal_tos';
    public const LEGAL_PRIVACY = 'legal_privacy';
	/**
	 * Registration.
	 */
	public const REGISTRATION_ENABLED = 'registration_enabled';
}
