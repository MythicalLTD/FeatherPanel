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

import React from 'react';
import { Wifi, Cpu, Clock, Activity, HardDrive, Database, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatMib, formatCpu as formatCpuGlobal, cn, formatFileSize } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ServerInfoCardsProps {
    serverIp: string;
    serverPort: number;
    cpuLimit: number;
    memoryLimit: number;
    diskLimit: number;
    wingsUptime: string;
    ping: number | null;
    // Current usage
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    networkRx?: number;
    networkTx?: number;
    className?: string;
}

export default function ServerInfoCards({
    serverIp,
    serverPort,
    cpuLimit,
    memoryLimit,
    diskLimit,
    wingsUptime,
    ping,
    cpuUsage = 0,
    memoryUsage = 0,
    diskUsage = 0,
    networkRx = 0,
    networkTx = 0,
    className,
}: ServerInfoCardsProps) {
    const { t } = useTranslation();

    const formatCpu = (cpu: number): string => {
        if (cpu === 0) return t('servers.console.info_cards.unlimited');
        return formatCpuGlobal(cpu);
    };

    const formatMemory = (memory: number): string => {
        if (memory === 0) return t('servers.console.info_cards.unlimited');
        return formatMib(memory);
    };

    const formatDisk = (disk: number): string => {
        if (disk === 0) return t('servers.console.info_cards.unlimited');
        return formatMib(disk);
    };

    const handleCopy = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                toast.success(t('servers.console.info_cards.copied'));
            } else {
                // Fallback for non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    toast.success(t('servers.console.info_cards.copied'));
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    toast.error(t('servers.console.info_cards.copy_error'));
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error(t('servers.console.info_cards.copy_error'));
        }
    };

    return (
        <div className={cn('grid gap-6', className)}>
            {/* Network Widget */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
                <h3 className='text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2'>
                    <Wifi className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title') || 'Network'}
                </h3>

                <div className='space-y-4'>
                    <div>
                        <p className='text-xs text-muted-foreground mb-1'>{t('servers.console.info_cards.address')}</p>
                        <div className='flex items-center gap-2'>
                            <code className='bg-muted px-2 py-1 rounded text-sm font-mono flex-1 truncate'>
                                {serverIp && serverPort ? `${serverIp}:${serverPort}` : 'N/A'}
                            </code>
                            <button
                                onClick={() => handleCopy(serverIp && serverPort ? `${serverIp}:${serverPort}` : 'N/A')}
                                className='p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground'
                                title={t('servers.console.info_cards.copy')}
                            >
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    width='14'
                                    height='14'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                >
                                    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                                    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4 pt-2'>
                        <div>
                            <p className='text-xs text-muted-foreground mb-1 flex items-center gap-1'>
                                <Clock className='h-3 w-3' />
                                {t('servers.console.info_cards.uptime')}
                            </p>
                            <p className='font-medium text-sm'>{wingsUptime || 'N/A'}</p>
                        </div>
                        <div>
                            <p className='text-xs text-muted-foreground mb-1 flex items-center gap-1'>
                                <Activity className='h-3 w-3' />
                                {t('servers.console.info_cards.ping')}
                            </p>
                            <p className='font-medium text-sm'>{ping !== null ? `${ping}ms` : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resources Widget */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
                <h3 className='text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2'>
                    <Activity className='h-4 w-4' />
                    {t('servers.console.info_cards.resources_title')}
                </h3>

                <div className='space-y-5'>
                    {/* CPU */}
                    <div>
                        <div className='flex justify-between text-sm mb-1.5'>
                            <span className='text-muted-foreground flex gap-2 items-center'>
                                <Cpu className='h-3 w-3' />
                                {t('servers.cpu')}
                            </span>
                            <span className='font-medium'>{cpuUsage.toFixed(1)}%</span>
                        </div>
                        <Progress value={cpuLimit > 0 ? (cpuUsage / cpuLimit) * 100 : 0} className='h-1.5' />
                        <p className='text-[10px] text-muted-foreground mt-1 text-right'>
                            {t('servers.console.info_cards.limit', { limit: formatCpu(cpuLimit) })}
                        </p>
                    </div>

                    {/* Memory */}
                    <div>
                        <div className='flex justify-between text-sm mb-1.5'>
                            <span className='text-muted-foreground flex gap-2 items-center'>
                                <Database className='h-3 w-3' />
                                {t('servers.memory')}
                            </span>
                            <span className='font-medium'>{formatMib(memoryUsage)}</span>
                        </div>
                        <Progress value={memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0} className='h-1.5' />
                        <p className='text-[10px] text-muted-foreground mt-1 text-right'>
                            {t('servers.console.info_cards.limit', { limit: formatMemory(memoryLimit) })}
                        </p>
                    </div>

                    {/* Disk */}
                    <div>
                        <div className='flex justify-between text-sm mb-1.5'>
                            <span className='text-muted-foreground flex gap-2 items-center'>
                                <HardDrive className='h-3 w-3' />
                                {t('servers.disk')}
                            </span>
                            <span className='font-medium'>{formatMib(diskUsage)}</span>
                        </div>
                        <Progress value={diskLimit > 0 ? (diskUsage / diskLimit) * 100 : 0} className='h-1.5' />
                        <p className='text-[10px] text-muted-foreground mt-1 text-right'>
                            {t('servers.console.info_cards.limit', { limit: formatDisk(diskLimit) })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Networking Widget */}
            <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
                <h3 className='text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2'>
                    <Activity className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title')}
                </h3>

                <div className='space-y-4'>
                    {/* Inbound */}
                    <div>
                        <div className='flex justify-between text-sm mb-1.5 align-middle'>
                            <span className='text-muted-foreground flex gap-2 items-center'>
                                <ArrowDown className='h-3 w-3' />
                                {t('servers.console.info_cards.network_rx')}
                            </span>
                            <span className='font-medium'>{formatFileSize(networkRx)}/s</span>
                        </div>
                    </div>

                    {/* Outbound */}
                    <div>
                        <div className='flex justify-between text-sm mb-1.5 align-middle'>
                            <span className='text-muted-foreground flex gap-2 items-center'>
                                <ArrowUp className='h-3 w-3' />
                                {t('servers.console.info_cards.network_tx')}
                            </span>
                            <span className='font-medium'>{formatFileSize(networkTx)}/s</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
