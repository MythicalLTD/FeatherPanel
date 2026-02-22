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

import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

import { getAuroraColorStops, getPrimaryHex, getBeamLightHex, getAccentHue } from '@/lib/themeColors';

import '@/components/thirdparty/Aurora.css';
import '@/components/thirdparty/Beams.css';
import '@/components/thirdparty/ColorBends.css';
import '@/components/thirdparty/DarkVeil.css';
import '@/components/thirdparty/FloatingLines.css';

const Aurora = dynamic(() => import('@/components/thirdparty/Aurora'), {
    ssr: false,
    loading: () => <div className='aurora-container' />,
});
const Beams = dynamic(() => import('@/components/thirdparty/Beams'), { ssr: false });
const ColorBends = dynamic(() => import('@/components/thirdparty/ColorBends'), { ssr: false });
const DarkVeil = dynamic(() => import('@/components/thirdparty/DarkVeil'), { ssr: false });
const FloatingLines = dynamic(() => import('@/components/thirdparty/FloatingLines'), { ssr: false });
const Silk = dynamic(() => import('@/components/thirdparty/Silk'), { ssr: false });

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
    const {
        backgroundType,
        backgroundImage,
        backdropBlur,
        backdropDarken,
        backgroundImageFit,
        accentColor,
        backgroundAnimatedVariant,
    } = useTheme();
    const [mounted] = useState(() => typeof window !== 'undefined');

    if (!mounted) {
        return <>{children}</>;
    }

    const getBackgroundStyle = (): React.CSSProperties => {
        if (backgroundType === 'image' && backgroundImage) {
            return {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: backgroundImageFit,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
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

    const useAurora = backgroundType === 'aurora';
    const hasOverlay = backdropBlur > 0 || backdropDarken > 0;
    const overlayStyle: React.CSSProperties = {
        backdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        WebkitBackdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        backgroundColor: backdropDarken > 0 ? `rgba(0,0,0,${backdropDarken / 100})` : undefined,
    };

    return (
        <div className='min-h-screen transition-all duration-500 relative'>
            {/* Background layer: Aurora or gradient/solid/pattern/image */}
            {useAurora ? (
                <>
                    <div
                        className='auth-aurora-wrap pointer-events-none fixed inset-0 z-0'
                        style={{ background: 'hsl(var(--background))' }}
                        aria-hidden
                    >
                        {backgroundAnimatedVariant === 'aurora' && (
                            <Aurora colorStops={getAuroraColorStops(accentColor)} amplitude={1.2} blend={0.5} />
                        )}
                        {backgroundAnimatedVariant === 'beams' && (
                            <Beams
                                lightColor={getBeamLightHex(accentColor)}
                                speed={2}
                                noiseIntensity={1.75}
                                scale={0.2}
                            />
                        )}
                        {backgroundAnimatedVariant === 'colorBends' && (
                            <ColorBends
                                colors={getAuroraColorStops(accentColor)}
                                speed={0.2}
                                transparent
                                scale={1}
                                frequency={1}
                                warpStrength={1}
                            />
                        )}
                        {backgroundAnimatedVariant === 'darkVeil' && (
                            <>
                                <DarkVeil
                                    hueShift={getAccentHue(accentColor)}
                                    noiseIntensity={0.03}
                                    speed={0.5}
                                    warpAmount={0.5}
                                />
                                <div
                                    className='absolute inset-0 pointer-events-none'
                                    style={{
                                        background: `linear-gradient(135deg, hsl(var(--primary) / 0.45) 0%, transparent 50%, hsl(var(--primary) / 0.25) 100%)`,
                                        mixBlendMode: 'color',
                                    }}
                                    aria-hidden
                                />
                            </>
                        )}
                        {backgroundAnimatedVariant === 'floatingLines' && (
                            <FloatingLines
                                linesGradient={getAuroraColorStops(accentColor)}
                                enabledWaves={['middle', 'bottom']}
                                lineCount={[8]}
                                animationSpeed={1}
                                interactive={false}
                                parallax={false}
                            />
                        )}
                        {backgroundAnimatedVariant === 'silk' && (
                            <Silk color={getPrimaryHex(accentColor)} speed={5} scale={1} noiseIntensity={1.5} />
                        )}
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

            {hasOverlay && (
                <div
                    className='pointer-events-none fixed inset-0 z-[2] transition-all duration-500'
                    style={overlayStyle}
                    aria-hidden
                />
            )}
            <div className='relative z-10'>{children}</div>
        </div>
    );
}
