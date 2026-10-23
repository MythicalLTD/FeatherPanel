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

import * as React from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';

interface Preview {
    server: { name: string; uuidShort: string };
    invited_by: string | null;
    permissions: string[];
    expires_at: string;
}

export default function SubuserInvitePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { token } = useParams() as { token: string };
    const [preview, setPreview] = React.useState<Preview | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [accepting, setAccepting] = React.useState(false);

    React.useEffect(() => {
        axios
            .get(`/api/user/subuser-invites/${token}`)
            .then(({ data }) => setPreview(data.data))
            .catch((err) => setError(getApiErrorMessage(err, t, 'serverSubusers.invites.invalid')));
    }, [token, t]);

    const accept = async () => {
        setAccepting(true);
        try {
            const { data } = await axios.post(`/api/user/subuser-invites/${token}`);
            toast.success(t('serverSubusers.invites.joined'));
            router.push(`/server/${data.data.server.uuidShort}`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'serverSubusers.invites.invalid'));
            setAccepting(false);
        }
    };

    return (
        <div className='mx-auto max-w-lg py-12'>
            <div className='fp-surface space-y-5 rounded-2xl border p-6'>
                <div className='flex items-center gap-3'>
                    <UserPlus className='text-primary h-6 w-6' />
                    <h1 className='text-xl font-semibold'>{t('serverSubusers.invites.acceptTitle')}</h1>
                </div>
                {error ? (
                    <p className='text-destructive text-sm'>{error}</p>
                ) : !preview ? (
                    <Loader2 className='text-primary h-6 w-6 animate-spin' />
                ) : (
                    <>
                        <p className='text-sm'>
                            {t('serverSubusers.invites.acceptBody', {
                                server: preview.server.name,
                                user: preview.invited_by ?? '?',
                            })}
                        </p>
                        <div className='flex flex-wrap gap-1'>
                            {preview.permissions.map((p) => (
                                <span key={p} className='bg-secondary/40 rounded-md px-2 py-0.5 font-mono text-[11px]'>
                                    {p}
                                </span>
                            ))}
                        </div>
                        <p className='text-muted-foreground text-xs'>
                            {t('serverSubusers.invites.expires', {
                                date: new Date(preview.expires_at).toLocaleString(),
                            })}
                        </p>
                        <Button onClick={accept} disabled={accepting} className='w-full'>
                            {accepting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {t('serverSubusers.invites.accept')}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
