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

import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { FeatherOsProvider, useFeatherOs } from './FeatherOsContext';
import { MenuBar } from './MenuBar';
import { Desktop } from './Desktop';
import { Dock } from './Dock';
import { Spotlight } from './Spotlight';
import { OsContextMenu } from './ContextMenu';
import { OsDialogs } from './OsDialogs';
import { AboutDialog } from './AboutDialog';
import { QuickLook } from './QuickLook';
import { BootScreen } from './BootScreen';
import { OsWindowFrame } from './OsWindowFrame';
import { ServerPicker } from './ServerPicker';
import { MissionControl } from './MissionControl';
import { Launchpad } from './Launchpad';
import { NotificationCenter } from './NotificationCenter';
import { HotCorners } from './HotCorners';
import { AppSwitcher } from './AppSwitcher';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { SnapAssist } from './SnapLayouts';
import { LockScreen } from './LockScreen';
import { ImmersivePrompt } from './ImmersivePrompt';
import { useOsHotkeys } from './useOsHotkeys';
import { DesktopOnlyGate } from './DesktopOnlyGate';
import { OsSessionGate } from './OsSessionGate';
import { OS_APPS } from './registry';
import { OS_APP_COMPONENTS } from './apps';
import { resolveWallpaper } from './wallpapers';
import { glassAlphaScale, type OsWindow } from './types';
import './featheros.css';

function AppHost({ win }: { win: OsWindow }) {
    const { t } = useTranslation();
    const { setWindowServer, getServer, can, serversLoading } = useFeatherOs();
    const def = OS_APPS[win.app];
    const Component = OS_APP_COMPONENTS[win.app];
    if (def.serverScoped) {
        if (!win.serverUuid) {
            return (
                <ServerPicker
                    permission={def.serverPermission}
                    onPick={(uuid) => setWindowServer(win.id, uuid)}
                    title={t('featheros.picker.title_for', { app: t(def.nameKey) })}
                />
            );
        }
        const server = getServer(win.serverUuid);
        if (!server && !serversLoading) {
            return (
                <Notice
                    text={t('featheros.errors.server_gone')}
                    action={t('featheros.window.switch_server')}
                    onAction={() => setWindowServer(win.id, null)}
                />
            );
        }
        if (server && def.serverPermission && !can(server, def.serverPermission)) {
            return (
                <Notice
                    text={t('featheros.errors.no_permission_app')}
                    action={t('featheros.window.switch_server')}
                    onAction={() => setWindowServer(win.id, null)}
                />
            );
        }
        if (!server) return null;
    }
    return <Component win={win} />;
}

function Notice({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
    return (
        <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm'>
            <ShieldAlert className='h-8 w-8' />
            <p>{text}</p>
            <button
                type='button'
                onClick={onAction}
                className='bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium'
            >
                {action}
            </button>
        </div>
    );
}

function Shell() {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const {
        ready,
        bootPhase,
        bootProgress,
        osName,
        logoUrl,
        windows,
        settings,
        isDark,
        activeSpace,
        missionControlOpen,
        launchpadOpen,
    } = os;
    const wallpaper = resolveWallpaper(settings.wallpaper, isDark, settings.customWallpaperUrl);
    const dim = Math.max(0, Math.min(70, settings.wallpaperDim ?? 0)) / 100;
    const [bootGone, setBootGone] = useState(false);
    const {
        metaHeld,
        shortcutsOpen,
        setShortcutsOpen,
        switcherOpen,
        switcherIndex,
        switcherWindows,
        hoverSwitcher,
        pickSwitcher,
    } = useOsHotkeys();

    const bootStatus = useMemo(() => {
        if (ready || bootPhase === 'done') {
            return t('featheros.boot.ready', { defaultValue: 'Starting…' });
        }
        if (bootPhase === 'session') {
            return t('featheros.boot.session', { defaultValue: 'Signing in…' });
        }
        if (bootPhase === 'state') {
            return t('featheros.boot.desktop', { defaultValue: 'Loading desktop…' });
        }
        return t('featheros.boot.servers', { defaultValue: 'Loading servers…' });
    }, [ready, bootPhase, t]);

    useEffect(() => {
        document.title = osName;
    }, [osName]);

    useEffect(() => {
        if (!ready) return;
        const timer = window.setTimeout(() => setBootGone(true), 550);
        return () => window.clearTimeout(timer);
    }, [ready]);

    // The panel page behind stays mounted (providers), but the OS owns the whole viewport.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div
            className={cn('fos-root fixed inset-0 z-[200] flex flex-col overflow-hidden select-none', isDark && 'dark')}
            data-fos-motion={settings.reduceMotion ? 'reduced' : 'full'}
            data-fos-theme={isDark ? 'dark' : 'light'}
            data-fos-meta-held={metaHeld ? 'true' : undefined}
            data-fos-launchpad={launchpadOpen ? 'true' : undefined}
            data-fos-focus-ring={settings.focusRing ? 'true' : undefined}
            data-fos-dim-inactive={settings.dimInactive ? 'true' : undefined}
            data-fos-solid={settings.reduceTransparency ? 'true' : undefined}
            style={{
                background:
                    dim > 0 ? `linear-gradient(rgb(0 0 0 / ${dim}), rgb(0 0 0 / ${dim})), ${wallpaper}` : wallpaper,
                fontSize: `${Math.round(15 * (settings.fontScale || 1))}px`,
                ['--fos-speed' as string]: String(settings.animationSpeed || 1),
                ['--fos-accent' as string]: settings.accent?.startsWith('#') ? settings.accent : undefined,
                ['--fos-alpha' as string]: glassAlphaScale(settings).toFixed(3),
                ['--fos-blur-scale' as string]: settings.reduceTransparency
                    ? '0'
                    : String(Math.max(0, Math.min(200, settings.glassBlur ?? 100)) / 100),
                ['--fos-radius' as string]: `${Math.max(0, Math.min(24, settings.windowRadius ?? 12))}px`,
            }}
            onContextMenu={(e) => {
                // Keep the native menu (copy / paste / spellcheck) inside text fields and editors.
                const el = e.target as HTMLElement;
                if (el.closest('input, textarea, [contenteditable="true"], .monaco-editor, .xterm')) return;
                e.preventDefault();
            }}
        >
            <MenuBar />
            <div className='relative min-h-0 flex-1'>
                <Desktop />
                {ready &&
                    windows
                        .filter((win) => (win.space ?? 0) === activeSpace || missionControlOpen)
                        .map((win) => (
                            <OsWindowFrame key={win.id} win={win}>
                                <div className='h-full w-full select-text'>
                                    <AppHost win={win} />
                                </div>
                            </OsWindowFrame>
                        ))}
                <Dock />
            </div>
            <OsContextMenu />
            <Spotlight />
            <Launchpad />
            <MissionControl />
            <AppSwitcher
                open={switcherOpen}
                ordered={switcherWindows}
                selectedIndex={switcherIndex}
                onHover={hoverSwitcher}
                onPick={pickSwitcher}
            />
            <SnapAssist />
            <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <ImmersivePrompt ready={ready && bootGone} />
            <LockScreen />
            <NotificationCenter />
            <HotCorners />
            <AboutDialog />
            <QuickLook />
            <OsDialogs />
            {!bootGone && (
                <BootScreen
                    logoUrl={logoUrl}
                    osName={osName}
                    leaving={ready}
                    progress={bootProgress}
                    status={bootStatus}
                />
            )}
        </div>
    );
}

export default function FeatherOS() {
    return (
        <DesktopOnlyGate>
            <OsSessionGate>
                <FeatherOsProvider>
                    <Shell />
                </FeatherOsProvider>
            </OsSessionGate>
        </DesktopOnlyGate>
    );
}
