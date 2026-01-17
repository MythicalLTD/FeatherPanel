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

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/featherui/Button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Eye, Info, Mail, RefreshCw, Server, Settings, TicketIcon, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Ticket, UserData, UserMail } from '../page';
import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

// Interfaces need to be shared. For now redefining or importing if exported.
// Ideally, move interfaces to a types file.
interface TicketSidebarProps {
    ticket: Ticket;
    userDetails: UserData | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userServers: any[];
    userTickets: Ticket[];
    loadingSidebar: boolean;
    onOpenMailPreview: (mail: UserMail) => void;
    // We pass dependencies or handling logic if needed
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

    if (loadingSidebar) {
        return (
            <div className='flex justify-center p-8'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    return (
        <div className='space-y-6 h-full overflow-y-auto pr-1 pb-20'>
            {/* User Info Card */}
            {userDetails ? (
                <>
                    <Card className='overflow-hidden bg-card/30 backdrop-blur-md border-border/10 shadow-sm'>
                        <div className='p-6 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/5 text-center relative overflow-hidden group/avatar'>
                            <div className='absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-150 animate-pulse group-hover/avatar:scale-110 transition-transform duration-1000' />
                            <div className='relative space-y-3'>
                                <div className='relative inline-block'>
                                    <Avatar className='h-20 w-20 mx-auto border-4 border-background shadow-xl transition-all duration-500 group-hover/avatar:scale-105'>
                                        <AvatarImage src={userDetails.avatar} />
                                        <AvatarFallback className='text-xl font-black bg-primary/10 text-primary'>
                                            {userDetails.username?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className='absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-background border border-border/50 flex items-center justify-center shadow-md'>
                                        <div className='h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse' />
                                    </div>
                                </div>
                                <div className='space-y-0.5'>
                                    <h3 className='text-lg font-black uppercase tracking-tighter text-foreground'>
                                        {userDetails.username}
                                    </h3>
                                    <p className='text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60'>
                                        {userDetails.email}
                                    </p>
                                </div>
                                <div className='flex justify-center gap-2 pt-1'>
                                    {userDetails.role && (
                                        <Badge
                                            className='font-black text-[9px] tracking-widest uppercase px-2 py-0.5 border-none shadow-sm'
                                            style={{
                                                backgroundColor: userDetails.role.color || '#3b82f6',
                                                color: 'white',
                                            }}
                                        >
                                            {userDetails.role.display_name || userDetails.role.name}
                                        </Badge>
                                    )}
                                    {userDetails.banned === 'true' && (
                                        <Badge variant='destructive' className='text-[9px] uppercase px-2 py-0.5'>
                                            {t('common.banned')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Tabs defaultValue='details' className='p-4'>
                            <TabsList className='grid grid-cols-4 h-10 bg-accent/20 rounded-xl p-1 gap-1 border border-border/5'>
                                <TabsTrigger
                                    value='details'
                                    className='rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                                >
                                    <User className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='servers'
                                    className='rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                                >
                                    <Server className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='tickets'
                                    className='rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                                >
                                    <TicketIcon className='h-3.5 w-3.5' />
                                </TabsTrigger>
                                <TabsTrigger
                                    value='emails'
                                    className='rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
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
                                            className='flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors'
                                        >
                                            <div className='flex items-center gap-2'>
                                                <div className='h-6 w-6 rounded-md bg-primary/5 flex items-center justify-center text-primary'>
                                                    <Info className='h-3 w-3' />
                                                </div>
                                                <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-tight'>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span
                                                className={cn(
                                                    'text-xs font-bold truncate max-w-[100px]',
                                                    item.color && 'text-current',
                                                )}
                                                style={{ color: item.color }}
                                            >
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                    <div className='bg-primary/5 rounded-lg p-3 space-y-2 border border-primary/10'>
                                        <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                                            <span>{t('admin.tickets.sidebar.meta.created')}</span>
                                            <span className='font-mono font-bold text-foreground'>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                                            <span>{t('admin.tickets.sidebar.meta.updated')}</span>
                                            <span className='font-mono font-bold text-foreground'>
                                                {new Date(ticket.updated_at).toLocaleDateString()}
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
                                                className='flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors'
                                            >
                                                <div className='flex items-center gap-2'>
                                                    <div className='h-6 w-6 rounded-md bg-primary/5 flex items-center justify-center text-primary'>
                                                        <item.icon className='h-3 w-3' />
                                                    </div>
                                                    <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-tight'>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'text-xs font-bold truncate max-w-[100px]',
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
                                        className='w-full h-9 rounded-xl text-xs font-bold uppercase tracking-wide'
                                    >
                                        <Eye className='h-3 w-3 mr-2' />
                                        {t('admin.tickets.sidebar.labels.profile')}
                                    </Button>
                                </Link>
                            </TabsContent>

                            <TabsContent value='servers' className='pt-3'>
                                <div className='space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide'>
                                    {userServers.length === 0 ? (
                                        <p className='text-xs text-center text-muted-foreground italic py-4'>
                                            {t('admin.tickets.sidebar.empty.servers')}
                                        </p>
                                    ) : (
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        userServers.map((s: any) => (
                                            <Link
                                                key={s.uuid}
                                                href={`/server/${s.uuid_short || s.uuidShort || s.identifier || s.uuid}`}
                                            >
                                                <div className='p-2 rounded-lg bg-background/50 border border-border/5 hover:bg-accent/50 transition-colors'>
                                                    <div className='flex items-center justify-between'>
                                                        <span className='text-xs font-bold truncate pr-2'>
                                                            {s.name}
                                                        </span>
                                                        <Badge variant='outline' className='text-[9px] h-4 px-1'>
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
                                <div className='space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide'>
                                    {userTickets.filter((t) => t.uuid !== ticket.uuid).length === 0 ? (
                                        <p className='text-xs text-center text-muted-foreground italic py-4'>
                                            {t('admin.tickets.sidebar.empty.tickets')}
                                        </p>
                                    ) : (
                                        userTickets
                                            .filter((t) => t.uuid !== ticket.uuid)
                                            .map((ut) => (
                                                <Link key={ut.uuid} href={`/admin/tickets/${ut.uuid}`}>
                                                    <div className='p-2 rounded-lg bg-background/50 border border-border/5 hover:bg-accent/50 transition-colors'>
                                                        <div className='flex items-center justify-between gap-2'>
                                                            <span className='text-xs font-bold truncate'>
                                                                {ut.title}
                                                            </span>
                                                            <Badge variant='outline' className='text-[9px] h-4 px-1'>
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
                                <div className='space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide'>
                                    {!userDetails.mails || userDetails.mails.length === 0 ? (
                                        <p className='text-xs text-center text-muted-foreground italic py-4'>
                                            {t('admin.tickets.sidebar.empty.emails')}
                                        </p>
                                    ) : (
                                        userDetails.mails.map((email, idx: number) => (
                                            <div
                                                key={idx}
                                                className='p-2 rounded-lg bg-background/50 border border-border/5 cursor-pointer hover:bg-accent/50'
                                                onClick={() => onOpenMailPreview(email)}
                                            >
                                                <div className='flex items-center justify-between'>
                                                    <span className='text-xs font-bold truncate'>{email.subject}</span>
                                                    <Badge
                                                        variant={email.status === 'sent' ? 'secondary' : 'destructive'}
                                                        className='text-[9px] h-4 px-1 uppercase'
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

                    {/* Admin Utilities */}
                    <Card className='p-5 space-y-3 bg-card/30 backdrop-blur-md border-border/10 shadow-sm'>
                        <div className='flex items-center gap-2 pb-2 border-b border-border/5'>
                            <Settings className='h-4 w-4 text-primary' />
                            <h4 className='font-black uppercase tracking-widest text-[10px] text-foreground'>
                                {t('admin.tickets.sidebar.ticket_info')}
                            </h4>
                        </div>
                        <div className='grid grid-cols-1 gap-2'>
                            <Link href={`/admin/tickets?user_uuid=${userDetails.uuid}`}>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='w-full h-8 justify-start text-xs font-bold'
                                >
                                    <TicketIcon className='h-3 w-3 mr-2' />{' '}
                                    {t('admin.tickets.sidebar.actions.view_all_tickets')}
                                </Button>
                            </Link>
                            <Link href={`/admin/users/${userDetails.uuid}`}>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='w-full h-8 justify-start text-xs font-bold'
                                >
                                    <User className='h-3 w-3 mr-2' /> {t('admin.tickets.sidebar.actions.view_user')}
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className='p-8 text-center text-muted-foreground border-border/10 bg-card/30'>
                    <User className='h-10 w-10 mx-auto mb-3 opacity-20' />
                    <p className='text-sm'>User info unavailable</p>
                </Card>
            )}

            {/* Ticket Meta */}
            <Card className='p-4 space-y-3 bg-card/50 backdrop-blur-sm border-border/10 shadow-sm'>
                <div className='flex items-center gap-2 pb-2 border-b border-border/5'>
                    <Info className='h-3.5 w-3.5 text-primary' />
                    <h4 className='font-black uppercase tracking-widest text-[10px] text-foreground'>Ticket Info</h4>
                </div>
                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-medium text-muted-foreground'>Status</span>
                        <div className='flex items-center gap-2'>
                            <div
                                className='h-2 w-2 rounded-full animate-pulse'
                                style={{ backgroundColor: ticket.status?.color }}
                            />
                            <span className='text-xs font-bold' style={{ color: ticket.status?.color }}>
                                {ticket.status?.name}
                            </span>
                        </div>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-medium text-muted-foreground'>Priority</span>
                        <div className='flex items-center gap-2'>
                            <div
                                className='h-2 w-2 rounded-full rotate-45'
                                style={{ backgroundColor: ticket.priority?.color }}
                            />
                            <span className='text-xs font-bold' style={{ color: ticket.priority?.color }}>
                                {ticket.priority?.name}
                            </span>
                        </div>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-medium text-muted-foreground'>Category</span>
                        <span className='text-xs font-bold'>{ticket.category?.name}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-medium text-muted-foreground'>Created</span>
                        <span className='text-xs font-bold'>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </Card>

            {WidgetRenderer && widgets && <WidgetRenderer widgets={widgets} />}
        </div>
    );
}
