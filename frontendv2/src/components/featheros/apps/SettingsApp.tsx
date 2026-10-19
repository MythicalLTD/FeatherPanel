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

import { useState } from 'react';
import { Palette, PanelBottom, Monitor, Info, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ACCENT_PRESET_IDS, ACCENT_PRESETS } from '@/lib/accent-colors';
import { formatCustomAccent, getCustomAccentHex, isCustomAccent } from '@/lib/accent-color-utils';
import { featherOsApi } from '@/lib/featheros-api';
import { toast } from 'sonner';
import { useFeatherOs } from '../FeatherOsContext';
import { OsSelect } from '../OsSelect';
import { OS_WALLPAPERS, resolveWallpaper } from '../wallpapers';
import { OS_APP_IDS, OS_APPS } from '../registry';
import { AppIcon } from '../AppIcon';
import type { OsHotCornerAction, OsTheme } from '../types';
import type { OsAppProps } from './index';

const HOT_CORNER_ACTIONS: OsHotCornerAction[] = [
    'mission',
    'launchpad',
    'desktop',
    'notifications',
    'none',
];

type HotCornerKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function HotCornersMap({
    corners,
    hover,
    onHoverChange,
}: {
    corners: { topLeft: OsHotCornerAction; topRight: OsHotCornerAction; bottomLeft: OsHotCornerAction; bottomRight: OsHotCornerAction };
    hover: HotCornerKey | null;
    onHoverChange: (key: HotCornerKey | null) => void;
}) {
    const cells: { key: HotCornerKey; mark: string }[] = [
        { key: 'topLeft', mark: 'TL' },
        { key: 'topRight', mark: 'TR' },
        { key: 'bottomLeft', mark: 'BL' },
        { key: 'bottomRight', mark: 'BR' },
    ];
    return (
        <div className='fos-hotcorners-map' aria-hidden>
            {cells.map((c) => (
                <div
                    key={c.key}
                    className={cn('fos-hotcorners-cell', hover === c.key && 'is-hover')}
                    title={corners[c.key]}
                    onMouseEnter={() => onHoverChange(c.key)}
                    onMouseLeave={() => onHoverChange(null)}
                >
                    {c.mark}
                </div>
            ))}
        </div>
    );
}

type Section = 'appearance' | 'dock' | 'desktop' | 'about';

function Toggle({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
}) {
    return (
        <label className='fos-settings-row'>
            <span className='fos-settings-row-text'>
                <span className='fos-settings-row-label'>{label}</span>
                {hint && <span className='fos-settings-row-hint'>{hint}</span>}
            </span>
            <button
                type='button'
                role='switch'
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn('fos-settings-toggle', checked && 'is-on')}
            >
                <span />
            </button>
        </label>
    );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className='fos-settings-group'>
            <h3 className='fos-settings-group-title'>{title}</h3>
            <div className='fos-settings-card'>{children}</div>
        </section>
    );
}

export default function SettingsApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const {
        settings,
        updateSettings,
        setOsTheme,
        isDark,
        dock,
        setDock,
        resetDesktop,
        confirm,
        osName,
        logoUrl,
        version,
        panelName,
        updateWindowProps,
    } = useFeatherOs();
    const { setAccentColor, accentColor } = useTheme();
    const section: Section = (win.props?.section as Section) ?? 'appearance';
    const [customUrl, setCustomUrl] = useState(settings.customWallpaperUrl);
    const [hotCornerHover, setHotCornerHover] = useState<HotCornerKey | null>(null);
    const currentAccent = settings.accent || accentColor;
    const hotCorners = settings.hotCorners ?? {
        topLeft: 'mission' as OsHotCornerAction,
        topRight: 'notifications' as OsHotCornerAction,
        bottomLeft: 'desktop' as OsHotCornerAction,
        bottomRight: 'launchpad' as OsHotCornerAction,
    };

    const nav: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'appearance', label: t('featheros.settings.appearance'), icon: Palette },
        { id: 'dock', label: t('featheros.settings.dock'), icon: PanelBottom },
        { id: 'desktop', label: t('featheros.settings.desktop'), icon: Monitor },
        { id: 'about', label: t('featheros.settings.about'), icon: Info },
    ];

    const themes: { id: OsTheme; label: string }[] = [
        { id: 'auto', label: t('featheros.settings.theme_auto') },
        { id: 'light', label: t('featheros.settings.theme_light') },
        { id: 'dark', label: t('featheros.settings.theme_dark') },
    ];

    return (
        <div className='fos-settings'>
            <aside className='fos-settings-sidebar'>
                {nav.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type='button'
                        onClick={() => updateWindowProps(win.id, { section: id })}
                        className={cn('fos-settings-nav', section === id && 'is-active')}
                    >
                        <span className={cn('fos-settings-nav-icon', `is-${id}`)}>
                            <Icon className='h-3.5 w-3.5' />
                        </span>
                        {label}
                    </button>
                ))}
            </aside>
            <div className='fos-settings-main fos-scroll'>
                {section === 'appearance' && (
                    <>
                        <h2 className='fos-settings-heading'>{t('featheros.settings.appearance')}</h2>
                        <Group title={t('featheros.settings.theme')}>
                            <div className='fos-settings-themes'>
                                {themes.map((th) => (
                                    <button
                                        key={th.id}
                                        type='button'
                                        onClick={() => setOsTheme(th.id)}
                                        className={cn('fos-settings-theme', settings.theme === th.id && 'is-active')}
                                    >
                                        <span
                                            className={cn(
                                                'fos-settings-theme-preview',
                                                th.id === 'light' && 'is-light',
                                                th.id === 'dark' && 'is-dark',
                                                th.id === 'auto' && 'is-auto',
                                            )}
                                        />
                                        <span>{th.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Group>
                        <Group title={t('featheros.settings.accent')}>
                            <div className='fos-settings-accents'>
                                {ACCENT_PRESET_IDS.map((id) => (
                                    <button
                                        key={id}
                                        type='button'
                                        title={id}
                                        aria-label={id}
                                        onClick={() => {
                                            setAccentColor(id);
                                            updateSettings({ accent: id });
                                        }}
                                        className={cn(
                                            'fos-settings-swatch',
                                            currentAccent === id && 'is-active',
                                        )}
                                        style={{ background: ACCENT_PRESETS[id].hex }}
                                    >
                                        {currentAccent === id && <Check className='h-3 w-3 text-white drop-shadow' />}
                                    </button>
                                ))}
                                <label
                                    className={cn(
                                        'fos-settings-swatch fos-settings-swatch-custom',
                                        isCustomAccent(currentAccent) && 'is-active',
                                    )}
                                    title={t('featheros.settings.accent_custom')}
                                >
                                    <input
                                        type='color'
                                        value={
                                            isCustomAccent(currentAccent)
                                                ? getCustomAccentHex(currentAccent)
                                                : '#0a84ff'
                                        }
                                        onChange={(e) => {
                                            const next = formatCustomAccent(e.target.value);
                                            setAccentColor(next);
                                            updateSettings({ accent: next });
                                        }}
                                    />
                                </label>
                            </div>
                        </Group>
                        <Group title={t('featheros.settings.wallpaper')}>
                            <div className='fos-settings-wallpapers'>
                                {OS_WALLPAPERS.map((wp) => (
                                    <button
                                        key={wp.id}
                                        type='button'
                                        onClick={() => updateSettings({ wallpaper: wp.id })}
                                        className={cn(
                                            'fos-settings-wallpaper',
                                            settings.wallpaper === wp.id && 'is-active',
                                        )}
                                    >
                                        <span
                                            className='fos-settings-wallpaper-thumb'
                                            style={{ background: isDark ? wp.dark : wp.light }}
                                        >
                                            {settings.wallpaper === wp.id && (
                                                <Check className='h-4 w-4 text-white drop-shadow' />
                                            )}
                                        </span>
                                        <span>{t(wp.nameKey)}</span>
                                    </button>
                                ))}
                            </div>
                            <div className='fos-settings-wallpaper-custom'>
                                <input
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                    placeholder={t('featheros.settings.custom_url')}
                                    className='fos-settings-input'
                                />
                                <button
                                    type='button'
                                    disabled={!customUrl.trim()}
                                    onClick={() =>
                                        updateSettings({ wallpaper: 'custom', customWallpaperUrl: customUrl.trim() })
                                    }
                                    className='fos-settings-btn'
                                >
                                    {t('featheros.settings.use_custom')}
                                </button>
                            </div>
                            <div className='fos-settings-wallpaper-upload'>
                                <input
                                    type='file'
                                    accept='image/png,image/jpeg,image/webp,image/gif'
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (!file) return;
                                        try {
                                            const url = await featherOsApi.uploadWallpaper(file);
                                            setCustomUrl(url);
                                            updateSettings({ wallpaper: 'custom', customWallpaperUrl: url });
                                            toast.success(t('featheros.settings.wallpaper_uploaded'));
                                        } catch (err) {
                                            toast.error(t('featheros.settings.wallpaper_upload_failed'));
                                            console.error(err);
                                        }
                                    }}
                                />
                                <span>{t('featheros.settings.wallpaper_upload_hint')}</span>
                            </div>
                            {settings.wallpaper === 'custom' && (
                                <div
                                    className='fos-settings-wallpaper-preview'
                                    style={{
                                        background: resolveWallpaper('custom', isDark, settings.customWallpaperUrl),
                                    }}
                                />
                            )}
                        </Group>
                    </>
                )}
                {section === 'dock' && (
                    <>
                        <h2 className='fos-settings-heading'>{t('featheros.settings.dock')}</h2>
                        <Group title={t('featheros.settings.dock')}>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.dock_size')}</span>
                                <input
                                    type='range'
                                    min={36}
                                    max={80}
                                    value={settings.dockSize}
                                    onChange={(e) => updateSettings({ dockSize: Number(e.target.value) })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.dockSize}px</span>
                            </div>
                            <Toggle
                                checked={settings.dockMagnification}
                                onChange={(v) => updateSettings({ dockMagnification: v })}
                                label={t('featheros.settings.dock_magnification')}
                            />
                            <Toggle
                                checked={settings.dockAutoHide}
                                onChange={(v) => updateSettings({ dockAutoHide: v })}
                                label={t('featheros.settings.dock_autohide')}
                            />
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.dock_position')}</span>
                                <OsSelect
                                    ariaLabel={t('featheros.settings.dock_position')}
                                    value={settings.dockPosition}
                                    onChange={(v) =>
                                        updateSettings({ dockPosition: v as 'bottom' | 'left' | 'right' })
                                    }
                                    options={[
                                        { value: 'bottom', label: t('featheros.settings.dock_bottom') },
                                        { value: 'left', label: t('featheros.settings.dock_left') },
                                        { value: 'right', label: t('featheros.settings.dock_right') },
                                    ]}
                                />
                            </div>
                        </Group>
                        <Group title={t('featheros.settings.dock_apps')}>
                            <div className='fos-settings-dock-apps'>
                                {OS_APP_IDS.map((id) => {
                                    const pinned = dock.includes(id);
                                    return (
                                        <label key={id} className='fos-settings-dock-app'>
                                            <input
                                                type='checkbox'
                                                checked={pinned}
                                                onChange={() =>
                                                    setDock(pinned ? dock.filter((d) => d !== id) : [...dock, id])
                                                }
                                            />
                                            <AppIcon app={id} size={22} />
                                            <span>{t(OS_APPS[id].nameKey)}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </Group>
                    </>
                )}
                {section === 'desktop' && (
                    <>
                        <h2 className='fos-settings-heading'>{t('featheros.settings.desktop')}</h2>
                        <Group title={t('featheros.settings.desktop')}>
                            <Toggle
                                checked={settings.showServerIcons}
                                onChange={(v) => updateSettings({ showServerIcons: v })}
                                label={t('featheros.settings.show_server_icons')}
                            />
                            <Toggle
                                checked={settings.reduceMotion}
                                onChange={(v) => updateSettings({ reduceMotion: v })}
                                label={t('featheros.settings.reduce_motion')}
                            />
                            <Toggle
                                checked={settings.showWidgets}
                                onChange={(v) => updateSettings({ showWidgets: v })}
                                label={t('featheros.settings.show_widgets')}
                            />
                            <Toggle
                                checked={settings.snapToGrid}
                                onChange={(v) => updateSettings({ snapToGrid: v })}
                                label={t('featheros.settings.snap_to_grid')}
                            />
                            <Toggle
                                checked={settings.menuBarOpaque}
                                onChange={(v) => updateSettings({ menuBarOpaque: v })}
                                label={t('featheros.settings.menu_opaque')}
                            />
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.icon_size')}</span>
                                <input
                                    type='range'
                                    min={48}
                                    max={88}
                                    value={settings.iconSize}
                                    onChange={(e) => updateSettings({ iconSize: Number(e.target.value) })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.iconSize}px</span>
                            </div>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.grid_spacing')}</span>
                                <input
                                    type='range'
                                    min={80}
                                    max={140}
                                    value={settings.gridSpacing}
                                    onChange={(e) => updateSettings({ gridSpacing: Number(e.target.value) })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.gridSpacing}px</span>
                            </div>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.spaces')}</span>
                                <input
                                    type='range'
                                    min={1}
                                    max={6}
                                    value={settings.spaceCount}
                                    onChange={(e) => updateSettings({ spaceCount: Number(e.target.value) })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.spaceCount}</span>
                            </div>
                        </Group>
                        <Group title={t('featheros.hot_corners.title', { defaultValue: 'Hot Corners' })}>
                            <HotCornersMap
                                corners={hotCorners}
                                onHoverChange={setHotCornerHover}
                                hover={hotCornerHover}
                            />
                            {(
                                [
                                    ['topLeft', 'featheros.hot_corners.top_left', 'Top Left'],
                                    ['topRight', 'featheros.hot_corners.top_right', 'Top Right'],
                                    ['bottomLeft', 'featheros.hot_corners.bottom_left', 'Bottom Left'],
                                    ['bottomRight', 'featheros.hot_corners.bottom_right', 'Bottom Right'],
                                ] as const
                            ).map(([key, labelKey, fallback]) => (
                                <div
                                    key={key}
                                    className='fos-settings-row'
                                    onMouseEnter={() => setHotCornerHover(key)}
                                    onMouseLeave={() => setHotCornerHover(null)}
                                >
                                    <span className='fos-settings-row-label'>
                                        {t(labelKey, { defaultValue: fallback })}
                                    </span>
                                    <OsSelect
                                        ariaLabel={t(labelKey, { defaultValue: fallback })}
                                        value={settings.hotCorners?.[key] ?? 'none'}
                                        onChange={(v) =>
                                            updateSettings({
                                                hotCorners: {
                                                    ...settings.hotCorners,
                                                    [key]: v as OsHotCornerAction,
                                                },
                                            })
                                        }
                                        options={HOT_CORNER_ACTIONS.map((action) => ({
                                            value: action,
                                            label: t(`featheros.hot_corners.action_${action}`, {
                                                defaultValue:
                                                    action === 'mission'
                                                        ? 'Mission Control'
                                                        : action === 'launchpad'
                                                          ? 'Launchpad'
                                                          : action === 'desktop'
                                                            ? 'Show Desktop'
                                                            : action === 'notifications'
                                                              ? 'Notification Center'
                                                              : '—',
                                            }),
                                        }))}
                                    />
                                </div>
                            ))}
                        </Group>
                        <Group title={t('featheros.settings.clock')}>
                            <Toggle
                                checked={settings.clock24h}
                                onChange={(v) => updateSettings({ clock24h: v })}
                                label={t('featheros.settings.clock_24h')}
                            />
                            <Toggle
                                checked={settings.clockSeconds}
                                onChange={(v) => updateSettings({ clockSeconds: v })}
                                label={t('featheros.settings.clock_seconds')}
                            />
                        </Group>
                        <Group title={t('featheros.settings.reset')}>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-hint flex-1'>
                                    {t('featheros.settings.reset_hint')}
                                </span>
                                <button
                                    type='button'
                                    onClick={async () => {
                                        const ok = await confirm({
                                            title: t('featheros.settings.reset'),
                                            message: t('featheros.settings.reset_hint'),
                                            confirmLabel: t('featheros.settings.reset_confirm'),
                                            danger: true,
                                        });
                                        if (ok) await resetDesktop();
                                    }}
                                    className='fos-settings-btn-danger'
                                >
                                    <RotateCcw className='h-3.5 w-3.5' /> {t('featheros.settings.reset_confirm')}
                                </button>
                            </div>
                        </Group>
                    </>
                )}
                {section === 'about' && (
                    <div className='fos-settings-about'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt='' />
                        <h2>{osName}</h2>
                        <p>{t('featheros.about.version', { version: version ?? '—' })}</p>
                        <p>{t('featheros.about.description', { panel: panelName })}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
