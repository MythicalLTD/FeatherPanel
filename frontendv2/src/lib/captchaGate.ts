/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import type { AppSettings } from '@/types/settings';
import { executeRecaptchaV3 } from '@/lib/recaptchaV3';
import { readReforgeCaptchaTokenFromDom } from '@/lib/reforgeCaptcha';

/** True when global captcha is on and the active provider has a public site key configured. */
export function isCaptchaConfigured(settings: AppSettings | null | undefined): boolean {
    if (!settings || settings.turnstile_enabled !== 'true') {
        return false;
    }
    const provider = settings.captcha_provider || 'turnstile';
    switch (provider) {
        case 'hcaptcha':
            return Boolean(settings.hcaptcha_site_key?.trim());
        case 'recaptcha':
            return Boolean(settings.recaptcha_site_key?.trim());
        case 'friendlycaptcha':
            return Boolean(settings.friendly_captcha_site_key?.trim());
        case 'reforge':
            return Boolean(settings.reforge_captcha_site_key?.trim());
        case 'turnstile':
        default:
            return Boolean(settings.turnstile_key_pub?.trim());
    }
}

/** Google reCAPTCHA v3: invisible score-based token from `execute()`, not a checkbox widget. */
export function isRecaptchaV3Configured(settings: AppSettings | null | undefined): boolean {
    if (!settings || settings.turnstile_enabled !== 'true') {
        return false;
    }
    if ((settings.captcha_provider || 'turnstile') !== 'recaptcha') {
        return false;
    }
    const ver = (settings.recaptcha_version || 'v2').toLowerCase();
    if (ver !== 'v3') {
        return false;
    }
    return Boolean(settings.recaptcha_site_key?.trim());
}

/** reForge Captcha: https://reforgecaptcha.cloud/ */
export function isReforgeConfigured(settings: AppSettings | null | undefined): boolean {
    if (!settings || settings.turnstile_enabled !== 'true') {
        return false;
    }
    if ((settings.captcha_provider || 'turnstile') !== 'reforge') {
        return false;
    }
    return Boolean(settings.reforge_captcha_site_key?.trim());
}

/**
 * Value to send as `turnstile_token` on auth APIs. For reCAPTCHA v3, always runs `execute()` at call time.
 * For reForge, uses the widget token from state or a one-shot read from the hidden input.
 * Other providers use the interactive widget token from state.
 */
export async function obtainCaptchaResponseToken(
    settings: AppSettings | null | undefined,
    widgetToken: string,
): Promise<string> {
    if (!isCaptchaConfigured(settings)) {
        return '';
    }
    if (isRecaptchaV3Configured(settings) && settings?.recaptcha_site_key) {
        const action = (settings.recaptcha_v3_action || 'submit').trim() || 'submit';
        const token = await executeRecaptchaV3(settings.recaptcha_site_key.trim(), action);
        return token?.trim() ?? '';
    }
    if (isReforgeConfigured(settings)) {
        const fromState = widgetToken.trim();
        if (fromState) {
            return fromState;
        }
        return readReforgeCaptchaTokenFromDom();
    }
    return widgetToken.trim();
}
