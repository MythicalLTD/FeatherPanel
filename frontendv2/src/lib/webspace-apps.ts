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

export const WEBSPACE_APP_WORDPRESS = 'wordpress';
export const WEBSPACE_APP_GIT_DEPLOY = 'git-deploy';
export const WEBSPACE_APP_LARAVEL = 'laravel';
export const WEBSPACE_APP_JOOMLA = 'joomla';
export const WEBSPACE_APP_DRUPAL = 'drupal';
export const WEBSPACE_APP_PRESTASHOP = 'prestashop';
export const WEBSPACE_APP_MAGENTO = 'magento';
export const WEBSPACE_APP_GHOST = 'ghost';
export const WEBSPACE_APP_NODE_STARTER = 'node-starter';
export const WEBSPACE_APP_PYTHON_STARTER = 'python-starter';

export type WebSpaceAppId =
    | typeof WEBSPACE_APP_WORDPRESS
    | typeof WEBSPACE_APP_GIT_DEPLOY
    | typeof WEBSPACE_APP_LARAVEL
    | typeof WEBSPACE_APP_JOOMLA
    | typeof WEBSPACE_APP_DRUPAL
    | typeof WEBSPACE_APP_PRESTASHOP
    | typeof WEBSPACE_APP_MAGENTO
    | typeof WEBSPACE_APP_GHOST
    | typeof WEBSPACE_APP_NODE_STARTER
    | typeof WEBSPACE_APP_PYTHON_STARTER;

const APPS_BY_RUNTIME: Record<string, WebSpaceAppId[]> = {
    static: [],
    php: [
        WEBSPACE_APP_WORDPRESS,
        WEBSPACE_APP_LARAVEL,
        WEBSPACE_APP_JOOMLA,
        WEBSPACE_APP_DRUPAL,
        WEBSPACE_APP_PRESTASHOP,
        WEBSPACE_APP_MAGENTO,
        WEBSPACE_APP_GIT_DEPLOY,
    ],
    node: [WEBSPACE_APP_GIT_DEPLOY, WEBSPACE_APP_NODE_STARTER, WEBSPACE_APP_GHOST],
    python: [WEBSPACE_APP_GIT_DEPLOY, WEBSPACE_APP_PYTHON_STARTER],
    custom: [WEBSPACE_APP_GIT_DEPLOY],
};

export function availableAppsForRuntime(runtime: string | undefined | null): WebSpaceAppId[] {
    const key = (runtime || 'static').toLowerCase();

    return APPS_BY_RUNTIME[key] ?? [];
}

export function hasWebSpaceApps(runtime: string | undefined | null, availableApps?: string[] | null): boolean {
    if (Array.isArray(availableApps)) {
        return availableApps.length > 0;
    }

    return availableAppsForRuntime(runtime).length > 0;
}

export function supportsApp(
    runtime: string | undefined | null,
    app: WebSpaceAppId,
    availableApps?: string[] | null,
): boolean {
    const apps = Array.isArray(availableApps) ? availableApps : availableAppsForRuntime(runtime);

    return apps.includes(app);
}
