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

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/featherui/Button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Eye, Info, Mail, RefreshCw, Server, Settings, TicketIcon, User } from 'lucide-react';
import Link from 'next/link';
import { RoleBadge } from '@/components/RoleBadge';
import { cn } from '@/lib/utils';
import { Ticket, UserData, UserMail } from '../page';
import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

interface TicketSidebarProps {
    ticket: Ticket;
    userDetails: UserData | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userServers: any[];
    userTickets: Ticket[];
    loadingSidebar: boolean;
    onOpenMailPreview: (mail: UserMail) => void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    widgets?: any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WidgetRenderer?: React.ComponentType<any>;
}

export function TicketSidebar({
    ticket,
    userDetails,

    userServers,
    userTickets,
    loadingSidebar,
    onOpenMailPreview,
    widgets,
    WidgetRenderer,
}: TicketSidebarProps) {
    const { t } = useTranslation();
    const formatDateSafe = (value?: string | null, fallback = 'N/A') => {
        if (!value || value === '0000-00-00 00:00:00') return fallback;
        const timestamp = new Date(value).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= 0) return fallback;
        return new Date(timestamp).toLocaleDateString();
    };

    if (loadingSidebar) {
        return (
            <div className='flex justify-center p-8'>
                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='h-full space-y-6 overflow-y-auto pr-1 pb-20'>
            {userDetails ? (
                <>
                    <Card className='bg-card/30 border-border/10 overflow-hidden shadow-sm backdrop-blur-md'>
                        <div className='from-primary/10 via-primary/5 border-border/5 group/avatar relative overflow-hidden border-b bg-linear-to-br to-transparent p-6 text-center'>
                            <div className='bg-primary/5 absolute inset-0 scale-150 animate-pulse rounded-full blur-3xl transition-transform duration-1000 group-hover/avatar:scale-110' />
                            <div className='relative space-y-3'>
                                <div className='relative inline-block'>
                                    <Avatar className='border-background mx-auto h-20 w-20 border-4 transition-all duration-500 group-hover/avatar:scale-105'>
                                        <AvatarImage src={userDetails.avatar} />
                                    </Avatar>
                                    <div className='bg-background border-border/50 absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-lg border'>
                                        <div className='h-2.5 w-2.5 animate-pulse rounded-full bg-green-500' />
                                    </div>
                                </div>
                                <div className='space-y-0.5'>
                                    <h3 className='text-foreground text-lg font-black tracking-tighter uppercase'>
                                        {userDetails.username}
                                    </h3>
                                    <p className='text-muted-foreground text-[10px] font-black tracking-widest uppercase opacity-60'>
                                        {userDetails.email}
                                    </p>
                                </div>
                                <div className='flex justify-center gap-2 pt-1'>
                                    {userDetails.role && (
                                        <RoleBadge
                                            role={userDetails.role}
                                            variant='solid'
                                            size='sm'
                                            className='px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm'
                                        />
                                    )}
                                    {userDetails.banned === 'true' && (
                                        <Badge variant='destructive' className='px-2 py-0.5 text-[9px] uppercase'>
                                            {t('common.banned')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Tabs defaultValue='details' className='p-4'>
                            <TabsList className='bg-accent/20 border-border/5 grid h-10 grid-cols-4 gap-1 rounded-xl border p-1'>
                                <TabsTrigger
                                    value='details'
                                    className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-xs'
                                >
                                    <User className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='servers'
                                    className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-xs'
                                >
                                    <Server className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='tickets'
                                    className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-xs'
                                >
                                    <TicketIcon className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='emails'
                                    className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg text-xs'
                                >
                                    <Mail className='h-3.5 w-3.5' />
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value='details' className='space-y-3 pt-4'>
                                <div className='space-y-1'>
                                    {[
                                        {
                                            label: t('admin.tickets.sidebar.meta.status'),
                                            value: ticket.status?.name,
                                            color: ticket.status?.color,
                                        },
                                        {
                                            label: t('admin.tickets.sidebar.meta.priority'),
                                            value: ticket.priority?.name,
                                            color: ticket.priority?.color,
                                        },
                                        {
                                            label: t('admin.tickets.sidebar.meta.category'),
                                            value: ticket.category?.name,
                                        },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className='hover:bg-accent/50 flex items-center justify-between rounded-lg p-2 transition-colors'
                                        >
                                            <div className='flex items-center gap-2'>
                                                <div className='bg-primary/5 text-primary flex h-6 w-6 items-center justify-center rounded-md'>
                                                    <Info className='h-3 w-3' />
                                                </div>
                                                <span className='text-muted-foreground text-[10px] font-bold tracking-tight uppercase'>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span
                                                className={cn(
                                                    'max-w-[100px] truncate text-xs font-bold',
                                                    item.color && 'text-current',
                                                )}
                                                style={{ color: item.color }}
                                            >
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                    <div className='bg-primary/5 border-primary/10 space-y-2 rounded-lg border p-3'>
                                        <div className='text-muted-foreground flex items-center justify-between text-[10px]'>
                                            <span>{t('admin.tickets.sidebar.meta.created')}</span>
                                            <span className='text-foreground font-mono font-bold'>
                                                {formatDateSafe(ticket.created_at)}
                                            </span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center justify-between text-[10px]'>
                                            <span>{t('admin.tickets.sidebar.meta.updated')}</span>
                                            <span className='text-foreground font-mono font-bold'>
                                                {formatDateSafe(ticket.updated_at, formatDateSafe(ticket.created_at))}
                                            </span>
                                        </div>
                                    </div>
                                    {[
                                        {
                                            label: t('admin.tickets.sidebar.labels.id'),
                                            value: userDetails.id ? `#${userDetails.id}` : null,
                                            icon: Info,
                                        },
                                        {
                                            label: t('admin.tickets.sidebar.labels.uuid'),
                                            value: userDetails.uuid,
                                            icon: Info,
                                            mono: true,
                                        },
                                        {
                                            label: t('admin.tickets.sidebar.labels.ip'),
                                            value: userDetails.last_ip || 'N/A',
                                            icon: Server,
                                            mono: true,
                                        },
                                        {
                                            label: t('admin.tickets.sidebar.labels.registered'),
                                            value: new Date(userDetails.first_seen).toLocaleDateString(),
                                            icon: Clock,
                                        },
                                    ]
                                        .filter((item) => item.value)
                                        .map((item, i) => (
                                            <div
                                                key={i}
                                                className='hover:bg-accent/50 flex items-center justify-between rounded-lg p-2 transition-colors'
                                            >
                                                <div className='flex items-center gap-2'>
                                                    <div className='bg-primary/5 text-primary flex h-6 w-6 items-center justify-center rounded-md'>
                                                        <item.icon className='h-3 w-3' />
                                                    </div>
                                                    <span className='text-muted-foreground text-[10px] font-bold tracking-tight uppercase'>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'max-w-[100px] truncate text-xs font-bold',
                                                        item.mono && 'font-mono text-[10px]',
                                                    )}
                                                >
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                                <Link href={`/admin/users/${userDetails.uuid}/edit`}>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='h-9 w-full rounded-xl text-xs font-bold tracking-wide uppercase'
                                    >
                                        <Eye className='mr-2 h-3 w-3' />
                                        {t('admin.tickets.sidebar.labels.profile')}
                                    </Button>
                                </Link>
                            </TabsContent>

                            <TabsContent value='servers' className='pt-3'>
                                <div className='scrollbar-hide max-h-50 space-y-2 overflow-y-auto'>
                                    {userServers.length === 0 ? (
                                        <p className='text-muted-foreground py-4 text-center text-xs italic'>
                                            {t('admin.tickets.sidebar.empty.servers')}
                                        </p>
                                    ) : (
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        userServers.map((s: any) => (
                                            <Link
                                                key={s.uuid}
                                                href={`/server/${s.uuid_short || s.uuidShort || s.identifier || s.uuid}`}
                                            >
                                                <div className='bg-background/50 border-border/5 hover:bg-accent/50 rounded-lg border p-2 transition-colors'>
                                                    <div className='flex items-center justify-between'>
                                                        <span className='truncate pr-2 text-xs font-bold'>
                                                            {s.name}
                                                        </span>
                                                        <Badge variant='outline' className='h-4 px-1 text-[9px]'>
                                                            {s.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value='tickets' className='pt-3'>
                                <div className='scrollbar-hide max-h-50 space-y-2 overflow-y-auto'>
                                    {userTickets.filter((t) => t.uuid !== ticket.uuid).length === 0 ? (
                                        <p className='text-muted-foreground py-4 text-center text-xs italic'>
                                            {t('admin.tickets.sidebar.empty.tickets')}
                                        </p>
                                    ) : (
                                        userTickets
                                            .filter((t) => t.uuid !== ticket.uuid)
                                            .map((ut) => (
                                                <Link key={ut.uuid} href={`/admin/tickets/${ut.uuid}`}>
                                                    <div className='bg-background/50 border-border/5 hover:bg-accent/50 rounded-lg border p-2 transition-colors'>
                                                        <div className='flex items-center justify-between gap-2'>
                                                            <span className='truncate text-xs font-bold'>
                                                                {ut.title}
                                                            </span>
                                                            <Badge variant='outline' className='h-4 px-1 text-[9px]'>
                                                                {ut.status?.name}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value='emails' className='pt-3'>
                                <div className='scrollbar-hide max-h-50 space-y-2 overflow-y-auto'>
                                    {!userDetails.mails || userDetails.mails.length === 0 ? (
                                        <p className='text-muted-foreground py-4 text-center text-xs italic'>
                                            {t('admin.tickets.sidebar.empty.emails')}
                                        </p>
                                    ) : (
                                        userDetails.mails.map((email, idx: number) => (
                                            <div
                                                key={idx}
                                                className='bg-background/50 border-border/5 hover:bg-accent/50 cursor-pointer rounded-lg border p-2'
                                                onClick={() => onOpenMailPreview(email)}
                                            >
                                                <div className='flex items-center justify-between'>
                                                    <span className='truncate text-xs font-bold'>{email.subject}</span>
                                                    <Badge
                                                        variant={email.status === 'sent' ? 'secondary' : 'destructive'}
                                                        className='h-4 px-1 text-[9px] uppercase'
                                                    >
                                                        {email.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>

                    <Card className='bg-card/30 border-border/10 space-y-3 p-5 shadow-sm backdrop-blur-md'>
                        <div className='border-border/5 flex items-center gap-2 border-b pb-2'>
                            <Settings className='text-primary h-4 w-4' />
                            <h4 className='text-foreground text-[10px] font-black tracking-widest uppercase'>
                                {t('admin.tickets.sidebar.ticket_info')}
                            </h4>
                        </div>
                        <div className='grid grid-cols-1 gap-2'>
                            <Link href={`/admin/tickets?user_uuid=${userDetails.uuid}`}>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-8 w-full justify-start text-xs font-bold'
                                >
                                    <TicketIcon className='mr-2 h-3 w-3' />{' '}
                                    {t('admin.tickets.sidebar.actions.view_all_tickets')}
                                </Button>
                            </Link>
                            <Link href={`/admin/users/${userDetails.uuid}`}>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-8 w-full justify-start text-xs font-bold'
                                >
                                    <User className='mr-2 h-3 w-3' /> {t('admin.tickets.sidebar.actions.view_user')}
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className='text-muted-foreground border-border/10 bg-card/30 p-8 text-center'>
                    <User className='mx-auto mb-3 h-10 w-10 opacity-20' />
                    <p className='text-sm'>{t('admin.tickets.sidebar.user_info_unavailable')}</p>
                </Card>
            )}

            <Card className='bg-card/50 border-border/10 space-y-3 p-4 shadow-sm backdrop-blur-sm'>
                <div className='border-border/5 flex items-center gap-2 border-b pb-2'>
                    <Info className='text-primary h-3.5 w-3.5' />
                    <h4 className='text-foreground text-[10px] font-black tracking-widest uppercase'>
                        {t('admin.tickets.sidebar.ticket_info')}
                    </h4>
                </div>
                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-xs font-medium'>
                            {t('admin.tickets.sidebar.meta.status')}
                        </span>
                        <div className='flex items-center gap-2'>
                            <div
                                className='h-2 w-2 animate-pulse rounded-full'
                                style={{ backgroundColor: ticket.status?.color }}
                            />
                            <span className='text-xs font-bold' style={{ color: ticket.status?.color }}>
                                {ticket.status?.name}
                            </span>
                        </div>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-xs font-medium'>
                            {t('admin.tickets.sidebar.meta.priority')}
                        </span>
                        <div className='flex items-center gap-2'>
                            <div
                                className='h-2 w-2 rotate-45 rounded-full'
                                style={{ backgroundColor: ticket.priority?.color }}
                            />
                            <span className='text-xs font-bold' style={{ color: ticket.priority?.color }}>
                                {ticket.priority?.name}
                            </span>
                        </div>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-xs font-medium'>
                            {t('admin.tickets.sidebar.meta.category')}
                        </span>
                        <span className='text-xs font-bold'>{ticket.category?.name}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-xs font-medium'>
                            {t('admin.tickets.sidebar.meta.created')}
                        </span>
                        <span className='text-xs font-bold'>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </Card>

            {WidgetRenderer && widgets && <WidgetRenderer widgets={widgets} />}
        </div>
    );
}
