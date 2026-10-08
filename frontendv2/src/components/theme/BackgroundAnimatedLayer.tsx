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
import type { BackgroundAnimatedVariant } from '@/lib/background-variants';
import { getAuroraColorStops, getBeamLightHex, getPrimaryHex } from '@/lib/themeColors';
import { importWithRetry } from '@/lib/importWithRetry';
import BackgroundEffectBoundary from '@/components/theme/BackgroundEffectBoundary';

import '@/components/thirdparty/Aurora.css';
import '@/components/thirdparty/Beams.css';
import '@/components/thirdparty/ColorBends.css';
import '@/components/thirdparty/FloatingLines.css';

const Aurora = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Aurora')), {
    ssr: false,
    loading: () => <div className='aurora-container' />,
});
const Beams = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Beams')), { ssr: false });
const ColorBends = dynamic(() => importWithRetry(() => import('@/components/thirdparty/ColorBends')), {
    ssr: false,
});
const FloatingLines = dynamic(() => importWithRetry(() => import('@/components/thirdparty/FloatingLines')), {
    ssr: false,
    loading: () => <div className='floating-lines-container' aria-hidden />,
});
const Silk = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Silk')), { ssr: false });
const Waves = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Waves')), { ssr: false });
const SoftAura = dynamic(() => importWithRetry(() => import('@/components/thirdparty/SoftAura')), { ssr: false });
const PlasmaWave = dynamic(() => importWithRetry(() => import('@/components/thirdparty/PlasmaWave')), { ssr: false });
const Plasma = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Plasma')), { ssr: false });
const LineWaves = dynamic(() => importWithRetry(() => import('@/components/thirdparty/LineWaves')), { ssr: false });
const GhostFibers = dynamic(() => importWithRetry(() => import('@/components/thirdparty/GhostFibers')), {
    ssr: false,
});
const CRTWarp = dynamic(() => importWithRetry(() => import('@/components/thirdparty/CRTWarp')), { ssr: false });
const Ferrofluid = dynamic(() => importWithRetry(() => import('@/components/thirdparty/Ferrorfluid')), {
    ssr: false,
});

export default function BackgroundAnimatedLayer({
    variant,
    accentColor,
    preview = false,
}: {
    variant: BackgroundAnimatedVariant;
    accentColor: string;
    preview?: boolean;
}) {
    const [left, mid, right] = getAuroraColorStops(accentColor);
    const primary = getPrimaryHex(accentColor);

    return (
        <BackgroundEffectBoundary>
            {variant === 'aurora' && (
                <Aurora colorStops={getAuroraColorStops(accentColor)} amplitude={1.2} blend={0.5} />
            )}
            {variant === 'beams' && (
                <Beams lightColor={getBeamLightHex(accentColor)} speed={2} noiseIntensity={1.75} scale={0.2} />
            )}
            {variant === 'colorBends' && (
                <ColorBends
                    colors={getAuroraColorStops(accentColor)}
                    speed={0.2}
                    transparent
                    scale={1}
                    frequency={1}
                    warpStrength={1}
                />
            )}
            {variant === 'floatingLines' && (
                <FloatingLines
                    linesGradient={getAuroraColorStops(accentColor)}
                    enabledWaves={['middle', 'bottom']}
                    lineCount={[8]}
                    animationSpeed={1}
                    interactive={false}
                    parallax={false}
                />
            )}
            {variant === 'silk' && <Silk color={primary} speed={5} scale={1} noiseIntensity={1.5} />}
            {variant === 'waves' && (
                <Waves
                    horizonColor={left}
                    waveColor={mid}
                    crestColor={right}
                    speed={preview ? 0.25 : 0.35}
                    mouseInteraction={false}
                    detail={preview ? 'low' : 'medium'}
                />
            )}
            {variant === 'softAura' && (
                <SoftAura color1={left} color2={mid} speed={0.6} brightness={1.1} enableMouseInteraction={false} />
            )}
            {variant === 'plasmaWave' && (
                <PlasmaWave colors={[left, mid]} speed1={0.05} speed2={0.05} focalLength={0.8} />
            )}
            {variant === 'plasma' && (
                <Plasma
                    color={primary}
                    speed={preview ? 0.4 : 0.6}
                    scale={1.2}
                    mouseInteractive={false}
                    targetFps={preview ? 20 : 30}
                    renderScale={preview ? 0.4 : 0.55}
                />
            )}
            {variant === 'lineWaves' && (
                <LineWaves color1={left} color2={mid} color3={right} speed={0.5} enableMouseInteraction={false} />
            )}
            {variant === 'ghostFibers' && (
                <GhostFibers lineColor={left} glowColor={mid} speed={0.2} fps={preview ? 15 : 30} />
            )}
            {variant === 'crtWarp' && (
                <CRTWarp
                    color={primary}
                    speed={0.5}
                    mouseReact={false}
                    fps={preview ? 15 : 30}
                    className='h-full w-full'
                    style={{ width: '100%', height: '100%' }}
                />
            )}
            {variant === 'ferrofluid' && (
                <Ferrofluid colors={getAuroraColorStops(accentColor)} speed={0.35} mouseInteraction={false} />
            )}
        </BackgroundEffectBoundary>
    );
}
