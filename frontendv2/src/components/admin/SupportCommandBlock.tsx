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

import { Button } from '@/components/featherui/Button';
import { Copy } from 'lucide-react';

interface SupportCommandBlockProps {
    command: string;
    copyLabel: string;
    onCopy: () => void;
}

export function SupportCommandBlock({ command, copyLabel, onCopy }: SupportCommandBlockProps) {
    return (
        <div className='overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950'>
            <div className='flex justify-end border-b border-zinc-800 bg-zinc-900 px-3 py-2'>
                <Button
                    type='button'
                    variant='plain'
                    size='sm'
                    className='border border-zinc-600 bg-zinc-800 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700 hover:text-white'
                    onClick={onCopy}
                >
                    <Copy className='mr-2 h-4 w-4 shrink-0' />
                    <span className='truncate'>{copyLabel}</span>
                </Button>
            </div>
            <pre className='overflow-x-auto p-4 font-mono text-xs break-all whitespace-pre-wrap text-zinc-300'>
                {command}
            </pre>
        </div>
    );
}
