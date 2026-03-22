/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { PageCard } from '@/components/featherui/PageCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { Shield, Lock, Zap } from 'lucide-react';
import { TabBlankState } from './TabPrimitives';

export function FirewallTab() {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.vdsNodes.firewall_tab.title')} icon={Shield}>
            <div className='space-y-6'>
                <TabBlankState
                    icon={Shield}
                    title={t('admin.vdsNodes.firewall_tab.blank_title')}
                    description={t('admin.vdsNodes.firewall_tab.blank_description')}
                    className='border-red-500/25 bg-gradient-to-br from-red-500/10 to-transparent'
                />

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 mt-0.5'>
                                <Shield className='h-4 w-4 text-red-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.firewall_tab.cards.inbound_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.firewall_tab.cards.inbound_description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 mt-0.5'>
                                <Lock className='h-4 w-4 text-orange-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.firewall_tab.cards.outbound_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.firewall_tab.cards.outbound_description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3 md:col-span-2'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/10 mt-0.5'>
                                <Zap className='h-4 w-4 text-yellow-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.firewall_tab.cards.advanced_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.firewall_tab.cards.advanced_description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/20 to-transparent p-4'>
                    <p className='text-sm text-muted-foreground/70 leading-relaxed'>
                        {t('admin.vdsNodes.firewall_tab.footer_description')}
                    </p>
                </div>
            </div>
        </PageCard>
    );
}
