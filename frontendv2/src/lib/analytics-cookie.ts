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

export const ANALYTICS_COOKIE_NAME = 'featherpanel_analytics';
export const ANALYTICS_CONSENT_COOKIE_NAME = 'featherpanel_analytics_consent_v1';
export const ANALYTICS_CONSENT_EVENT = 'featherpanel:analytics-consent';
/** Compatibility for existing preferences: browser telemetry cannot be enabled. */
export function setAnalyticsCookie(_enabled: boolean): void {
    void _enabled;
    if (typeof document === 'undefined') return;
    for (const name of [ANALYTICS_COOKIE_NAME, ANALYTICS_CONSENT_COOKIE_NAME]) {
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    }
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function getAnalyticsConsent(): boolean | null {
    return false;
}

export function getAnalyticsCookie(): boolean {
    return false;
}

export function isAnalyticsPreferenceCookie(name: string): boolean {
    return name === ANALYTICS_COOKIE_NAME || name === ANALYTICS_CONSENT_COOKIE_NAME;
}

export function isClientTelemetryEnvironment(): boolean {
    return false;
}
