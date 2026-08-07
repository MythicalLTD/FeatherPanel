/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/**
 * CSS injected into same-origin plugin iframes so panel theme matches the shell.
 *
 * Transparent iframe canvases only work when the iframe's used color-scheme
 * matches the embedding document. A mismatch forces an opaque UA Canvas
 * (white for light, near-black for dark) — see CSS Color Adjustment §3.1.
 * The panel sets `html.style.colorScheme` from ThemeContext; we must mirror
 * that on the iframe document (and the <iframe> element) or dark mode shows
 * a white slab behind plugin widgets.
 */
export function getPluginIframeThemeOverrideCss(theme: 'light' | 'dark'): string {
    // Match the parent document's color-scheme so the iframe canvas stays
    // transparent and the panel backdrop (gradients / gold glow) shows through.
    const colorSchemeBlock = `
                :root {
                    color-scheme: ${theme};
                }
            `;

    // Dark: strip only the outer shell (direct children of body). Inner routes
    // and cards keep `bg-card` / etc. so typography matches dark theme without
    // a second opaque slab hiding the panel's custom backdrop.
    const darkShellTransparency =
        theme === 'dark'
            ? `
                html.dark > body > * {
                    background: transparent !important;
                    background-color: transparent !important;
                    background-image: none !important;
                }
            `
            : '';

    return `
                ${colorSchemeBlock}
                ${darkShellTransparency}
                [data-fp-theme="light"] {
                    --fp-bg: #ffffff;
                    --fp-fg: #0a0a0a;
                    --fp-card: #ffffff;
                    --fp-card-fg: #0a0a0a;
                    --fp-muted: #f5f5f5;
                }
                [data-fp-theme="dark"] {
                    --fp-bg: #0a0a0a;
                    --fp-fg: #fafafa;
                    --fp-card: #171717;
                    --fp-card-fg: #fafafa;
                    --fp-muted: #262626;
                }
                /* Strip the iframe's own page-level background so the panel's
                   custom backdrop (gradients, glass, etc.) shows through.
                   Safe only because color-scheme matches the parent above. */
                html,
                html[data-fp-theme="light"],
                html[data-fp-theme="dark"],
                html.light,
                html.dark {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                html > body,
                html[data-fp-theme="light"] > body,
                html[data-fp-theme="dark"] > body,
                html.light > body,
                html.dark > body {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                /* Common root containers used by plugin frameworks (Next.js,
                   Nuxt/Vue, generic SPA mounts). Keep transparent so panel bg
                   bleeds through behind the plugin's own cards/sections. */
                html #__next,
                html #app,
                html #__nuxt,
                html #root,
                html[data-fp-theme="dark"] #__next,
                html[data-fp-theme="dark"] #app,
                html[data-fp-theme="dark"] #__nuxt,
                html[data-fp-theme="dark"] #root,
                html.dark #__next,
                html.dark #app,
                html.dark #__nuxt,
                html.dark #root {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                html #app > div:first-of-type,
                html #__nuxt > div:first-of-type,
                html #__next > div:first-of-type,
                html #root > div:first-of-type,
                html.dark #app > div:first-of-type,
                html.dark #__nuxt > div:first-of-type,
                html.dark #__next > div:first-of-type,
                html.dark #root > div:first-of-type {
                    background: transparent !important;
                    background-color: transparent !important;
                }
            `;
}
