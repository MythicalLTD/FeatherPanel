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
import { Inter, Nunito } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import AppContent from '@/components/common/AppContent';
import { Toaster } from 'sonner';

import type { Metadata } from 'next';

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
    display: 'swap',
});

const nunito = Nunito({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-nunito',
    display: 'swap',
});
import { cookies } from 'next/headers';
import { settingsApi } from '@/lib/settings-api';
import { ANALYTICS_COOKIE_NAME } from '@/lib/analytics-cookie';

export async function generateMetadata(): Promise<Metadata> {
    const data = await settingsApi.getPublicSettings();
    const settings = data?.settings;

    const title = settings?.app_seo_title || settings?.app_name || 'FeatherPanel';
    const description = settings?.app_seo_description || 'A powerful game server management panel.';
    const keywords = settings?.app_seo_keywords || 'game, server, management, panel, hosting';
    const logo = settings?.app_logo_dark || '/assets/logo.png';
    const indexingEnabled = settings?.app_seo_indexing === 'true';

    return {
        title: {
            default: title,
            template: `%s | ${title}`,
        },
        description: description,
        keywords: keywords.split(',').map((k) => k.trim()),
        icons: {
            icon: logo,
            shortcut: logo,
            apple: logo,
            other: {
                rel: 'apple-touch-icon-precomposed',
                url: logo,
            },
        },
        openGraph: {
            title: title,
            description: description,
            siteName: settings?.app_name || 'FeatherPanel',
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
        applicationName: settings?.app_name || 'FeatherPanel',
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
            author: 'FeatherPanel',
        },
    };
}

import SystemHealthCheck from '@/components/SystemHealthCheck';
import PluginAssets from '@/components/common/PluginAssets';
import ChunkLoadErrorHandler from '@/components/common/ChunkLoadErrorHandler';
import { PwaInstaller } from '@/components/common/PwaInstaller';
import AnalyticsScript from '@/components/common/AnalyticsScript';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const analyticsCookie = cookieStore.get(ANALYTICS_COOKIE_NAME)?.value;
    const analyticsEnabled = analyticsCookie !== '0';

    return (
        <html lang='en' suppressHydrationWarning className={`${inter.variable} ${nunito.variable}`}>
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
                  const colors = {
                    purple: '262 83% 58%',
                    blue: '217 91% 60%',
                    green: '142 71% 45%',
                    red: '0 84% 60%',
                    orange: '25 95% 53%',
                    pink: '330 81% 60%',
                    teal: '173 80% 40%',
                    yellow: '48 96% 53%',
                    white: '210 20% 92%',
                    violet: '270 75% 55%',
                    cyan: '188 78% 41%',
                    lime: '84 69% 35%',
                    amber: '38 92% 50%',
                    rose: '347 77% 50%',
                    slate: '215 20% 45%',
                  };
                  var foregrounds = {
                    orange: '0 0% 9%',
                    teal: '0 0% 9%',
                    yellow: '0 0% 9%',
                    cyan: '0 0% 9%',
                    lime: '0 0% 9%',
                    amber: '0 0% 9%'
                  };
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.setProperty('--primary', colors[accentColor] || colors.purple);
                  document.documentElement.style.setProperty('--ring', colors[accentColor] || colors.purple);
                  document.documentElement.style.setProperty('--primary-foreground', foregrounds[accentColor] || '0 0% 98%');
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
                  var fontStacks = {
                    inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    rounded: "'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                  };
                  if (savedFont && fontStacks[savedFont]) {
                    document.documentElement.style.setProperty('--app-font-family', fontStacks[savedFont]);
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
                <SettingsProvider>
                    <ThemeProvider>
                        <TranslationProvider>
                            <SessionProvider>
                                <PreferencesProvider>
                                    <NotificationProvider>
                                        <PluginAssets />
                                        <ChunkLoadErrorHandler />
                                        <SystemHealthCheck />
                                        <PwaInstaller />
                                        <AppContent>{children}</AppContent>
                                        <Toaster richColors position='top-right' />
                                    </NotificationProvider>
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
