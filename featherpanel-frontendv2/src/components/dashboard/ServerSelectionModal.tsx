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

import { useState, useEffect } from 'react';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { Input } from '@/components/ui/input';
import { Search, Server as ServerIcon, Check, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';

interface Server {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
}

interface ServerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (server: Server) => void;
    servers: Server[];
    selectedServerId?: string | number;
    onSearch?: (query: string) => void;
    loading?: boolean;
}

export function ServerSelectionModal({
    isOpen,
    onClose,
    onSelect,
    servers,
    selectedServerId,
    onSearch,
    loading = false,
}: ServerSelectionModalProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch) {
                onSearch(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]); // Only depend on searchQuery, not onSearch

    return (
        <HeadlessModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('tickets.selectServerTitle')}
            description={t('tickets.selectServerDescription')}
        >
            <div className='space-y-4'>
                <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                        placeholder={t('tickets.searchServers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-9 bg-secondary/20'
                    />
                </div>

                <div className='max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-1 relative min-h-[100px]'>
                    {loading ? (
                        <div className='absolute inset-0 flex items-center justify-center bg-background/50 z-10'>
                            <Loader2 className='h-6 w-6 animate-spin text-primary' />
                        </div>
                    ) : null}

                    {servers.length === 0 && !loading ? (
                        <div className='text-center py-8 text-muted-foreground text-sm'>
                            {t('tickets.noServersFound')}
                        </div>
                    ) : (
                        servers.map((server) => (
                            <button
                                key={server.id}
                                onClick={() => {
                                    onSelect(server);
                                    onClose();
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group
                                    ${
                                        Number(selectedServerId) === server.id
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border/50 hover:bg-muted/50 hover:border-border'
                                    }
                                `}
                            >
                                <div className='flex items-center gap-3 min-w-0'>
                                    <div
                                        className={`p-2 rounded-lg ${Number(selectedServerId) === server.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'}`}
                                    >
                                        <ServerIcon className='h-4 w-4' />
                                    </div>
                                    <div className='min-w-0'>
                                        <p
                                            className={`text-sm font-medium truncate ${Number(selectedServerId) === server.id ? 'text-primary' : 'text-foreground'}`}
                                        >
                                            {server.name}
                                        </p>
                                        <p className='text-xs text-muted-foreground truncate'>
                                            {server.uuidShort || server.uuid}
                                        </p>
                                    </div>
                                </div>
                                {Number(selectedServerId) === server.id && (
                                    <Check className='h-4 w-4 text-primary shrink-0' />
                                )}
                            </button>
                        ))
                    )}
                </div>

                <div className='flex justify-end pt-2'>
                    <Button variant='ghost' onClick={onClose} size='sm'>
                        {t('common.cancel')}
                    </Button>
                </div>
            </div>
        </HeadlessModal>
    );
}
