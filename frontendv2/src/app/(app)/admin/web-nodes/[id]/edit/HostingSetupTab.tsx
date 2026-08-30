/*
This file is part of FeatherPanel.
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

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { WebSpaceInfrastructurePanel } from '@/components/webspace/WebSpaceInfrastructurePanel';
import { WebSpaceHostingMaturityPanel } from '@/components/webspace/WebSpaceHostingMaturityPanel';

interface HostingSetupTabProps {
    nodeId: string;
}

export function HostingSetupTab({ nodeId }: HostingSetupTabProps) {
    const { t } = useTranslation();
    const numericId = Number(nodeId);

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.hostingSetup.title')}
                description={t('admin.webNodes.hostingSetup.description')}
            >
                <div className='flex flex-wrap gap-2'>
                    <Button variant='outline' size='sm' asChild>
                        <Link href={`/admin/web-nodes/${nodeId}/edit?tab=quilld`}>
                            {t('admin.webNodes.hostingSetup.openQuilld')}
                        </Link>
                    </Button>
                    <Button variant='outline' size='sm' asChild>
                        <Link href={`/admin/web-nodes/${nodeId}/edit?tab=packages`}>
                            {t('admin.webNodes.packages.tab')}
                        </Link>
                    </Button>
                    <Button variant='outline' size='sm' asChild>
                        <Link href={`/admin/web-nodes/${nodeId}/edit?tab=status`}>
                            {t('admin.webNodes.status.tab')}
                        </Link>
                    </Button>
                </div>
            </PageCard>

            <WebSpaceHostingMaturityPanel webNodeId={numericId > 0 ? numericId : undefined} />

            <WebSpaceInfrastructurePanel webNodeId={numericId > 0 ? numericId : undefined} ssl variant='full' />
        </div>
    );
}
