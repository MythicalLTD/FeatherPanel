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

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useVdsFeatures } from '@/hooks/useVdsFeatures';
import { Button } from '@/components/featherui/Button';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { VdsBootOrderCard } from '@/components/vds/VdsBootOrderCard';
import { VdsHostIsoCard } from '@/components/vds/VdsHostIsoCard';
import { VdsMyIsosCard } from '@/components/vds/VdsMyIsosCard';

export default function VdsBootPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();
    const features = useVdsFeatures(Number(id));
    const [orderRefresh, setOrderRefresh] = useState(0);

    const canSettings = hasPermission('settings');
    const isQemu = instance?.vm_type === 'qemu';
    const vmId = Number(id);

    if (instanceLoading || !instance) {
        return <VdsPageLoading label={t('vds.boot.loading')} />;
    }

    if (!canSettings) {
        return (
            <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
                <p className='text-muted-foreground'>{t('vds.settings.access_denied')}</p>
                <Button variant='outline' onClick={() => router.push(`/vds/${id}`)}>
                    {t('common.back')}
                </Button>
            </div>
        );
    }

    if (!isQemu) {
        return (
            <div className='mx-auto flex w-full max-w-(--fp-content-max,80rem) flex-1 flex-col gap-6 px-0 pb-10'>
                <VdsPageHeader
                    title={t('vds.boot.title')}
                    description={t('vds.boot.lxc_unsupported')}
                    icon={HardDrive}
                />
                <p className='text-muted-foreground text-sm'>
                    <Link href={`/vds/${id}/settings`} className='text-primary underline-offset-4 hover:underline'>
                        {t('vds.boot.back_to_settings')}
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className='mx-auto flex w-full max-w-(--fp-content-max,80rem) flex-1 flex-col gap-6 px-0 pb-10'>
            <VdsPageHeader title={t('vds.boot.title')} description={t('vds.boot.description')} icon={HardDrive} />

            <VdsBootOrderCard vmId={vmId} canEdit={canSettings} refreshKey={orderRefresh} />

            <VdsHostIsoCard
                vmId={vmId}
                features={features}
                canSettings={canSettings}
                onChanged={() => setOrderRefresh((n) => n + 1)}
            />

            <VdsMyIsosCard
                vmId={vmId}
                features={features}
                canSettings={canSettings}
                onMounted={() => setOrderRefresh((n) => n + 1)}
            />
        </div>
    );
}
