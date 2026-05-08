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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch) {
                onSearch(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    return (
        <HeadlessModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('tickets.selectServerTitle')}
            description={t('tickets.selectServerDescription')}
        >
            <div className='space-y-4'>
                <div className='relative'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        placeholder={t('tickets.searchServers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='bg-secondary/20 pl-9'
                    />
                </div>

                <div className='custom-scrollbar relative max-h-[300px] min-h-[100px] space-y-2 overflow-y-auto pr-1'>
                    {loading ? (
                        <div className='bg-background/50 absolute inset-0 z-10 flex items-center justify-center'>
                            <Loader2 className='text-primary h-6 w-6 animate-spin' />
                        </div>
                    ) : null}

                    {servers.length === 0 && !loading ? (
                        <div className='text-muted-foreground py-8 text-center text-sm'>
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
                                className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                    Number(selectedServerId) === server.id
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border/50 hover:bg-muted/50 hover:border-border'
                                } `}
                            >
                                <div className='flex min-w-0 items-center gap-3'>
                                    <div
                                        className={`rounded-lg p-2 ${Number(selectedServerId) === server.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'}`}
                                    >
                                        <ServerIcon className='h-4 w-4' />
                                    </div>
                                    <div className='min-w-0'>
                                        <p
                                            className={`truncate text-sm font-medium ${Number(selectedServerId) === server.id ? 'text-primary' : 'text-foreground'}`}
                                        >
                                            {server.name}
                                        </p>
                                        <p className='text-muted-foreground truncate text-xs'>
                                            {server.uuidShort || server.uuid}
                                        </p>
                                    </div>
                                </div>
                                {Number(selectedServerId) === server.id && (
                                    <Check className='text-primary h-4 w-4 shrink-0' />
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
