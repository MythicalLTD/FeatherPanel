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

import { useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { ServerContext } from '@/contexts/ServerContext';

import { backgroundFitToCssSize } from '@/lib/backgroundImageFit';
import BackgroundAnimatedLayer from '@/components/theme/BackgroundAnimatedLayer';
import { resolveServerSpellBannerBackground, resolveSpellBannerUrl } from '@/lib/server-spell-banner';
import { cn } from '@/lib/utils';

export default function BackgroundWrapper({
    children,
    fillViewport = false,
}: {
    children: React.ReactNode;
    /** Lock shell to viewport height — dashboard uses a single inner scroll area. */
    fillViewport?: boolean;
}) {
    const {
        backgroundType,
        backgroundImage,
        backdropBlur,
        backdropDarken,
        backgroundImageFit,
        accentColor,
        backgroundAnimatedVariant,
        setBackgroundType,
        setBackgroundImage,
    } = useTheme();
    const { settings } = useSettings();
    const serverCtx = useContext(ServerContext);
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isServerRoute = Boolean(pathname?.startsWith('/server/'));
    const spellBgMode = resolveServerSpellBannerBackground(settings);
    const spellBannerUrl =
        isServerRoute && spellBgMode !== 'off' ? resolveSpellBannerUrl(serverCtx?.server?.spell?.banner) : null;
    const useSpellReplace = Boolean(spellBannerUrl && spellBgMode === 'replace');
    const useSpellBlend = Boolean(spellBannerUrl && spellBgMode === 'blend');

    useEffect(() => {
        if (!mounted) return;
        if (!settings) return;
        // Don't fight a server-route spell replace background with admin image seeding.
        if (useSpellReplace) return;

        const imageUrl = settings.app_background_image_url;
        const lock = settings.app_background_lock === 'true';

        // If admin has configured a global background image
        if (imageUrl) {
            if (lock) {
                // Hard force: always apply admin background for everyone
                setBackgroundImage(imageUrl);
                setBackgroundType('image');
            } else if (!backgroundImage) {
                // Soft default: seed only when user has not chosen anything yet
                setBackgroundImage(imageUrl);
                setBackgroundType('image');
            }
        }
    }, [
        mounted,
        settings,
        settings?.app_background_image_url,
        settings?.app_background_lock,
        backgroundImage,
        setBackgroundImage,
        setBackgroundType,
        useSpellReplace,
    ]);

    if (!mounted) {
        return <>{children}</>;
    }

    const getBackgroundStyle = (): React.CSSProperties => {
        if (useSpellReplace && spellBannerUrl) {
            return {
                backgroundImage: `url(${spellBannerUrl})`,
                backgroundSize: backgroundFitToCssSize(backgroundImageFit),
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            };
        }

        if (backgroundType === 'image' && backgroundImage) {
            return {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: backgroundFitToCssSize(backgroundImageFit),
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            };
        }

        if (backgroundType === 'gradient') {
            return {
                background:
                    'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 50%, hsl(var(--primary) / 0.12) 100%)',
            };
        }

        if (backgroundType === 'pattern') {
            return {
                backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
            };
        }

        if (backgroundType === 'solid' && backgroundImage) {
            if (backgroundImage.startsWith('#')) {
                return {
                    backgroundColor: backgroundImage,
                };
            }
        }

        return {};
    };

    const useAurora = !useSpellReplace && backgroundType === 'aurora';
    const hasOverlay = backdropBlur > 0 || backdropDarken > 0 || useSpellReplace;
    const overlayStyle: React.CSSProperties = {
        backdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        WebkitBackdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        backgroundColor:
            backdropDarken > 0 || useSpellReplace
                ? `rgba(0,0,0,${Math.max(backdropDarken, useSpellReplace ? 35 : 0) / 100})`
                : undefined,
    };

    return (
        <div
            className={cn(
                'relative transition-all duration-500',
                fillViewport ? 'flex h-svh max-h-svh flex-col overflow-hidden' : 'min-h-svh',
            )}
        >
            {/* Background layer: Aurora or gradient/solid/pattern/image (or spell replace on server pages) */}
            {useAurora ? (
                <>
                    <div
                        className='auth-aurora-wrap pointer-events-none fixed inset-0 z-0'
                        style={{ background: 'hsl(var(--background))' }}
                        aria-hidden
                    >
                        <BackgroundAnimatedLayer variant={backgroundAnimatedVariant} accentColor={accentColor} />
                    </div>
                    <div
                        className='pointer-events-none fixed inset-0 z-[1]'
                        style={{
                            background:
                                'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, hsl(var(--background) / 0.35) 100%)',
                        }}
                        aria-hidden
                    />
                </>
            ) : (
                <div
                    className='pointer-events-none fixed inset-0 z-0 transition-all duration-500'
                    style={getBackgroundStyle()}
                    aria-hidden
                />
            )}

            {/* Soft spell banner over the existing theme background on server pages */}
            {useSpellBlend && spellBannerUrl ? (
                <div
                    className='pointer-events-none fixed inset-0 z-[1] bg-cover bg-center bg-no-repeat opacity-45 transition-all duration-500'
                    style={{ backgroundImage: `url(${spellBannerUrl})` }}
                    aria-hidden
                />
            ) : null}

            {hasOverlay && (
                <div
                    className='pointer-events-none fixed inset-0 z-[2] transition-all duration-500'
                    style={overlayStyle}
                    aria-hidden
                />
            )}
            <div className={cn('relative z-10', fillViewport && 'flex min-h-0 flex-1 flex-col')}>{children}</div>
        </div>
    );
}
