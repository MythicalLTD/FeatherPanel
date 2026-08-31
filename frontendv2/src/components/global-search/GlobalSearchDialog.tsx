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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bug, Loader2, Search, Sparkles, Terminal } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { PanelIcon } from '@/components/icons/PanelIcon';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { usePanelDebug } from '@/contexts/PanelDebugContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useGlobalSearchItems } from '@/hooks/useGlobalSearchItems';
import { groupGlobalSearchResults, type GlobalSearchCategory, type GlobalSearchResult } from '@/lib/global-search';
import { isReactIconComponent } from '@/lib/iconLibrary';
import type { GlobalSearchEntityContext } from '@/lib/global-search-context';
import { cn } from '@/lib/utils';

function formatGroupLabel(value?: string): string | undefined {
    if (!value) return undefined;
    return value
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getCategoryLabel(
    category: GlobalSearchCategory,
    entityContext: GlobalSearchEntityContext | null | undefined,
    t: (key: string, params?: Record<string, string>) => string,
): string {
    if (category === 'currentContext' && entityContext) {
        const key = `globalSearch.categories.currentContext.${entityContext.kind}`;
        const label = t(key, { name: entityContext.entityName });
        return label !== key ? label : entityContext.entityName;
    }

    const key = `globalSearch.categories.${category}`;
    const label = t(key);
    return label !== key ? label : category;
}

function ResultIcon({ result }: { result: GlobalSearchResult }) {
    const Icon = isReactIconComponent(result.icon) ? result.icon : null;
    if (Icon) {
        return <Icon className='h-4 w-4 shrink-0' aria-hidden />;
    }
    if (result.lucideIcon) {
        return <DynamicIcon name={result.lucideIcon as never} className='h-4 w-4 shrink-0' aria-hidden />;
    }
    if (result.panelIcon) {
        return (
            <PanelIcon
                source={{ panelIcon: result.panelIcon }}
                size={16}
                label={result.title}
                className='text-current'
            />
        );
    }
    return <Sparkles className='text-primary/80 h-4 w-4 shrink-0' aria-hidden />;
}

export function GlobalSearchTrigger({
    variant = 'classic',
    className,
}: {
    variant?: 'classic' | 'modern';
    className?: string;
}) {
    const { setOpen } = useGlobalSearch();
    const { t } = useTranslation();
    const isModern = variant === 'modern';

    return (
        <button
            type='button'
            onClick={() => setOpen(true)}
            className={cn(
                'group text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex min-w-0 items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                isModern
                    ? 'bg-muted/15 hover:bg-muted/25 border-border/35 hover:border-primary/30 w-full rounded-xl border px-3 py-2 shadow-sm'
                    : 'hover:bg-accent/50 border-border/35 bg-muted/10 hidden w-full rounded-xl border px-3 py-2 md:flex',
                className,
            )}
            aria-label={t('globalSearch.open')}
        >
            <Search className='h-4 w-4 shrink-0 opacity-70' aria-hidden />
            <span className='truncate text-left text-sm'>{t('globalSearch.placeholder')}</span>
            <kbd
                className={cn(
                    'border-border/60 bg-background/80 ml-auto hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase opacity-70 lg:inline',
                )}
            >
                {t('globalSearch.shortcut')}
            </kbd>
        </button>
    );
}

export default function GlobalSearchDialog() {
    const router = useRouter();
    const { open, setOpen } = useGlobalSearch();
    const { openDebugConsole } = usePanelDebug();
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const { results, loading, parsedQuery, entityContext } = useGlobalSearchItems(open, query);
    const isDebugMode = parsedQuery.mode === 'debug';
    const grouped = useMemo(() => groupGlobalSearchResults(results), [results]);
    const flatResults = useMemo(() => grouped.flatMap((group) => group.items), [grouped]);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setSelectedIndex(0);
            return;
        }
        const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query, results.length, isDebugMode]);

    useEffect(() => {
        const selected = listRef.current?.querySelector('[data-selected="true"]');
        selected?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const navigateTo = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    const launchDebugConsole = () => {
        openDebugConsole(parsedQuery.debugCommand ?? '');
        setOpen(false);
        setQuery('');
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (isDebugMode) {
            if (event.key === 'Enter') {
                event.preventDefault();
                launchDebugConsole();
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((index) => (flatResults.length ? (index + 1) % flatResults.length : 0));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((index) =>
                flatResults.length ? (index - 1 + flatResults.length) % flatResults.length : 0,
            );
            return;
        }
        if (event.key === 'Enter' && flatResults[selectedIndex]) {
            event.preventDefault();
            navigateTo(flatResults[selectedIndex].href);
        }
    };

    let runningIndex = -1;

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
            className='border-border/60 max-w-2xl overflow-hidden p-0 shadow-2xl'
        >
            <div className='border-border/50 bg-muted/10 flex items-center gap-3 border-b px-4 py-3.5'>
                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        isDebugMode ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary',
                    )}
                >
                    <Search className='h-4 w-4' aria-hidden />
                </div>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={t('globalSearch.inputPlaceholder')}
                    className='text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-base outline-none'
                    aria-label={t('globalSearch.inputPlaceholder')}
                    autoComplete='off'
                    spellCheck={false}
                />
                {loading && !isDebugMode ? (
                    <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' aria-hidden />
                ) : null}
                {parsedQuery.scopeExplicit && !isDebugMode ? (
                    <span className='bg-primary/10 text-primary hidden shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide uppercase sm:inline'>
                        {parsedQuery.scopeLabel ?? parsedQuery.scope}
                    </span>
                ) : null}
                {isDebugMode ? (
                    <span className='bg-muted text-muted-foreground hidden shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide uppercase sm:inline'>
                        debug
                    </span>
                ) : null}
                <kbd className='border-border/60 bg-background/70 text-muted-foreground hidden rounded-md border px-2 py-1 text-[10px] font-medium sm:inline'>
                    {t('globalSearch.shortcut')}
                </kbd>
            </div>

            {isDebugMode ? (
                <div className='flex flex-col items-center gap-5 px-6 py-12 text-center'>
                    <div className='border-border/60 bg-muted/30 flex h-14 w-14 items-center justify-center rounded-xl border'>
                        <Terminal className='text-foreground h-6 w-6' />
                    </div>
                    <div className='max-w-sm space-y-2'>
                        <p className='text-foreground text-base font-semibold'>
                            {t('globalSearch.debug.launcherTitle')}
                        </p>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('globalSearch.debug.launcherHint')}
                        </p>
                        {parsedQuery.debugCommand ? (
                            <p className='text-muted-foreground text-xs'>
                                {t('globalSearch.debug.launcherFilter', { filter: parsedQuery.debugCommand })}
                            </p>
                        ) : null}
                    </div>
                    <Button onClick={launchDebugConsole}>
                        <Bug className='mr-2 h-4 w-4' />
                        {t('globalSearch.debug.openConsole')}
                    </Button>
                    <p className='text-muted-foreground text-[11px]'>{t('globalSearch.debug.launcherShortcut')}</p>
                </div>
            ) : (
                <div
                    ref={listRef}
                    className='custom-scrollbar max-h-[min(28rem,calc(100dvh-10rem))] overflow-y-auto p-2'
                >
                    {flatResults.length === 0 ? (
                        <div className='animate-in fade-in-0 flex flex-col items-center justify-center gap-2 px-6 py-14 text-center duration-300'>
                            <div className='bg-muted/40 flex h-12 w-12 items-center justify-center rounded-2xl'>
                                <Search className='text-muted-foreground h-5 w-5' aria-hidden />
                            </div>
                            <p className='text-foreground text-sm font-medium'>
                                {query ? t('globalSearch.emptySearch') : t('globalSearch.emptyDefault')}
                            </p>
                            <p className='text-muted-foreground max-w-sm text-xs leading-relaxed'>
                                {t('globalSearch.emptyHint')}
                            </p>
                            <p className='text-muted-foreground/80 max-w-md text-[11px] leading-relaxed'>
                                {t('globalSearch.scopeHint')}
                            </p>
                        </div>
                    ) : (
                        grouped.map((group) => (
                            <section
                                key={group.category}
                                className={cn(
                                    'mb-3 last:mb-0',
                                    group.category === 'currentContext' &&
                                        'border-primary/15 bg-primary/4 mb-3 rounded-xl border p-1.5',
                                )}
                            >
                                <div className='flex items-center justify-between gap-2 px-2 py-2'>
                                    <p
                                        className={cn(
                                            'text-[11px] font-semibold tracking-[0.12em] uppercase',
                                            group.category === 'currentContext'
                                                ? 'text-primary'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {getCategoryLabel(group.category, entityContext, t)}
                                    </p>
                                    <span className='text-muted-foreground/70 text-[10px] tabular-nums'>
                                        {group.items.length}
                                    </span>
                                </div>
                                <ul className='space-y-0.5'>
                                    {group.items.map((result, itemIndex) => {
                                        runningIndex += 1;
                                        const index = runningIndex;
                                        const selected = index === selectedIndex;
                                        const subtitle = formatGroupLabel(result.subtitle) ?? result.subtitle;

                                        return (
                                            <li
                                                key={result.id}
                                                data-selected={selected ? 'true' : 'false'}
                                                className='animate-in fade-in-0 slide-in-from-bottom-1 duration-300'
                                                style={{ animationDelay: `${Math.min(itemIndex, 8) * 30}ms` }}
                                            >
                                                <button
                                                    type='button'
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                    onClick={() => navigateTo(result.href)}
                                                    className={cn(
                                                        'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all',
                                                        selected
                                                            ? 'bg-primary/12 ring-primary/20 shadow-primary/5 ring-1'
                                                            : 'hover:bg-muted/55',
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                                                            selected
                                                                ? 'border-primary/25 bg-primary/12 text-primary'
                                                                : 'border-border/45 bg-background/60 text-muted-foreground',
                                                        )}
                                                    >
                                                        <ResultIcon result={result} />
                                                    </div>
                                                    <div className='min-w-0 flex-1'>
                                                        <div className='flex min-w-0 items-center gap-2'>
                                                            <p className='text-foreground truncate text-sm font-medium'>
                                                                {result.title}
                                                            </p>
                                                            {result.contextTag ? (
                                                                <span className='border-primary/20 bg-background/80 text-primary max-w-[8rem] shrink-0 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium'>
                                                                    {result.contextTag}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {subtitle ? (
                                                            <p className='text-muted-foreground truncate text-xs'>
                                                                {subtitle}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <ArrowRight
                                                        className={cn(
                                                            'h-4 w-4 shrink-0 transition-all',
                                                            selected
                                                                ? 'text-primary translate-x-0 opacity-100'
                                                                : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50',
                                                        )}
                                                        aria-hidden
                                                    />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            )}

            <div className='border-border/50 bg-muted/15 text-muted-foreground flex flex-col gap-2 border-t px-4 py-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between'>
                <div className='space-y-1'>
                    <span>{isDebugMode ? t('globalSearch.debug.footer') : t('globalSearch.footerHint')}</span>
                    {!isDebugMode ? (
                        <p className='text-muted-foreground/75 hidden text-[10px] leading-relaxed lg:block'>
                            {t('globalSearch.scopeHint')}
                        </p>
                    ) : null}
                </div>
                {!isDebugMode ? (
                    <div className='hidden items-center gap-2 sm:flex'>
                        <kbd className='border-border/60 bg-background/70 rounded border px-1.5 py-0.5'>↑↓</kbd>
                        <span>{t('globalSearch.navigate')}</span>
                        <kbd className='border-border/60 bg-background/70 rounded border px-1.5 py-0.5'>↵</kbd>
                        <span>{t('globalSearch.openItem')}</span>
                    </div>
                ) : null}
            </div>
        </Dialog>
    );
}
