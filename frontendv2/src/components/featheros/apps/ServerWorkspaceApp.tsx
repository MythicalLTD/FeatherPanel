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

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import axios from 'axios';
import {
    SquareTerminal,
    FolderOpen,
    DatabaseZap,
    CalendarRange,
    ArchiveRestore,
    UsersRound,
    Network,
    Rocket,
    Settings2,
    History,
    Loader2,
    Play,
    RotateCw,
    Square,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppId } from '../types';
import { OS_APP_COMPONENTS, type OsAppProps } from './index';
import ServerSettingsPane from './ServerSettingsPane';
import ServerActivityPane from './ServerActivityPane';

type SectionId =
    | 'console'
    | 'files'
    | 'databases'
    | 'schedules'
    | 'backups'
    | 'subusers'
    | 'network'
    | 'startup'
    | 'settings'
    | 'activity';

interface Section {
    id: SectionId;
    icon: LucideIcon;
    permission: string | string[];
    /** Existing FeatherOS app rendered as the pane. */
    app?: OsAppId;
    pane?: ComponentType<OsAppProps>;
    group: 'manage' | 'configure';
}

const SECTIONS: Section[] = [
    { id: 'console', icon: SquareTerminal, permission: 'websocket.connect', app: 'terminal', group: 'manage' },
    { id: 'files', icon: FolderOpen, permission: 'file.read', app: 'finder', group: 'manage' },
    { id: 'databases', icon: DatabaseZap, permission: 'database.read', app: 'databases', group: 'manage' },
    { id: 'schedules', icon: CalendarRange, permission: 'schedule.read', app: 'schedules', group: 'manage' },
    { id: 'backups', icon: ArchiveRestore, permission: 'backup.read', app: 'backups', group: 'manage' },
    { id: 'subusers', icon: UsersRound, permission: 'user.read', app: 'subusers', group: 'configure' },
    { id: 'network', icon: Network, permission: 'allocation.read', app: 'network', group: 'configure' },
    { id: 'startup', icon: Rocket, permission: 'startup.read', app: 'startup', group: 'configure' },
    {
        id: 'settings',
        icon: Settings2,
        permission: ['settings.rename', 'settings.reinstall'],
        pane: ServerSettingsPane,
        group: 'configure',
    },
    { id: 'activity', icon: History, permission: 'activity.read', pane: ServerActivityPane, group: 'configure' },
];

/**
 * One window per server with a Finder like sidebar. Every section reuses the
 * existing FeatherOS app for that area, so behaviour and permissions match
 * the standalone apps and nothing sends the user back to the panel.
 */
export default function ServerWorkspaceApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, getServer, live, errorMessage } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const server = getServer(uuid);

    const visible = useMemo(
        () =>
            SECTIONS.filter((s) =>
                (Array.isArray(s.permission) ? s.permission : [s.permission]).some((p) => can(uuid, p)),
            ),
        [can, uuid],
    );
    const initial = (win.props?.section as SectionId | undefined) ?? visible[0]?.id;
    const [active, setActive] = useState<SectionId | undefined>(initial);
    const [powering, setPowering] = useState<string | null>(null);

    useEffect(() => {
        if (active && !visible.some((s) => s.id === active)) setActive(visible[0]?.id);
    }, [active, visible]);

    const section = visible.find((s) => s.id === active);
    const Pane = section ? (section.pane ?? (section.app ? OS_APP_COMPONENTS[section.app] : undefined)) : undefined;
    const paneWin = useMemo(() => (section?.app ? { ...win, app: section.app } : win), [section, win]);
    const state = live[uuid]?.status ?? server?.status;

    const power = async (signal: 'start' | 'restart' | 'stop') => {
        setPowering(signal);
        try {
            await axios.post(`/api/user/servers/${uuid}/power/${signal}`);
            toast.success(t(`featheros.server_workspace.power_${signal}`));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setPowering(null);
        }
    };

    const groups: Section['group'][] = ['manage', 'configure'];

    return (
        <div className='fos-finder fos-server-ws flex h-full min-h-0'>
            <aside className='fos-finder-sidebar fos-scroll overflow-y-auto'>
                <div className='fos-server-ws-head'>
                    <span className={cn('fos-server-ws-dot', `is-${String(state ?? 'offline')}`)} />
                    <span className='truncate'>{server?.name ?? uuid}</span>
                </div>
                {groups.map((g) => {
                    const items = visible.filter((s) => s.group === g);
                    if (items.length === 0) return null;
                    return (
                        <div key={g}>
                            <div className='fos-finder-sidebar-label'>{t(`featheros.server_workspace.group_${g}`)}</div>
                            {items.map((s) => (
                                <button
                                    key={s.id}
                                    type='button'
                                    className={cn('fos-finder-location', active === s.id && 'is-active')}
                                    onClick={() => setActive(s.id)}
                                >
                                    <s.icon className='h-4 w-4 shrink-0 text-[var(--fos-accent,#0a84ff)]' />
                                    <span className='truncate'>{t(`featheros.server_workspace.section_${s.id}`)}</span>
                                </button>
                            ))}
                        </div>
                    );
                })}
                <div className='fos-server-ws-power'>
                    {(['start', 'restart', 'stop'] as const).map((sig) => {
                        const Icon = sig === 'start' ? Play : sig === 'restart' ? RotateCw : Square;
                        const perm = `control.${sig}`;
                        return (
                            <button
                                key={sig}
                                type='button'
                                title={t(`featheros.server_workspace.${sig}`)}
                                disabled={!can(uuid, perm) || powering !== null}
                                onClick={() => void power(sig)}
                            >
                                {powering === sig ? (
                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                ) : (
                                    <Icon className='h-3.5 w-3.5' />
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>
            <section className='relative min-w-0 flex-1'>
                {Pane ? (
                    <Pane key={section?.id} win={paneWin} />
                ) : (
                    <div className='flex h-full items-center justify-center text-[13px] text-[var(--fos-secondary)]'>
                        {t('featheros.server_workspace.no_access')}
                    </div>
                )}
            </section>
        </div>
    );
}
