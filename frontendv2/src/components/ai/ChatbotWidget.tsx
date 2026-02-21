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
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatbotContainer from './ChatbotContainer';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';

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
    const shouldShow = pathname?.startsWith('/server/') && chatbotEnabled;

    if (!shouldShow) return null;

    return (
        <>
            {!isOpen && (
                <div className='fixed bottom-6 right-6 z-50'>
                    <div className='relative'>
                        <div className='absolute inset-0 rounded-full bg-primary/20 animate-ping' />
                        <div className='absolute inset-0 rounded-full bg-primary/10 animate-pulse' />

                        <Button
                            className='relative h-14 w-14 md:h-16 md:w-16 rounded-full shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-300 bg-linear-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-2 border-primary/20'
                            size='icon'
                            onClick={() => setIsOpen(true)}
                        >
                            <MessageSquare className='h-6 w-6 md:h-7 md:w-7 text-primary-foreground' />
                            <span className='sr-only'>{t('chatbot.openChat')}</span>
                        </Button>
                    </div>
                </div>
            )}

            <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
