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

import React, { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';
import { Globe, Plus, Search, Pencil, Trash2, Download, Upload, Check, X, FileCode, Users } from 'lucide-react';

interface TranslationFile {
    code: string;
    name: string;
    file: string;
    size: number;
    modified: string | null;
    enabled: boolean;
}

export default function TranslationsPage() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [translationFiles, setTranslationFiles] = useState<TranslationFile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedLang, setSelectedLang] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [, setOriginalContent] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newLangCode, setNewLangCode] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-translations');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/translations');
                let files = data.data || [];

                if (debouncedSearchQuery) {
                    files = files.filter(
                        (file: TranslationFile) =>
                            file.code.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                            file.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
                    );
                }

                setTranslationFiles(files);
            } catch (error) {
                console.error('Error fetching translation files:', error);
                toast.error(t('admin.translations.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [debouncedSearchQuery, refreshKey, t]);

    const loadTranslationContent = async (lang: string) => {
        try {
            const { data } = await axios.get(`/api/admin/translations/${lang}`);
            const content = JSON.stringify(data.data, null, 2);
            setEditingContent(content);
            setOriginalContent(content);
            setSelectedLang(lang);
            setEditOpen(true);
        } catch (error) {
            console.error('Error loading translation content:', error);
            toast.error(t('admin.translations.messages.fetch_content_failed'));
        }
    };

    const handleImportDefault = async () => {
        setIsImporting(true);
        try {
            const response = await fetch('/locales/en.json');
            if (!response.ok) {
                throw new Error('Failed to fetch frontend translations');
            }
            const frontendTranslations = await response.json();

            await axios.put('/api/admin/translations/en', frontendTranslations, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            toast.success(t('admin.translations.messages.imported'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error importing translations:', error);
            toast.error(t('admin.translations.messages.import_failed'));
        } finally {
            setIsImporting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            await axios.post('/api/admin/translations/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success(t('admin.translations.messages.uploaded'));
            setRefreshKey((prev) => prev + 1);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading translation file:', error);
            let msg = t('admin.translations.messages.upload_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const langCode = newLangCode.trim().toLowerCase();
            if (!langCode || !/^[a-z]{2}(-[a-z]{2})?$/.test(langCode)) {
                toast.error('Invalid language code. Use ISO 639-1 format (e.g., en, de, fr)');
                setIsSubmitting(false);
                return;
            }

            await axios.post(`/api/admin/translations/${langCode}`, {});
            toast.success(t('admin.translations.messages.created'));
            setCreateOpen(false);
            setNewLangCode('');
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating translation file:', error);
            let msg = t('admin.translations.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedLang) return;

        try {
            JSON.parse(editingContent);
        } catch {
            toast.error(t('admin.translations.messages.invalid_json'));
            return;
        }

        setIsSubmitting(true);
        try {
            const translations = JSON.parse(editingContent);
            await axios.put(`/api/admin/translations/${selectedLang}`, translations, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            toast.success(t('admin.translations.messages.updated'));
            setEditOpen(false);
            setSelectedLang(null);
            setEditingContent('');
            setOriginalContent('');
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating translation file:', error);
            let msg = t('admin.translations.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (lang: string) => {
        if (!confirm(t('admin.translations.messages.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/translations/${lang}`);
            toast.success(t('admin.translations.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting translation file:', error);
            toast.error(t('admin.translations.messages.delete_failed'));
        }
    };

    const handleDownload = async (lang: string) => {
        try {
            const response = await axios.get(`/api/admin/translations/${lang}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${lang}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading translation file:', error);
            toast.error('Failed to download translation file');
        }
    };

    const hasEnglishTranslations = translationFiles.some((file) => file.code === 'en');

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-translations', 'top-of-page')} />
            <PageHeader
                title={t('admin.translations.title')}
                description={t('admin.translations.subtitle')}
                icon={Globe}
                actions={
                    <div className='flex gap-2'>
                        <Button
                            onClick={() => (location.href = 'https://github.com/featherpanel-com/translations')}
                            variant='outline'
                        >
                            <Users className='h-4 w-4 mr-2' />
                            {t('admin.translations.community_made')}
                        </Button>
                        {!hasEnglishTranslations && (
                            <Button onClick={handleImportDefault} loading={isImporting} variant='outline'>
                                <Upload className='h-4 w-4 mr-2' />
                                {t('admin.translations.import_default')}
                            </Button>
                        )}
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='.json'
                            onChange={handleFileUpload}
                            className='hidden'
                            id='translation-file-upload'
                        />
                        <Button onClick={() => fileInputRef.current?.click()} loading={isUploading} variant='outline'>
                            <Upload className='h-4 w-4 mr-2' />
                            {t('admin.translations.upload')}
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.translations.create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-translations', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.translations.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : translationFiles.length === 0 ? (
                <EmptyState
                    icon={Globe}
                    title={t('admin.translations.no_results')}
                    description={t('admin.translations.search_placeholder')}
                    action={
                        <div className='flex gap-2'>
                            {!hasEnglishTranslations && (
                                <Button onClick={handleImportDefault} loading={isImporting} variant='outline'>
                                    <Upload className='h-4 w-4 mr-2' />
                                    {t('admin.translations.import_default')}
                                </Button>
                            )}
                            <Button onClick={() => setCreateOpen(true)}>{t('admin.translations.create')}</Button>
                        </div>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {translationFiles.map((file) => (
                        <ResourceCard
                            key={file.code}
                            title={file.name}
                            subtitle={
                                <div className='flex items-center gap-2 text-xs'>
                                    <span
                                        className={`px-2 py-1 rounded ${file.enabled ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        {file.enabled ? (
                                            <>
                                                <Check className='h-3 w-3 inline mr-1' />
                                                Enabled
                                            </>
                                        ) : (
                                            <>
                                                <X className='h-3 w-3 inline mr-1' />
                                                Disabled
                                            </>
                                        )}
                                    </span>
                                </div>
                            }
                            icon={Globe}
                            badges={[
                                {
                                    label: file.code,
                                    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono',
                                },
                                {
                                    label: `${(file.size / 1024).toFixed(1)} KB`,
                                    className: 'bg-muted text-muted-foreground',
                                },
                            ]}
                            description={
                                <div className='flex flex-col gap-1 mt-2 text-sm text-muted-foreground'>
                                    <div className='flex items-center gap-2'>
                                        <FileCode className='h-3 w-3 shrink-0 opacity-50' />
                                        <span>{file.file}</span>
                                    </div>
                                    {file.modified && (
                                        <div className='flex items-center gap-2'>
                                            <span className='text-xs opacity-50'>
                                                Modified: {new Date(file.modified).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button size='sm' variant='ghost' onClick={() => loadTranslationContent(file.code)}>
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button size='sm' variant='ghost' onClick={() => handleDownload(file.code)}>
                                        <Download className='h-4 w-4' />
                                    </Button>
                                    {file.code !== 'en' && (
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(file.code)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-6'>
                <PageCard title={t('admin.translations.help.what_is.title')} icon={Globe}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.translations.help.what_is.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.translations.help.fallback.title')} icon={Globe}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.translations.help.fallback.description')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={editOpen} onOpenChange={setEditOpen} className='max-w-6xl'>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.translations.form.edit_title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.translations.form.edit_description', { lang: selectedLang || '' })}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='h-[calc(100vh-300px)] min-h-[500px] border rounded-lg overflow-hidden'>
                        <Editor
                            height='100%'
                            defaultLanguage='json'
                            value={editingContent}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            onChange={(value) => setEditingContent(value || '')}
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 20 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontLigatures: true,
                                formatOnPaste: true,
                                formatOnType: true,
                            }}
                        />
                    </div>
                    <SheetFooter>
                        <Button variant='outline' onClick={() => setEditOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleUpdate} loading={isSubmitting}>
                            {t('admin.translations.form.submit_update')}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.translations.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.translations.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.translations.form.language_code')}</Label>
                            <Input
                                value={newLangCode}
                                onChange={(e) => setNewLangCode(e.target.value)}
                                placeholder={t('admin.translations.form.language_code_placeholder')}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>
                                {t('admin.translations.form.language_code_help')}
                            </p>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.translations.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-translations', 'bottom-of-page')} />
        </div>
    );
}
