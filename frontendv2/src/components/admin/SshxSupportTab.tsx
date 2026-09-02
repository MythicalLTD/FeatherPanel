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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { SupportCommandBlock } from '@/components/admin/SupportCommandBlock';
import { copyToClipboard } from '@/lib/utils';
import { AlertTriangle, ExternalLink, ShieldAlert, Terminal } from 'lucide-react';

const SSHX_INSTALL_COMMAND = 'curl -sSf https://sshx.io/get | sh';
const SSHX_RUN_COMMAND = 'sshx';

const SSHX_EXAMPLE_OUTPUT = `sshx v0.4.1

  ➜  Link:  https://sshx.io/s/EpWJw1AGeF#gYXOXzw0bmJRyD
  ➜  Shell: /bin/bash`;

export function SshxSupportTab() {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <div
                className='flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300'
                role='alert'
            >
                <ShieldAlert className='mt-0.5 h-5 w-5 shrink-0' aria-hidden />
                <div className='space-y-2 text-sm leading-relaxed'>
                    <p className='font-semibold'>{t('admin.support.sshx.warning_title')}</p>
                    <p>{t('admin.support.sshx.warning_body')}</p>
                    <ul className='list-disc space-y-1 pl-5'>
                        <li>{t('admin.support.sshx.warning_only_team')}</li>
                        <li>{t('admin.support.sshx.warning_trusted')}</li>
                        <li>{t('admin.support.sshx.warning_self')}</li>
                    </ul>
                </div>
            </div>

            <PageCard
                title={t('admin.support.sshx.title')}
                description={t('admin.support.sshx.description')}
                icon={Terminal}
            >
                <div className='space-y-8'>
                    <div className='space-y-2'>
                        <p className='text-foreground text-xs font-semibold'>{t('admin.support.sshx.step_install')}</p>
                        <p className='text-muted-foreground text-sm'>{t('admin.support.sshx.step_install_help')}</p>
                        <SupportCommandBlock
                            command={SSHX_INSTALL_COMMAND}
                            copyLabel={t('admin.support.sshx.copy_command')}
                            onCopy={() => copyToClipboard(SSHX_INSTALL_COMMAND, t)}
                        />
                    </div>

                    <div className='space-y-2'>
                        <p className='text-foreground text-xs font-semibold'>{t('admin.support.sshx.step_run')}</p>
                        <p className='text-muted-foreground text-sm'>{t('admin.support.sshx.step_run_help')}</p>
                        <SupportCommandBlock
                            command={SSHX_RUN_COMMAND}
                            copyLabel={t('admin.support.sshx.copy_command')}
                            onCopy={() => copyToClipboard(SSHX_RUN_COMMAND, t)}
                        />
                    </div>

                    <div className='space-y-3 border-t border-white/5 pt-6'>
                        <p className='text-foreground text-xs font-semibold'>{t('admin.support.sshx.output_title')}</p>
                        <p className='text-muted-foreground text-sm'>{t('admin.support.sshx.output_help')}</p>
                        <pre className='bg-muted/30 border-border/50 overflow-x-auto rounded-2xl border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-300'>
                            {SSHX_EXAMPLE_OUTPUT}
                        </pre>
                        <p className='text-muted-foreground text-xs'>{t('admin.support.sshx.output_share')}</p>
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('admin.support.sshx.learn_more_title')} icon={AlertTriangle} variant='danger'>
                <div className='space-y-3'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.support.sshx.learn_more_body')}
                    </p>
                    <a
                        href='https://sshx.io'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline'
                    >
                        {t('admin.support.sshx.learn_more_link')}
                        <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                </div>
            </PageCard>
        </div>
    );
}
