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

import {
    FolderOpen,
    SquareTerminal,
    Braces,
    ServerCog,
    Gauge,
    ListTree,
    DatabaseZap,
    NotebookPen,
    SlidersHorizontal,
    ArchiveRestore,
    CalendarRange,
    Network,
    ArrowUpDown,
    Calculator,
    Trash,
    Cable,
    UsersRound,
    Rocket,
    Sparkles,
    PackageCheck,
    type LucideIcon,
} from 'lucide-react';
import type { OsAppId } from './types';

export interface OsAppDefinition {
    id: OsAppId;
    /** Translation key of the app name. */
    nameKey: string;
    icon: LucideIcon;
    /** Tailwind classes of the squircle icon background. */
    gradient: string;
    /** Works on one server at a time (shows a server picker until one is chosen). */
    serverScoped: boolean;
    /** Server permission needed for a server to be offered in this app's picker. */
    serverPermission?: string;
    defaultSize: { w: number; h: number };
    minSize: { w: number; h: number };
    /** Only one window of this app (focus it instead of opening another). */
    singleton?: boolean;
}

export const OS_APPS: Record<OsAppId, OsAppDefinition> = {
    finder: {
        id: 'finder',
        nameKey: 'featheros.apps.finder',
        icon: FolderOpen,
        gradient: 'bg-sky-500',
        serverScoped: true,
        serverPermission: 'file.read',
        defaultSize: { w: 900, h: 560 },
        minSize: { w: 520, h: 320 },
    },
    terminal: {
        id: 'terminal',
        nameKey: 'featheros.apps.terminal',
        icon: SquareTerminal,
        gradient: 'bg-zinc-800',
        serverScoped: false,
        defaultSize: { w: 760, h: 480 },
        minSize: { w: 480, h: 300 },
    },
    editor: {
        id: 'editor',
        nameKey: 'featheros.apps.editor',
        icon: Braces,
        gradient: 'bg-indigo-600',
        serverScoped: false,
        defaultSize: { w: 1000, h: 640 },
        minSize: { w: 520, h: 320 },
    },
    servers: {
        id: 'servers',
        nameKey: 'featheros.apps.servers',
        icon: ServerCog,
        gradient: 'bg-emerald-600',
        serverScoped: false,
        defaultSize: { w: 940, h: 560 },
        minSize: { w: 560, h: 320 },
        singleton: true,
    },
    monitor: {
        id: 'monitor',
        nameKey: 'featheros.apps.monitor',
        icon: Gauge,
        gradient: 'bg-lime-600',
        serverScoped: false,
        defaultSize: { w: 900, h: 560 },
        minSize: { w: 560, h: 320 },
        singleton: true,
    },
    logs: {
        id: 'logs',
        nameKey: 'featheros.apps.logs',
        icon: ListTree,
        gradient: 'bg-amber-500',
        serverScoped: true,
        serverPermission: 'activity.read',
        defaultSize: { w: 880, h: 560 },
        minSize: { w: 480, h: 300 },
    },
    databases: {
        id: 'databases',
        nameKey: 'featheros.apps.databases',
        icon: DatabaseZap,
        gradient: 'bg-cyan-600',
        serverScoped: true,
        serverPermission: 'database.read',
        defaultSize: { w: 940, h: 600 },
        minSize: { w: 560, h: 340 },
    },
    notes: {
        id: 'notes',
        nameKey: 'featheros.apps.notes',
        icon: NotebookPen,
        gradient: 'bg-yellow-500',
        serverScoped: false,
        defaultSize: { w: 820, h: 540 },
        minSize: { w: 460, h: 300 },
        singleton: true,
    },
    settings: {
        id: 'settings',
        nameKey: 'featheros.apps.settings',
        icon: SlidersHorizontal,
        gradient: 'bg-slate-600',
        serverScoped: false,
        defaultSize: { w: 760, h: 540 },
        minSize: { w: 520, h: 360 },
        singleton: true,
    },
    backups: {
        id: 'backups',
        nameKey: 'featheros.apps.backups',
        icon: ArchiveRestore,
        gradient: 'bg-rose-600',
        serverScoped: true,
        serverPermission: 'backup.read',
        defaultSize: { w: 820, h: 520 },
        minSize: { w: 480, h: 300 },
    },
    schedules: {
        id: 'schedules',
        nameKey: 'featheros.apps.schedules',
        icon: CalendarRange,
        gradient: 'bg-fuchsia-600',
        serverScoped: true,
        serverPermission: 'schedule.read',
        defaultSize: { w: 820, h: 520 },
        minSize: { w: 480, h: 300 },
    },
    network: {
        id: 'network',
        nameKey: 'featheros.apps.network',
        icon: Network,
        gradient: 'bg-blue-600',
        serverScoped: true,
        serverPermission: 'allocation.read',
        defaultSize: { w: 760, h: 480 },
        minSize: { w: 460, h: 300 },
    },
    transfers: {
        id: 'transfers',
        nameKey: 'featheros.apps.transfers',
        icon: ArrowUpDown,
        gradient: 'bg-orange-600',
        serverScoped: false,
        defaultSize: { w: 680, h: 460 },
        minSize: { w: 420, h: 280 },
        singleton: true,
    },
    calculator: {
        id: 'calculator',
        nameKey: 'featheros.apps.calculator',
        icon: Calculator,
        gradient: 'bg-zinc-700',
        serverScoped: false,
        defaultSize: { w: 320, h: 460 },
        minSize: { w: 280, h: 400 },
        singleton: true,
    },
    trash: {
        id: 'trash',
        nameKey: 'featheros.apps.trash',
        icon: Trash,
        gradient: 'bg-zinc-600',
        serverScoped: false,
        defaultSize: { w: 560, h: 420 },
        minSize: { w: 360, h: 280 },
        singleton: true,
    },
    connection: {
        id: 'connection',
        nameKey: 'featheros.apps.connection',
        icon: Cable,
        gradient: 'bg-teal-600',
        serverScoped: true,
        serverPermission: 'file.sftp',
        defaultSize: { w: 520, h: 420 },
        minSize: { w: 360, h: 300 },
    },
    subusers: {
        id: 'subusers',
        nameKey: 'featheros.apps.subusers',
        icon: UsersRound,
        gradient: 'bg-violet-600',
        serverScoped: true,
        serverPermission: 'user.read',
        defaultSize: { w: 820, h: 520 },
        minSize: { w: 480, h: 320 },
    },
    startup: {
        id: 'startup',
        nameKey: 'featheros.apps.startup',
        icon: Rocket,
        gradient: 'bg-amber-700',
        serverScoped: true,
        serverPermission: 'startup.read',
        defaultSize: { w: 760, h: 560 },
        minSize: { w: 480, h: 360 },
    },
    spells: {
        id: 'spells',
        nameKey: 'featheros.apps.spells',
        icon: Sparkles,
        gradient: 'bg-fuchsia-700',
        serverScoped: false,
        defaultSize: { w: 900, h: 600 },
        minSize: { w: 560, h: 360 },
        singleton: true,
    },
    archive: {
        id: 'archive',
        nameKey: 'featheros.apps.archive',
        icon: PackageCheck,
        gradient: 'bg-yellow-600',
        serverScoped: true,
        serverPermission: 'file.archive',
        defaultSize: { w: 720, h: 480 },
        minSize: { w: 420, h: 300 },
    },
};

export const OS_APP_IDS = Object.keys(OS_APPS) as OsAppId[];

export function isOsAppId(value: unknown): value is OsAppId {
    return typeof value === 'string' && value in OS_APPS;
}
