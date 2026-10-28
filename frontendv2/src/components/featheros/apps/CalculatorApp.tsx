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

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { OsAppProps } from './index';

const BTNS = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
] as const;

function apply(a: number, b: number, op: string): number {
    switch (op) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '×':
            return a * b;
        case '÷':
            return b === 0 ? NaN : a / b;
        default:
            return b;
    }
}

export default function CalculatorApp({ win }: OsAppProps) {
    void win;
    const [display, setDisplay] = useState('0');
    const [acc, setAcc] = useState<number | null>(null);
    const [op, setOp] = useState<string | null>(null);
    const [fresh, setFresh] = useState(true);

    const press = (key: string) => {
        if (key === 'C') {
            setDisplay('0');
            setAcc(null);
            setOp(null);
            setFresh(true);
            return;
        }
        if (key === '±') {
            setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : `-${d}`));
            return;
        }
        if (key === '%') {
            setDisplay(String(parseFloat(display) / 100));
            setFresh(true);
            return;
        }
        if ('÷×-+'.includes(key)) {
            const n = parseFloat(display);
            if (acc !== null && op && !fresh) {
                const r = apply(acc, n, op);
                setDisplay(String(r));
                setAcc(r);
            } else setAcc(n);
            setOp(key);
            setFresh(true);
            return;
        }
        if (key === '=') {
            if (acc === null || !op) return;
            const r = apply(acc, parseFloat(display), op);
            setDisplay(Number.isFinite(r) ? String(r) : 'Error');
            setAcc(null);
            setOp(null);
            setFresh(true);
            return;
        }
        if (key === '.') {
            if (!fresh && display.includes('.')) return;
            setDisplay(fresh ? '0.' : display + '.');
            setFresh(false);
            return;
        }
        setDisplay(fresh || display === '0' ? key : display + key);
        setFresh(false);
    };

    return (
        <div className='flex h-full flex-col bg-zinc-900 p-3 text-white'>
            <div className='mb-3 flex h-16 items-end justify-end px-2 text-4xl font-light tabular-nums'>{display}</div>
            <div className='grid flex-1 grid-cols-4 gap-2'>
                {BTNS.flat().map((key) => (
                    <button
                        key={key}
                        type='button'
                        onClick={() => press(key)}
                        className={cn(
                            'rounded-full text-xl font-medium active:scale-95',
                            key === '0' && 'col-span-2',
                            '÷×-+='.includes(key)
                                ? 'bg-amber-500 text-white'
                                : 'C±%'.includes(key)
                                  ? 'bg-zinc-500'
                                  : 'bg-zinc-700',
                        )}
                    >
                        {key}
                    </button>
                ))}
            </div>
        </div>
    );
}
