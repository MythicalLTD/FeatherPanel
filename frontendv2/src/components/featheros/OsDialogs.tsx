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

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';

/** macOS style alert / prompt sheets, driven by prompt() and confirm() of the OS context. */
export function OsDialogs() {
    const { dialogs, resolveDialog, logoUrl } = useFeatherOs();
    const { t } = useTranslation();
    const current = dialogs[0];
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!current) return;
        setValue(current.defaultValue ?? '');
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
            const dot = (current.defaultValue ?? '').lastIndexOf('.');
            if (dot > 0) inputRef.current?.setSelectionRange(0, dot);
            else inputRef.current?.select();
        }, 30);
        return () => window.clearTimeout(timer);
    }, [current]);

    if (!current) return null;
    const cancel = () => resolveDialog(current.id, current.kind === 'prompt' ? null : false);
    const accept = () => resolveDialog(current.id, current.kind === 'prompt' ? value : true);

    return (
        <div
            className='fos-fade fixed inset-0 z-[10001] flex items-start justify-center bg-black/25 pt-[18vh] backdrop-blur-[6px]'
            onMouseDown={(e) => e.target === e.currentTarget && cancel()}
        >
            <form
                className='fos-sheet fos-pop w-[360px] rounded-[16px] p-5 text-center'
                onSubmit={(e) => {
                    e.preventDefault();
                    accept();
                }}
                onKeyDown={(e) => e.key === 'Escape' && cancel()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt='' className='mx-auto mb-3 h-12 w-12 rounded-xl object-contain' />
                <h3 className='text-[13px] font-semibold'>{current.title}</h3>
                {current.message && (
                    <p className='mt-1 text-xs break-words whitespace-pre-line opacity-70'>{current.message}</p>
                )}
                {current.kind === 'prompt' && (
                    <input
                        ref={inputRef}
                        value={value}
                        placeholder={current.placeholder}
                        onChange={(e) => setValue(e.target.value)}
                        className='fos-dialog-input fos-field mt-3 w-full rounded-md px-2 py-1 text-[13px] outline-none'
                    />
                )}
                <div className='mt-4 grid grid-cols-2 gap-2'>
                    <button
                        type='button'
                        onClick={cancel}
                        className='fos-dialog-cancel rounded-[8px] py-1.5 text-[13px] font-medium'
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type='submit'
                        autoFocus={current.kind === 'confirm'}
                        className={cn(
                            'rounded-[8px] py-1.5 text-[13px] font-medium text-white',
                            current.danger ? 'bg-[#ff3b30] hover:bg-[#ff453a]' : 'bg-[#0a84ff] hover:bg-[#409cff]',
                        )}
                    >
                        {current.confirmLabel || t('featheros.common.ok')}
                    </button>
                </div>
            </form>
        </div>
    );
}
