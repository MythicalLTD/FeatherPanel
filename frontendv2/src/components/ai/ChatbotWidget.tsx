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
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatbotContainer from './ChatbotContainer';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';

// ---------------------------------------------------------------------------
// VdsChatbotWidget — rendered only when inside a VmInstanceProvider (VDS routes)
// Calls useVmInstance() safely here since it is always inside the provider.
// ---------------------------------------------------------------------------
function VdsChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();
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
                        <Button
                            className='bg-primary hover:bg-primary/90 border-primary/20 relative h-14 w-14 rounded-full border transition-all duration-200 hover:scale-105 md:h-16 md:w-16'
                            size='icon'
                            onClick={() => setIsOpen(true)}
                        >
                            <MessageSquare className='text-primary-foreground h-6 w-6 md:h-7 md:w-7' />
                            <span className='sr-only'>{t('chatbot.openChat')}</span>
                        </Button>
                    </div>
                </div>
            )}

            <ChatbotContainer
                open={isOpen}
                onClose={() => setIsOpen(false)}
                mode='vds'
                vdsInstance={instance}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// ChatbotWidget — main export; renders server or VDS widget based on route
// ---------------------------------------------------------------------------
export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { t } = useTranslation();
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
    const shouldShow = (isServer || isVds) && !isIDE && chatbotEnabled;

    if (!shouldShow) return null;

    // VDS routes: delegate to VdsChatbotWidget which safely calls useVmInstance()
    if (isVds) {
        return <VdsChatbotWidget />;
    }

    // Server routes: existing behaviour
    return (
        <>
            {!isOpen && (
                <div className='fixed right-6 bottom-6 z-50'>
                    <div className='relative'>
                        <Button
                            className='bg-primary hover:bg-primary/90 border-primary/20 relative h-14 w-14 rounded-full border transition-all duration-200 hover:scale-105 md:h-16 md:w-16'
                            size='icon'
                            onClick={() => setIsOpen(true)}
                        >
                            <MessageSquare className='text-primary-foreground h-6 w-6 md:h-7 md:w-7' />
                            <span className='sr-only'>{t('chatbot.openChat')}</span>
                        </Button>
                    </div>
                </div>
            )}

            <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} mode='server' />
        </>
    );
}
