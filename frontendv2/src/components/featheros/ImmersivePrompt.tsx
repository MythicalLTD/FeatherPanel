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

import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { keyboardLockSupported, toggleImmersiveWithFeedback, useImmersiveState } from './immersive';

const DISMISS_KEY = 'featheros:immersive-prompt-dismissed';

export function ImmersivePrompt({ ready }: { ready: boolean }) {
    const { t } = useTranslation();
    const state = useImmersiveState();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!ready || !keyboardLockSupported()) return;
        if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
        const timer = window.setTimeout(() => setVisible(true), 1200);
        return () => window.clearTimeout(timer);
    }, [ready]);

    if (!visible || state !== 'off') return null;

    const dismiss = () => {
        window.localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
    };

    return (
        <div className='fos-immersive-prompt' role='dialog' aria-label={t('featheros.immersive.title')}>
            <div className='fos-immersive-prompt-icon'>
                <Keyboard className='h-5 w-5' />
            </div>
            <div className='fos-immersive-prompt-copy'>
                <strong>{t('featheros.immersive.prompt_title')}</strong>
                <span>{t('featheros.immersive.prompt_body')}</span>
            </div>
            <button
                type='button'
                className='fos-immersive-prompt-go'
                onClick={() => {
                    setVisible(false);
                    toggleImmersiveWithFeedback(t);
                }}
            >
                {t('featheros.immersive.enter')}
            </button>
            <button
                type='button'
                className='fos-immersive-prompt-close'
                onClick={dismiss}
                aria-label={t('featheros.common.close')}
                title={t('featheros.immersive.dont_ask')}
            >
                <X className='h-3.5 w-3.5' />
            </button>
        </div>
    );
}
