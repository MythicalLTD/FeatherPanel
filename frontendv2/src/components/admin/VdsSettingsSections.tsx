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

'use client';

import type { ReactNode } from 'react';
import type { Setting } from '@/lib/admin-settings-api';
import { SettingsAccordionSections } from '@/components/admin/SettingsAccordionSections';

/** @deprecated Use SettingsAccordionSections with categoryKey="vds". */
export function VdsSettingsSections({
    entries,
    settings,
    searching,
    renderField,
}: {
    entries: [string, Setting][];
    settings: Record<string, Setting>;
    searching: boolean;
    renderField: (key: string, setting: Setting) => ReactNode;
}) {
    return (
        <SettingsAccordionSections
            categoryKey='vds'
            entries={entries}
            settings={settings}
            searching={searching}
            renderField={renderField}
        />
    );
}
