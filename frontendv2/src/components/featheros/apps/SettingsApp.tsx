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

import { useRef, useState } from 'react';
import {
    Palette,
    PanelBottom,
    Monitor,
    Info,
    Check,
    RotateCcw,
    LayoutDashboard,
    Download,
    Upload,
    Trash2,
    Plus,
    RefreshCw,
    Lock,
} from 'lucide-react';
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
import { OsRange, OsSwitch } from '../controls';
import {
    DEFAULT_SETTINGS,
    EFFECT_SETTING_KEYS,
    type OsHotCornerAction,
    type OsSavedTheme,
    type OsTheme,
    type OsThemeValues,
} from '../types';
import { BUILTIN_THEMES, MAX_SAVED_THEMES, downloadThemeFile, pickThemeValues, readThemeFile } from '../themes';
import { confirmRestoreWorkspace, promptSaveWorkspace } from '../workspaces';
import { uid } from '../utils';
import { lockOs } from '../LockScreen';
import type { OsAppProps } from './index';

const HOT_CORNER_ACTIONS: OsHotCornerAction[] = ['mission', 'launchpad', 'desktop', 'notifications', 'none'];

type HotCornerKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function HotCornersMap({
    corners,
    hover,
    onHoverChange,
}: {
    corners: {
        topLeft: OsHotCornerAction;
        topRight: OsHotCornerAction;
        bottomLeft: OsHotCornerAction;
        bottomRight: OsHotCornerAction;
    };
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

type Section = 'appearance' | 'dock' | 'desktop' | 'workspaces' | 'about';

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
            <OsSwitch checked={checked} onChange={onChange} aria-label={label} />
        </label>
    );
}

function Range({
    label,
    hint,
    value,
    min,
    max,
    step = 1,
    format,
    onChange,
}: {
    label: string;
    hint?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    format: (v: number) => string;
    onChange: (v: number) => void;
}) {
    return (
        <div className='fos-settings-row'>
            <span className='fos-settings-row-text'>
                <span className='fos-settings-row-label'>{label}</span>
                {hint && <span className='fos-settings-row-hint'>{hint}</span>}
            </span>
            <OsRange
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
                className='fos-settings-range'
                aria-label={label}
            />
            <span className='fos-settings-range-val'>{format(value)}</span>
        </div>
    );
}

const GLASS_PRESETS = [
    { id: 'clear', transparency: 85, blur: 60 },
    { id: 'default', transparency: 50, blur: 100 },
    { id: 'frosted', transparency: 35, blur: 170 },
    { id: 'solid', transparency: 0, blur: 30 },
] as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className='fos-settings-group'>
            <h3 className='fos-settings-group-title'>{title}</h3>
            <div className='fos-settings-card'>{children}</div>
        </section>
    );
}

export default function SettingsApp({ win }: OsAppProps) {
    const { t, locale } = useTranslation();
    const os = useFeatherOs();
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
        prompt,
        saveWorkspace,
        deleteWorkspace,
    } = os;
    const themeFileRef = useRef<HTMLInputElement>(null);
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
        { id: 'workspaces', label: t('featheros.workspaces.title'), icon: LayoutDashboard },
        { id: 'about', label: t('featheros.settings.about'), icon: Info },
    ];

    const themes: { id: OsTheme; label: string }[] = [
        { id: 'auto', label: t('featheros.settings.theme_auto') },
        { id: 'light', label: t('featheros.settings.theme_light') },
        { id: 'dark', label: t('featheros.settings.theme_dark') },
    ];

    const savedThemes = settings.savedThemes ?? [];
    const workspaces = settings.workspaces ?? [];

    const applyTheme = (values: OsThemeValues) => {
        const { theme, accent, ...rest } = values;
        updateSettings(rest);
        if (theme) setOsTheme(theme);
        if (accent) {
            setAccentColor(accent);
            updateSettings({ accent });
        }
        if (typeof rest.customWallpaperUrl === 'string') setCustomUrl(rest.customWallpaperUrl);
    };

    const addSavedTheme = (name: string, values: OsThemeValues) => {
        const entry: OsSavedTheme = { id: uid('th'), name, savedAt: Date.now(), values };
        updateSettings({
            savedThemes: [entry, ...savedThemes.filter((th) => th.name !== name)].slice(0, MAX_SAVED_THEMES),
        });
    };

    const saveCurrentTheme = async () => {
        const name = await prompt({
            title: t('featheros.themes.save_title'),
            defaultValue: t('featheros.themes.default_name', { n: String(savedThemes.length + 1) }),
            confirmLabel: t('featheros.themes.save'),
        });
        if (!name?.trim()) return;
        addSavedTheme(name.trim().slice(0, 40), pickThemeValues(settings, accentColor));
        toast.success(t('featheros.themes.saved', { name: name.trim() }));
    };

    const importTheme = async (file: File | undefined) => {
        if (!file) return;
        const parsed = await readThemeFile(file);
        if (!parsed) {
            toast.error(t('featheros.themes.import_failed'));
            return;
        }
        addSavedTheme(parsed.name, parsed.values);
        applyTheme(parsed.values);
        toast.success(t('featheros.themes.imported', { name: parsed.name }));
    };

    const themePreview = (values: OsThemeValues) => {
        const dark = values.theme ? values.theme === 'dark' || (values.theme === 'auto' && isDark) : isDark;
        const accent = values.accent ?? '';
        const accentHex =
            accent in ACCENT_PRESETS
                ? ACCENT_PRESETS[accent as keyof typeof ACCENT_PRESETS].hex
                : isCustomAccent(accent)
                  ? getCustomAccentHex(accent)
                  : 'hsl(var(--primary))';
        return {
            dark,
            accentHex,
            background: resolveWallpaper(
                values.wallpaper ?? settings.wallpaper,
                dark,
                values.customWallpaperUrl ?? settings.customWallpaperUrl,
            ),
        };
    };

    const renderThemeCard = (key: string, name: string, values: OsThemeValues, saved?: OsSavedTheme) => {
        const p = themePreview(values);
        return (
            <div key={key} className='fos-theme-card'>
                <button
                    type='button'
                    className='fos-theme-card-hit'
                    onClick={() => applyTheme(values)}
                    aria-label={t('featheros.themes.apply_named', { name })}
                >
                    <span className='fos-theme-card-preview' style={{ background: p.background }}>
                        <span
                            className={cn('fos-theme-card-window', p.dark && 'is-dark')}
                            style={{ borderRadius: Math.round((values.windowRadius ?? 12) / 2) }}
                        >
                            <span className='fos-theme-card-dots'>
                                <i />
                                <i />
                                <i />
                            </span>
                            <span className='fos-theme-card-accent' style={{ background: p.accentHex }} />
                        </span>
                    </span>
                    <span className='fos-theme-card-name'>{name}</span>
                </button>
                {saved && (
                    <span className='fos-theme-card-actions'>
                        <button
                            type='button'
                            title={t('featheros.themes.export')}
                            aria-label={t('featheros.themes.export')}
                            onClick={() => downloadThemeFile(saved.name, saved.values)}
                        >
                            <Download className='h-3 w-3' />
                        </button>
                        <button
                            type='button'
                            title={t('featheros.common.delete')}
                            aria-label={t('featheros.common.delete')}
                            onClick={() =>
                                updateSettings({ savedThemes: savedThemes.filter((th) => th.id !== saved.id) })
                            }
                        >
                            <Trash2 className='h-3 w-3' />
                        </button>
                    </span>
                )}
            </div>
        );
    };

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
                        <Group title={t('featheros.themes.title')}>
                            <div className='fos-theme-grid'>
                                {BUILTIN_THEMES.map((th) =>
                                    renderThemeCard(th.id, t(`featheros.themes.builtin_${th.id}`), th.values),
                                )}
                                {savedThemes.map((th) => renderThemeCard(th.id, th.name, th.values, th))}
                            </div>
                            <div className='fos-settings-row fos-theme-toolbar'>
                                <span className='fos-settings-row-text'>
                                    <span className='fos-settings-row-hint'>{t('featheros.themes.hint')}</span>
                                </span>
                                <button
                                    type='button'
                                    className='fos-settings-btn'
                                    onClick={() => void saveCurrentTheme()}
                                >
                                    <Plus className='h-3.5 w-3.5' /> {t('featheros.themes.save_current')}
                                </button>
                                <button
                                    type='button'
                                    className='fos-settings-btn is-secondary'
                                    onClick={() => themeFileRef.current?.click()}
                                >
                                    <Upload className='h-3.5 w-3.5' /> {t('featheros.themes.import')}
                                </button>
                                <input
                                    ref={themeFileRef}
                                    type='file'
                                    accept='.json,application/json'
                                    hidden
                                    onChange={(e) => {
                                        void importTheme(e.target.files?.[0]);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        </Group>
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
                                        className={cn('fos-settings-swatch', currentAccent === id && 'is-active')}
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
                        <Group title={t('featheros.settings.glass')}>
                            <div className='fos-settings-glass'>
                                <div
                                    className='fos-settings-glass-preview'
                                    style={{
                                        background: resolveWallpaper(
                                            settings.wallpaper,
                                            isDark,
                                            settings.customWallpaperUrl,
                                        ),
                                    }}
                                    aria-hidden
                                >
                                    <div className='fos-settings-glass-blob' />
                                    <div className='fos-settings-glass-pane'>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                                <div className='fos-settings-glass-presets'>
                                    {GLASS_PRESETS.map((p) => {
                                        const active =
                                            !settings.reduceTransparency &&
                                            settings.glassTransparency === p.transparency &&
                                            settings.glassBlur === p.blur;
                                        return (
                                            <button
                                                key={p.id}
                                                type='button'
                                                className={cn('fos-settings-glass-preset', active && 'is-active')}
                                                onClick={() =>
                                                    updateSettings({
                                                        glassTransparency: p.transparency,
                                                        glassBlur: p.blur,
                                                        reduceTransparency: false,
                                                    })
                                                }
                                            >
                                                {t(`featheros.settings.glass_${p.id}`)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <Range
                                label={t('featheros.settings.glass_transparency')}
                                hint={t('featheros.settings.glass_transparency_hint')}
                                value={settings.glassTransparency}
                                min={0}
                                max={100}
                                format={(v) => `${v}%`}
                                onChange={(v) => updateSettings({ glassTransparency: v, reduceTransparency: false })}
                            />
                            <Range
                                label={t('featheros.settings.glass_blur')}
                                value={settings.glassBlur}
                                min={0}
                                max={200}
                                step={5}
                                format={(v) => `${v}%`}
                                onChange={(v) => updateSettings({ glassBlur: v, reduceTransparency: false })}
                            />
                            <Toggle
                                checked={settings.reduceTransparency}
                                onChange={(v) => updateSettings({ reduceTransparency: v })}
                                label={t('featheros.settings.reduce_transparency')}
                                hint={t('featheros.settings.reduce_transparency_hint')}
                            />
                        </Group>
                        <Group title={t('featheros.settings.windows')}>
                            <Range
                                label={t('featheros.settings.window_radius')}
                                value={settings.windowRadius}
                                min={0}
                                max={24}
                                format={(v) => `${v}px`}
                                onChange={(v) => updateSettings({ windowRadius: v })}
                            />
                            <Toggle
                                checked={settings.focusRing}
                                onChange={(v) => updateSettings({ focusRing: v })}
                                label={t('featheros.settings.focus_ring')}
                                hint={t('featheros.settings.focus_ring_hint')}
                            />
                            <Toggle
                                checked={settings.dimInactive}
                                onChange={(v) => updateSettings({ dimInactive: v })}
                                label={t('featheros.settings.dim_inactive')}
                            />
                            <Toggle
                                checked={settings.snapAssist !== false}
                                onChange={(v) => updateSettings({ snapAssist: v })}
                                label={t('featheros.settings.snap_assist')}
                                hint={t('featheros.settings.snap_assist_hint')}
                            />
                            <Range
                                label={t('featheros.settings.animation_speed')}
                                value={settings.animationSpeed}
                                min={0.5}
                                max={2}
                                step={0.25}
                                format={(v) => `${v}×`}
                                onChange={(v) => updateSettings({ animationSpeed: v })}
                            />
                            <Range
                                label={t('featheros.settings.text_size')}
                                value={settings.fontScale}
                                min={0.85}
                                max={1.25}
                                step={0.05}
                                format={(v) => `${Math.round(v * 100)}%`}
                                onChange={(v) => updateSettings({ fontScale: v })}
                            />
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-hint flex-1'>
                                    {t('featheros.settings.effects_reset_hint')}
                                </span>
                                <button
                                    type='button'
                                    className='fos-settings-btn'
                                    onClick={() =>
                                        updateSettings(
                                            Object.fromEntries(
                                                EFFECT_SETTING_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]]),
                                            ) as Partial<typeof settings>,
                                        )
                                    }
                                >
                                    {t('featheros.settings.effects_reset')}
                                </button>
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
                            <Range
                                label={t('featheros.settings.wallpaper_dim')}
                                value={settings.wallpaperDim}
                                min={0}
                                max={70}
                                format={(v) => `${v}%`}
                                onChange={(v) => updateSettings({ wallpaperDim: v })}
                            />
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
                                <OsRange
                                    min={36}
                                    max={80}
                                    value={settings.dockSize}
                                    onChange={(v) => updateSettings({ dockSize: v })}
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
                                    onChange={(v) => updateSettings({ dockPosition: v as 'bottom' | 'left' | 'right' })}
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
                                <OsRange
                                    min={48}
                                    max={88}
                                    value={settings.iconSize}
                                    onChange={(v) => updateSettings({ iconSize: v })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.iconSize}px</span>
                            </div>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.grid_spacing')}</span>
                                <OsRange
                                    min={80}
                                    max={140}
                                    value={settings.gridSpacing}
                                    onChange={(v) => updateSettings({ gridSpacing: v })}
                                    className='fos-settings-range'
                                />
                                <span className='fos-settings-range-val'>{settings.gridSpacing}px</span>
                            </div>
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-label'>{t('featheros.settings.spaces')}</span>
                                <OsRange
                                    min={1}
                                    max={6}
                                    value={settings.spaceCount}
                                    onChange={(v) => updateSettings({ spaceCount: v })}
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
                                                              : '-',
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
                        <Group title={t('featheros.lock.title')}>
                            <Range
                                label={t('featheros.lock.after')}
                                hint={t('featheros.lock.after_hint')}
                                value={settings.lockAfterMinutes ?? 0}
                                min={0}
                                max={60}
                                step={1}
                                format={(v) =>
                                    v === 0 ? t('featheros.lock.never') : t('featheros.lock.minutes', { n: String(v) })
                                }
                                onChange={(v) => updateSettings({ lockAfterMinutes: v })}
                            />
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-text'>
                                    <span className='fos-settings-row-label'>{t('featheros.lock.lock_screen')}</span>
                                    <span className='fos-settings-row-hint'>{t('featheros.lock.shortcut_hint')}</span>
                                </span>
                                <button
                                    type='button'
                                    className='fos-settings-btn is-secondary'
                                    onClick={() => lockOs()}
                                >
                                    <Lock className='h-3.5 w-3.5' /> {t('featheros.lock.lock_now')}
                                </button>
                            </div>
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
                {section === 'workspaces' && (
                    <>
                        <h2 className='fos-settings-heading'>{t('featheros.workspaces.title')}</h2>
                        <Group title={t('featheros.workspaces.saved_layouts')}>
                            {workspaces.length === 0 && (
                                <div className='fos-settings-row'>
                                    <span className='fos-settings-row-text'>
                                        <span className='fos-settings-row-label'>{t('featheros.workspaces.none')}</span>
                                        <span className='fos-settings-row-hint'>
                                            {t('featheros.workspaces.none_hint')}
                                        </span>
                                    </span>
                                </div>
                            )}
                            {workspaces.map((ws) => (
                                <div key={ws.id} className='fos-settings-row fos-workspace-row'>
                                    <span className='fos-workspace-thumb' aria-hidden>
                                        {ws.windows.slice(-6).map((w, i) => (
                                            <i
                                                key={i}
                                                style={{
                                                    left: `${Math.max(0, Math.min(90, (w.x / window.innerWidth) * 100))}%`,
                                                    top: `${Math.max(0, Math.min(85, (w.y / window.innerHeight) * 100))}%`,
                                                    width: `${w.maximized ? 100 : Math.max(10, Math.min(100, (w.w / window.innerWidth) * 100))}%`,
                                                    height: `${w.maximized ? 100 : Math.max(12, Math.min(100, (w.h / window.innerHeight) * 100))}%`,
                                                    ...(w.maximized ? { left: 0, top: 0 } : {}),
                                                }}
                                            />
                                        ))}
                                    </span>
                                    <span className='fos-settings-row-text'>
                                        <span className='fos-settings-row-label'>{ws.name}</span>
                                        <span className='fos-settings-row-hint'>
                                            {t('featheros.workspaces.meta', {
                                                count: String(ws.windows.length),
                                                date: new Date(ws.savedAt).toLocaleString(locale, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                }),
                                            })}
                                        </span>
                                    </span>
                                    <button
                                        type='button'
                                        className='fos-settings-btn'
                                        onClick={() => void confirmRestoreWorkspace(os, t, ws)}
                                    >
                                        {t('featheros.workspaces.restore')}
                                    </button>
                                    <button
                                        type='button'
                                        className='fos-settings-icon-btn'
                                        title={t('featheros.workspaces.update')}
                                        aria-label={t('featheros.workspaces.update')}
                                        onClick={() => {
                                            saveWorkspace(ws.name);
                                            toast.success(t('featheros.workspaces.saved', { name: ws.name }));
                                        }}
                                    >
                                        <RefreshCw className='h-3.5 w-3.5' />
                                    </button>
                                    <button
                                        type='button'
                                        className='fos-settings-icon-btn is-danger'
                                        title={t('featheros.common.delete')}
                                        aria-label={t('featheros.common.delete')}
                                        onClick={() => deleteWorkspace(ws.id)}
                                    >
                                        <Trash2 className='h-3.5 w-3.5' />
                                    </button>
                                </div>
                            ))}
                            <div className='fos-settings-row'>
                                <span className='fos-settings-row-text'>
                                    <span className='fos-settings-row-hint'>{t('featheros.workspaces.hint')}</span>
                                </span>
                                <button
                                    type='button'
                                    className='fos-settings-btn'
                                    onClick={() => void promptSaveWorkspace(os, t)}
                                >
                                    <Plus className='h-3.5 w-3.5' /> {t('featheros.workspaces.save_current')}
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
                        <p>{t('featheros.about.version', { version: version ?? '-' })}</p>
                        <p>{t('featheros.about.description', { panel: panelName })}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
