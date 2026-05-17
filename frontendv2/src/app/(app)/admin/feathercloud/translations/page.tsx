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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Languages, Search, Download, Globe, Star, Users, Calendar, FileText } from 'lucide-react';

interface CommunityTranslation {
    id: string;
    lang: string;
    name: string;
    nativeName: string;
    author: string;
    version: string;
    downloads: number;
    rating: number;
    updatedAt: string;
    description?: string;
    verified?: boolean;
}

export default function CommunityTranslationsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [translations, setTranslations] = useState<CommunityTranslation[]>([]);
    const [filteredTranslations, setFilteredTranslations] = useState<CommunityTranslation[]>([]);
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-translations');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchTranslations = async () => {
            setLoading(true);
            try {
                const mockTranslations: CommunityTranslation[] = [];

                setTranslations(mockTranslations);
                setFilteredTranslations(mockTranslations);
            } catch (error) {
                console.error('Error fetching community translations:', error);
                toast.error(t('admin.feathercloud.translations.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchTranslations();
    }, [t]);

    useEffect(() => {
        if (!debouncedSearchQuery) {
            setFilteredTranslations(translations);
            return;
        }

        const query = debouncedSearchQuery.toLowerCase();
        const filtered = translations.filter(
            (translation) =>
                translation.name.toLowerCase().includes(query) ||
                translation.nativeName.toLowerCase().includes(query) ||
                translation.lang.toLowerCase().includes(query) ||
                translation.author.toLowerCase().includes(query) ||
                translation.description?.toLowerCase().includes(query),
        );
        setFilteredTranslations(filtered);
    }, [debouncedSearchQuery, translations]);

    const handleDownload = async () => {
        try {
            toast.info(t('admin.feathercloud.translations.download_coming_soon'));
        } catch (error) {
            console.error('Error downloading translation:', error);
            toast.error(t('admin.feathercloud.translations.download_failed'));
        }
    };

    const handleInstall = async () => {
        try {
            toast.info(t('admin.marketplace.index.translations.install_coming_soon'));
        } catch (error) {
            console.error('Error installing translation:', error);
            toast.error(t('admin.marketplace.index.translations.install_failed'));
        }
    };

    return (
        <div className='space-y-8'>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-translations', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.index.translations.title')}
                description={t('admin.marketplace.index.translations.description')}
                icon={Languages}
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-translations', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-translations', 'before-content')} />

            <div className='border-border/50 bg-card/50 rounded-3xl border p-6 backdrop-blur-3xl'>
                <div className='flex items-center gap-4'>
                    <div className='relative flex-1'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                        <Input
                            placeholder={t('admin.translations.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='pl-10'
                        />
                    </div>
                    <Button variant='outline' onClick={() => router.push('/admin/translations')}>
                        <FileText className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.index.translations.manage_local')}
                    </Button>
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : filteredTranslations.length === 0 ? (
                <EmptyState
                    icon={Languages}
                    title={
                        searchQuery
                            ? t('admin.marketplace.index.translations.no_results')
                            : t('admin.marketplace.index.translations.no_community')
                    }
                    description={
                        searchQuery
                            ? t('admin.marketplace.index.translations.adjust_search')
                            : t('admin.marketplace.index.translations.community_description')
                    }
                    action={
                        !searchQuery && (
                            <Button onClick={() => router.push('/admin/translations')}>
                                {t('admin.marketplace.index.translations.go_to_management')}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {filteredTranslations.map((translation) => (
                        <div
                            key={translation.id}
                            className='border-border/50 bg-card/50 rounded-3xl border p-6 backdrop-blur-3xl transition-shadow hover:shadow-lg'
                        >
                            <div className='space-y-4'>
                                <div className='flex items-start justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='bg-primary/10 rounded-lg p-2'>
                                            <Globe className='text-primary h-5 w-5' />
                                        </div>
                                        <div>
                                            <h3 className='text-lg font-semibold'>{translation.name}</h3>
                                            <p className='text-muted-foreground text-sm'>{translation.nativeName}</p>
                                        </div>
                                    </div>
                                    {translation.verified && (
                                        <Badge
                                            variant='default'
                                            className='border-green-500/20 bg-green-500/10 text-green-600'
                                        >
                                            {t('admin.marketplace.index.translations.verified')}
                                        </Badge>
                                    )}
                                </div>

                                {translation.description && (
                                    <p className='text-muted-foreground line-clamp-2 text-sm'>
                                        {translation.description}
                                    </p>
                                )}

                                <div className='text-muted-foreground flex flex-wrap gap-2 text-xs'>
                                    <div className='flex items-center gap-1'>
                                        <Users className='h-3 w-3' />
                                        <span>{translation.author}</span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Download className='h-3 w-3' />
                                        <span>{translation.downloads}</span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                        <span>{translation.rating.toFixed(1)}</span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Calendar className='h-3 w-3' />
                                        <span>{new Date(translation.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className='flex gap-2 border-t pt-2'>
                                    <Button variant='outline' size='sm' className='flex-1' onClick={handleDownload}>
                                        <Download className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.index.translations.download')}
                                    </Button>
                                    <Button size='sm' className='flex-1' onClick={handleInstall}>
                                        {t('admin.marketplace.index.translations.install')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-translations', 'bottom-of-page')} />
        </div>
    );
}
