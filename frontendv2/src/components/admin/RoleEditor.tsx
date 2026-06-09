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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Shield,
    Search,
    RefreshCw,
    Lock,
    ChevronDown,
    Sparkles,
    KeyRound,
    Settings2,
    CheckCheck,
    XCircle,
    Crown,
    ArrowLeft,
    Save,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import Permissions from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { RoleBadge } from '@/components/RoleBadge';
import { ROLE_COLOR_PRESETS, randomRoleColor, isDefaultRole, type RoleForm } from '@/lib/role-utils';

interface PermissionNode {
    constant: string;
    value: string;
    category: string;
    description: string;
}

type PermissionFilter = 'all' | 'granted' | 'missing';

interface RoleEditorProps {
    mode: 'create' | 'edit';
    loading: boolean;
    form: RoleForm;
    onFormChange: (form: RoleForm) => void;
    onDisplayNameChange: (value: string) => void;
    onNameManualEdit: () => void;
    activeTab: 'details' | 'permissions';
    onTabChange: (tab: 'details' | 'permissions') => void;
    roleId: number | null;
    isYourRole: boolean;
    isSubmitting: boolean;
    onSave: (e: React.FormEvent) => void;
    onDelete?: () => void;
    loadingPermissions: boolean;
    assignedPermissionMap: Map<string, number>;
    onTogglePermission: (value: string, checked: boolean) => Promise<void>;
    onBulkTogglePermissions: (items: Array<{ value: string; enable: boolean }>) => Promise<void>;
    togglingPermission: string | null;
    isRootLocked: (value: string) => boolean;
    canEditPermissions: boolean;
    t: (key: string, params?: Record<string, string>) => string;
}

export function RoleEditor({
    mode,
    loading,
    form,
    onFormChange,
    onDisplayNameChange,
    onNameManualEdit,
    activeTab,
    onTabChange,
    roleId,
    isYourRole,
    isSubmitting,
    onSave,
    onDelete,
    loadingPermissions,
    assignedPermissionMap,
    onTogglePermission,
    onBulkTogglePermissions,
    togglingPermission,
    isRootLocked,
    canEditPermissions,
    t,
}: RoleEditorProps) {
    const router = useRouter();
    const [permissionSearch, setPermissionSearch] = useState('');
    const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>('all');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [bulkTogglingCategory, setBulkTogglingCategory] = useState<string | null>(null);

    const allPermissions = useMemo(() => Permissions.getAll(), []);
    const hasAdminRoot = assignedPermissionMap.has(Permissions.ADMIN_ROOT);
    const assignedCount = assignedPermissionMap.size;
    const totalCount = allPermissions.length;
    const coveragePercent = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

    const permissionsByCategory = useMemo(() => {
        const grouped = new Map<string, PermissionNode[]>();
        const search = permissionSearch.toLowerCase();

        for (const perm of allPermissions) {
            const isAssigned = assignedPermissionMap.has(perm.value);
            const matchesSearch =
                !search ||
                perm.value.toLowerCase().includes(search) ||
                perm.description.toLowerCase().includes(search) ||
                perm.category.toLowerCase().includes(search);

            if (!matchesSearch) continue;
            if (permissionFilter === 'granted' && !isAssigned) continue;
            if (permissionFilter === 'missing' && isAssigned) continue;

            if (!grouped.has(perm.category)) {
                grouped.set(perm.category, []);
            }
            grouped.get(perm.category)!.push(perm);
        }

        return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [allPermissions, assignedPermissionMap, permissionFilter, permissionSearch]);

    useEffect(() => {
        if (permissionsByCategory.length === 0) return;

        setExpandedCategories((prev) => {
            if (prev.size > 0) return prev;
            const initial = new Set<string>();
            for (const [category, perms] of permissionsByCategory) {
                if (perms.some((perm) => assignedPermissionMap.has(perm.value))) {
                    initial.add(category);
                }
            }
            if (initial.size === 0 && permissionsByCategory[0]) {
                initial.add(permissionsByCategory[0][0]);
            }
            return initial;
        });
    }, [permissionsByCategory, assignedPermissionMap]);

    const toggleCategoryExpanded = (category: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    };

    const toggleCategoryPermissions = useCallback(
        async (category: string, enable: boolean) => {
            const perms = permissionsByCategory.find(([c]) => c === category)?.[1] ?? [];
            setBulkTogglingCategory(category);

            try {
                const items = perms
                    .filter((perm) => {
                        const isAssigned = assignedPermissionMap.has(perm.value);
                        const locked = isRootLocked(perm.value);
                        if (enable) return !isAssigned;
                        return isAssigned && !locked;
                    })
                    .map((perm) => ({ value: perm.value, enable }));

                if (items.length > 0) {
                    await onBulkTogglePermissions(items);
                }
            } finally {
                setBulkTogglingCategory(null);
            }
        },
        [assignedPermissionMap, isRootLocked, onBulkTogglePermissions, permissionsByCategory],
    );

    if (loading) {
        return (
            <div className='space-y-6'>
                <TableSkeleton count={4} />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={
                    mode === 'create'
                        ? t('admin.roles.form.create_title')
                        : form.display_name || t('admin.roles.form.edit_title')
                }
                description={
                    mode === 'create' ? t('admin.roles.create_description') : t('admin.roles.edit_description')
                }
                icon={Shield}
                actions={
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button variant='outline' onClick={() => router.push('/admin/roles')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        {mode === 'edit' && onDelete && roleId && !isDefaultRole(roleId) && (
                            <Button
                                variant='outline'
                                className='text-destructive hover:text-destructive'
                                onClick={onDelete}
                                disabled={isSubmitting}
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('common.delete')}
                            </Button>
                        )}
                        <Button loading={isSubmitting} onClick={(e) => onSave(e as unknown as React.FormEvent)}>
                            <Save className='mr-2 h-4 w-4' />
                            {mode === 'create'
                                ? t('admin.roles.form.submit_create')
                                : t('admin.roles.form.submit_update')}
                        </Button>
                    </div>
                }
            />

            <div
                className='border-border/60 relative overflow-hidden rounded-2xl border p-5 sm:p-6'
                style={{
                    borderColor: `${form.color}44`,
                    background: `linear-gradient(135deg, ${form.color}18 0%, transparent 60%)`,
                }}
            >
                <div className='flex flex-wrap items-center gap-4'>
                    <div
                        className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md'
                        style={{ backgroundColor: form.color }}
                    >
                        <Shield className='h-7 w-7 text-white' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='text-xl font-bold'>
                                {form.display_name || t('admin.roles.form.display_name')}
                            </h2>
                            {isYourRole && <Badge variant='secondary'>{t('admin.roles.labels.your_role')}</Badge>}
                            {hasAdminRoot && (
                                <Badge
                                    className='gap-1 border-amber-500/30 bg-amber-500/15 text-amber-200'
                                    variant='outline'
                                >
                                    <Crown className='h-3 w-3' />
                                    admin.root
                                </Badge>
                            )}
                        </div>
                        <p className='text-muted-foreground mt-1 font-mono text-sm'>{form.name || 'role_name'}</p>
                    </div>
                    {canEditPermissions && (
                        <div className='grid w-full grid-cols-3 gap-3 sm:ml-auto sm:w-auto sm:min-w-[280px]'>
                            <div className='bg-card/60 border-border/50 rounded-xl border px-3 py-2 text-center sm:text-left'>
                                <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                    {t('admin.roles.stats.assigned')}
                                </p>
                                <p className='text-lg font-bold'>{assignedCount}</p>
                            </div>
                            <div className='bg-card/60 border-border/50 rounded-xl border px-3 py-2 text-center sm:text-left'>
                                <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                    {t('admin.roles.stats.total')}
                                </p>
                                <p className='text-lg font-bold'>{totalCount}</p>
                            </div>
                            <div className='bg-card/60 border-border/50 rounded-xl border px-3 py-2 text-center sm:text-left'>
                                <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                    {t('admin.roles.stats.coverage')}
                                </p>
                                <p className='text-lg font-bold'>{coveragePercent}%</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'details' | 'permissions')}>
                <TabsList className='grid h-11 w-full max-w-md grid-cols-2'>
                    <TabsTrigger value='details' className='gap-2'>
                        <Settings2 className='h-4 w-4' />
                        {t('admin.roles.tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger value='permissions' disabled={!canEditPermissions} className='gap-2'>
                        <KeyRound className='h-4 w-4' />
                        {t('admin.roles.tabs.permissions')}
                        {canEditPermissions && (
                            <Badge variant='secondary' className='h-5 px-1.5 text-[10px]'>
                                {assignedCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='details' className='mt-6 space-y-6'>
                    <PageCard title={t('admin.roles.tabs.details')} icon={Settings2}>
                        <form onSubmit={onSave} className='space-y-5'>
                            <div className='grid gap-5 lg:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='editor-display-name'>{t('admin.roles.form.display_name')}</Label>
                                    <Input
                                        id='editor-display-name'
                                        value={form.display_name}
                                        onChange={(e) => onDisplayNameChange(e.target.value)}
                                        required
                                        placeholder='Support Team'
                                        className='h-11'
                                    />
                                </div>

                                <div className='space-y-2'>
                                    <Label htmlFor='editor-name'>{t('admin.roles.form.name')}</Label>
                                    <Input
                                        id='editor-name'
                                        value={form.name}
                                        onChange={(e) => {
                                            onNameManualEdit();
                                            onFormChange({ ...form, name: e.target.value });
                                        }}
                                        required
                                        placeholder='support_team'
                                        className='h-11 font-mono'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.roles.form.auto_name_hint')}
                                    </p>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='editor-custom-badge'>{t('admin.roles.form.custom_badge')}</Label>
                                <Input
                                    id='editor-custom-badge'
                                    value={form.custom_badge}
                                    onChange={(e) => onFormChange({ ...form, custom_badge: e.target.value })}
                                    placeholder='VIP'
                                    maxLength={64}
                                    className='h-11'
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.roles.form.custom_badge_hint')}
                                </p>
                            </div>

                            <div className='space-y-3'>
                                <div className='flex items-center justify-between gap-2'>
                                    <Label>{t('admin.roles.form.color')}</Label>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 gap-1.5 text-xs'
                                        onClick={() => onFormChange({ ...form, color: randomRoleColor() })}
                                    >
                                        <Sparkles className='h-3.5 w-3.5' />
                                        {t('admin.roles.form.random_color')}
                                    </Button>
                                </div>
                                <div className='grid grid-cols-6 gap-2 sm:grid-cols-12'>
                                    {ROLE_COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            type='button'
                                            title={preset}
                                            onClick={() => onFormChange({ ...form, color: preset })}
                                            className={cn(
                                                'aspect-square rounded-xl border-2 transition-all hover:scale-105',
                                                form.color.toLowerCase() === preset.toLowerCase()
                                                    ? 'border-foreground scale-105 shadow-md'
                                                    : 'border-transparent opacity-90 hover:opacity-100',
                                            )}
                                            style={{ backgroundColor: preset }}
                                        />
                                    ))}
                                </div>
                                <div className='flex items-center gap-3'>
                                    <Input
                                        type='color'
                                        value={form.color}
                                        onChange={(e) => onFormChange({ ...form, color: e.target.value })}
                                        className='h-11 w-14 cursor-pointer rounded-xl p-1'
                                    />
                                    <Input
                                        value={form.color}
                                        onChange={(e) => onFormChange({ ...form, color: e.target.value })}
                                        required
                                        className='h-11 flex-1 font-mono uppercase'
                                    />
                                </div>
                            </div>

                            <div
                                className='bg-muted/20 flex items-center gap-4 rounded-xl border p-4'
                                style={{ borderColor: `${form.color}55` }}
                            >
                                <div
                                    className='h-10 w-10 shrink-0 rounded-lg'
                                    style={{ backgroundColor: form.color }}
                                />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate font-semibold'>
                                        {form.display_name || t('admin.roles.form.display_name')}
                                    </p>
                                    <p className='text-muted-foreground truncate font-mono text-xs'>
                                        {form.name || 'role_name'}
                                    </p>
                                </div>
                                <RoleBadge role={form} variant='solid' size='sm' className='shrink-0' />
                            </div>
                        </form>
                    </PageCard>

                    {mode === 'create' && (
                        <PageCard title={t('admin.roles.permissions.title')} icon={KeyRound}>
                            <p className='text-muted-foreground text-sm'>
                                {t('admin.roles.permissions.create_first_hint')}
                            </p>
                        </PageCard>
                    )}
                </TabsContent>

                <TabsContent value='permissions' className='mt-6'>
                    <PageCard title={t('admin.roles.permissions.title')} icon={KeyRound}>
                        <div className='space-y-4'>
                            <div className='flex items-center gap-2'>
                                <Progress value={coveragePercent} className='h-2 flex-1' />
                                <span className='text-muted-foreground w-10 text-right text-xs font-medium'>
                                    {coveragePercent}%
                                </span>
                            </div>

                            <div className='flex flex-wrap items-center gap-2'>
                                {(['all', 'granted', 'missing'] as PermissionFilter[]).map((filter) => (
                                    <button
                                        key={filter}
                                        type='button'
                                        onClick={() => setPermissionFilter(filter)}
                                        className={cn(
                                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                            permissionFilter === filter
                                                ? 'border-primary bg-primary/15 text-primary'
                                                : 'border-border text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {t(`admin.roles.filters.${filter}`)}
                                    </button>
                                ))}
                                <div className='ml-auto flex gap-2'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        onClick={() =>
                                            setExpandedCategories(new Set(permissionsByCategory.map(([c]) => c)))
                                        }
                                    >
                                        {t('admin.roles.permissions.expand_all')}
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => setExpandedCategories(new Set())}
                                    >
                                        {t('admin.roles.permissions.collapse_all')}
                                    </Button>
                                </div>
                            </div>

                            <div className='group relative'>
                                <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                                <Input
                                    placeholder={t('admin.roles.permissions.search')}
                                    value={permissionSearch}
                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                    className='h-11 pl-10'
                                />
                            </div>

                            <div className='space-y-3'>
                                {loadingPermissions ? (
                                    <div className='flex h-40 flex-col items-center justify-center gap-3'>
                                        <RefreshCw className='text-muted-foreground h-6 w-6 animate-spin' />
                                        <span className='text-muted-foreground text-sm'>
                                            {t('admin.roles.permissions.syncing')}
                                        </span>
                                    </div>
                                ) : permissionsByCategory.length === 0 ? (
                                    <div className='text-muted-foreground flex h-32 items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm'>
                                        {t('admin.roles.no_results')}
                                    </div>
                                ) : (
                                    permissionsByCategory.map(([category, perms]) => {
                                        const grantedInCategory = perms.filter((p) =>
                                            assignedPermissionMap.has(p.value),
                                        ).length;
                                        const isExpanded = expandedCategories.has(category);
                                        const isBulkLoading = bulkTogglingCategory === category;

                                        return (
                                            <div
                                                key={category}
                                                className='bg-card/40 border-border/60 overflow-hidden rounded-xl border'
                                            >
                                                <button
                                                    type='button'
                                                    onClick={() => toggleCategoryExpanded(category)}
                                                    className='hover:bg-muted/20 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors'
                                                >
                                                    <ChevronDown
                                                        className={cn(
                                                            'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                                                            isExpanded && 'rotate-180',
                                                        )}
                                                    />
                                                    <div className='min-w-0 flex-1'>
                                                        <p className='truncate text-sm font-semibold'>{category}</p>
                                                        <p className='text-muted-foreground text-xs'>
                                                            {grantedInCategory}/{perms.length}{' '}
                                                            {t('admin.roles.permissions.in_category')}
                                                        </p>
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className='border-border/50 border-t px-2 pb-2'>
                                                        <div className='flex justify-end gap-2 px-2 py-2'>
                                                            <Button
                                                                type='button'
                                                                variant='ghost'
                                                                size='sm'
                                                                className='h-7 gap-1 text-xs'
                                                                disabled={isBulkLoading}
                                                                onClick={() =>
                                                                    toggleCategoryPermissions(category, true)
                                                                }
                                                            >
                                                                <CheckCheck className='h-3.5 w-3.5' />
                                                                {t('admin.roles.permissions.enable_category')}
                                                            </Button>
                                                            <Button
                                                                type='button'
                                                                variant='ghost'
                                                                size='sm'
                                                                className='h-7 gap-1 text-xs'
                                                                disabled={isBulkLoading}
                                                                onClick={() =>
                                                                    toggleCategoryPermissions(category, false)
                                                                }
                                                            >
                                                                <XCircle className='h-3.5 w-3.5' />
                                                                {t('admin.roles.permissions.disable_category')}
                                                            </Button>
                                                        </div>

                                                        <div className='space-y-1'>
                                                            {perms.map((perm) => {
                                                                const isAssigned = assignedPermissionMap.has(
                                                                    perm.value,
                                                                );
                                                                const locked = isRootLocked(perm.value);
                                                                const isToggling =
                                                                    togglingPermission === perm.value || isBulkLoading;

                                                                return (
                                                                    <div
                                                                        key={perm.value}
                                                                        className={cn(
                                                                            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                                                                            isAssigned && 'bg-primary/5',
                                                                            locked && 'bg-amber-500/5',
                                                                            !isToggling && 'hover:bg-muted/30',
                                                                            isToggling && 'opacity-60',
                                                                        )}
                                                                    >
                                                                        <Switch
                                                                            checked={isAssigned}
                                                                            disabled={locked || isToggling}
                                                                            onCheckedChange={(checked) =>
                                                                                onTogglePermission(perm.value, checked)
                                                                            }
                                                                        />
                                                                        <div className='min-w-0 flex-1'>
                                                                            <div className='flex flex-wrap items-center gap-2'>
                                                                                <code className='text-xs font-semibold'>
                                                                                    {perm.value}
                                                                                </code>
                                                                                {locked && (
                                                                                    <span className='inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200'>
                                                                                        <Lock className='h-3 w-3' />
                                                                                        {t(
                                                                                            'admin.roles.permissions.locked',
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                                                                                {perm.description}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}
