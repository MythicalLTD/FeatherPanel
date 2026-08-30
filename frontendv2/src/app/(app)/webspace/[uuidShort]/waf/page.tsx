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
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

export default function WebSpaceWafPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        wafEnabled: false,
        wafDenyIps: '',
        wafDenyPaths: '',
    });

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}`);
            const ws = data.data.webspace as {
                waf_enabled?: boolean;
                waf_deny_ips?: string[];
                waf_deny_paths?: string[];
            };
            setForm({
                wafEnabled: !!ws.waf_enabled,
                wafDenyIps: (ws.waf_deny_ips || []).join('\n'),
                wafDenyPaths: (ws.waf_deny_paths || []).join('\n'),
            });
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.settings.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const saveWaf = async () => {
        setSaving(true);
        try {
            await axios.patch(`/api/user/webspaces/${uuidShort}`, {
                waf_enabled: form.wafEnabled,
                waf_deny_ips: form.wafDenyIps
                    .split(/[\n,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                waf_deny_paths: form.wafDenyPaths
                    .split(/[\n,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
            });
            toast.success(t('webSpaces.settings.saved'));
        } catch (error) {
            let msg = t('webSpaces.settings.saveFailed');
            if (isAxiosError(error)) {
                if (error.response?.status === 403) {
                    msg = t('webSpaces.settings.noPermission');
                } else if (error.response?.data?.message) {
                    msg = error.response.data.message;
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-waf'>
            <div className='mx-auto max-w-4xl space-y-8 pb-16'>
                <PageHeader title={t('webSpaces.wafPage.title')} description={t('webSpaces.wafPage.description')} />

                <PageCard title={t('webSpaces.settings.wafTitle')} icon={Shield}>
                    <div className='space-y-4'>
                        <p className='text-muted-foreground text-sm'>{t('webSpaces.settings.wafHelp')}</p>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.wafEnabled}
                                onCheckedChange={(checked) => setForm({ ...form, wafEnabled: checked === true })}
                            />
                            {t('webSpaces.settings.wafEnabled')}
                        </label>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.settings.wafDenyIps')}
                            </Label>
                            <textarea
                                value={form.wafDenyIps}
                                onChange={(e) => setForm({ ...form, wafDenyIps: e.target.value })}
                                rows={4}
                                placeholder='203.0.113.10&#10;198.51.100.0/24'
                                className='bg-secondary/50 border-border/10 focus:border-primary/50 w-full rounded-xl border p-3 font-mono text-sm'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.settings.wafDenyPaths')}
                            </Label>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.wafDenyPathsHelp')}</p>
                            <textarea
                                value={form.wafDenyPaths}
                                onChange={(e) => setForm({ ...form, wafDenyPaths: e.target.value })}
                                rows={4}
                                placeholder='/xmlrpc.php&#10;/wp-config.php'
                                className='bg-secondary/50 border-border/10 focus:border-primary/50 w-full rounded-xl border p-3 font-mono text-sm'
                            />
                        </div>
                        <Button loading={saving} onClick={() => void saveWaf()} size='sm'>
                            <Save className='mr-2 h-4 w-4' />
                            {t('webSpaces.settings.saveSettings')}
                        </Button>
                    </div>
                </PageCard>
            </div>
        </WebSpacePageWidgets>
    );
}
