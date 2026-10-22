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

import { useEffect, useRef, useState } from 'react';
import {
    Search,
    LayoutGrid,
    Bell,
    Columns2,
    Sun,
    Moon,
    ArrowRightLeft,
    Server as ServerIcon,
    LogOut,
    User,
    Info,
    Settings,
    ExternalLink,
    Plus,
    X,
    Minus,
    Maximize2,
    AppWindow,
    RotateCcw,
    Keyboard,
    Expand,
    Shrink,
    BookmarkPlus,
    Lock,
    LayoutDashboard,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { cn } from '@/lib/utils';
import {
    canFeatherOsUndo,
    peekFeatherOsUndo,
    performFeatherOsUndo,
    subscribeFeatherOsUndo,
    undoRefreshDirs,
} from '@/lib/featheros-undo';
import { toast } from 'sonner';
import { useFeatherOs } from './FeatherOsContext';
import { OS_APPS } from './registry';
import { MenuList, menuSurface } from './ContextMenu';
import { MENU_BAR_HEIGHT, type OsContextMenuItem } from './types';
import { serverState } from './utils';
import { ControlCenter } from './ControlCenter';
import { ZONE_LEFT, ZONE_RIGHT, rememberPreSnap, requestSnapAssist, workArea, zoneRect } from './snap';
import { confirmRestoreWorkspace, promptSaveWorkspace } from './workspaces';
import { lockOs } from './LockScreen';
import { FOS_SHORTCUTS_EVENT, FOS_SWITCHER_EVENT, toggleImmersiveWithFeedback, useImmersiveState } from './immersive';

function Clock({ h24, seconds, locale }: { h24: boolean; seconds: boolean; locale: string }) {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), seconds ? 1000 : 10_000);
        return () => window.clearInterval(timer);
    }, [seconds]);
    if (!now) return null;
    let text = '';
    try {
        const date = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
        const time = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            ...(seconds ? { second: '2-digit' } : {}),
            hour12: !h24,
        }).format(now);
        text = `${date}  ${time}`;
    } catch {
        text = now.toLocaleString();
    }
    return <span className='tabular-nums'>{text}</span>;
}

export function MenuBar() {
    const { t, locale } = useTranslation();
    const { user, logout } = useSession();
    const os = useFeatherOs();
    const {
        osName,
        panelName,
        logoUrl,
        windows,
        focusedId,
        openApp,
        closeWindow,
        closeAppWindows,
        minimizeWindow,
        toggleMaximize,
        focusWindow,
        setSpotlightOpen,
        setLaunchpadOpen,
        setMissionControlOpen,
        setNotificationsOpen,
        osNotifications,
        setAboutOpen,
        isDark,
        setOsTheme,
        settings,
        transfers,
        servers,
        live,
        getServer,
        setWindowGeometry,
        emitFilesChanged,
        errorMessage,
    } = os;
    const [open, setOpen] = useState<string | null>(null);
    const [, setUndoTick] = useState(0);
    const immersiveState = useImmersiveState();
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => subscribeFeatherOsUndo(() => setUndoTick((n) => n + 1)), []);

    const focused = windows.find((w) => w.id === focusedId && !w.minimized);
    const activeApp = focused ? OS_APPS[focused.app] : null;
    const finderFocused = focused?.app === 'finder';
    const activeName = activeApp ? t(activeApp.nameKey) : t('featheros.menu.finder_desktop');
    const activeTransfers = transfers.filter((x) => x.status === 'pending' || x.status === 'running');
    const runningCount = servers.filter((s) => serverState(s, live[s.uuidShort]?.status) === 'running').length;

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const menus: { id: string; label: React.ReactNode; bold?: boolean; items: OsContextMenuItem[] }[] = [
        {
            id: 'system',
            label: (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={osName} className='h-4 w-4 rounded-[4px] object-contain' />
            ),
            items: [
                {
                    id: 'about',
                    label: t('featheros.menu.about', { name: osName }),
                    icon: Info,
                    onSelect: () => setAboutOpen(true),
                },
                { id: 's1', separator: true },
                {
                    id: 'settings',
                    label: t('featheros.menu.system_settings'),
                    icon: Settings,
                    onSelect: () => openApp('settings'),
                },
                {
                    id: 'panel',
                    label: t('featheros.menu.open_panel', { name: panelName }),
                    icon: ExternalLink,
                    onSelect: () => window.open('/dashboard', '_blank', 'noopener'),
                },
                { id: 's2', separator: true },
                {
                    id: 'lock',
                    label: t('featheros.lock.lock_screen'),
                    icon: Lock,
                    shortcut: 'Ctrl+Alt+L',
                    onSelect: () => lockOs(),
                },
                {
                    id: 'reload',
                    label: t('featheros.menu.restart'),
                    icon: RotateCcw,
                    onSelect: () => window.location.reload(),
                },
                {
                    id: 'logout',
                    label: t('featheros.menu.log_out', { name: user?.username ?? '' }),
                    icon: LogOut,
                    onSelect: () => void logout(),
                },
            ],
        },
        {
            id: 'app',
            label: activeName,
            bold: true,
            items: focused
                ? [
                      {
                          id: 'new',
                          label: t('featheros.menu.new_window'),
                          icon: Plus,
                          disabled: !!activeApp?.singleton,
                          onSelect: () => openApp(focused.app, { newWindow: true, serverUuid: focused.serverUuid }),
                      },
                      { id: 's', separator: true },
                      {
                          id: 'quit',
                          label: t('featheros.menu.quit', { app: activeName }),
                          icon: X,
                          onSelect: () => closeAppWindows(focused.app),
                      },
                  ]
                : [
                      {
                          id: 'finder',
                          label: t('featheros.menu.new_finder'),
                          icon: Plus,
                          onSelect: () => openApp('finder', { newWindow: true }),
                      },
                  ],
        },
        {
            id: 'file',
            label: t('featheros.menu.file'),
            items: [
                {
                    id: 'new-finder',
                    label: t('featheros.menu.new_finder'),
                    onSelect: () => openApp('finder', { newWindow: true }),
                },
                {
                    id: 'new-terminal',
                    label: t('featheros.menu.new_terminal'),
                    onSelect: () => openApp('terminal', { newWindow: true }),
                },
                {
                    id: 'new-note',
                    label: t('featheros.menu.new_note'),
                    onSelect: () => openApp('notes', { props: { createNew: true } }),
                },
                { id: 's', separator: true },
                {
                    id: 'close',
                    label: t('featheros.menu.close_window'),
                    shortcut: 'Alt+F4',
                    disabled: !focused,
                    onSelect: () => focused && closeWindow(focused.id),
                },
            ],
        },
        {
            id: 'edit',
            label: t('featheros.menu.edit', { defaultValue: 'Edit' }),
            items: [
                {
                    id: 'undo',
                    label: peekFeatherOsUndo()?.label ?? t('featheros.files.undo', { defaultValue: 'Undo' }),
                    shortcut: '⌘Z',
                    disabled: !finderFocused || !canFeatherOsUndo(),
                    onSelect: () => {
                        void (async () => {
                            try {
                                const op = await performFeatherOsUndo();
                                if (!op) return;
                                const { serverUuid, dirs } = undoRefreshDirs(op);
                                dirs.forEach((d) => emitFilesChanged(serverUuid, d));
                                toast.success(t('featheros.files.undone', { defaultValue: 'Undone' }));
                                setUndoTick((n) => n + 1);
                            } catch (error) {
                                toast.error(errorMessage(error));
                            }
                        })();
                    },
                },
            ],
        },
        {
            id: 'go',
            label: t('featheros.menu.go'),
            items:
                servers.length === 0
                    ? [{ id: 'none', label: t('featheros.picker.empty'), disabled: true }]
                    : servers.slice(0, 20).map((s) => ({
                          id: s.uuidShort,
                          label: s.name,
                          icon: ServerIcon,
                          onSelect: () => openApp('server', { serverUuid: s.uuidShort }),
                      })),
        },
        {
            id: 'window',
            label: t('featheros.menu.window'),
            items: [
                {
                    id: 'min',
                    label: t('featheros.window.minimize'),
                    icon: Minus,
                    disabled: !focused,
                    onSelect: () => focused && minimizeWindow(focused.id),
                },
                {
                    id: 'zoom',
                    label: t('featheros.window.zoom'),
                    icon: Maximize2,
                    disabled: !focused,
                    onSelect: () => focused && toggleMaximize(focused.id),
                },
                ...(['left', 'right'] as const).map((side) => ({
                    id: `tile-${side}`,
                    label: t(`featheros.control.tile_${side}`),
                    icon: Columns2,
                    disabled: !focused,
                    onSelect: () => {
                        if (!focused) return;
                        const zone = side === 'left' ? ZONE_LEFT : ZONE_RIGHT;
                        rememberPreSnap(focused.id, { w: focused.w, h: focused.h });
                        setWindowGeometry(focused.id, zoneRect(workArea(settings), zone));
                        requestSnapAssist(zone, focused.id);
                    },
                })),
                { id: 's-ws', separator: true },
                {
                    id: 'ws-save',
                    label: t('featheros.workspaces.save_current'),
                    icon: BookmarkPlus,
                    disabled: windows.length === 0,
                    onSelect: () => void promptSaveWorkspace(os, t),
                },
                ...(settings.workspaces ?? []).map((ws) => ({
                    id: `ws-${ws.id}`,
                    label: ws.name,
                    icon: LayoutDashboard,
                    onSelect: () => void confirmRestoreWorkspace(os, t, ws),
                })),
                { id: 's', separator: true },
                ...windows.map((w) => {
                    const server = getServer(w.serverUuid);
                    return {
                        id: w.id,
                        label: [t(OS_APPS[w.app].nameKey), server?.name].filter(Boolean).join(' — '),
                        icon: AppWindow,
                        checked: w.id === focusedId,
                        onSelect: () => focusWindow(w.id),
                    };
                }),
            ],
        },
        {
            id: 'help',
            label: t('featheros.menu.help'),
            items: [
                {
                    id: 'spotlight',
                    label: t('featheros.spotlight.title'),
                    icon: Search,
                    shortcut: '⌃Space',
                    onSelect: () => {
                        setLaunchpadOpen(false);
                        setSpotlightOpen(true);
                    },
                },
                {
                    id: 'launchpad',
                    label: t('featheros.launchpad.title', { defaultValue: 'Launchpad' }),
                    icon: LayoutGrid,
                    shortcut: '⌘ / ⊞',
                    onSelect: () => {
                        setSpotlightOpen(false);
                        setLaunchpadOpen(true);
                    },
                },
                {
                    id: 'switcher',
                    label: t('featheros.switcher.title'),
                    icon: AppWindow,
                    shortcut: '⌥Tab',
                    onSelect: () => window.dispatchEvent(new Event(FOS_SWITCHER_EVENT)),
                },
                {
                    id: 'mission',
                    label: t('featheros.mission.title'),
                    icon: Columns2,
                    shortcut: 'F3',
                    onSelect: () => setMissionControlOpen(true),
                },
                {
                    id: 'shortcuts',
                    label: t('featheros.keys.title'),
                    icon: Keyboard,
                    shortcut: '⌃/',
                    onSelect: () => window.dispatchEvent(new Event(FOS_SHORTCUTS_EVENT)),
                },
                {
                    id: 'immersive',
                    label: t('featheros.immersive.title'),
                    icon: immersiveState !== 'off' ? Shrink : Expand,
                    shortcut: '⌃⌥F',
                    checked: immersiveState !== 'off',
                    onSelect: () => toggleImmersiveWithFeedback(t),
                },
                {
                    id: 'about',
                    label: t('featheros.menu.about', { name: osName }),
                    icon: Info,
                    onSelect: () => setAboutOpen(true),
                },
            ],
        },
    ];

    const userItems: OsContextMenuItem[] = [
        { id: 'name', label: user ? `${user.first_name} ${user.last_name} (${user.username})` : '', disabled: true },
        { id: 's', separator: true },
        {
            id: 'account',
            label: t('featheros.menu.account'),
            icon: User,
            onSelect: () => window.open('/dashboard/account', '_blank', 'noopener'),
        },
        {
            id: 'logout',
            label: t('featheros.menu.log_out', { name: user?.username ?? '' }),
            icon: LogOut,
            onSelect: () => void logout(),
        },
    ];

    const item = 'fos-menubar-item flex h-full items-center rounded-[6px] px-2.5 transition-colors';

    return (
        <div
            ref={barRef}
            className='fos-menubar relative z-[9000] flex shrink-0 items-center justify-between px-2 text-[13px] select-none'
            data-opaque={settings.menuBarOpaque}
            style={{ height: MENU_BAR_HEIGHT }}
        >
            <div className='flex h-full min-w-0 items-center py-0.5'>
                {menus.map((m) => (
                    <div key={m.id} className='relative h-full'>
                        <button
                            type='button'
                            onClick={() => {
                                setOpen(open === m.id ? null : m.id);
                            }}
                            aria-expanded={open === m.id}
                            onMouseEnter={() => open && setOpen(m.id)}
                            className={cn(item, m.bold && 'font-semibold', open === m.id && 'is-open')}
                        >
                            {m.label}
                        </button>
                        {open === m.id && (
                            <div className={cn('fos-pop absolute top-full left-0 mt-0.5', menuSurface)}>
                                <MenuList items={m.items} onDone={() => setOpen(null)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button
                type='button'
                className='fos-menubar-search'
                onClick={() => setSpotlightOpen(true)}
                title={t('featheros.spotlight.title')}
            >
                <Search className='h-3.5 w-3.5 shrink-0 opacity-70' />
                <span className='truncate'>{t('featheros.spotlight.placeholder')}</span>
                <kbd>⌃Space</kbd>
            </button>
            <div className='flex h-full items-center gap-0.5 py-0.5'>
                <ControlCenter />
                {activeTransfers.length > 0 && (
                    <button
                        type='button'
                        className={cn(item, 'gap-1.5')}
                        onClick={() => openApp('transfers')}
                        title={t('featheros.apps.transfers')}
                    >
                        <ArrowRightLeft className='h-3.5 w-3.5 animate-pulse' />
                        <span className='tabular-nums'>{activeTransfers.length}</span>
                    </button>
                )}
                <button
                    type='button'
                    className={cn(item, 'gap-1.5')}
                    onClick={() => openApp('servers')}
                    title={t('featheros.menu.running_servers')}
                >
                    <ServerIcon className='h-3.5 w-3.5' />
                    <span className='tabular-nums'>
                        {runningCount}/{servers.length}
                    </span>
                </button>
                <button
                    type='button'
                    className={item}
                    onClick={() => setOsTheme(isDark ? 'light' : 'dark')}
                    title={t('featheros.menu.toggle_theme')}
                >
                    {isDark ? <Moon className='h-3.5 w-3.5' /> : <Sun className='h-3.5 w-3.5' />}
                </button>
                <button
                    type='button'
                    className={item}
                    onClick={() => setMissionControlOpen(true)}
                    title={t('featheros.mission.title')}
                >
                    <Columns2 className='h-3.5 w-3.5' />
                </button>
                <button
                    type='button'
                    className={cn(item, 'relative')}
                    onClick={() => toggleImmersiveWithFeedback(t)}
                    title={t(`featheros.immersive.status_${immersiveState}`)}
                    aria-pressed={immersiveState !== 'off'}
                >
                    <Keyboard className='h-3.5 w-3.5' />
                    {immersiveState !== 'off' && (
                        <span
                            className={cn(
                                'absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full',
                                immersiveState === 'locked' ? 'bg-emerald-500' : 'bg-amber-500',
                            )}
                        />
                    )}
                </button>
                <button
                    type='button'
                    className={cn(item, 'relative')}
                    onClick={() => setNotificationsOpen(true)}
                    title={t('featheros.notifications.title')}
                >
                    <Bell className='h-3.5 w-3.5' />
                    {osNotifications.length > 0 && (
                        <span className='bg-primary absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full' />
                    )}
                </button>
                <button
                    type='button'
                    className={item}
                    onClick={() => setSpotlightOpen(true)}
                    title={t('featheros.spotlight.title')}
                >
                    <Search className='h-3.5 w-3.5' />
                </button>
                <div className='relative h-full'>
                    <button
                        type='button'
                        onClick={() => {
                            setOpen(open === 'user' ? null : 'user');
                        }}
                        className={cn(item, 'gap-1.5', open === 'user' && 'is-open')}
                    >
                        {user?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt='' className='h-4 w-4 rounded-full object-cover' />
                        ) : (
                            <User className='h-3.5 w-3.5' />
                        )}
                        <span className='hidden sm:inline'>{user?.username}</span>
                    </button>
                    {open === 'user' && (
                        <div className={cn('fos-pop absolute top-full right-0 mt-0.5', menuSurface)}>
                            <MenuList items={userItems} onDone={() => setOpen(null)} />
                        </div>
                    )}
                </div>
                <div className={cn(item, 'font-medium')}>
                    <Clock h24={settings.clock24h} seconds={settings.clockSeconds} locale={locale || 'en'} />
                </div>
            </div>
        </div>
    );
}
