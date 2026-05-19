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

export const FEATHERPANEL_MARKETING_URL = 'https://featherpanel.com';

export function shouldShowPoweredBy(settings: AppSettings | null | undefined): boolean {
    return (settings?.branding_show_powered_by ?? 'true') === 'true';
}
