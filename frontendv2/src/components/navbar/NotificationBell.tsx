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

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import axios from 'axios';
import { Popover, PopoverButton, PopoverPanel, CloseButton } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Archive,
    ArchiveX,
    Bell,
    CheckCheck,
    Loader2,
    Megaphone,
    MessageSquareText,
    TriangleAlert,
    Gauge,
    CalendarClock,
    Power,
    type LucideProps,
    ArrowRightLeft,
} from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { realtimeTopics } from '@/lib/realtime';
import { formatRelativeTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type InboxKind =
    | 'ticket_reply'
    | 'backup_completed'
    | 'backup_failed'
    | 'server_crashed'
    | 'file_transfer_completed'
    | 'file_transfer_failed'
    | 'resource_limit'
    | 'transfer_power_failed'
    | 'vds_down'
    | 'vds_high_cpu'
    | 'vds_backup_failed'
    | 'vds_bandwidth'
    | 'vds_expiring'
    | 'announcement';

export interface InboxItem {
    key: string;
    source: 'inbox' | 'announcement';
    kind: InboxKind | string;
    data: Record<string, string | null | undefined>;
    link: string | null;
    count: number;
    read: boolean;
    created_at: string;
}

interface InboxResponse {
    success: boolean;
    data?: { items: InboxItem[]; unread_count: number };
}

const POLL_MS = 60_000;

const KIND_ICONS: Record<InboxKind, { icon: ComponentType<LucideProps>; tone: string }> = {
    ticket_reply: { icon: MessageSquareText, tone: 'text-primary bg-primary/10' },
    backup_completed: { icon: Archive, tone: 'text-emerald-500 bg-emerald-500/10' },
    backup_failed: { icon: ArchiveX, tone: 'text-red-500 bg-red-500/10' },
    server_crashed: { icon: TriangleAlert, tone: 'text-amber-500 bg-amber-500/10' },
    file_transfer_completed: { icon: ArrowRightLeft, tone: 'text-emerald-500 bg-emerald-500/10' },
    file_transfer_failed: { icon: ArrowRightLeft, tone: 'text-red-500 bg-red-500/10' },
    resource_limit: { icon: Gauge, tone: 'text-amber-500 bg-amber-500/10' },
    transfer_power_failed: { icon: Power, tone: 'text-red-500 bg-red-500/10' },
    vds_down: { icon: Power, tone: 'text-red-500 bg-red-500/10' },
    vds_high_cpu: { icon: Gauge, tone: 'text-amber-500 bg-amber-500/10' },
    vds_backup_failed: { icon: ArchiveX, tone: 'text-red-500 bg-red-500/10' },
    vds_bandwidth: { icon: Gauge, tone: 'text-amber-500 bg-amber-500/10' },
    vds_expiring: { icon: CalendarClock, tone: 'text-orange-500 bg-orange-500/10' },
    announcement: { icon: Megaphone, tone: 'text-sky-500 bg-sky-500/10' },
};

const KIND_TITLES: Record<InboxKind, string> = {
    ticket_reply: 'navbar.inbox.kinds.ticket_reply',
    backup_completed: 'navbar.inbox.kinds.backup_completed',
    backup_failed: 'navbar.inbox.kinds.backup_failed',
    server_crashed: 'navbar.inbox.kinds.server_crashed',
    file_transfer_completed: 'navbar.inbox.kinds.file_transfer_completed',
    file_transfer_failed: 'navbar.inbox.kinds.file_transfer_failed',
    resource_limit: 'navbar.inbox.kinds.resource_limit',
    transfer_power_failed: 'navbar.inbox.kinds.transfer_power_failed',
    vds_down: 'navbar.inbox.kinds.vds_down',
    vds_high_cpu: 'navbar.inbox.kinds.vds_high_cpu',
    vds_backup_failed: 'navbar.inbox.kinds.vds_backup_failed',
    vds_bandwidth: 'navbar.inbox.kinds.vds_bandwidth',
    vds_expiring: 'navbar.inbox.kinds.vds_expiring',
    announcement: 'navbar.inbox.kinds.announcement',
};

const KIND_BODIES: Record<Exclude<InboxKind, 'announcement'>, string> = {
    ticket_reply: 'navbar.inbox.bodies.ticket_reply',
    backup_completed: 'navbar.inbox.bodies.backup_completed',
    backup_failed: 'navbar.inbox.bodies.backup_failed',
    server_crashed: 'navbar.inbox.bodies.server_crashed',
    file_transfer_completed: 'navbar.inbox.bodies.file_transfer_completed',
    file_transfer_failed: 'navbar.inbox.bodies.file_transfer_failed',
    resource_limit: 'navbar.inbox.bodies.resource_limit',
    transfer_power_failed: 'navbar.inbox.bodies.transfer_power_failed',
    vds_down: 'navbar.inbox.bodies.vds_down',
    vds_high_cpu: 'navbar.inbox.bodies.vds_high_cpu',
    vds_backup_failed: 'navbar.inbox.bodies.vds_backup_failed',
    vds_bandwidth: 'navbar.inbox.bodies.vds_bandwidth',
    vds_expiring: 'navbar.inbox.bodies.vds_expiring',
};

function isKnownKind(kind: string): kind is InboxKind {
    return kind in KIND_ICONS;
}

/** Params for an item's body text; missing values fall back to an empty string. */
function bodyParams(item: InboxItem): Record<string, string> {
    const d = item.data ?? {};
    return {
        ticket: d.ticket_title ?? '',
        replier: d.replier ?? '',
        server: d.server_name ?? '',
        backup: d.backup_name ?? '',
        target: d.target_name ?? '',
        files: d.count ?? '',
        percent: d.percent ?? '',
        vds: d.vds_name ?? '',
        minutes: d.minutes ?? '',
        error: d.error ?? '',
        count: String(item.count),
    };
}

/** Top bar bell: ticket replies, backup results, crashes and announcements with read state. */
export function NotificationBell({ className }: { className?: string }) {
    const { user } = useSession();
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const router = useRouter();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get<InboxResponse>('/api/user/notifications/inbox');
            if (data.success && data.data) {
                setItems(data.data.items);
                setUnread(data.data.unread_count);
                setFailed(false);
            }
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const enabled = Boolean(user?.uuid);
    useEffect(() => {
        if (enabled) void load();
    }, [enabled, load]);

    useLiveRefresh({
        topics: [user?.uuid && realtimeTopics.user(user.uuid), realtimeTopics.notifications],
        types: ['inbox.updated', 'notifications.updated'],
        refresh: () => void load(),
        pollMs: POLL_MS,
        enabled,
    });

    const markRead = useCallback(
        async (payload: { all: true } | { keys: string[] }) => {
            const before = { items, unread };
            const keys = 'keys' in payload ? new Set(payload.keys) : null;
            const changed = items.filter((i) => !i.read && (!keys || keys.has(i.key))).length;
            setItems((prev) => prev.map((i) => (!keys || keys.has(i.key) ? { ...i, read: true } : i)));
            setUnread((prev) => (keys ? Math.max(0, prev - changed) : 0));
            try {
                await axios.post('/api/user/notifications/inbox/read', payload);
            } catch (error) {
                setItems(before.items);
                setUnread(before.unread);
                toast.error(getApiErrorMessage(error, t, 'navbar.inbox.markFailed'));
            }
        },
        [items, unread, t],
    );

    const openItem = (item: InboxItem) => {
        if (!item.read) void markRead({ keys: [item.key] });
        if (item.link) router.push(item.link);
    };

    if (!user) return null;

    const badge = unread > 99 ? '99+' : String(unread);
    const label = unread > 0 ? t('navbar.inbox.openUnread', { count: badge }) : t('navbar.inbox.open');

    return (
        <Popover className='relative shrink-0'>
            <PopoverButton
                title={label}
                aria-label={label}
                data-testid='notification-bell'
                className={cn(
                    'text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:ring-ring data-[open]:bg-muted/50 data-[open]:text-foreground relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    className,
                )}
            >
                <Bell className='h-4 w-4' aria-hidden />
                {unread > 0 ? (
                    <span className='bg-primary text-primary-foreground ring-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold ring-2'>
                        {badge}
                    </span>
                ) : null}
            </PopoverButton>
            <PopoverPanel
                anchor={{ to: 'bottom end', gap: 8, padding: 8 }}
                transition
                className='border-border/40 bg-card/95 z-50 flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0'
            >
                <div className='border-border/40 flex items-center justify-between gap-2 border-b px-4 py-3'>
                    <div className='min-w-0'>
                        <p className='text-foreground text-sm font-semibold'>{t('navbar.inbox.title')}</p>
                        <p className='text-muted-foreground text-xs'>
                            {unread > 0 ? t('navbar.inbox.unreadCount', { count: badge }) : t('navbar.inbox.allRead')}
                        </p>
                    </div>
                    <button
                        type='button'
                        disabled={unread === 0 || markingAll}
                        onClick={async () => {
                            setMarkingAll(true);
                            await markRead({ all: true });
                            setMarkingAll(false);
                        }}
                        className='text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'
                    >
                        {markingAll ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />
                        ) : (
                            <CheckCheck className='h-3.5 w-3.5' aria-hidden />
                        )}
                        {t('navbar.inbox.markAll')}
                    </button>
                </div>
                <div className='max-h-[min(28rem,70vh)] overflow-y-auto'>
                    {loading ? (
                        <div className='space-y-2 p-3' aria-busy='true'>
                            {[0, 1, 2].map((i) => (
                                <div key={i} className='bg-muted/40 h-14 animate-pulse rounded-lg' />
                            ))}
                        </div>
                    ) : failed && items.length === 0 ? (
                        <p className='text-muted-foreground px-4 py-8 text-center text-sm'>
                            {t('navbar.inbox.loadFailed')}
                        </p>
                    ) : items.length === 0 ? (
                        <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
                            <span className='fp-icon-tile flex h-10 w-10 items-center justify-center rounded-xl'>
                                <Bell className='text-muted-foreground h-5 w-5' aria-hidden />
                            </span>
                            <p className='text-foreground text-sm font-medium'>{t('navbar.inbox.emptyTitle')}</p>
                            <p className='text-muted-foreground text-xs'>{t('navbar.inbox.emptyBody')}</p>
                        </div>
                    ) : (
                        <ul className='divide-border/30 divide-y'>
                            {items.map((item) => {
                                const kind = isKnownKind(item.kind) ? item.kind : null;
                                const visual = KIND_ICONS[kind ?? 'announcement'];
                                const Icon = visual.icon;
                                const title =
                                    kind === 'announcement'
                                        ? (item.data.title ?? t(KIND_TITLES.announcement))
                                        : kind
                                          ? t(KIND_TITLES[kind])
                                          : t('navbar.inbox.kinds.other');
                                const body =
                                    kind === 'announcement'
                                        ? (item.data.excerpt ?? '')
                                        : kind
                                          ? t(KIND_BODIES[kind], {
                                                ...bodyParams(item),
                                                metric:
                                                    kind === 'resource_limit'
                                                        ? t(`navbar.inbox.metrics.${item.data.metric ?? 'cpu'}`)
                                                        : '',
                                            })
                                          : '';
                                return (
                                    <li key={item.key}>
                                        <CloseButton
                                            as='button'
                                            type='button'
                                            onClick={() => openItem(item)}
                                            className={cn(
                                                'hover:bg-muted/40 focus-visible:bg-muted/40 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none',
                                                !item.read && 'bg-primary/[0.04]',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                    visual.tone,
                                                )}
                                            >
                                                <Icon className='h-4 w-4' aria-hidden />
                                            </span>
                                            <span className='min-w-0 flex-1'>
                                                <span className='flex items-baseline justify-between gap-2'>
                                                    <span
                                                        className={cn(
                                                            'truncate text-sm',
                                                            item.read
                                                                ? 'text-muted-foreground font-medium'
                                                                : 'text-foreground font-semibold',
                                                        )}
                                                    >
                                                        {title}
                                                    </span>
                                                    <span className='text-muted-foreground shrink-0 text-[11px]'>
                                                        {formatRelativeTime(item.created_at, dateOpts)}
                                                    </span>
                                                </span>
                                                {body ? (
                                                    <span className='text-muted-foreground mt-0.5 line-clamp-2 block text-xs'>
                                                        {body}
                                                    </span>
                                                ) : null}
                                                {item.count > 1 ? (
                                                    <span className='bg-muted/60 text-muted-foreground mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium'>
                                                        {t('navbar.inbox.repeated', { count: String(item.count) })}
                                                    </span>
                                                ) : null}
                                            </span>
                                            {!item.read ? (
                                                <span className='mt-1.5 flex shrink-0 items-center'>
                                                    <span className='bg-primary h-2 w-2 rounded-full' />
                                                    <span className='sr-only'>{t('navbar.inbox.unread')}</span>
                                                </span>
                                            ) : null}
                                        </CloseButton>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </PopoverPanel>
        </Popover>
    );
}
