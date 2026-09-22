#!/usr/bin/env node
/**
 * Download latin-subset preference fonts into src/fonts for next/font/local.
 * Static families keep per-weight files; variable families keep a single *-400.woff2.
 *
 * Usage: node scripts/vendor-panel-fonts.mjs
 */
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

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/fonts');
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';

const FONTS = [
    { filePrefix: 'Poppins', family: 'Poppins', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Roboto', family: 'Roboto', weights: ['400', '500', '700'] },
    { filePrefix: 'OpenSans', family: 'Open Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'DMSans', family: 'DM Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Outfit', family: 'Outfit', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'SpaceGrotesk', family: 'Space Grotesk', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Manrope', family: 'Manrope', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Lato', family: 'Lato', weights: ['400', '700'] },
    { filePrefix: 'Montserrat', family: 'Montserrat', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Raleway', family: 'Raleway', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'WorkSans', family: 'Work Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Lexend', family: 'Lexend', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Figtree', family: 'Figtree', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Sora', family: 'Sora', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'PlusJakartaSans', family: 'Plus Jakarta Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'IBMPlexSans', family: 'IBM Plex Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'FiraSans', family: 'Fira Sans', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Rubik', family: 'Rubik', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Ubuntu', family: 'Ubuntu', weights: ['400', '500', '700'] },
    { filePrefix: 'Quicksand', family: 'Quicksand', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Archivo', family: 'Archivo', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'JetBrainsMono', family: 'JetBrains Mono', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'FiraCode', family: 'Fira Code', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'IBMPlexMono', family: 'IBM Plex Mono', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'SourceSerif4', family: 'Source Serif 4', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'Merriweather', family: 'Merriweather', weights: ['400', '700'] },
    { filePrefix: 'Lora', family: 'Lora', weights: ['400', '500', '600', '700'] },
    { filePrefix: 'PlayfairDisplay', family: 'Playfair Display', weights: ['400', '500', '600', '700'] },
];

async function fetchRetry(url, tries = 5) {
    let last;
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': UA } });
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            return res;
        } catch (e) {
            last = e;
            await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        }
    }
    throw last;
}

function latinWoff2ByWeight(css) {
    const map = new Map();
    let currentSubset = '';
    let currentWeight = '';
    for (const line of css.split('\n')) {
        const sub = /\/\* (.+?) \*\//.exec(line)?.[1];
        if (sub) {
            currentSubset = sub;
            continue;
        }
        const w = /font-weight:\s*(\d+)/.exec(line)?.[1];
        if (w) currentWeight = w;
        const src = /src: url\((.+?)\)/.exec(line)?.[1];
        if (src && currentSubset === 'latin' && currentWeight && !map.has(currentWeight)) {
            map.set(currentWeight, src);
        }
    }
    return map;
}

fs.mkdirSync(OUT, { recursive: true });

for (const font of FONTS) {
    const familyParam = encodeURIComponent(font.family).replace(/%20/g, '+');
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${font.weights.join(';')}&display=swap`;
    const css = await (await fetchRetry(cssUrl)).text();
    const byWeight = latinWoff2ByWeight(css);

    /** @type {{ weight: string, buf: Buffer }[]} */
    const downloaded = [];
    for (const weight of font.weights) {
        const url = byWeight.get(weight);
        if (!url) {
            throw new Error(`Missing latin ${font.family} ${weight}; have ${[...byWeight.keys()]}`);
        }
        const buf = Buffer.from(await (await fetchRetry(url)).arrayBuffer());
        if (buf.byteLength < 500) throw new Error(`tiny download for ${font.family} ${weight}`);
        downloaded.push({ weight, buf });
    }

    const hashes = downloaded.map((d) => createHash('md5').update(d.buf).digest('hex'));
    const isVariable = new Set(hashes).size === 1 && downloaded.length > 1;

    // Remove previous files for this prefix (except Inter/Nunito which are not in FONTS)
    for (const existing of fs.readdirSync(OUT)) {
        if (existing.startsWith(`${font.filePrefix}-`) && existing.endsWith('.woff2')) {
            fs.unlinkSync(path.join(OUT, existing));
        }
    }

    if (isVariable) {
        const dest = path.join(OUT, `${font.filePrefix}-400.woff2`);
        fs.writeFileSync(dest, downloaded[0].buf);
        console.log(`variable ${font.filePrefix} -> ${path.basename(dest)} (${downloaded[0].buf.byteLength}b)`);
    } else {
        for (const { weight, buf } of downloaded) {
            const dest = path.join(OUT, `${font.filePrefix}-${weight}.woff2`);
            fs.writeFileSync(dest, buf);
            console.log(`static ${path.basename(dest)} (${buf.byteLength}b)`);
        }
    }
}

console.log('Done. Fonts in', OUT);
