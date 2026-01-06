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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Shield, Check, Copy, RefreshCw } from 'lucide-react';

interface WingsTabProps {
    wingsConfigYaml: string;
    copyToClipboard: () => void;
    copied: boolean;
    handleResetKey: () => void;
    resetting: boolean;
}

export function WingsTab({ wingsConfigYaml, copyToClipboard, copied, handleResetKey, resetting }: WingsTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.node.wings.config_title')} icon={Shield}>
            <div className='space-y-6'>
                <p className='text-sm text-muted-foreground'>{t('admin.node.wings.config_help')}</p>
                <div className='relative group'>
                    <pre className='bg-zinc-950 p-6 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'>
                        {wingsConfigYaml}
                    </pre>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md border-white/10 hover:bg-zinc-800'
                        onClick={copyToClipboard}
                    >
                        {copied ? <Check className='h-4 w-4 mr-2 text-green-500' /> : <Copy className='h-4 w-4 mr-2' />}
                        {copied ? t('admin.node.wings.config_copied') : t('admin.node.wings.copy_config')}
                    </Button>
                </div>

                <div className='pt-6 border-t border-white/5 space-y-4'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h4 className='text-sm font-bold text-white'>{t('admin.node.wings.reset_key')}</h4>
                            <p className='text-xs text-muted-foreground mt-1'>
                                Generating a new master daemon key will invalidate the old one. You will need to update
                                your Wings configuration manually.
                            </p>
                        </div>
                        <Button
                            type='button'
                            variant='destructive'
                            onClick={handleResetKey}
                            loading={resetting}
                            className='h-11 px-6 shadow-lg shadow-red-500/10'
                        >
                            <RefreshCw className='h-4 w-4 mr-2' />
                            {t('admin.node.wings.reset_key')}
                        </Button>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
