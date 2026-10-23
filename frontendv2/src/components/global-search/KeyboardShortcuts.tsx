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
import { useRouter } from 'next/navigation';
import { Keyboard } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitleComponent, DialogDescription } from '@/components/ui/dialog';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import Permissions from '@/lib/permissions';

type Shortcut = { keys: string[]; labelKey: string };

/** Navigation chords: press g, then the letter. */
const GO_TO: Array<{ key: string; href: string; labelKey: string; permission?: string }> = [
    { key: 'd', href: '/dashboard', labelKey: 'shortcuts.goDashboard' },
    { key: 'a', href: '/dashboard/account', labelKey: 'shortcuts.goAccount' },
    { key: 's', href: '/dashboard/status', labelKey: 'shortcuts.goStatus' },
    { key: 'm', href: '/admin', labelKey: 'shortcuts.goAdmin', permission: Permissions.ADMIN_DASHBOARD_VIEW },
    { key: 'u', href: '/admin/users', labelKey: 'shortcuts.goUsers', permission: Permissions.ADMIN_USERS_VIEW },
    {
        key: 'p',
        href: '/admin/settings',
        labelKey: 'shortcuts.goSettings',
        permission: Permissions.ADMIN_SETTINGS_VIEW,
    },
];

function isTyping(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        el.isContentEditable ||
        !!el.closest('[contenteditable="true"], .monaco-editor, .xterm, .cm-editor')
    );
}

export default function KeyboardShortcuts() {
    const router = useRouter();
    const { setOpen } = useGlobalSearch();
    const { hasPermission } = useSession();
    const { t } = useTranslation();
    const [helpOpen, setHelpOpen] = useState(false);
    const pendingG = useRef<number | null>(null);

    const goTo = GO_TO.filter((item) => !item.permission || hasPermission(item.permission));

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
            if (isTyping(event.target)) return;

            if (pendingG.current !== null) {
                window.clearTimeout(pendingG.current);
                pendingG.current = null;
                const target = goTo.find((item) => item.key === event.key.toLowerCase());
                if (target) {
                    event.preventDefault();
                    setHelpOpen(false);
                    router.push(target.href);
                }
                return;
            }

            if (event.key === '?') {
                event.preventDefault();
                setHelpOpen((value) => !value);
                return;
            }
            if (event.key === '/') {
                event.preventDefault();
                setOpen(true);
                return;
            }
            if (event.key === 'g' && !event.shiftKey) {
                pendingG.current = window.setTimeout(() => {
                    pendingG.current = null;
                }, 1200);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [goTo, router, setOpen]);

    const general: Shortcut[] = [
        { keys: ['Ctrl', 'K'], labelKey: 'shortcuts.openPalette' },
        { keys: ['/'], labelKey: 'shortcuts.openPalette' },
        { keys: ['Ctrl', 'D'], labelKey: 'shortcuts.openPaletteAlt' },
        { keys: ['?'], labelKey: 'shortcuts.toggleHelp' },
        { keys: ['Esc'], labelKey: 'shortcuts.close' },
        { keys: ['Ctrl', 'S'], labelKey: 'shortcuts.save' },
    ];

    const renderRow = (keys: string[], label: string, id: string) => (
        <li key={id} className='flex items-center justify-between gap-4 py-1.5 text-sm'>
            <span className='text-foreground'>{label}</span>
            <span className='flex shrink-0 items-center gap-1'>
                {keys.map((key) => (
                    <kbd
                        key={key}
                        className='border-border/60 bg-muted/40 text-muted-foreground min-w-6 rounded-md border px-1.5 py-0.5 text-center font-mono text-[11px]'
                    >
                        {key}
                    </kbd>
                ))}
            </span>
        </li>
    );

    return (
        <Dialog open={helpOpen} onOpenChange={setHelpOpen} className='max-w-lg'>
            <DialogHeader>
                <DialogTitleComponent>
                    <span className='flex items-center gap-2'>
                        <Keyboard className='h-5 w-5' />
                        {t('shortcuts.title')}
                    </span>
                </DialogTitleComponent>
                <DialogDescription>{t('shortcuts.description')}</DialogDescription>
            </DialogHeader>
            <div className='mt-4 grid gap-6 sm:grid-cols-2'>
                <section>
                    <h3 className='text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase'>
                        {t('shortcuts.general')}
                    </h3>
                    <ul>{general.map((s, i) => renderRow(s.keys, t(s.labelKey), `g-${i}`))}</ul>
                </section>
                <section>
                    <h3 className='text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase'>
                        {t('shortcuts.navigation')}
                    </h3>
                    <ul>{goTo.map((item) => renderRow(['G', item.key.toUpperCase()], t(item.labelKey), item.key))}</ul>
                </section>
            </div>
        </Dialog>
    );
}
