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

import type { ReactNode } from 'react';
import type { OsAppId } from './types';

/** Original FeatherOS app artwork, drawn on a 100×100 canvas and clipped to the squircle by AppIcon. */

/** Continuous-corner squircle, close to the macOS icon mask. */
export const SQUIRCLE_PATH =
    'M50 0C80 0 89 0 94.5 5.5C100 11 100 20 100 50C100 80 100 89 94.5 94.5C89 100 80 100 50 100C20 100 11 100 5.5 94.5C0 89 0 80 0 50C0 20 0 11 5.5 5.5C11 0 20 0 50 0Z';

/** Builds ids that are unique per rendered icon (gradients break when two SVGs share ids and one is hidden). */
export type IconIds = (name: string) => string;

const url = (id: string) => `url(#${id})`;

function vgrad(id: string, from: string, to: string, x2 = 0, y2 = 1) {
    return (
        <linearGradient id={id} x1='0' y1='0' x2={x2} y2={y2}>
            <stop offset='0' stopColor={from} />
            <stop offset='1' stopColor={to} />
        </linearGradient>
    );
}

function background(u: IconIds, from: string, to: string) {
    return (
        <>
            <defs>{vgrad(u('bg'), from, to)}</defs>
            <rect width='100' height='100' fill={url(u('bg'))} />
        </>
    );
}

function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number) {
    const pts: string[] = [];
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
        const a = i * step;
        const corners: Array<[number, number]> = [
            [a - step * 0.3, inner],
            [a - step * 0.17, outer],
            [a + step * 0.17, outer],
            [a + step * 0.3, inner],
        ];
        for (const [ang, r] of corners) {
            pts.push(`${(cx + Math.cos(ang) * r).toFixed(2)} ${(cy + Math.sin(ang) * r).toFixed(2)}`);
        }
    }
    return `M${pts.join('L')}Z`;
}

/** Four-point sparkle with concave sides. */
function sparkle(cx: number, cy: number, s: number) {
    return `M${cx} ${cy - s}Q${cx} ${cy} ${cx + s} ${cy}Q${cx} ${cy} ${cx} ${cy + s}Q${cx} ${cy} ${cx - s} ${cy}Q${cx} ${cy} ${cx} ${cy - s}Z`;
}

function calendarFace(u: IconIds) {
    const now = new Date();
    let weekday = '';
    try {
        weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(now).replace('.', '').toUpperCase();
    } catch {
        weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];
    }
    return (
        <>
            {background(u, '#FFFFFF', '#ECECF1')}
            <defs>{vgrad(u('head'), '#FF5A4F', '#E5322A')}</defs>
            <rect width='100' height='30' fill={url(u('head'))} />
            <text
                x='50'
                y='21.5'
                textAnchor='middle'
                fontSize='13'
                fontWeight='700'
                letterSpacing='1'
                fill='#fff'
                fontFamily='-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif'
                suppressHydrationWarning
            >
                {weekday}
            </text>
            <text
                x='50'
                y='83'
                textAnchor='middle'
                fontSize='52'
                fontWeight='300'
                letterSpacing='-2'
                fill='#1C1C1E'
                fontFamily='-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif'
                suppressHydrationWarning
            >
                {now.getDate()}
            </text>
        </>
    );
}

const LAUNCHER_COLORS = [
    '#FF5F57',
    '#FF9F0A',
    '#FFD60A',
    '#30D158',
    '#64D2FF',
    '#0A84FF',
    '#BF5AF2',
    '#FF375F',
    '#C8A27A',
];

export const LAUNCHER_ART = (u: IconIds) => (
    <>
        {background(u, '#4A4A51', '#1C1C20')}
        <g filter={url(u('sh'))}>
            {LAUNCHER_COLORS.map((color, i) => (
                <rect
                    key={color}
                    x={19 + (i % 3) * 22}
                    y={19 + Math.floor(i / 3) * 22}
                    width='18'
                    height='18'
                    rx='5.5'
                    fill={color}
                />
            ))}
        </g>
    </>
);

export const SERVER_DRIVE_ART = (u: IconIds) => (
    <>
        {background(u, '#5DB2FF', '#1C59D2')}
        <defs>{vgrad(u('drive'), '#FFFFFF', '#C7D2E0')}</defs>
        <g filter={url(u('sh'))}>
            <rect x='13' y='32' width='74' height='36' rx='9' fill={url(u('drive'))} />
        </g>
        <path d='M21 45H58' stroke='#94A3B8' strokeWidth='2.6' strokeLinecap='round' />
        <path d='M21 53H48' stroke='#B4C0CF' strokeWidth='2.6' strokeLinecap='round' />
        <circle cx='75' cy='50' r='4.4' fill='#22C55E' stroke='#15803D' strokeOpacity='0.4' strokeWidth='1' />
    </>
);

/** Bare macOS-style folder for desktop folders (no squircle). */
export const FOLDER_ART = (u: IconIds) => (
    <>
        <defs>
            {vgrad(u('back'), '#3B92EE', '#1E68CF')}
            {vgrad(u('front'), '#7CCBFF', '#3D9BF2')}
        </defs>
        <g filter={url(u('sh'))}>
            <path
                d='M14 16h20c2.8 0 4.5 1 6 3l4.4 5.6H86a7 7 0 0 1 7 7V82a7 7 0 0 1-7 7H14a7 7 0 0 1-7-7V23a7 7 0 0 1 7-7z'
                fill={url(u('back'))}
            />
            <rect x='13' y='30' width='74' height='34' rx='3' fill='#fff' opacity='0.95' />
            <path d='M7 41a7 7 0 0 1 7-7h72a7 7 0 0 1 7 7v41a7 7 0 0 1-7 7H14a7 7 0 0 1-7-7z' fill={url(u('front'))} />
            <path d='M13 35.6h74' stroke='#fff' strokeOpacity='0.5' strokeWidth='1.2' />
        </g>
    </>
);

/** Bare document with a folded corner, labelled with the file extension. */
export function fileArt(ext: string) {
    const label = ext.slice(0, 4).toUpperCase();
    return function FileArt(u: IconIds) {
        return (
            <>
                <defs>{vgrad(u('page'), '#FFFFFF', '#EEF0F4')}</defs>
                <g filter={url(u('sh'))}>
                    <path
                        d='M24 6h37l21 21v61a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z'
                        fill={url(u('page'))}
                    />
                </g>
                <path d='M61 6v16a5 5 0 0 0 5 5h16' fill='#DCE0E7' />
                <text
                    x='50'
                    y='74'
                    textAnchor='middle'
                    fontSize={label.length > 3 ? 14 : 16}
                    fontWeight='700'
                    letterSpacing='0.5'
                    fill='#6B7280'
                    fontFamily='-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif'
                >
                    {label}
                </text>
            </>
        );
    };
}

export const APP_ICON_ART: Record<OsAppId, (u: IconIds) => ReactNode> = {
    finder: (u) => (
        <>
            {background(u, '#F6FAFF', '#D3E4F9')}
            <defs>
                {vgrad(u('back'), '#2E86E8', '#1A64C9')}
                {vgrad(u('front'), '#74C4FF', '#3A98F0')}
            </defs>
            <g filter={url(u('sh'))}>
                <path
                    d='M23 22h14.5c2.4 0 3.9.9 5.3 2.6L46.4 29H77a7 7 0 0 1 7 7v38a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7V29a7 7 0 0 1 7-7z'
                    fill={url(u('back'))}
                />
                <rect x='22' y='33' width='56' height='30' rx='3' fill='#fff' opacity='0.96' />
                <path
                    d='M16 44a6 6 0 0 1 6-6h56a6 6 0 0 1 6 6v30a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z'
                    fill={url(u('front'))}
                />
                <path d='M22 39.4h56' stroke='#fff' strokeOpacity='0.5' strokeWidth='1.2' />
                <path
                    d='M44 58c4-1.6 8.6-6.2 12-10.6-1.2 6.8-4.6 11.6-9.4 14.2M44 58l-3.4 6'
                    fill='none'
                    stroke='#fff'
                    strokeOpacity='0.8'
                    strokeWidth='2.8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </g>
        </>
    ),

    terminal: (u) => (
        <>
            {background(u, '#ECECF0', '#B4B4BC')}
            <defs>
                {vgrad(u('screen'), '#2E2E33', '#0F0F11')}
                {vgrad(u('glare'), 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)')}
            </defs>
            <g filter={url(u('sh'))}>
                <rect x='11' y='13' width='78' height='74' rx='10' fill={url(u('screen'))} />
            </g>
            <rect x='11' y='13' width='78' height='30' rx='10' fill={url(u('glare'))} />
            <path
                d='M24 33l12 9-12 9'
                fill='none'
                stroke='#F5F5F7'
                strokeWidth='5'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <rect x='41' y='47' width='15' height='5' rx='1.6' fill='#4ADE80' />
            <rect x='24' y='63' width='34' height='3.6' rx='1.8' fill='#fff' opacity='0.22' />
            <rect x='24' y='71' width='22' height='3.6' rx='1.8' fill='#fff' opacity='0.14' />
        </>
    ),

    editor: (u) => (
        <>
            {background(u, '#7173F5', '#3B2FC0')}
            <defs>{vgrad(u('card'), '#221E52', '#15123A')}</defs>
            <g filter={url(u('sh'))}>
                <rect x='15' y='17' width='70' height='66' rx='10' fill={url(u('card'))} />
            </g>
            <circle cx='25' cy='27' r='2.6' fill='#FF5F57' />
            <circle cx='32.5' cy='27' r='2.6' fill='#FEBC2E' />
            <circle cx='40' cy='27' r='2.6' fill='#28C840' />
            <g>
                <rect x='24' y='37' width='14' height='4.4' rx='2.2' fill='#F472B6' />
                <rect x='41' y='37' width='24' height='4.4' rx='2.2' fill='#93C5FD' />
                <rect x='30' y='46' width='18' height='4.4' rx='2.2' fill='#86EFAC' />
                <rect x='51' y='46' width='14' height='4.4' rx='2.2' fill='#FDE68A' />
                <rect x='30' y='55' width='28' height='4.4' rx='2.2' fill='#93C5FD' />
                <rect x='30' y='64' width='10' height='4.4' rx='2.2' fill='#F472B6' />
                <rect x='43' y='64' width='18' height='4.4' rx='2.2' fill='#C4B5FD' />
                <rect x='24' y='73' width='12' height='4.4' rx='2.2' fill='#86EFAC' />
            </g>
        </>
    ),

    servers: (u) => (
        <>
            {background(u, '#3EDBA3', '#03785A')}
            <defs>{vgrad(u('unit'), '#FFFFFF', '#D5DFDA')}</defs>
            <g filter={url(u('sh'))}>
                {[19, 40.5, 62].map((y, i) => (
                    <g key={y}>
                        <rect x='18' y={y} width='64' height='18' rx='5' fill={url(u('unit'))} />
                        <circle cx='29' cy={y + 9} r='3.2' fill={i === 2 ? '#F59E0B' : '#22C55E'} />
                        <circle cx='38' cy={y + 9} r='2' fill='#A7B4AE' />
                        {[54, 60, 66, 72].map((x) => (
                            <rect key={x} x={x} y={y + 5} width='2.6' height='8' rx='1.3' fill='#9AA8A1' />
                        ))}
                    </g>
                ))}
            </g>
        </>
    ),

    server: (u) => (
        <>
            {background(u, '#5B8CFF', '#2747B8')}
            <defs>{vgrad(u('unit'), '#FFFFFF', '#DCE4F7')}</defs>
            <g filter={url(u('sh'))}>
                <rect x='18' y='20' width='64' height='60' rx='9' fill={url(u('unit'))} />
                <rect x='18' y='20' width='20' height='60' rx='9' fill='#C9D6F5' />
                {[34, 46, 58].map((y) => (
                    <rect key={y} x='23' y={y} width='10' height='3' rx='1.5' fill='#5B7BD6' />
                ))}
                <rect x='44' y='32' width='30' height='4' rx='2' fill='#9BB0E6' />
                <rect x='44' y='42' width='24' height='4' rx='2' fill='#B7C6EE' />
                <circle cx='70' cy='66' r='5' fill='#22C55E' />
            </g>
        </>
    ),

    monitor: (u) => (
        <>
            {background(u, '#2E2E31', '#0C0C0E')}
            <defs>
                {vgrad(u('line'), '#D9F99D', '#22C55E', 1, 0)}
                {vgrad(u('area'), 'rgba(74,222,128,0.5)', 'rgba(74,222,128,0)')}
            </defs>
            {[28, 44, 60, 76].map((y) => (
                <path key={y} d={`M10 ${y}H90`} stroke='#fff' strokeOpacity='0.08' strokeWidth='1' />
            ))}
            {[30, 50, 70].map((x) => (
                <path key={x} d={`M${x} 14V86`} stroke='#fff' strokeOpacity='0.05' strokeWidth='1' />
            ))}
            <path d='M10 68L22 60L31 64L41 40L50 53L59 28L68 46L78 37L90 49V90H10Z' fill={url(u('area'))} />
            <path
                d='M10 68L22 60L31 64L41 40L50 53L59 28L68 46L78 37L90 49'
                fill='none'
                stroke={url(u('line'))}
                strokeWidth='4'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <circle cx='59' cy='28' r='4' fill='#ECFCCB' />
        </>
    ),

    logs: (u) => (
        <>
            {background(u, '#FFBD4A', '#F2700E')}
            <defs>{vgrad(u('paper'), '#FFFFFF', '#EEF0F3')}</defs>
            <g filter={url(u('sh'))}>
                <rect x='21' y='13' width='58' height='74' rx='8' fill={url(u('paper'))} />
            </g>
            {(
                [
                    ['#EF4444', 30],
                    ['#F59E0B', 22],
                    ['#3B82F6', 32],
                    ['#22C55E', 18],
                    ['#3B82F6', 26],
                ] as const
            ).map(([color, w], i) => (
                <g key={i}>
                    <circle cx='31' cy={28 + i * 11.5} r='3.2' fill={color} />
                    <rect x='38' y={26 + i * 11.5} width={w} height='4.2' rx='2.1' fill='#C7CFDA' />
                </g>
            ))}
        </>
    ),

    databases: (u) => (
        <>
            {background(u, '#45C6FA', '#0566A6')}
            <defs>
                <linearGradient id={u('side')} x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='0' stopColor='#CDEBFB' />
                    <stop offset='0.45' stopColor='#FFFFFF' />
                    <stop offset='1' stopColor='#B5DDF5' />
                </linearGradient>
            </defs>
            <g filter={url(u('sh'))}>
                <path d='M23 27V73A27 9.5 0 0 0 77 73V27Z' fill={url(u('side'))} />
                <ellipse cx='50' cy='27' rx='27' ry='9.5' fill='#F2FAFF' />
            </g>
            <ellipse cx='50' cy='27' rx='27' ry='9.5' fill='none' stroke='#7CC6EE' strokeWidth='1.4' />
            <path
                d='M23 42.5A27 9.5 0 0 0 77 42.5'
                fill='none'
                stroke='#2A9BD8'
                strokeOpacity='0.6'
                strokeWidth='2.2'
            />
            <path d='M23 58A27 9.5 0 0 0 77 58' fill='none' stroke='#2A9BD8' strokeOpacity='0.6' strokeWidth='2.2' />
            <circle cx='68' cy='50' r='2.4' fill='#22C55E' />
            <circle cx='68' cy='65.5' r='2.4' fill='#22C55E' />
        </>
    ),

    notes: (u) => (
        <>
            {background(u, '#FFF6C2', '#FFE36B')}
            <defs>{vgrad(u('bind'), '#45454D', '#232327')}</defs>
            <rect width='100' height='24' fill={url(u('bind'))} />
            {[22, 36, 50, 64, 78].map((x) => (
                <circle
                    key={x}
                    cx={x}
                    cy='24'
                    r='3.4'
                    fill='#FFF6C2'
                    stroke='#1C1C1E'
                    strokeOpacity='0.35'
                    strokeWidth='1'
                />
            ))}
            {[42, 54, 66, 78, 90].map((y) => (
                <path key={y} d={`M10 ${y}H92`} stroke='#8CB8F0' strokeWidth='1.6' />
            ))}
            <path d='M25 24V100' stroke='#F27474' strokeWidth='1.8' />
            <path
                d='M32 49c4-3 7 3 11 0s7 3 11 0 6 2 9 0'
                fill='none'
                stroke='#3F3F46'
                strokeWidth='2.4'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </>
    ),

    settings: (u) => (
        <>
            {background(u, '#A3A3AA', '#56565C')}
            <defs>
                {vgrad(u('gear'), '#FAFAFC', '#B9B9C0')}
                {vgrad(u('hub'), '#D6D6DC', '#8E8E95')}
            </defs>
            <g filter={url(u('sh'))}>
                <path
                    d={gearPath(50, 50, 36, 28, 12)}
                    fill={url(u('gear'))}
                    stroke={url(u('gear'))}
                    strokeWidth='3'
                    strokeLinejoin='round'
                />
            </g>
            <circle cx='50' cy='50' r='21' fill={url(u('hub'))} />
            <circle cx='50' cy='50' r='21' fill='none' stroke='#fff' strokeOpacity='0.5' strokeWidth='1' />
            <path
                d={gearPath(50, 50, 15, 11.5, 8)}
                fill='#E9E9EE'
                stroke='#E9E9EE'
                strokeWidth='1.6'
                strokeLinejoin='round'
            />
            <circle cx='50' cy='50' r='5.5' fill='#5C5C63' />
        </>
    ),

    backups: (u) => (
        <>
            {background(u, '#FF7A8E', '#C0123E')}
            <defs>{vgrad(u('face'), '#FFFFFF', '#FFE1E7')}</defs>
            <path
                d='M20.9 41.4A31 31 0 1 1 26.3 71.9'
                fill='none'
                stroke='#fff'
                strokeWidth='5.5'
                strokeLinecap='round'
            />
            <path d='M15 39.2L27 43.6L18.4 49Z' fill='#fff' stroke='#fff' strokeWidth='2' strokeLinejoin='round' />
            <g filter={url(u('sh'))}>
                <circle cx='50' cy='52' r='22' fill={url(u('face'))} />
            </g>
            <path
                d='M50 38V52L60 58'
                fill='none'
                stroke='#C0123E'
                strokeWidth='4.4'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <circle cx='50' cy='52' r='3' fill='#C0123E' />
        </>
    ),

    schedules: calendarFace,

    network: (u) => (
        <>
            {background(u, '#63A8FF', '#1A47C9')}
            <circle cx='50' cy='50' r='30' fill='#fff' fillOpacity='0.14' />
            <g fill='none' stroke='#fff' strokeLinecap='round' filter={url(u('sh'))}>
                <circle cx='50' cy='50' r='30' strokeWidth='4' />
                <ellipse cx='50' cy='50' rx='13' ry='30' strokeWidth='3.2' />
                <path d='M20 50H80' strokeWidth='3.2' />
                <path d='M25 35Q50 42 75 35M25 65Q50 58 75 65' strokeWidth='2.8' />
            </g>
            <circle cx='78' cy='26' r='6.5' fill='#4ADE80' stroke='#fff' strokeWidth='2.5' />
        </>
    ),

    transfers: (u) => (
        <>
            {background(u, '#FFB36B', '#E4510A')}
            <g
                fill='none'
                stroke='#fff'
                strokeWidth='7.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                filter={url(u('sh'))}
            >
                <path d='M37 76V26M24 39L37 26L50 39' />
                <path d='M63 24V74M50 61L63 74L76 61' strokeOpacity='0.82' />
            </g>
        </>
    ),

    calculator: (u) => (
        <>
            {background(u, '#3C3C40', '#18181A')}
            <rect x='16' y='13' width='68' height='20' rx='5' fill='#0A0A0B' />
            <text
                x='78'
                y='29'
                textAnchor='end'
                fontSize='15'
                fontWeight='500'
                fill='#fff'
                fontFamily='-apple-system, BlinkMacSystemFont, Inter, Segoe UI, sans-serif'
            >
                42
            </text>
            {[0, 1, 2, 3].flatMap((col) =>
                [0, 1, 2].map((row) => (
                    <rect
                        key={`${col}-${row}`}
                        x={16 + col * 18}
                        y={40 + row * 16}
                        width='14'
                        height='12.5'
                        rx='3.8'
                        fill={col === 3 ? '#FF9F0A' : row === 0 ? '#A5A5AC' : '#5B5B60'}
                    />
                )),
            )}
        </>
    ),

    trash: (u) => (
        <>
            {background(u, '#F7F7FA', '#CFCFD6')}
            <defs>{vgrad(u('can'), '#D2D2D8', '#94949C')}</defs>
            <g filter={url(u('sh'))}>
                <path
                    d='M41.5 22v-3.5a2.5 2.5 0 0 1 2.5-2.5h12a2.5 2.5 0 0 1 2.5 2.5V22'
                    fill='none'
                    stroke='#8A8A92'
                    strokeWidth='3.2'
                />
                <rect x='24' y='21' width='52' height='8' rx='4' fill='#8A8A92' />
                <path d='M29 33H71L67.2 80.4A5 5 0 0 1 62.2 85H37.8A5 5 0 0 1 32.8 80.4Z' fill={url(u('can'))} />
            </g>
            {[41, 50, 59].map((x) => (
                <path
                    key={x}
                    d={`M${x} 42V76`}
                    stroke='#F4F4F7'
                    strokeOpacity='0.75'
                    strokeWidth='3'
                    strokeLinecap='round'
                />
            ))}
        </>
    ),

    connection: (u) => (
        <>
            {background(u, '#34DCC5', '#0B6E66')}
            <defs>{vgrad(u('body'), '#FFFFFF', '#C9F5EC')}</defs>
            <g filter={url(u('sh'))}>
                <path d='M35.5 46V35a14.5 14.5 0 0 1 29 0V46' fill='none' stroke='#E9FBF7' strokeWidth='7' />
                <rect x='26' y='44' width='48' height='38' rx='9' fill={url(u('body'))} />
            </g>
            <circle cx='50' cy='59' r='5.5' fill='#0B6E66' />
            <rect x='47.8' y='61' width='4.4' height='11' rx='2.2' fill='#0B6E66' />
        </>
    ),

    subusers: (u) => (
        <>
            {background(u, '#B49BFF', '#6324D6')}
            <g fill='#fff'>
                <circle cx='63' cy='35' r='10.5' fillOpacity='0.55' />
                <path d='M45 75a18 16 0 0 1 36 0v1.5H45Z' fillOpacity='0.55' />
                <g filter={url(u('sh'))}>
                    <circle cx='41' cy='42' r='12.5' />
                    <path d='M18 83a23 20 0 0 1 46 0v1H18Z' />
                </g>
            </g>
        </>
    ),

    startup: (u) => (
        <>
            {background(u, '#FFC43D', '#D9480F')}
            <defs>
                {vgrad(u('body'), '#FFFFFF', '#D7DBE2', 1, 0)}
                {vgrad(u('flame'), '#FEF08A', '#F97316')}
            </defs>
            <g transform='rotate(40 50 50)' filter={url(u('sh'))}>
                <path d='M44 66Q50 90 56 66Z' fill={url(u('flame'))} />
                <path d='M38 50L27 65L38 62Z' fill='#EF4444' />
                <path d='M62 50L73 65L62 62Z' fill='#DC2626' />
                <path d='M50 12C62.5 22 64.5 39 62 62H38C35.5 39 37.5 22 50 12Z' fill={url(u('body'))} />
                <circle cx='50' cy='37' r='6.5' fill='#3B82F6' stroke='#1E3A8A' strokeWidth='2.2' />
                <rect x='42' y='61' width='16' height='5' rx='2' fill='#9CA3AF' />
            </g>
        </>
    ),

    spells: (u) => (
        <>
            {background(u, '#E78BFF', '#8A1BAA')}
            <g filter={url(u('sh'))}>
                <path d='M26 76L58 44' stroke='#2A1838' strokeWidth='8' strokeLinecap='round' />
                <path d='M58 44L64 38' stroke='#fff' strokeWidth='8' strokeLinecap='round' />
            </g>
            <path d={sparkle(71, 28, 13)} fill='#FFF7AE' />
            <path d={sparkle(40, 31, 7)} fill='#fff' />
            <path d={sparkle(76, 58, 6.5)} fill='#fff' fillOpacity='0.9' />
            <circle cx='56' cy='22' r='2' fill='#fff' />
        </>
    ),

    archive: (u) => (
        <>
            {background(u, '#FFF1C4', '#F5C24A')}
            <defs>
                {vgrad(u('box'), '#C99256', '#A06A34')}
                {vgrad(u('lid'), '#DDA769', '#BC8246')}
            </defs>
            <g filter={url(u('sh'))}>
                <rect x='20' y='38' width='60' height='46' rx='5' fill={url(u('box'))} />
                <rect x='15' y='24' width='70' height='17' rx='4.5' fill={url(u('lid'))} />
            </g>
            <rect x='46' y='24' width='8' height='60' fill='#3A3A40' />
            {Array.from({ length: 9 }, (_, i) => (
                <path key={i} d={`M46 ${28 + i * 6.4}H54`} stroke='#A1A1AA' strokeWidth='1.6' />
            ))}
            <rect x='43.5' y='45' width='13' height='15' rx='3.5' fill='#E8E8ED' stroke='#6B6B73' strokeWidth='1.4' />
            <rect x='48' y='49' width='4' height='7' rx='2' fill='#6B6B73' />
        </>
    ),
};
