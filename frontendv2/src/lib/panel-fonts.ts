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
import {
    Archivo,
    DM_Sans,
    Figtree,
    Fira_Code,
    Fira_Sans,
    IBM_Plex_Mono,
    IBM_Plex_Sans,
    JetBrains_Mono,
    Lato,
    Lexend,
    Lora,
    Manrope,
    Merriweather,
    Montserrat,
    Open_Sans,
    Outfit,
    Playfair_Display,
    Plus_Jakarta_Sans,
    Poppins,
    Quicksand,
    Raleway,
    Roboto,
    Rubik,
    Sora,
    Source_Serif_4,
    Space_Grotesk,
    Ubuntu,
    Work_Sans,
} from 'next/font/google';

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

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-poppins',
    display: 'swap',
});
const roboto = Roboto({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-roboto',
    display: 'swap',
});
const openSans = Open_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-open-sans',
    display: 'swap',
});
const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-dm-sans',
    display: 'swap',
});
const outfit = Outfit({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-outfit',
    display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-space-grotesk',
    display: 'swap',
});
const manrope = Manrope({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-manrope',
    display: 'swap',
});
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato', display: 'swap' });
const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-montserrat',
    display: 'swap',
});
const raleway = Raleway({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-raleway',
    display: 'swap',
});
const workSans = Work_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-work-sans',
    display: 'swap',
});
const lexend = Lexend({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-lexend',
    display: 'swap',
});
const figtree = Figtree({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-figtree',
    display: 'swap',
});
const sora = Sora({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-sora',
    display: 'swap',
});
const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-plus-jakarta',
    display: 'swap',
});
const ibmPlexSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-ibm-plex-sans',
    display: 'swap',
});
const firaSans = Fira_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-fira-sans',
    display: 'swap',
});
const rubik = Rubik({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-rubik',
    display: 'swap',
});
const ubuntu = Ubuntu({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-ubuntu',
    display: 'swap',
});
const quicksand = Quicksand({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-quicksand',
    display: 'swap',
});
const archivo = Archivo({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-archivo',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-jetbrains-mono',
    display: 'swap',
});
const firaCode = Fira_Code({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-fira-code',
    display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-ibm-plex-mono',
    display: 'swap',
});

const sourceSerif = Source_Serif_4({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-source-serif',
    display: 'swap',
});
const merriweather = Merriweather({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-merriweather',
    display: 'swap',
});
const lora = Lora({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-lora',
    display: 'swap',
});
const playfair = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-playfair',
    display: 'swap',
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
