/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { t } = useTranslation();

    // Keyboard shortcut (Ctrl+K or Cmd+K)
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

    // Show on server pages
    const shouldShow = pathname?.startsWith('/server/');

    if (!shouldShow) return null;

    return (
        <>
            {/* Floating Widget Button */}
            {!isOpen && (
                <div className='fixed bottom-6 right-6 z-50'>
                    <div className='relative'>
                        {/* Pulse animation ring */}
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

            {/* Chatbot Container (Headless UI Dialog) */}
            <ChatbotContainer open={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
