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
import { Plus, Gamepad2, Monitor, Globe } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';

export function CreateServerAction({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const [open, setOpen] = useState(false);
    const options = [
        {
            id: 'game',
            href: '/admin/servers/create',
            icon: Gamepad2,
            permission: Permissions.ADMIN_SERVERS_CREATE,
            title: t('admin.dashboard.create_server.game_title'),
            description: t('admin.dashboard.create_server.game_description'),
        },
        {
            id: 'vds',
            href: '/admin/vm-instances/create',
            icon: Monitor,
            permission: Permissions.ADMIN_NODES_CREATE,
            title: t('admin.dashboard.create_server.vds_title'),
            description: t('admin.dashboard.create_server.vds_description'),
        },
        {
            id: 'web',
            href: '/admin/webspaces/create',
            icon: Globe,
            permission: Permissions.ADMIN_WEBSPACES_CREATE,
            title: t('admin.dashboard.create_server.web_title'),
            description: t('admin.dashboard.create_server.web_description'),
        },
    ].filter((option) => hasPermission(option.permission));

    if (options.length === 0) return null;

    return (
        <>
            <Button
                type='button'
                variant={compact ? 'ghost' : 'default'}
                onClick={() => setOpen(true)}
                aria-haspopup='dialog'
                className={compact ? 'gap-1.5 px-2 text-xs' : 'gap-2'}
            >
                <Plus className='h-4 w-4 shrink-0' aria-hidden />
                {compact ? t('admin.recent_servers.create') : t('admin.welcome.create_server')}
            </Button>
            <Dialog
                open={open}
                onOpenChange={setOpen}
                className='bg-card/80 border-border/50 max-w-2xl backdrop-blur-xl'
                enableSaveShortcut={false}
            >
                <DialogHeader>
                    <DialogTitle className='text-2xl font-bold tracking-tight'>
                        {t('admin.dashboard.create_server.title')}
                    </DialogTitle>
                    <DialogDescription>{t('admin.dashboard.create_server.description')}</DialogDescription>
                </DialogHeader>
                <div className='[&_a:focus-visible]:outline-foreground space-y-3 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:-outline-offset-2'>
                    {options.map((option) => (
                        <ResourceCard
                            key={option.id}
                            icon={option.icon}
                            className='[&>div:last-child]:flex-row [&>div:last-child]:items-center [&>div:last-child]:gap-4 [&>div:last-child]:p-4'
                            iconWrapperClassName='h-12 w-12 rounded-xl'
                            iconClassName='h-6 w-6'
                            titleClassName='text-lg'
                            title={option.title}
                            description={
                                <p className='text-muted-foreground text-sm leading-relaxed'>{option.description}</p>
                            }
                            href={option.href}
                            onClick={() => setOpen(false)}
                        />
                    ))}
                </div>
                <DialogFooter>
                    <Button
                        type='button'
                        variant='ghost'
                        onClick={() => setOpen(false)}
                        className='focus-visible:ring-foreground focus-visible:ring-2'
                    >
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
