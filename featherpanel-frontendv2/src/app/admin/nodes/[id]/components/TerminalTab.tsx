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

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Terminal as TerminalIcon, Zap, Trash2, AlertTriangle } from 'lucide-react';
import { NodeData, CommandExecutionResponse } from '../types';
import axios from 'axios';
import { toast } from 'sonner';

interface TerminalTabProps {
    node: NodeData;
}

export function TerminalTab({ node }: TerminalTabProps) {
    const { t } = useTranslation();
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [commandInput, setCommandInput] = useState('');
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        if (!terminalRef.current) return;

        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#000000',
                foreground: '#d1d5db',
                cursor: '#ffffff',
                black: '#000000',
                red: '#e74c3c',
                green: '#2ecc71',
                yellow: '#f39c12',
                blue: '#3498db',
                magenta: '#9b59b6',
                cyan: '#1abc9c',
                white: '#ecf0f1',
                brightBlack: '#95a5a6',
                brightRed: '#ff6b6b',
                brightGreen: '#51cf66',
                brightYellow: '#ffd43b',
                brightBlue: '#74c0fc',
                brightMagenta: '#da77f2',
                brightCyan: '#3bc9db',
                brightWhite: '#ffffff',
            },
            scrollback: 10000,
            convertEol: true,
            allowTransparency: false,
            disableStdin: true,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(new WebLinksAddon());

        terminal.open(terminalRef.current);
        fitAddon.fit();

        terminalInstanceRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Welcome message
        terminal.writeln('\x1b[1;36m╔' + '═'.repeat(58) + '╗\x1b[0m');
        terminal.writeln('\x1b[1;36m║       Welcome to FeatherPanel Host Terminal            ║\x1b[0m');
        terminal.writeln('\x1b[1;36m╚' + '═'.repeat(58) + '╝\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\x1b[90mHost: ' + (node?.fqdn || 'Unknown') + '\x1b[0m');
        terminal.writeln('\x1b[90mCommands execute with system privileges - use with caution.\x1b[0m');
        terminal.writeln('');

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            terminal.dispose();
        };
    }, [node]);

    const handleExecute = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commandInput.trim() || executing || !node) return;

        const command = commandInput.trim();
        const terminal = terminalInstanceRef.current;

        if (terminal) {
            terminal.write('\r\n\x1b[1;36m❯\x1b[0m \x1b[37m' + command + '\x1b[0m\r\n');
        }

        setExecuting(true);
        setCommandInput('');

        try {
            const { data } = await axios.post<{
                success: boolean;
                data: CommandExecutionResponse;
                message?: string;
            }>(`/api/admin/nodes/${node.id}/terminal/exec`, {
                command,
                timeout_seconds: 60,
            });

            if (!data.success) {
                throw new Error(data.message || 'Command execution failed');
            }

            if (terminal) {
                const result = data.data;
                if (result.stdout) terminal.write(result.stdout);
                if (result.stderr) terminal.write('\x1b[31m' + result.stderr + '\x1b[0m');
                if (!result.stdout && !result.stderr) terminal.write('\r\n');

                const statusColor = result.exit_code === 0 ? '\x1b[32m' : '\x1b[31m';
                const statusSymbol = result.exit_code === 0 ? '✓' : '✗';
                const statusText = result.exit_code === 0 ? 'Success' : 'Failed (exit code: ' + result.exit_code + ')';
                terminal.write(
                    '\x1b[90m[' +
                        statusColor +
                        statusSymbol +
                        ' ' +
                        statusText +
                        '\x1b[90m | ' +
                        result.duration_ms +
                        'ms' +
                        (result.timed_out ? ' | ⚠ Timed out' : '') +
                        ']\x1b[0m\r\n',
                );
            }
        } catch (err: unknown) {
            let msg = 'Failed to execute command';
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            if (terminal) {
                terminal.write('\x1b[31m✗ Error: ' + msg + '\x1b[0m\r\n');
            }
            toast.error(msg);
        } finally {
            setExecuting(false);
        }
    };

    const handleClear = () => {
        if (terminalInstanceRef.current) {
            terminalInstanceRef.current.clear();
            terminalInstanceRef.current.writeln('\x1b[32mTerminal cleared\x1b[0m');
            terminalInstanceRef.current.writeln('');
        }
    };

    return (
        <Card className='border-none shadow-none bg-transparent'>
            <CardHeader className='px-0 pt-0'>
                <CardTitle className='text-lg flex items-center gap-2'>
                    <TerminalIcon className='h-5 w-5 text-primary' />
                    {t('admin.node.view.terminal.title')}
                </CardTitle>
                <CardDescription>{t('admin.node.view.terminal.description')}</CardDescription>
            </CardHeader>
            <CardContent className='px-0 space-y-4'>
                <div className='rounded-2xl border border-border bg-black overflow-hidden shadow-2xl shadow-black/50'>
                    <div ref={terminalRef} className='w-full h-[450px] bg-black p-2' />
                </div>

                <form className='flex gap-2' onSubmit={handleExecute}>
                    <Input
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        placeholder={t('admin.node.view.terminal.placeholder')}
                        className='flex-1 font-mono text-sm h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all'
                        disabled={executing}
                    />
                    <Button
                        type='submit'
                        loading={executing}
                        disabled={!commandInput.trim()}
                        className='h-12 px-6 rounded-xl'
                    >
                        {!executing && <Zap className='h-4 w-4 mr-2' />}
                        {t('admin.node.view.terminal.execute')}
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={handleClear}
                        className='h-12 w-12 p-0 rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors'
                        title={t('common.clear')}
                    >
                        <Trash2 className='h-4 w-4' />
                    </Button>
                </form>

                <div className='rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 animate-in fade-in slide-in-from-bottom-2'>
                    <div className='flex items-start gap-4'>
                        <div className='p-2 rounded-xl bg-yellow-500/10'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                        </div>
                        <div className='flex-1'>
                            <div className='text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-1'>
                                {t('admin.node.view.terminal.warning_title')}
                            </div>
                            <p className='text-xs text-yellow-600/80 dark:text-yellow-500/70 leading-relaxed'>
                                {t('admin.node.view.terminal.warning_description')}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
