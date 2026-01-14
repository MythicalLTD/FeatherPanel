import '@/app/(app)/globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'sonner';
import PluginAssets from '@/components/common/PluginAssets';

export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en' suppressHydrationWarning>
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
            <body className='bg-background text-foreground' suppressHydrationWarning>
                <ThemeProvider>
                    <PluginAssets />
                    {children}
                    <Toaster richColors position='top-right' />
                </ThemeProvider>
            </body>
        </html>
    );
}
