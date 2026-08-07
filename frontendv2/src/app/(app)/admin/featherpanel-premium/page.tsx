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

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Crown,
    ExternalLink,
    ImageIcon,
    LayoutPanelLeft,
    Loader2,
    RefreshCw,
    Save,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PremiumSidebarEditor } from './PremiumSidebarEditor';
import { ImageAttachmentField } from '@/components/featherui/ImageAttachmentField';
import { parseSidebarNavigationConfig, type SidebarNavigationConfig } from '@/lib/sidebarCustomization';

export type FeatherPanelPremiumFeatures = {
    remove_branding: boolean;
    rename_ai_agent: boolean;
    custom_sidebar: boolean;
    higher_limits: boolean;
    priority_support: boolean;
    priority_suggestions: boolean;
};

export type FeatherPanelPremiumStatus = {
    active: boolean;
    features: FeatherPanelPremiumFeatures;
    checked_at?: string | null;
    expires_at?: string | null;
    last_failure_at?: string | null;
    using_cache?: boolean;
    can_customize_ui: boolean;
    can_custom_sidebar?: boolean;
    manage_url: string;
};

type PremiumPayload = {
    linked: boolean;
    team_uuid?: string | null;
    team_name?: string | null;
    team_slug?: string | null;
    premium: FeatherPanelPremiumStatus;
    settings: {
        chatbot_display_name: string;
        chatbot_avatar_url: string;
        branding_show_powered_by: boolean;
        sidebar_navigation_config?: SidebarNavigationConfig | string;
    };
};

export default function FeatherPanelPremiumPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { refetch: refetchSettings } = useSettings();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<PremiumPayload | null>(null);

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [showPoweredBy, setShowPoweredBy] = useState(true);
    const [sidebarConfig, setSidebarConfig] = useState<SidebarNavigationConfig>({});

    const applyPayload = useCallback((payload: PremiumPayload) => {
        setData(payload);
        setDisplayName(payload.settings.chatbot_display_name || '');
        setAvatarUrl(payload.settings.chatbot_avatar_url || '');
        setShowPoweredBy(payload.settings.branding_show_powered_by !== false);
        setSidebarConfig(parseSidebarNavigationConfig(payload.settings.sidebar_navigation_config));
    }, []);

    const load = useCallback(
        async (refresh = true) => {
            if (refresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            try {
                const res = await axios.get<{ success: boolean; data: PremiumPayload }>(
                    '/api/admin/featherpanel-premium',
                    { params: { refresh: refresh ? '1' : '0' } },
                );
                if (res.data.success && res.data.data) {
                    applyPayload(res.data.data);
                } else {
                    toast.error(t('admin.featherpanel_premium.load_failed'));
                }
            } catch {
                toast.error(t('admin.featherpanel_premium.load_failed'));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [applyPayload, t],
    );

    useEffect(() => {
        void load(true);
    }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await axios.post<{ success: boolean; data: PremiumPayload; message?: string }>(
                '/api/admin/featherpanel-premium',
                {
                    chatbot_display_name: displayName,
                    chatbot_avatar_url: avatarUrl,
                    branding_show_powered_by: showPoweredBy,
                    sidebar_navigation_config: sidebarConfig,
                },
            );
            if (res.data.success && res.data.data) {
                applyPayload(res.data.data);
                await refetchSettings();
                toast.success(t('admin.featherpanel_premium.saved'));
            } else {
                toast.error(res.data.message || t('admin.featherpanel_premium.save_failed'));
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; error_code?: string } } };
            if (e?.response?.data?.error_code === 'PREMIUM_REQUIRED') {
                toast.error(t('admin.featherpanel_premium.premium_required'));
                void load(true);
            } else {
                toast.error(e?.response?.data?.message || t('admin.featherpanel_premium.save_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const premium = data?.premium;
    const active = Boolean(premium?.active);
    const linked = Boolean(data?.linked);
    const manageUrl = premium?.manage_url || 'https://my.mythicalsystems.org/clouds';

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title={t('admin.featherpanel_premium.title')}
                description={t('admin.featherpanel_premium.subtitle')}
                icon={Crown}
                actions={
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={loading || refreshing}
                        onClick={() => void load(true)}
                    >
                        <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                        {t('admin.featherpanel_premium.refresh')}
                    </Button>
                }
            />

            {loading && !data ? (
                <div className='flex justify-center py-16'>
                    <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                </div>
            ) : (
                <>
                    <PageCard title={t('admin.featherpanel_premium.status.card_title')} icon={Sparkles}>
                        <div className='space-y-4'>
                            <div className='flex flex-wrap items-center gap-2'>
                                {active ? (
                                    <>
                                        <CheckCircle2 className='text-primary h-5 w-5' />
                                        <span className='text-foreground text-lg font-semibold'>
                                            {t('admin.featherpanel_premium.status.active')}
                                        </span>
                                        <span className='bg-primary/10 text-primary border-primary/20 rounded-md border px-2 py-0.5 text-xs font-medium'>
                                            Premium
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className='text-muted-foreground h-5 w-5' />
                                        <span className='text-foreground text-lg font-semibold'>
                                            {t('admin.featherpanel_premium.status.inactive')}
                                        </span>
                                    </>
                                )}
                            </div>

                            {!linked ? (
                                <div className='space-y-3'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.featherpanel_premium.status.not_linked')}
                                    </p>
                                    <Button onClick={() => router.push('/admin/cloud-management')}>
                                        {t('admin.featherpanel_premium.open_cloud')}
                                    </Button>
                                </div>
                            ) : active ? (
                                <div className='space-y-2'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.featherpanel_premium.status.active_desc', {
                                            team: data?.team_name || t('admin.featherpanel_premium.your_team'),
                                        })}
                                    </p>
                                    {premium?.features?.higher_limits && (
                                        <p className='text-muted-foreground text-sm'>
                                            {t('admin.featherpanel_premium.status.higher_limits')}
                                        </p>
                                    )}
                                    {premium?.using_cache && (
                                        <p className='text-sm text-amber-600 dark:text-amber-400'>
                                            {t('admin.featherpanel_premium.status.using_cache', {
                                                expires: premium.expires_at || '—',
                                            })}
                                        </p>
                                    )}
                                    {premium?.checked_at && (
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherpanel_premium.status.checked_at')}: {premium.checked_at}
                                        </p>
                                    )}
                                    {premium?.expires_at && (
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherpanel_premium.status.expires_at')}: {premium.expires_at}
                                        </p>
                                    )}
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => window.open(manageUrl, '_blank', 'noopener,noreferrer')}
                                    >
                                        <ExternalLink className='mr-2 h-4 w-4' />
                                        {t('admin.featherpanel_premium.manage_on_mythic')}
                                    </Button>
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.featherpanel_premium.status.inactive_desc')}
                                    </p>
                                    <div className='flex flex-wrap gap-2'>
                                        <Button onClick={() => window.open(manageUrl, '_blank', 'noopener,noreferrer')}>
                                            <Crown className='mr-2 h-4 w-4' />
                                            {t('admin.featherpanel_premium.get_premium')}
                                            <ExternalLink className='ml-2 h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            onClick={() => router.push('/admin/cloud-management')}
                                        >
                                            {t('admin.featherpanel_premium.open_cloud')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </PageCard>

                    {linked && active && (
                        <>
                            <PageCard title={t('admin.featherpanel_premium.customize.card_title')} icon={ImageIcon}>
                                <div className='space-y-6'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('admin.featherpanel_premium.customize.description')}
                                    </p>

                                    <div className='space-y-2'>
                                        <Label htmlFor='premium-ai-name'>
                                            {t('admin.featherpanel_premium.customize.ai_name')}
                                        </Label>
                                        <Input
                                            id='premium-ai-name'
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder={t('admin.featherpanel_premium.customize.ai_name_placeholder')}
                                            maxLength={64}
                                        />
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherpanel_premium.customize.ai_name_help')}
                                        </p>
                                    </div>

                                    <ImageAttachmentField
                                        id='premium-ai-avatar'
                                        label={t('admin.featherpanel_premium.customize.ai_avatar')}
                                        description={t('admin.featherpanel_premium.customize.ai_avatar_help')}
                                        value={avatarUrl}
                                        onChange={setAvatarUrl}
                                        placeholder='https://… or /attachments/…'
                                    />

                                    <div className='flex items-center justify-between gap-4 rounded-lg border px-4 py-3'>
                                        <div className='space-y-1'>
                                            <Label htmlFor='premium-powered-by'>
                                                {t('admin.featherpanel_premium.customize.show_powered_by')}
                                            </Label>
                                            <p className='text-muted-foreground text-xs'>
                                                {t('admin.featherpanel_premium.customize.show_powered_by_help')}
                                            </p>
                                        </div>
                                        <Switch
                                            id='premium-powered-by'
                                            checked={showPoweredBy}
                                            onCheckedChange={setShowPoweredBy}
                                        />
                                    </div>

                                    <Button onClick={() => void save()} disabled={saving}>
                                        {saving ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Save className='mr-2 h-4 w-4' />
                                        )}
                                        {t('admin.featherpanel_premium.customize.save')}
                                    </Button>
                                </div>
                            </PageCard>

                            <PageCard title={t('admin.featherpanel_premium.sidebar.card_title')} icon={LayoutPanelLeft}>
                                <div className='space-y-6'>
                                    <PremiumSidebarEditor config={sidebarConfig} onConfigChange={setSidebarConfig} />
                                    <Button onClick={() => void save()} disabled={saving}>
                                        {saving ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Save className='mr-2 h-4 w-4' />
                                        )}
                                        {t('admin.featherpanel_premium.customize.save')}
                                    </Button>
                                </div>
                            </PageCard>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
