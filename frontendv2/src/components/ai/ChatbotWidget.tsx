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

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import ChatbotContainer from './ChatbotContainer';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTheme } from '@/contexts/ThemeContext';

function ChatbotOpenButton({ onClick }: { onClick: () => void }) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
    const logoUrl = theme === 'dark' ? settings?.app_logo_dark || '/logo.png' : settings?.app_logo_white || '/logo.png';

    return (
        <Button
            className='bg-card hover:bg-card/95 border-border/70 ring-primary/15 dark:bg-card/90 relative h-14 w-14 rounded-2xl border shadow-2xl ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 md:h-16 md:w-16'
            size='icon'
            onClick={onClick}
        >
            <Image
                src={logoUrl}
                alt={settings?.app_name || t('chatbot.title')}
                width={34}
                height={34}
                className='h-8 w-8 object-contain md:h-9 md:w-9'
                unoptimized
            />
            <span className='sr-only'>{t('chatbot.openChat')}</span>
            <span className='border-background absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 bg-emerald-500' />
        </Button>
    );
}

function VdsChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { instance } = useVmInstance();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInputField =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.getAttribute('contenteditable') === 'true';

            if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !isInputField) {
                event.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            {!isOpen && (
                <div className='fixed right-6 bottom-6 z-50'>
                    <div className='relative'>
                        <ChatbotOpenButton onClick={() => setIsOpen(true)} />
                    </div>
                </div>
            )}

            <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} mode='vds' vdsInstance={instance} />
        </>
    );
}

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { settings } = useSettings();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isInputField =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.getAttribute('contenteditable') === 'true';

            if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !isInputField) {
                event.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const chatbotEnabled = settings?.chatbot_enabled === 'true';
    const isIDE = pathname?.includes('/files/ide');
    const isVds = pathname?.startsWith('/vds/');
    const isServer = pathname?.startsWith('/server/');
    const dashboardChatbotRoutes = ['/dashboard', '/dashboard/servers', '/dashboard/vms', '/dashboard/knowledgebase'];
    const isDashboardChatbotRoute =
        pathname === '/dashboard/knowledgebase' ||
        pathname?.startsWith('/dashboard/knowledgebase/') ||
        dashboardChatbotRoutes.includes(pathname || '');
    const shouldShow = (isServer || isVds || isDashboardChatbotRoute) && !isIDE && chatbotEnabled;

    if (!shouldShow) return null;

    // VDS routes: delegate to VdsChatbotWidget which safely calls useVmInstance()
    if (isVds) {
        return <VdsChatbotWidget />;
    }

    if (isDashboardChatbotRoute) {
        return (
            <>
                {!isOpen && (
                    <div className='fixed right-6 bottom-6 z-50'>
                        <div className='relative'>
                            <ChatbotOpenButton onClick={() => setIsOpen(true)} />
                        </div>
                    </div>
                )}

                <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} mode='dashboard' />
            </>
        );
    }

    // Server routes: existing behaviour
    return (
        <>
            {!isOpen && (
                <div className='fixed right-6 bottom-6 z-50'>
                    <div className='relative'>
                        <ChatbotOpenButton onClick={() => setIsOpen(true)} />
                    </div>
                </div>
            )}

            <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} mode='server' />
        </>
    );
}
