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

import localFont from 'next/font/local';

/**
 * Preference fonts are fully self-hosted via next/font/local (files in src/fonts).
 * Do not use next/font/google here: Docker/CI builds fetch Google Fonts at compile
 * time and fail unreliably (null URL parse / network timeouts).
 *
 * Static families ship discrete weight files; variable families use one file with
 * a weight range. Regenerate with: node scripts/vendor-panel-fonts.mjs
 *
 * next/font requires each localFont() call to be a module-scope const (no wrappers).
 */
const inter = localFont({
    src: [
        { path: '../fonts/Inter-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Inter-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/Inter-600.woff2', weight: '600', style: 'normal' },
        { path: '../fonts/Inter-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-inter',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const nunito = localFont({
    src: [
        { path: '../fonts/Nunito-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Nunito-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/Nunito-600.woff2', weight: '600', style: 'normal' },
        { path: '../fonts/Nunito-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-nunito',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const poppins = localFont({
    src: [
        { path: '../fonts/Poppins-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Poppins-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/Poppins-600.woff2', weight: '600', style: 'normal' },
        { path: '../fonts/Poppins-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-poppins',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const roboto = localFont({
    src: '../fonts/Roboto-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-roboto',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const openSans = localFont({
    src: '../fonts/OpenSans-400.woff2',
    weight: '300 800',
    style: 'normal',
    variable: '--font-open-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const dmSans = localFont({
    src: '../fonts/DMSans-400.woff2',
    weight: '100 1000',
    style: 'normal',
    variable: '--font-dm-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const outfit = localFont({
    src: '../fonts/Outfit-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-outfit',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const spaceGrotesk = localFont({
    src: '../fonts/SpaceGrotesk-400.woff2',
    weight: '300 700',
    style: 'normal',
    variable: '--font-space-grotesk',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const manrope = localFont({
    src: '../fonts/Manrope-400.woff2',
    weight: '200 800',
    style: 'normal',
    variable: '--font-manrope',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const lato = localFont({
    src: [
        { path: '../fonts/Lato-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Lato-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-lato',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const montserrat = localFont({
    src: '../fonts/Montserrat-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-montserrat',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const raleway = localFont({
    src: '../fonts/Raleway-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-raleway',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const workSans = localFont({
    src: '../fonts/WorkSans-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-work-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const lexend = localFont({
    src: '../fonts/Lexend-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-lexend',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const figtree = localFont({
    src: '../fonts/Figtree-400.woff2',
    weight: '300 900',
    style: 'normal',
    variable: '--font-figtree',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const sora = localFont({
    src: '../fonts/Sora-400.woff2',
    weight: '100 800',
    style: 'normal',
    variable: '--font-sora',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const plusJakarta = localFont({
    src: '../fonts/PlusJakartaSans-400.woff2',
    weight: '200 800',
    style: 'normal',
    variable: '--font-plus-jakarta',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const ibmPlexSans = localFont({
    src: '../fonts/IBMPlexSans-400.woff2',
    weight: '100 700',
    style: 'normal',
    variable: '--font-ibm-plex-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const firaSans = localFont({
    src: [
        { path: '../fonts/FiraSans-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/FiraSans-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/FiraSans-600.woff2', weight: '600', style: 'normal' },
        { path: '../fonts/FiraSans-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-fira-sans',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const rubik = localFont({
    src: '../fonts/Rubik-400.woff2',
    weight: '300 900',
    style: 'normal',
    variable: '--font-rubik',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const ubuntu = localFont({
    src: [
        { path: '../fonts/Ubuntu-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/Ubuntu-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/Ubuntu-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-ubuntu',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const quicksand = localFont({
    src: '../fonts/Quicksand-400.woff2',
    weight: '300 700',
    style: 'normal',
    variable: '--font-quicksand',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const archivo = localFont({
    src: '../fonts/Archivo-400.woff2',
    weight: '100 900',
    style: 'normal',
    variable: '--font-archivo',
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const jetbrainsMono = localFont({
    src: '../fonts/JetBrainsMono-400.woff2',
    weight: '100 800',
    style: 'normal',
    variable: '--font-jetbrains-mono',
    display: 'swap',
    fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
});

const firaCode = localFont({
    src: '../fonts/FiraCode-400.woff2',
    weight: '300 700',
    style: 'normal',
    variable: '--font-fira-code',
    display: 'swap',
    fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
});

const ibmPlexMono = localFont({
    src: [
        { path: '../fonts/IBMPlexMono-400.woff2', weight: '400', style: 'normal' },
        { path: '../fonts/IBMPlexMono-500.woff2', weight: '500', style: 'normal' },
        { path: '../fonts/IBMPlexMono-600.woff2', weight: '600', style: 'normal' },
        { path: '../fonts/IBMPlexMono-700.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-ibm-plex-mono',
    display: 'swap',
    fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
});

const sourceSerif = localFont({
    src: '../fonts/SourceSerif4-400.woff2',
    weight: '200 900',
    style: 'normal',
    variable: '--font-source-serif',
    display: 'swap',
    fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

const merriweather = localFont({
    src: '../fonts/Merriweather-400.woff2',
    weight: '300 900',
    style: 'normal',
    variable: '--font-merriweather',
    display: 'swap',
    fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

const lora = localFont({
    src: '../fonts/Lora-400.woff2',
    weight: '400 700',
    style: 'normal',
    variable: '--font-lora',
    display: 'swap',
    fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

const playfair = localFont({
    src: '../fonts/PlayfairDisplay-400.woff2',
    weight: '400 900',
    style: 'normal',
    variable: '--font-playfair',
    display: 'swap',
    fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

/** CSS class string for `<html>` — attaches all panel font variables. */
export const panelFontClassName = [
    inter.variable,
    nunito.variable,
    poppins.variable,
    roboto.variable,
    openSans.variable,
    dmSans.variable,
    outfit.variable,
    spaceGrotesk.variable,
    manrope.variable,
    lato.variable,
    montserrat.variable,
    raleway.variable,
    workSans.variable,
    lexend.variable,
    figtree.variable,
    sora.variable,
    plusJakarta.variable,
    ibmPlexSans.variable,
    firaSans.variable,
    rubik.variable,
    ubuntu.variable,
    quicksand.variable,
    archivo.variable,
    jetbrainsMono.variable,
    firaCode.variable,
    ibmPlexMono.variable,
    sourceSerif.variable,
    merriweather.variable,
    lora.variable,
    playfair.variable,
].join(' ');
