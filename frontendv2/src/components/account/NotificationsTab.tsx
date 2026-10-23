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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Bell, Mail, Send } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/lib/api-errors';

type EventKey =
    'server_crashed' | 'backup_completed' | 'backup_failed' | 'file_transfer' | 'resource_limit' | 'transfer_power';

interface NotificationSettings {
    email_enabled: boolean;
    discord_enabled: boolean;
    discord_webhook_url: string;
    events: Record<EventKey, boolean>;
}

const EVENTS: EventKey[] = [
    'server_crashed',
    'backup_completed',
    'backup_failed',
    'file_transfer',
    'resource_limit',
    'transfer_power',
];

const DEFAULTS: NotificationSettings = {
    email_enabled: true,
    discord_enabled: true,
    discord_webhook_url: '',
    events: {
        server_crashed: true,
        backup_completed: true,
        backup_failed: true,
        file_transfer: true,
        resource_limit: true,
        transfer_power: true,
    },
};

function Row({
    title,
    description,
    checked,
    onChange,
    id,
}: {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    id: string;
}) {
    return (
        <div className='flex items-start justify-between gap-4 py-3'>
            <label htmlFor={id} className='min-w-0'>
                <span className='text-foreground block text-sm font-medium'>{title}</span>
                {description && <span className='text-muted-foreground block text-xs'>{description}</span>}
            </label>
            <Switch id={id} checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

export default function NotificationsTab() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/user/notification-settings');
            if (data?.data) setSettings({ ...DEFAULTS, ...data.data });
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'account.notifications.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put('/api/user/notification-settings', settings);
            if (data?.data) setSettings({ ...DEFAULTS, ...data.data });
            toast.success(t('account.notifications.saved'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'account.notifications.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const test = async () => {
        setTesting(true);
        try {
            await axios.post('/api/user/notification-settings/test-discord');
            toast.success(t('account.notifications.testSent'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'account.notifications.testFailed'));
        } finally {
            setTesting(false);
        }
    };

    const setEvent = (key: EventKey, value: boolean) =>
        setSettings((s) => ({ ...s, events: { ...s.events, [key]: value } }));

    return (
        <div className='space-y-6'>
            <div className='flex items-start gap-3'>
                <div className='bg-primary/10 text-primary rounded-xl p-2.5'>
                    <Bell className='h-5 w-5' />
                </div>
                <div>
                    <h3 className='text-foreground text-lg font-semibold'>{t('account.notifications.title')}</h3>
                    <p className='text-muted-foreground text-sm'>{t('account.notifications.description')}</p>
                </div>
            </div>

            <section className='border-border/60 bg-card/40 divide-border/50 divide-y rounded-xl border px-4'>
                <Row
                    id='notif-email'
                    title={t('account.notifications.email')}
                    description={t('account.notifications.emailDescription')}
                    checked={settings.email_enabled}
                    onChange={(v) => setSettings((s) => ({ ...s, email_enabled: v }))}
                />
                <div className='space-y-3 py-3'>
                    <Row
                        id='notif-discord'
                        title={t('account.notifications.discord')}
                        description={t('account.notifications.discordDescription')}
                        checked={settings.discord_enabled}
                        onChange={(v) => setSettings((s) => ({ ...s, discord_enabled: v }))}
                    />
                    <div className='flex flex-col gap-2 sm:flex-row'>
                        <Input
                            className='min-w-0 flex-1'
                            type='url'
                            placeholder='https://discord.com/api/webhooks/...'
                            value={settings.discord_webhook_url}
                            onChange={(e) => setSettings((s) => ({ ...s, discord_webhook_url: e.target.value }))}
                        />
                        <Button
                            type='button'
                            variant='outline'
                            onClick={test}
                            disabled={testing || !settings.discord_webhook_url}
                            className='gap-1.5'
                        >
                            <Send className='h-4 w-4' />
                            {t('account.notifications.sendTest')}
                        </Button>
                    </div>
                </div>
            </section>

            <section className='border-border/60 bg-card/40 rounded-xl border px-4 py-2'>
                <h4 className='text-foreground flex items-center gap-2 pt-2 text-sm font-semibold'>
                    <Mail className='h-4 w-4' />
                    {t('account.notifications.events')}
                </h4>
                <div className='divide-border/50 divide-y'>
                    {EVENTS.map((key) => (
                        <Row
                            key={key}
                            id={`notif-event-${key}`}
                            title={t(`account.notifications.event.${key}`)}
                            checked={settings.events[key]}
                            onChange={(v) => setEvent(key, v)}
                        />
                    ))}
                </div>
            </section>

            <div className='flex justify-end'>
                <Button type='button' onClick={save} disabled={saving || loading}>
                    {t('account.notifications.save')}
                </Button>
            </div>
        </div>
    );
}
