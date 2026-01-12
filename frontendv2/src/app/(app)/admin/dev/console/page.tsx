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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { toast } from 'sonner';
import { Terminal, Lock, Loader2, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

interface CommandResult {
    stdout: string;
    stderr: string;
    return_code: number;
    execution_time: number;
    command: string;
    working_directory: string;
    timestamp: string;
}

interface SystemInfo {
    os: string;
    php_version: string;
    server_software: string;
    server_name: string;
    user: string;
    home: string;
    working_directory: string;
    disk_usage: {
        free: number;
        total: number;
        used: number;
        percentage: number;
    };
    memory_usage: Record<string, number>;
    uptime: string;
}

interface TerminalLine {
    id: string;
    type: 'command' | 'output' | 'error' | 'info';
    content: string;
    timestamp: string;
    command?: string;
    returnCode?: number;
    executionTime?: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default function ConsolePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDeveloperModeEnabled, loading: developerModeLoading } = useDeveloperMode();
    const [commandInput, setCommandInput] = useState('');
    const [currentDirectory, setCurrentDirectory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [showSystemInfo, setShowSystemInfo] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const getPrompt = useCallback((): string => {
        const user = systemInfo?.user || 'www-data';
        const dir = currentDirectory.replace(/^.*\//, '~');
        return `${user}@featherpanel:${dir}$`;
    }, [systemInfo, currentDirectory]);

    const addTerminalLine = useCallback(
        (
            type: TerminalLine['type'],
            content: string,
            command?: string,
            returnCode?: number,
            executionTime?: number,
        ) => {
            const line: TerminalLine = {
                id: Date.now() + '-' + Math.random(),
                type,
                content,
                timestamp: new Date().toLocaleTimeString(),
                command,
                returnCode,
                executionTime,
            };
            setTerminalLines((prev) => [...prev, line]);
        },
        [],
    );

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
        }, 0);
    }, []);

    const fetchSystemInfo = useCallback(async () => {
        if (isDeveloperModeEnabled !== true) return;

        try {
            const response = await axios.get<{ success: boolean; data: SystemInfo; message?: string }>(
                '/api/admin/console/system-info',
            );
            if (response.data.success) {
                setSystemInfo(response.data.data);
                setCurrentDirectory(response.data.data.working_directory);
                addTerminalLine('info', `Connected to ${response.data.data.server_name} (${response.data.data.os})`);
                addTerminalLine('info', `PHP ${response.data.data.php_version} | User: ${response.data.data.user}`);
            } else {
                toast.error(response.data.message || t('admin.dev.console.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Failed to fetch system info:', error);
            toast.error(t('admin.dev.console.messages.fetch_failed'));
        }
    }, [isDeveloperModeEnabled, addTerminalLine, t]);

    const executeCommand = useCallback(async () => {
        if (!commandInput.trim() || isDeveloperModeEnabled !== true) return;

        const command = commandInput.trim();
        setCommandHistory((prev) => {
            const newHistory = [command, ...prev].slice(0, 100);
            return newHistory;
        });
        setHistoryIndex(-1);

        addTerminalLine('command', `${getPrompt()} ${command}`);
        setCommandInput('');
        setIsLoading(true);

        try {
            const response = await axios.post<{ success: boolean; data: CommandResult; message?: string }>(
                '/api/admin/console/execute',
                new URLSearchParams({
                    command: command,
                    cwd: currentDirectory,
                }),
            );

            if (response.data.success) {
                const result = response.data.data;

                // Update current directory if cd command was used
                if (command.startsWith('cd ')) {
                    const newDir = command.substring(3).trim();
                    if (newDir === '~' || newDir === '') {
                        setCurrentDirectory(systemInfo?.home || '/var/www');
                    } else if (newDir.startsWith('/')) {
                        setCurrentDirectory(newDir);
                    } else {
                        setCurrentDirectory((prev) => prev + '/' + newDir);
                    }
                }

                // Display output
                if (result.stdout) {
                    addTerminalLine('output', result.stdout);
                }
                if (result.stderr) {
                    addTerminalLine('error', result.stderr);
                }

                // Show command result info
                addTerminalLine('info', `[${result.return_code}] ${result.execution_time}ms`);

                if (result.return_code !== 0 && !result.stderr) {
                    toast.warning(t('admin.dev.console.messages.command_failed', { code: result.return_code }));
                }
            } else {
                addTerminalLine('error', `Error: ${response.data.message || 'Unknown error'}`);
                toast.error(response.data.message || t('admin.dev.console.messages.execute_failed'));
            }
        } catch (error) {
            console.error('Failed to execute command:', error);
            addTerminalLine('error', `Network error: ${String(error)}`);
            toast.error(t('admin.dev.console.messages.execute_failed'));
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    }, [commandInput, isDeveloperModeEnabled, getPrompt, currentDirectory, systemInfo, addTerminalLine, scrollToBottom, t]);

    const clearTerminal = useCallback(() => {
        setTerminalLines([]);
        addTerminalLine('info', 'Terminal cleared');
    }, [addTerminalLine]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHistoryIndex((prev) => {
                    if (prev < commandHistory.length - 1) {
                        const newIndex = prev + 1;
                        setCommandInput(commandHistory[newIndex] || '');
                        return newIndex;
                    }
                    return prev;
                });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHistoryIndex((prev) => {
                    if (prev > 0) {
                        const newIndex = prev - 1;
                        setCommandInput(commandHistory[newIndex] || '');
                        return newIndex;
                    } else if (prev === 0) {
                        setCommandInput('');
                        return -1;
                    }
                    return prev;
                });
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                clearTerminal();
            }
        },
        [executeCommand, commandHistory, clearTerminal],
    );

    useEffect(() => {
        if (isDeveloperModeEnabled === true) {
            fetchSystemInfo();
            addTerminalLine('info', 'FeatherPanel Console - Type "help" for available commands');
        }
    }, [isDeveloperModeEnabled, fetchSystemInfo, addTerminalLine]);

    // Developer Mode Check
    if (developerModeLoading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    if (isDeveloperModeEnabled === false) {
        return (
            <div className='space-y-6'>
                <EmptyState
                    title={t('admin.dev.developerModeRequired') || 'Developer Mode Required'}
                    description={
                        t('admin.dev.developerModeDescription') ||
                        'Developer mode must be enabled in settings to access developer tools.'
                    }
                    icon={Lock}
                    action={
                        <Button variant='outline' onClick={() => router.push('/admin/settings')}>
                            {t('admin.dev.goToSettings') || 'Go to Settings'}
                        </Button>
                    }
                />
            </div>
        );
    }

    const quickCommands = [
        'ls -la',
        'pwd',
        'whoami',
        'date',
        'df -h',
        'free -h',
        'ps aux',
        'top',
        'git status',
        'composer --version',
        'npm --version',
        'php --version',
    ];

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.dev.console.title') || 'Console'}
                description={t('admin.dev.console.description') || 'Execute commands on the server'}
                icon={Terminal}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => setShowSystemInfo(!showSystemInfo)}>
                            {showSystemInfo ? (
                                <>
                                    <EyeOff className='w-4 h-4 mr-2' />
                                    {t('admin.dev.console.hide_system_info') || 'Hide System Info'}
                                </>
                            ) : (
                                <>
                                    <Eye className='w-4 h-4 mr-2' />
                                    {t('admin.dev.console.show_system_info') || 'Show System Info'}
                                </>
                            )}
                        </Button>
                        <Button variant='outline' onClick={clearTerminal}>
                            <Trash2 className='w-4 h-4 mr-2' />
                            {t('admin.dev.console.clear_terminal') || 'Clear Terminal'}
                        </Button>
                        <Button variant='outline' onClick={fetchSystemInfo} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            {t('admin.dev.console.refresh') || 'Refresh'}
                        </Button>
                    </div>
                }
            />

            {/* System Info Panel */}
            {showSystemInfo && systemInfo && (
                <PageCard title={t('admin.dev.console.system_info') || 'System Information'}>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        <div>
                            <h3 className='font-semibold mb-2'>{t('admin.dev.console.system') || 'System'}</h3>
                            <div className='text-sm space-y-1'>
                                <div>
                                    <span className='text-muted-foreground'>OS:</span> {systemInfo.os}
                                </div>
                                <div>
                                    <span className='text-muted-foreground'>Server:</span> {systemInfo.server_software}
                                </div>
                                <div>
                                    <span className='text-muted-foreground'>User:</span> {systemInfo.user}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className='font-semibold mb-2'>{t('admin.dev.console.runtime') || 'Runtime'}</h3>
                            <div className='text-sm space-y-1'>
                                <div>
                                    <span className='text-muted-foreground'>PHP:</span> {systemInfo.php_version}
                                </div>
                                <div>
                                    <span className='text-muted-foreground'>Uptime:</span> {systemInfo.uptime}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className='font-semibold mb-2'>{t('admin.dev.console.disk_usage') || 'Disk Usage'}</h3>
                            <div className='text-sm space-y-1'>
                                <div>
                                    <span className='text-muted-foreground'>Used:</span> {formatBytes(systemInfo.disk_usage.used)}
                                </div>
                                <div>
                                    <span className='text-muted-foreground'>Free:</span> {formatBytes(systemInfo.disk_usage.free)}
                                </div>
                                <div>
                                    <span className='text-muted-foreground'>Usage:</span> {systemInfo.disk_usage.percentage}%
                                </div>
                            </div>
                        </div>
                    </div>
                </PageCard>
            )}

            {/* Terminal */}
            <PageCard title={t('admin.dev.console.terminal') || 'Terminal'}>
                <div className='space-y-4'>
                    <p className='text-xs text-muted-foreground'>
                        {t('admin.dev.console.terminal_help') ||
                            'Use Arrow Up/Down for command history, Ctrl+L to clear'}
                    </p>

                    {/* Terminal Output */}
                    <div
                        ref={terminalRef}
                        className='h-96 bg-black text-green-400 p-4 overflow-auto font-mono text-sm rounded-xl border border-border/50'
                        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace" }}
                    >
                        {terminalLines.map((line) => (
                            <div key={line.id} className='mb-1'>
                                {line.type === 'command' && (
                                    <span className='text-green-400 font-medium'>{line.content}</span>
                                )}
                                {line.type === 'error' && <span className='text-red-400'>{line.content}</span>}
                                {line.type === 'info' && (
                                    <span className='text-blue-400'>
                                        [{line.timestamp}] {line.content}
                                    </span>
                                )}
                                {line.type === 'output' && <span className='text-gray-300'>{line.content}</span>}
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className='flex items-center gap-2 text-yellow-400'>
                                <div className='animate-pulse'>●</div>
                                <span>{t('admin.dev.console.executing') || 'Executing command...'}</span>
                            </div>
                        )}
                    </div>

                    {/* Command Input */}
                    <div className='p-4 border border-border/50 bg-muted/30 rounded-xl'>
                        <div className='flex items-center gap-2'>
                            <span className='text-green-400 font-mono text-sm shrink-0'>{getPrompt()}</span>
                            <Input
                                ref={inputRef}
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                className='bg-transparent border-none text-green-400 font-mono text-sm focus:ring-0 focus:border-none flex-1'
                                placeholder={t('admin.dev.console.enter_command') || 'Enter command...'}
                                disabled={isLoading}
                                autoComplete='off'
                                spellCheck={false}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </div>
            </PageCard>

            {/* Quick Commands */}
            <PageCard title={t('admin.dev.console.quick_commands') || 'Quick Commands'}>
                <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'>
                    {quickCommands.map((cmd) => (
                        <Button
                            key={cmd}
                            variant='outline'
                            size='sm'
                            className='text-xs'
                            disabled={isLoading}
                            onClick={() => {
                                setCommandInput(cmd);
                                executeCommand();
                            }}
                        >
                            {cmd}
                        </Button>
                    ))}
                </div>
            </PageCard>
        </div>
    );
}
