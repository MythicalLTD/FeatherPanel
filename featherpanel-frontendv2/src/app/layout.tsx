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

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
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
				<ThemeProvider>
					<SettingsProvider>
						<TranslationProvider>
							<SessionProvider>
								<NotificationProvider>
									<AppContent>{children}</AppContent>
									<Toaster richColors position="top-right" />
								</NotificationProvider>
							</SessionProvider>
						</TranslationProvider>
					</SettingsProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}