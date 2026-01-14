'use client';
import { useEffect, useState } from 'react';
import { RedocStandalone } from 'redoc';
import Link from 'next/link';
import { ArrowLeft, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper function to get computed CSS variable value and convert to hex
function getComputedColor(cssVar: string): string {
    if (typeof window === 'undefined') return '#6366f1'; // Default fallback

    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(cssVar).trim();

    if (!value) return '#6366f1';

    // If it's already in HSL format like "262 83% 58%", convert to hex
    if (value.includes(' ')) {
        const hslMatch = value.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
        if (hslMatch) {
            const [, h, s, l] = hslMatch.map(Number);
            return hslToHex(h, s, l);
        }
    }

    // If it's already a valid color, return it
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
        return value;
    }

    return '#6366f1'; // Fallback
}

// Convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${[r, g, b]
        .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')}`;
}

export default function ApiDocs() {
    const [themeOptions, setThemeOptions] = useState<any>(null);

    useEffect(() => {
        // Get computed colors from CSS variables
        const primaryColor = getComputedColor('--primary');
        const foregroundColor = getComputedColor('--foreground');
        const mutedForegroundColor = getComputedColor('--muted-foreground');
        const cardColor = getComputedColor('--card');
        const mutedColor = getComputedColor('--muted');
        const backgroundColor = getComputedColor('--background');

        // Get font families
        const root = document.documentElement;
        const fontSans = getComputedStyle(root).getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif';
        const fontMono = getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace';

        setThemeOptions({
            theme: {
                colors: {
                    primary: {
                        main: primaryColor,
                    },
                    success: {
                        main: primaryColor,
                    },
                    text: {
                        primary: foregroundColor,
                        secondary: mutedForegroundColor,
                    },
                    http: {
                        get: '#10b981',
                        post: '#3b82f6',
                        put: '#f59e0b',
                        delete: '#ef4444',
                        patch: '#8b5cf6',
                    },
                },
                typography: {
                    fontSize: '14px',
                    fontFamily: fontSans,
                    headings: {
                        fontFamily: fontSans,
                        fontWeight: '600',
                    },
                    code: {
                        fontSize: '13px',
                        fontFamily: fontMono,
                    },
                },
                sidebar: {
                    backgroundColor: cardColor,
                    textColor: foregroundColor,
                    activeTextColor: primaryColor,
                    groupItems: {
                        activeBackgroundColor: mutedColor,
                        activeTextColor: primaryColor,
                    },
                },
                rightPanel: {
                    backgroundColor: cardColor,
                },
            },
            scrollYOffset: 73,
            hideDownloadButton: false,
            hideSingleRequestSampleTab: false,
            menuToggle: true,
            nativeScrollbars: true,
        });

        // Inject custom CSS for better styling
        const style = document.createElement('style');
        style.textContent = `
            .redoc-wrap {
                min-height: 100vh;
                background: hsl(var(--background));
                color: hsl(var(--foreground));
            }
            .redoc-wrap .api-content {
                background: hsl(var(--background));
            }
            .redoc-wrap .menu-content {
                background: hsl(var(--card));
                border-right: 1px solid hsl(var(--border));
            }
            .redoc-wrap .menu-content a {
                color: hsl(var(--foreground));
            }
            .redoc-wrap .menu-content a:hover {
                color: hsl(var(--primary));
            }
            .redoc-wrap code {
                background: hsl(var(--muted));
                color: hsl(var(--foreground));
                border: 1px solid hsl(var(--border));
            }
            .redoc-wrap pre {
                background: hsl(var(--muted));
                border: 1px solid hsl(var(--border));
            }
            .redoc-wrap .react-tabs__tab {
                color: hsl(var(--foreground));
            }
            .redoc-wrap .react-tabs__tab--selected {
                color: hsl(var(--primary));
                border-bottom-color: hsl(var(--primary));
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    if (!themeOptions) {
        return (
            <div className='min-h-screen bg-background flex items-center justify-center'>
                <div className='text-muted-foreground'>Loading API documentation...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-background'>
            <div className='sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
                <div className='container mx-auto px-4 py-4 flex items-center gap-4'>
                    <Link href='/icanhasfeatherpanel'>
                        <Button variant='ghost' size='sm'>
                            <ArrowLeft className='w-4 h-4 mr-2' />
                            Back to Documentation
                        </Button>
                    </Link>
                    <div className='flex items-center gap-2'>
                        <Code2 className='w-5 h-5 text-primary' />
                        <h1 className='text-lg font-semibold text-foreground'>API Reference</h1>
                    </div>
                </div>
            </div>
            <div className='w-full' style={{ minHeight: 'calc(100vh - 73px)' }}>
                <RedocStandalone specUrl='/api/openapi.json' options={themeOptions} />
            </div>
        </div>
    );
}
