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

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateInTz } from '@/lib/dateUtils';
import { Tab } from '@headlessui/react';
import { cn } from '@/lib/utils';
import ProfileTab from '@/components/account/ProfileTab';
import SettingsTab from '@/components/account/SettingsTab';
import SshKeysTab from '@/components/account/SshKeysTab';
import ApiKeysTab from '@/components/account/ApiKeysTab';
import ActivityTab from '@/components/account/ActivityTab';
import MailTab from '@/components/account/MailTab';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function AccountPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const dateOpts = useDateFormatOptions();
    const searchParams = useSearchParams();
    const router = useRouter();

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-account');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const tabs = [
        { id: 'profile', name: t('account.profile'), component: ProfileTab },
        { id: 'settings', name: t('account.settings'), component: SettingsTab },
        { id: 'ssh-keys', name: t('account.sshKeys.title'), component: SshKeysTab },
        { id: 'api-keys', name: t('account.apiKeys.title'), component: ApiKeysTab },
        { id: 'activity', name: t('account.activity.title'), component: ActivityTab },
        { id: 'mail', name: t('account.mail.title'), component: MailTab },
    ];

    const initialTabIndex = tabs.findIndex((tab) => tab.id === searchParams.get('tab'));
    const [selectedIndex, setSelectedIndex] = useState(initialTabIndex >= 0 ? initialTabIndex : 0);

    const handleTabChange = (index: number) => {
        setSelectedIndex(index);
        router.replace(`/dashboard/account?tab=${tabs[index].id}`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return t('account.unknown');
        const formatted = formatDateInTz(dateString, dateOpts);
        return formatted === '-' ? t('account.unknown') : formatted;
    };

    const getUserInitials = () => {
        if (!user) return 'U';
        return (
            `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() ||
            user.username?.[0]?.toUpperCase() ||
            'U'
        );
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-account', 'top-of-page')} />

            <div className='border-border/60 bg-card/70 rounded-2xl border p-6 backdrop-blur-xl sm:p-8'>
                <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6'>
                    {user?.avatar ? (
                        <NextImage
                            src={user.avatar}
                            alt={user.username || 'User avatar'}
                            width={96}
                            height={96}
                            unoptimized
                            className='border-primary/20 h-20 w-20 rounded-full border-2 object-cover sm:h-24 sm:w-24'
                        />
                    ) : (
                        <div className='from-primary/20 to-primary/10 border-primary/20 flex h-20 w-20 items-center justify-center rounded-full border-2 bg-linear-to-br sm:h-24 sm:w-24'>
                            <span className='text-primary text-2xl font-semibold'>{getUserInitials()}</span>
                        </div>
                    )}
                    <div className='space-y-2 text-center sm:text-left'>
                        <h2 className='text-foreground text-xl font-bold sm:text-2xl'>{user?.username}</h2>
                        <p className='text-muted-foreground text-sm sm:text-base'>{user?.email}</p>
                        <p className='text-muted-foreground text-xs sm:text-sm'>
                            {t('account.memberSince')} {formatDate(user?.first_seen)}
                        </p>
                    </div>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-account', 'after-profile-card')} />

            <div className='border-border/60 bg-card/60 overflow-hidden rounded-2xl border backdrop-blur-xl'>
                <Tab.Group selectedIndex={selectedIndex} onChange={handleTabChange}>
                    <div className='border-border block border-b p-4 sm:hidden'>
                        <select
                            value={selectedIndex}
                            onChange={(e) => handleTabChange(Number(e.target.value))}
                            className='border-border bg-background focus:ring-primary w-full rounded-lg border p-3 text-sm focus:ring-2 focus:outline-none'
                        >
                            {tabs.map((tab, index) => (
                                <option key={tab.id} value={index}>
                                    {tab.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='border-border/60 hidden border-b p-3 sm:block'>
                        <Tab.List className='custom-scrollbar flex gap-2 overflow-x-auto'>
                            {tabs.map((tab) => (
                                <Tab
                                    key={tab.id}
                                    className={({ selected }) =>
                                        cn(
                                            'rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all focus:outline-none',
                                            selected
                                                ? 'bg-primary/10 text-primary border-primary/20 border'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent',
                                        )
                                    }
                                >
                                    {tab.name}
                                </Tab>
                            ))}
                        </Tab.List>
                    </div>

                    <Tab.Panels className='p-5 sm:p-6'>
                        {tabs.map((tab) => (
                            <Tab.Panel key={tab.id} className='focus:outline-none'>
                                <tab.component />
                            </Tab.Panel>
                        ))}
                    </Tab.Panels>
                </Tab.Group>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-account', 'after-tabs')} />
            <WidgetRenderer widgets={getWidgets('dashboard-account', 'bottom-of-page')} />
        </div>
    );
}
