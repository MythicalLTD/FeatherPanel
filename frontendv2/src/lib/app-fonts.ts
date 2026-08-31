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

const SYSTEM_STACK = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const APP_FONT_FAMILIES = [
    'inter',
    'system',
    'rounded',
    'poppins',
    'roboto',
    'openSans',
    'dmSans',
    'outfit',
    'spaceGrotesk',
    'manrope',
    'lato',
    'montserrat',
    'raleway',
    'workSans',
    'lexend',
    'figtree',
    'sora',
    'plusJakarta',
    'ibmPlexSans',
    'firaSans',
    'rubik',
    'ubuntu',
    'quicksand',
    'archivo',
    'jetbrainsMono',
    'firaCode',
    'ibmPlexMono',
    'sourceSerif',
    'merriweather',
    'lora',
    'playfair',
] as const;

export type AppFontFamily = (typeof APP_FONT_FAMILIES)[number];
export type AppFontCategory = 'sans' | 'serif' | 'mono';

export function isAppFontFamily(value: string | null | undefined): value is AppFontFamily {
    return APP_FONT_FAMILIES.includes(value as AppFontFamily);
}

export const APP_FONT_STACKS: Record<AppFontFamily, string> = {
    inter: "var(--font-inter), 'Inter', system-ui, sans-serif",
    system: SYSTEM_STACK,
    rounded: "var(--font-nunito), 'Nunito', system-ui, sans-serif",
    poppins: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    roboto: "var(--font-roboto), 'Roboto', system-ui, sans-serif",
    openSans: "var(--font-open-sans), 'Open Sans', system-ui, sans-serif",
    dmSans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
    outfit: "var(--font-outfit), 'Outfit', system-ui, sans-serif",
    spaceGrotesk: "var(--font-space-grotesk), 'Space Grotesk', system-ui, sans-serif",
    manrope: "var(--font-manrope), 'Manrope', system-ui, sans-serif",
    lato: "var(--font-lato), 'Lato', system-ui, sans-serif",
    montserrat: "var(--font-montserrat), 'Montserrat', system-ui, sans-serif",
    raleway: "var(--font-raleway), 'Raleway', system-ui, sans-serif",
    workSans: "var(--font-work-sans), 'Work Sans', system-ui, sans-serif",
    lexend: "var(--font-lexend), 'Lexend', system-ui, sans-serif",
    figtree: "var(--font-figtree), 'Figtree', system-ui, sans-serif",
    sora: "var(--font-sora), 'Sora', system-ui, sans-serif",
    plusJakarta: "var(--font-plus-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif",
    ibmPlexSans: "var(--font-ibm-plex-sans), 'IBM Plex Sans', system-ui, sans-serif",
    firaSans: "var(--font-fira-sans), 'Fira Sans', system-ui, sans-serif",
    rubik: "var(--font-rubik), 'Rubik', system-ui, sans-serif",
    ubuntu: "var(--font-ubuntu), 'Ubuntu', system-ui, sans-serif",
    quicksand: "var(--font-quicksand), 'Quicksand', system-ui, sans-serif",
    archivo: "var(--font-archivo), 'Archivo', system-ui, sans-serif",
    jetbrainsMono: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
    firaCode: "var(--font-fira-code), 'Fira Code', monospace",
    ibmPlexMono: "var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace",
    sourceSerif: "var(--font-source-serif), 'Source Serif 4', serif",
    merriweather: "var(--font-merriweather), 'Merriweather', serif",
    lora: "var(--font-lora), 'Lora', serif",
    playfair: "var(--font-playfair), 'Playfair Display', serif",
};

export const APP_FONT_OPTIONS: {
    value: AppFontFamily;
    name: string;
    preview: string;
    category: AppFontCategory;
    sampleKey?: AppFontFamily;
}[] = [
    { value: 'inter', name: 'Inter', preview: APP_FONT_STACKS.inter, category: 'sans', sampleKey: 'inter' },
    { value: 'system', name: 'System UI', preview: APP_FONT_STACKS.system, category: 'sans', sampleKey: 'system' },
    { value: 'rounded', name: 'Nunito', preview: APP_FONT_STACKS.rounded, category: 'sans', sampleKey: 'rounded' },
    { value: 'poppins', name: 'Poppins', preview: APP_FONT_STACKS.poppins, category: 'sans', sampleKey: 'poppins' },
    { value: 'roboto', name: 'Roboto', preview: APP_FONT_STACKS.roboto, category: 'sans', sampleKey: 'roboto' },
    {
        value: 'openSans',
        name: 'Open Sans',
        preview: APP_FONT_STACKS.openSans,
        category: 'sans',
        sampleKey: 'openSans',
    },
    { value: 'dmSans', name: 'DM Sans', preview: APP_FONT_STACKS.dmSans, category: 'sans', sampleKey: 'dmSans' },
    { value: 'outfit', name: 'Outfit', preview: APP_FONT_STACKS.outfit, category: 'sans', sampleKey: 'outfit' },
    {
        value: 'spaceGrotesk',
        name: 'Space Grotesk',
        preview: APP_FONT_STACKS.spaceGrotesk,
        category: 'sans',
        sampleKey: 'spaceGrotesk',
    },
    { value: 'manrope', name: 'Manrope', preview: APP_FONT_STACKS.manrope, category: 'sans', sampleKey: 'manrope' },
    { value: 'lato', name: 'Lato', preview: APP_FONT_STACKS.lato, category: 'sans', sampleKey: 'lato' },
    {
        value: 'montserrat',
        name: 'Montserrat',
        preview: APP_FONT_STACKS.montserrat,
        category: 'sans',
        sampleKey: 'montserrat',
    },
    { value: 'raleway', name: 'Raleway', preview: APP_FONT_STACKS.raleway, category: 'sans', sampleKey: 'raleway' },
    {
        value: 'workSans',
        name: 'Work Sans',
        preview: APP_FONT_STACKS.workSans,
        category: 'sans',
        sampleKey: 'workSans',
    },
    { value: 'lexend', name: 'Lexend', preview: APP_FONT_STACKS.lexend, category: 'sans', sampleKey: 'lexend' },
    { value: 'figtree', name: 'Figtree', preview: APP_FONT_STACKS.figtree, category: 'sans', sampleKey: 'figtree' },
    { value: 'sora', name: 'Sora', preview: APP_FONT_STACKS.sora, category: 'sans', sampleKey: 'sora' },
    {
        value: 'plusJakarta',
        name: 'Plus Jakarta Sans',
        preview: APP_FONT_STACKS.plusJakarta,
        category: 'sans',
        sampleKey: 'plusJakarta',
    },
    {
        value: 'ibmPlexSans',
        name: 'IBM Plex Sans',
        preview: APP_FONT_STACKS.ibmPlexSans,
        category: 'sans',
        sampleKey: 'ibmPlexSans',
    },
    {
        value: 'firaSans',
        name: 'Fira Sans',
        preview: APP_FONT_STACKS.firaSans,
        category: 'sans',
        sampleKey: 'firaSans',
    },
    { value: 'rubik', name: 'Rubik', preview: APP_FONT_STACKS.rubik, category: 'sans', sampleKey: 'rubik' },
    { value: 'ubuntu', name: 'Ubuntu', preview: APP_FONT_STACKS.ubuntu, category: 'sans', sampleKey: 'ubuntu' },
    {
        value: 'quicksand',
        name: 'Quicksand',
        preview: APP_FONT_STACKS.quicksand,
        category: 'sans',
        sampleKey: 'quicksand',
    },
    { value: 'archivo', name: 'Archivo', preview: APP_FONT_STACKS.archivo, category: 'sans', sampleKey: 'archivo' },
    {
        value: 'jetbrainsMono',
        name: 'JetBrains Mono',
        preview: APP_FONT_STACKS.jetbrainsMono,
        category: 'mono',
        sampleKey: 'jetbrainsMono',
    },
    {
        value: 'firaCode',
        name: 'Fira Code',
        preview: APP_FONT_STACKS.firaCode,
        category: 'mono',
        sampleKey: 'firaCode',
    },
    {
        value: 'ibmPlexMono',
        name: 'IBM Plex Mono',
        preview: APP_FONT_STACKS.ibmPlexMono,
        category: 'mono',
        sampleKey: 'ibmPlexMono',
    },
    {
        value: 'sourceSerif',
        name: 'Source Serif 4',
        preview: APP_FONT_STACKS.sourceSerif,
        category: 'serif',
        sampleKey: 'sourceSerif',
    },
    {
        value: 'merriweather',
        name: 'Merriweather',
        preview: APP_FONT_STACKS.merriweather,
        category: 'serif',
        sampleKey: 'merriweather',
    },
    { value: 'lora', name: 'Lora', preview: APP_FONT_STACKS.lora, category: 'serif', sampleKey: 'lora' },
    {
        value: 'playfair',
        name: 'Playfair Display',
        preview: APP_FONT_STACKS.playfair,
        category: 'serif',
        sampleKey: 'playfair',
    },
];

/** Inline boot script in layout.tsx — keep in sync with APP_FONT_STACKS. */
export const APP_FONT_BOOT_STACKS_JSON = JSON.stringify(APP_FONT_STACKS);

export function fontsByCategory(category: AppFontCategory) {
    return APP_FONT_OPTIONS.filter((f) => f.category === category);
}
