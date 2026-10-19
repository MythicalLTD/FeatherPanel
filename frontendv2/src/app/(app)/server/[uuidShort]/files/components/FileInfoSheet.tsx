/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { Fingerprint, Folder, FileText, Link2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { formatBytes } from '@/lib/format';
import type { FileObject } from '@/types/server';

export function FileInfoSheet({
    file,
    directory,
    open,
    onOpenChange,
    onChecksum,
}: {
    file: FileObject | null;
    directory: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChecksum?: (file: FileObject) => void;
}) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    if (!file) return null;
    const path = directory.endsWith('/') ? `${directory}${file.name}` : `${directory}/${file.name}`;
    const size = file.isFile ? file.size : (file.directory_size ?? null);
    const rows: [string, string][] = [
        [t('files.info.path'), path],
        [t('files.info.type'), file.isFile ? t('files.info.type_file') : t('files.info.type_folder')],
        [t('files.info.size'), size === null ? '-' : `${formatBytes(size)} (${size.toLocaleString()} B)`],
        [t('files.info.permissions'), `${file.mode} (${file.mode_bits})`],
        [t('files.info.owner'), t('files.info.owner_value')],
        [t('files.info.mime'), file.mimetype || '-'],
        [t('files.info.modified'), file.modified_at ? formatDateTimeInTz(file.modified_at, dateOpts) : '-'],
        [t('files.info.created'), file.created_at ? formatDateTimeInTz(file.created_at, dateOpts) : '-'],
    ];
    const Icon = file.isFile ? FileText : Folder;
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side='right'>
                <SheetHeader>
                    <SheetTitle className='flex items-center gap-2 break-all'>
                        <Icon className='text-primary h-5 w-5 shrink-0' />
                        {file.name}
                    </SheetTitle>
                    <SheetDescription>{t('files.info.description')}</SheetDescription>
                </SheetHeader>
                <dl className='mt-6 space-y-3 text-sm'>
                    {rows.map(([label, value]) => (
                        <div key={label} className='fp-surface-inset rounded-xl border p-3'>
                            <dt className='text-muted-foreground text-xs'>{label}</dt>
                            <dd className='mt-1 font-mono text-xs break-all'>{value}</dd>
                        </div>
                    ))}
                    {file.symlink && (
                        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                            <Link2 className='h-3.5 w-3.5' />
                            {t('files.info.symlink')}
                        </p>
                    )}
                </dl>
                {file.isFile && onChecksum && (
                    <Button variant='outline' className='mt-4 w-full gap-2' onClick={() => onChecksum(file)}>
                        <Fingerprint className='h-4 w-4' />
                        {t('files.info.checksum')}
                    </Button>
                )}
            </SheetContent>
        </Sheet>
    );
}
