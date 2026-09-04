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

import './globals.css';
import { panelFontClassName } from '@/lib/panel-fonts';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import AppContent from '@/components/common/AppContent';
import { Toaster } from 'sonner';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ANALYTICS_COOKIE_NAME } from '@/lib/analytics-cookie';
import { getServerBootData, ICON_LIBRARY_COOKIE_NAME, LOCALE_COOKIE_NAME } from '@/lib/server-boot';
import { SidebarPrefsBootstrap } from '@/hooks/useSidebarPreferences';

import { APP_FONT_BOOT_STACKS_JSON } from '@/lib/app-fonts';
import { ACCENT_COLORS_BOOT_JSON, ACCENT_FOREGROUNDS_BOOT_JSON } from '@/lib/accent-colors';

import SystemHealthCheck from '@/components/SystemHealthCheck';
import PluginAssets from '@/components/common/PluginAssets';
import ChunkLoadErrorHandler from '@/components/common/ChunkLoadErrorHandler';
import { PwaInstaller } from '@/components/common/PwaInstaller';
import AnalyticsScript from '@/components/common/AnalyticsScript';

export async function generateMetadata(): Promise<Metadata> {
    const cookieStore = await cookies();
    const boot = await getServerBootData(
        cookieStore.get(LOCALE_COOKIE_NAME)?.value,
        cookieStore.get(ICON_LIBRARY_COOKIE_NAME)?.value,
    );
    const settings = boot.settings;

    const title = settings?.app_seo_title || settings?.app_name || 'FeatherPanel';
    const description = settings?.app_seo_description || 'A powerful game server management panel.';
    const keywords = settings?.app_seo_keywords || 'game, server, management, panel, hosting';
    const logo = settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png';
    const indexingEnabled = settings?.app_seo_indexing === 'true';
    const pwaEnabled = settings?.app_pwa_enabled === 'true';
    const appName = settings?.app_name || 'FeatherPanel';
    const themeColor = settings?.app_pwa_theme_color || '#000000';

    return {
        title: {
            default: title,
            template: `%s | ${title}`,
        },
        description: description,
        keywords: keywords.split(',').map((k) => k.trim()),
        applicationName: appName,
        appleWebApp: pwaEnabled
            ? {
                  capable: true,
                  title: settings?.app_pwa_short_name?.trim() || appName,
                  statusBarStyle: 'black-translucent',
              }
            : undefined,
        formatDetection: {
            telephone: false,
        },
        themeColor: [
            { media: '(prefers-color-scheme: light)', color: themeColor },
            { media: '(prefers-color-scheme: dark)', color: themeColor },
        ],
        icons: {
            icon: [{ url: logo }],
            shortcut: [{ url: logo }],
            apple: [{ url: logo, sizes: '180x180' }],
            other: [
                {
                    rel: 'apple-touch-icon-precomposed',
                    url: logo,
                },
            ],
        },
        openGraph: {
            title: title,
            description: description,
            siteName: appName,
            images: [
                {
                    url: logo,
                    width: 800,
                    height: 600,
                    alt: title,
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [logo],
        },
        robots: indexingEnabled
            ? {
                  index: true,
                  follow: true,
              }
            : {
                  index: false,
                  follow: false,
                  nocache: true,
              },
        other: {
            author: appName,
            ...(pwaEnabled
                ? {
                      'mobile-web-app-capable': 'yes',
                  }
                : {}),
        },
    };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const analyticsCookie = cookieStore.get(ANALYTICS_COOKIE_NAME)?.value;
    const analyticsEnabled = analyticsCookie !== '0';
    const boot = await getServerBootData(
        cookieStore.get(LOCALE_COOKIE_NAME)?.value,
        cookieStore.get(ICON_LIBRARY_COOKIE_NAME)?.value,
    );

    return (
        <html lang={boot.locale || 'en'} suppressHydrationWarning className={panelFontClassName}>
            <head>
                <noscript
                    dangerouslySetInnerHTML={{
                        __html: `<!-- FEATHERPANEL_HEADER_PLACEHOLDER_START -->\n<!-- FEATHERPANEL_HEADER_PLACEHOLDER_END -->`,
                    }}
                />
                <script
                    type='text/javascript'
                    dangerouslySetInnerHTML={{
                        __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  const accentColor = localStorage.getItem('accentColor') || 'purple';
                  const colors = ${ACCENT_COLORS_BOOT_JSON};
                  var foregrounds = ${ACCENT_FOREGROUNDS_BOOT_JSON};
                  function bootHexToHsl(hex) {
                    var normalized = hex.replace('#', '');
                    var r = parseInt(normalized.slice(0, 2), 16) / 255;
                    var g = parseInt(normalized.slice(2, 4), 16) / 255;
                    var b = parseInt(normalized.slice(4, 6), 16) / 255;
                    var max = Math.max(r, g, b);
                    var min = Math.min(r, g, b);
                    var delta = max - min;
                    var h = 0;
                    var l = (max + min) / 2;
                    var s = 0;
                    if (delta !== 0) {
                      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
                      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                      else if (max === g) h = ((b - r) / delta + 2) / 6;
                      else h = ((r - g) / delta + 4) / 6;
                    }
                    return {
                      h: Math.round(h * 360),
                      s: Math.round(s * 100),
                      l: Math.round(l * 100)
                    };
                  }
                  var accentHsl = colors[accentColor] || colors.purple;
                  var accentFg = foregrounds[accentColor] || '0 0% 98%';
                  if (accentColor.indexOf('custom:') === 0) {
                    var customHex = accentColor.slice(7);
                    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
                      var hsl = bootHexToHsl(customHex);
                      accentHsl = hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%';
                      accentFg = hsl.l > 58 ? '0 0% 9%' : '0 0% 98%';
                    }
                  }
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                  document.documentElement.style.setProperty('--primary', accentHsl);
                  document.documentElement.style.setProperty('--ring', accentHsl);
                  document.documentElement.style.setProperty('--primary-foreground', accentFg);
                  // Initialize motion preference for app-wide transitions.
                  const savedMotion = localStorage.getItem('motionLevel');
                  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  var motion = savedMotion === 'full' || savedMotion === 'reduced' || savedMotion === 'none'
                    ? savedMotion
                    : (prefersReduced ? 'reduced' : 'full');
                  localStorage.setItem('motionLevel', motion);
                  document.documentElement.dataset.motion = motion;

                  // Initialize font preference for UI.
                  const savedFont = localStorage.getItem('fontFamily');
                  var fontStacks = ${APP_FONT_BOOT_STACKS_JSON};
                  if (savedFont && fontStacks[savedFont]) {
                    document.documentElement.style.setProperty('--app-font-family', fontStacks[savedFont]);
                  }

                  // Keep SSR locale cookie aligned with localStorage preference.
                  var savedLocale = localStorage.getItem('locale');
                  if (savedLocale) {
                    document.cookie = '${LOCALE_COOKIE_NAME}=' + encodeURIComponent(savedLocale) + '; path=/; max-age=' + (365*24*60*60) + '; SameSite=Lax';
                  }

                  // Keep SSR icon library cookie aligned so nav icons do not morph after hydrate.
                  var savedIconLibrary = localStorage.getItem('featherpanel_icon_library');
                  if (savedIconLibrary === 'lucide' || savedIconLibrary === 'tabler' || savedIconLibrary === 'mdi' || savedIconLibrary === 'phosphor') {
                    document.cookie = '${ICON_LIBRARY_COOKIE_NAME}=' + encodeURIComponent(savedIconLibrary) + '; path=/; max-age=' + (365*24*60*60) + '; SameSite=Lax';
                  }

                  // UI preference sync id (keeps theme/layout prefs aligned across tabs).
                  var syncKey = 'fp:ui:pref:sync';
                  var syncCookie = '_fp_ui_sid';
                  var syncId = localStorage.getItem(syncKey);
                  if (!syncId) {
                    syncId = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
                      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    }).replace(/-/g, '');
                    localStorage.setItem(syncKey, syncId);
                  }
                  if (document.cookie.indexOf(syncCookie + '=') === -1) {
                    document.cookie = syncCookie + '=' + syncId + '; path=/; max-age=' + (365*24*60*60) + '; SameSite=Lax';
                  }
                } catch (e) {}
              })();
            `,
                    }}
                />
            </head>
            <body className='bg-background text-foreground'>
                <div dangerouslySetInnerHTML={{ __html: '<!-- FEATHERPANEL_APP_PLACEHOLDER_START -->' }} />
                <AnalyticsScript enabled={analyticsEnabled} />
                <SettingsProvider initialSettings={boot.settings} initialCore={boot.core}>
                    <ThemeProvider>
                        <TranslationProvider initialLocale={boot.locale} initialTranslations={boot.translations}>
                            <SessionProvider>
                                <PreferencesProvider>
                                    <SidebarPrefsBootstrap iconLibrary={boot.iconLibrary}>
                                        <NotificationProvider>
                                            <PluginAssets />
                                            <ChunkLoadErrorHandler />
                                            <SystemHealthCheck />
                                            <PwaInstaller />
                                            <AppContent>{children}</AppContent>
                                            <Toaster richColors position='top-right' />
                                        </NotificationProvider>
                                    </SidebarPrefsBootstrap>
                                </PreferencesProvider>
                            </SessionProvider>
                        </TranslationProvider>
                    </ThemeProvider>
                </SettingsProvider>
                <div dangerouslySetInnerHTML={{ __html: '<!-- FEATHERPANEL_APP_PLACEHOLDER_END -->' }} />
                <div
                    dangerouslySetInnerHTML={{
                        __html: '<!-- FEATHERPANEL_FOOTER_PLACEHOLDER_START -->\n<!-- FEATHERPANEL_FOOTER_PLACEHOLDER_END -->',
                    }}
                />
            </body>
        </html>
    );
}
