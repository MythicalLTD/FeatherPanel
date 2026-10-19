/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import type { ComponentType } from 'react';
import {
    Archive,
    CalendarClock,
    Database,
    FolderOpen,
    KeyRound,
    Lock,
    RotateCcw,
    Settings,
    ShieldCheck,
    Upload,
    Users,
} from 'lucide-react';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { useTranslation } from '@/contexts/TranslationContext';

type Tip = { icon: ComponentType<{ className?: string }>; key: string };

const PAGE_TIPS: Record<string, Tip[]> = {
    files: [
        { icon: Upload, key: 'files.t1' },
        { icon: FolderOpen, key: 'files.t2' },
    ],
    databases: [
        { icon: Database, key: 'databases.t1' },
        { icon: KeyRound, key: 'databases.t2' },
    ],
    schedules: [
        { icon: CalendarClock, key: 'schedules.t1' },
        { icon: RotateCcw, key: 'schedules.t2' },
    ],
    users: [
        { icon: Users, key: 'users.t1' },
        { icon: ShieldCheck, key: 'users.t2' },
    ],
    backups: [
        { icon: Archive, key: 'backups.t1' },
        { icon: Lock, key: 'backups.t2' },
    ],
    settings: [
        { icon: Settings, key: 'settings.t1' },
        { icon: RotateCcw, key: 'settings.t2' },
    ],
};

export function ServerPageTips({ page, className }: { page: keyof typeof PAGE_TIPS; className?: string }) {
    const { t } = useTranslation();
    const tips = PAGE_TIPS[page];
    if (!tips?.length) return null;
    return (
        <TipGrid className={className}>
            {tips.map((tip) => (
                <TipCard key={tip.key} icon={tip.icon} title={t(`server.tips.${tip.key}_title`)}>
                    <p>{t(`server.tips.${tip.key}_body`)}</p>
                </TipCard>
            ))}
        </TipGrid>
    );
}
