/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { TranslationProvider } from '@/contexts/TranslationContext'
import { SessionProvider } from '@/contexts/SessionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import AppContent from '@/components/common/AppContent'
import { Toaster } from 'sonner'

import type { Metadata } from 'next'
import { settingsApi } from '@/lib/settings-api'

export async function generateMetadata(): Promise<Metadata> {
  const data = await settingsApi.getPublicSettings()
  const settings = data?.settings

  const title = settings?.app_seo_title || settings?.app_name || 'FeatherPanel'
  const description = settings?.app_seo_description || 'A powerful game server management panel.'
  const keywords = settings?.app_seo_keywords || 'game, server, management, panel, hosting'
  const logo = settings?.app_logo_dark || '/assets/logo.png'

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: description,
    keywords: keywords.split(',').map(k => k.trim()),
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
  }
}

import SystemHealthCheck from '@/components/SystemHealthCheck'

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
                <meta name="author" content="FeatherPanel" />
                <noscript dangerouslySetInnerHTML={{ __html: `<!-- FEATHERPANEL_HEADER_PLACEHOLDER_START -->\n<!-- FEATHERPANEL_HEADER_PLACEHOLDER_END -->` }} />
				<script
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
                  };
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.setProperty('--primary', colors[accentColor] || colors.purple);
                  document.documentElement.style.setProperty('--ring', colors[accentColor] || colors.purple);
                } catch (e) {}
              })();
            `,
					}}
				/>
			</head>
			<body className="bg-background text-foreground">
                <div dangerouslySetInnerHTML={{ __html: '<!-- FEATHERPANEL_APP_PLACEHOLDER_START -->' }} />
				<ThemeProvider>
					<SettingsProvider>
						<TranslationProvider>
							<SessionProvider>
								<NotificationProvider>
                                    <SystemHealthCheck />
									<AppContent>{children}</AppContent>
									<Toaster richColors position="top-right" />
								</NotificationProvider>
							</SessionProvider>
						</TranslationProvider>
					</SettingsProvider>
				</ThemeProvider>
                <div dangerouslySetInnerHTML={{ __html: '<!-- FEATHERPANEL_APP_PLACEHOLDER_END -->' }} />
                <div dangerouslySetInnerHTML={{ __html: '<!-- FEATHERPANEL_FOOTER_PLACEHOLDER_START -->\n<!-- FEATHERPANEL_FOOTER_PLACEHOLDER_END -->' }} />
			</body>
		</html>
	)
}