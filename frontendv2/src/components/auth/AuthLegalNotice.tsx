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

import Link from 'next/link';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { getLegalLinks, type ConfiguredLink } from '@/lib/configured-links';
import { cn } from '@/lib/utils';

interface AuthLegalNoticeProps {
    variant?: 'login' | 'register';
    className?: string;
}

function LegalLink({ link }: { link: ConfiguredLink }) {
    const className =
        'text-primary hover:text-primary/80 font-medium underline-offset-4 transition-colors hover:underline';

    if (link.external) {
        return (
            <a href={link.href} target='_blank' rel='noopener noreferrer' className={className}>
                {link.label}
            </a>
        );
    }

    return (
        <Link href={link.href} className={className}>
            {link.label}
        </Link>
    );
}

export function AuthLegalNotice({ variant = 'login', className }: AuthLegalNoticeProps) {
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { terms, privacy } = getLegalLinks(settings, t);

    if (!terms && !privacy) {
        return null;
    }

    const prefix = variant === 'register' ? t('auth.legal.register_prefix') : t('auth.legal.login_prefix');

    return (
        <p className={cn('text-muted-foreground text-center text-xs leading-relaxed', className)}>
            {prefix} {terms ? <LegalLink link={terms} /> : null}
            {terms && privacy ? ` ${t('auth.legal.and')} ` : null}
            {privacy ? <LegalLink link={privacy} /> : null}.
        </p>
    );
}
