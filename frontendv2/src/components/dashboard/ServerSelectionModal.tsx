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
