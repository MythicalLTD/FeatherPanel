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

import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Check, Globe } from 'lucide-react';

export default function LanguageSelector() {
    const { locale, availableLanguages, setLocale, t } = useTranslation();
    const [mounted] = useState(true);

    if (!mounted) {
        return <div className='border-border/50 bg-background/90 h-10 w-10 rounded-full border backdrop-blur-md' />;
    }

    return (
        <Menu as='div' className='relative'>
            <MenuButton className='border-border/50 bg-background/90 hover:bg-background flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 hover:scale-110 hover:shadow-lg'>
                <Globe className='h-4 w-4' />
            </MenuButton>

            <Transition
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
            >
                <MenuItems className='bg-card border-border/50 ring-opacity-5 absolute right-0 mt-2 w-48 origin-top-right rounded-xl border p-2 shadow-lg ring-1 ring-black backdrop-blur-xl focus:outline-none'>
                    <div className='text-foreground border-border/50 mb-2 border-b px-3 py-2 text-sm font-semibold'>
                        {t('appearance.language')}
                    </div>
                    {availableLanguages.map((language) => (
                        <MenuItem key={language.code}>
                            {({ focus }) => (
                                <button
                                    onClick={() => setLocale(language.code)}
                                    className={`${
                                        focus ? 'bg-accent' : ''
                                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                >
                                    <span className='flex-1 text-left'>
                                        <span className='font-medium'>{language.nativeName}</span>
                                        {language.name !== language.nativeName && (
                                            <span className='text-muted-foreground ml-1 text-xs'>
                                                ({language.name})
                                            </span>
                                        )}
                                    </span>
                                    {locale === language.code && <Check className='text-primary h-4 w-4' />}
                                </button>
                            )}
                        </MenuItem>
                    ))}
                </MenuItems>
            </Transition>
        </Menu>
    );
}
