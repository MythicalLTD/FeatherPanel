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
import { Zap, ArrowRight } from 'lucide-react';
import { TabBlankState } from './TabPrimitives';

export function DhcpAgentTab() {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.vdsNodes.dhcp.title')} icon={Zap}>
            <div className='space-y-6'>
                <TabBlankState
                    icon={Zap}
                    title={t('admin.vdsNodes.dhcp.blank_title')}
                    description={t('admin.vdsNodes.dhcp.blank_description')}
                    className='border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent'
                />

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 mt-0.5'>
                                <Zap className='h-4 w-4 text-amber-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.dhcp.cards.dynamic_ip_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.dhcp.cards.dynamic_ip_description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 mt-0.5'>
                                <ArrowRight className='h-4 w-4 text-blue-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.dhcp.cards.multiple_ip_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.dhcp.cards.multiple_ip_description')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/30 to-transparent p-4 space-y-3 md:col-span-2'>
                        <div className='flex items-start gap-3'>
                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 mt-0.5'>
                                <Zap className='h-4 w-4 text-purple-600' />
                            </div>
                            <div>
                                <h3 className='text-sm font-medium'>
                                    {t('admin.vdsNodes.dhcp.cards.automation_title')}
                                </h3>
                                <p className='text-xs text-muted-foreground/70 leading-relaxed mt-1'>
                                    {t('admin.vdsNodes.dhcp.cards.automation_description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='rounded-xl border border-border/20 bg-gradient-to-br from-card/20 to-transparent p-4'>
                    <p className='text-sm text-muted-foreground/70 leading-relaxed'>
                        {t('admin.vdsNodes.dhcp.footer_description')}
                    </p>
                </div>
            </div>
        </PageCard>
    );
}
