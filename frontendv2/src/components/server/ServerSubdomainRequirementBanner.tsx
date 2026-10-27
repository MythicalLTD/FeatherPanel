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
import { Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useServer } from '@/contexts/ServerContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';

export function ServerSubdomainRequirementBanner() {
    const { t } = useTranslation();
    const { server } = useServer();

    if (!server?.subdomain_requirement?.enforced) {
        return null;
    }

    const createHref = `/server/${server.uuidShort}/subdomains/new`;

    return (
        <Card className='mb-4 border-2 border-amber-500/20 bg-amber-500/10'>
            <CardContent className='p-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
                    <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10'>
                        <Globe className='h-6 w-6 text-amber-600 dark:text-amber-400' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='font-semibold text-amber-600 dark:text-amber-400'>
                            {t('serverSubdomains.requirementTitle')}
                        </p>
                        <p className='text-muted-foreground mt-1 text-sm'>
                            {t('serverSubdomains.requirementDescription')}
                        </p>
                        <Button asChild size='sm' className='mt-3'>
                            <Link href={createHref}>{t('serverSubdomains.createButton')}</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
