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

import * as React from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Boxes, AlertTriangle, Loader2, Zap, ChevronRight, Check, Lock } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type {
    Variable,
    ServerRealm,
    ServerSpell,
    RealmsResponse,
    SpellsResponse,
    SpellDetailsResponse,
    Server,
} from '@/types/server';

interface ServerResponse {
    success: boolean;
    data: Server & {
        variables: Variable[];
        image?: string;
    };
}

export default function ServerTransferSpellPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { loading: permissionsLoading, hasPermission } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-startup-transfer-spell');

    const canChangeSpell = isEnabled(settings?.server_allow_egg_change);

    const [server, setServer] = React.useState<(Server & { variables: Variable[] }) | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [variableValues, setVariableValues] = React.useState<Record<number, string>>({});
    const [variableErrors, setVariableErrors] = React.useState<Record<number, string>>({});

    const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

    const [availableRealms, setAvailableRealms] = React.useState<ServerRealm[]>([]);
    const [loadingRealms, setLoadingRealms] = React.useState(false);
    const [selectedRealmId, setSelectedRealmId] = React.useState<string>('');

    const [availableSpells, setAvailableSpells] = React.useState<ServerSpell[]>([]);
    const [loadingSpells, setLoadingSpells] = React.useState(false);
    const [selectedSpellId, setSelectedSpellId] = React.useState<string>('');

    const [targetSpell, setTargetSpell] = React.useState<ServerSpell | null>(null);
    const [targetVariables, setTargetVariables] = React.useState<Variable[]>([]);
    const [wipeFiles, setWipeFiles] = React.useState(false);

    const parseRules = React.useCallback((rules: string) => {
        if (!rules) return [];
        const parts = rules.split('|');
        const parsed: Array<{ type: string; value?: number | string }> = [];
        for (const part of parts) {
            if (['required', 'nullable', 'string', 'numeric', 'integer'].includes(part)) {
                parsed.push({ type: part });
                continue;
            }
            const maxMatch = part.match(/^max:(\d+)$/);
            if (maxMatch) {
                parsed.push({ type: 'max', value: Number(maxMatch[1]) });
                continue;
            }
            const minMatch = part.match(/^min:(\d+)$/);
            if (minMatch) {
                parsed.push({ type: 'min', value: Number(minMatch[1]) });
                continue;
            }
            const regexMatch = part.match(/^regex:\/(.*)\/$/);
            if (regexMatch) {
                parsed.push({ type: 'regex', value: regexMatch[1] });
                continue;
            }
        }
        return parsed;
    }, []);

    const normalizeRegexPattern = React.useCallback((pattern: string) => {
        try {
            return pattern.replace(/\\\\/g, '\\');
        } catch {
            return pattern;
        }
    }, []);

    const validateVariableAgainstRules = React.useCallback(
        (value: string, rules: string): string | '' => {
            const parsed = parseRules(rules || '');
            const hasNullable = parsed.some((r) => r.type === 'nullable');
            const isRequired = parsed.some((r) => r.type === 'required');
            const isNumeric = parsed.some((r) => r.type === 'numeric' || r.type === 'integer');

            const val = value ?? '';
            const trimmedForEmptyCheck = val.trim();

            if (!isRequired && hasNullable && trimmedForEmptyCheck === '') return '';
            if (isRequired && trimmedForEmptyCheck === '') return t('serverStartup.fieldRequired');
            if (!isRequired && trimmedForEmptyCheck === '') return '';

            if (isNumeric && !/^\d+$/.test(trimmedForEmptyCheck)) return t('serverStartup.fieldMustBeNumeric');

            for (const rule of parsed) {
                if (rule.type === 'min' && typeof rule.value === 'number') {
                    if (isNumeric) {
                        const numValue = Number(trimmedForEmptyCheck);
                        if (isNaN(numValue) || numValue < rule.value) {
                            return t('serverStartup.minimumValue', { value: String(rule.value) });
                        }
                    } else {
                        if (trimmedForEmptyCheck.length < rule.value) {
                            return t('serverStartup.minimumCharacters', { value: String(rule.value) });
                        }
                    }
                }
                if (rule.type === 'max' && typeof rule.value === 'number') {
                    if (isNumeric) {
                        const numValue = Number(trimmedForEmptyCheck);
                        if (isNaN(numValue) || numValue > rule.value) {
                            return t('serverStartup.maximumValue', { value: String(rule.value) });
                        }
                    } else {
                        if (trimmedForEmptyCheck.length > rule.value) {
                            return t('serverStartup.maximumCharacters', { value: String(rule.value) });
                        }
                    }
                }
                if (rule.type === 'regex' && typeof rule.value === 'string') {
                    try {
                        const pattern = normalizeRegexPattern(rule.value);
                        const re = new RegExp(pattern);
                        if (!re.test(trimmedForEmptyCheck)) {
                            return t('serverStartup.valueDoesNotMatchFormat');
                        }
                    } catch (err) {
                        console.error('Invalid regex pattern:', rule.value, err);
                    }
                }
            }
            return '';
        },
        [parseRules, t, normalizeRegexPattern],
    );

    const validateOneVariable = React.useCallback(
        (v: Variable, value: string) => {
            const message = validateVariableAgainstRules(value, v.rules || '');
            setVariableErrors((prev) => {
                const next = { ...prev };
                if (message) {
                    next[v.variable_id] = message;
                } else {
                    delete next[v.variable_id];
                }
                return next;
            });
        },
        [validateVariableAgainstRules],
    );

    const fetchAvailableSpells = React.useCallback(
        async (realmId?: string) => {
            if (!realmId) {
                setAvailableSpells([]);
                return;
            }

            setLoadingSpells(true);
            try {
                const { data } = await axios.get<SpellsResponse>('/api/user/spells', {
                    params: { realm_id: realmId },
                });
                if (data.success) {
                    setAvailableSpells(data.data.spells);
                }
            } catch (error) {
                console.error('Failed to fetch spells:', error);
                toast.error(t('serverStartup.failedToFetchSpells'));
            } finally {
                setLoadingSpells(false);
            }
        },
        [t],
    );

    const fetchAvailableRealms = React.useCallback(
        async (currentServer?: Server) => {
            setLoadingRealms(true);
            try {
                const { data } = await axios.get<RealmsResponse>('/api/user/realms');
                if (data.success) {
                    let realms = data.data.realms;
                    if (!isEnabled(settings?.server_allow_cross_realm_spell_change) && currentServer) {
                        const currentRealmId = Number(currentServer.realm_id || currentServer.realm?.id || 0);
                        if (currentRealmId > 0) {
                            realms = realms.filter((r) => Number(r.id) === currentRealmId);
                        }
                    }
                    setAvailableRealms(realms);
                }
            } catch (error) {
                console.error('Failed to fetch realms:', error);
                toast.error(t('serverStartup.failedToFetchRealms'));
            } finally {
                setLoadingRealms(false);
            }
        },
        [settings?.server_allow_cross_realm_spell_change, t],
    );

    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return;
        setLoading(true);
        try {
            const { data } = await axios.get<ServerResponse>(`/api/user/servers/${uuidShort}`);
            if (data.success) {
                const s = data.data;
                setServer(s);

                if (s.realm) {
                    setSelectedRealmId(String(s.realm.id));
                }

                if (isEnabled(settings?.server_allow_egg_change)) {
                    await fetchAvailableRealms(s);
                    if (s.realm) {
                        await fetchAvailableSpells(String(s.realm.id));

                        if (!isEnabled(settings?.server_allow_cross_realm_spell_change)) {
                            setCurrentStep(2);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch transfer data:', error);
            toast.error(t('serverStartup.failedToFetchServer'));
        } finally {
            setLoading(false);
        }
    }, [
        uuidShort,
        t,
        settings?.server_allow_egg_change,
        settings?.server_allow_cross_realm_spell_change,
        fetchAvailableRealms,
        fetchAvailableSpells,
    ]);

    React.useEffect(() => {
        if (!permissionsLoading && !settingsLoading) {
            fetchData();
        }
    }, [permissionsLoading, settingsLoading, fetchData]);

    const handleRealmSelect = (realmId: string) => {
        if (!isEnabled(settings?.server_allow_cross_realm_spell_change) && server) {
            const currentRealmId = Number(server.realm_id || server.realm?.id || 0);
            if (realmId && currentRealmId > 0 && String(currentRealmId) !== String(realmId)) {
                toast.warning(t('serverStartup.crossRealmRestricted'));
                return;
            }
        }

        setSelectedRealmId(realmId);
        setSelectedSpellId('');
        fetchAvailableSpells(realmId).then(() => {
            setCurrentStep(2);
        });
    };

    const handleSpellSelect = async (newSpellId: string) => {
        if (!newSpellId) return;

        setSelectedSpellId(newSpellId);

        try {
            setLoadingSpells(true);
            const { data } = await axios.get<SpellDetailsResponse>(`/api/user/spells/${newSpellId}`);
            if (data.success) {
                const spell = data.data.spell;
                const vars = data.data.variables || [];

                setTargetSpell(spell);
                setTargetVariables(
                    vars.map((v) => {
                        const vid = v.variable_id || v.id;
                        return { ...v, variable_id: vid, id: vid };
                    }),
                );

                const initialValues: Record<number, string> = {};
                vars.forEach((v) => {
                    const vid = v.variable_id || v.id;
                    initialValues[vid] = v.default_value || '';
                });
                setVariableValues(initialValues);
                setVariableErrors({});
                setCurrentStep(3);
            }
        } catch (error) {
            console.error('Failed to fetch spell details:', error);
            toast.error(t('serverStartup.failedToFetchSpell'));
        } finally {
            setLoadingSpells(false);
        }
    };

    const handleBackToStep = (step: 1 | 2 | 3) => {
        if (step === 1 && !isEnabled(settings?.server_allow_cross_realm_spell_change)) {
            return;
        }

        if (step === 1) {
            setSelectedSpellId('');
            setTargetSpell(null);
            setTargetVariables([]);
        } else if (step === 2) {
            setTargetSpell(null);
            setTargetVariables([]);
        }
        setCurrentStep(step);
    };

    const handleSave = async () => {
        if (!targetSpell) return;

        setSaving(true);

        let hasErrors = false;
        const errors: Record<number, string> = {};
        targetVariables.forEach((v) => {
            const val = variableValues[v.variable_id] || '';
            const err = validateVariableAgainstRules(val, v.rules || '');
            if (err) {
                errors[v.variable_id] = err;
                hasErrors = true;
            }
        });
        setVariableErrors(errors);

        if (hasErrors) {
            setSaving(false);
            toast.error(t('serverStartup.pleaseFixErrors'));
            return;
        }

        try {
            const canUpdateStartup = hasPermission('startup.update');
            const payload = {
                spell_id: targetSpell.id,
                wipe_files: wipeFiles,
                variables: targetVariables
                    .filter(
                        (v) =>
                            v.user_editable === 1 ||
                            (canUpdateStartup && isEnabled(settings?.server_allow_startup_change)),
                    )
                    .map((v) => ({
                        variable_id: v.variable_id,
                        variable_value: variableValues[v.variable_id] || '',
                    })),
            };

            const { data } = await axios.put<{ success: boolean; message?: string }>(
                `/api/user/servers/${uuidShort}`,
                payload,
            );
            if (data.success) {
                toast.success(t('serverStartup.spellChanged'));
                router.push(`/server/${uuidShort}/startup`);
            } else {
                toast.error(data.message || t('serverStartup.saveError'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            const msg = axiosError.response?.data?.message || t('serverStartup.saveError');
            toast.error(msg);
            console.error('Transfer failed:', error);
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || settingsLoading || loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canChangeSpell) {
        return (
            <div className='flex flex-col items-center justify-center space-y-8 rounded-[3rem] border border-white/5 bg-[#0A0A0A]/40 py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-3xl' />
                    <div className='relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2 border-red-500/20 bg-red-500/10'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>
                        {t('serverStartup.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverStartup.noStartupPermission')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='mx-auto max-w-6xl space-y-8 pb-16 font-sans'>
            <WidgetRenderer widgets={getWidgets('server-startup-transfer-spell', 'top-of-page')} />

            <PageHeader
                title={t('navigation.items.transferSpell')}
                description={t('serverStartup.spellSelectionHelp')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='plain'
                            size='default'
                            onClick={() => handleBackToStep(1)}
                            disabled={currentStep === 1 || saving}
                            className='order-2 border border-transparent bg-transparent text-[10px] hover:border-white/10 hover:bg-white/5 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleSave}
                            disabled={currentStep !== 3 || saving || Object.keys(variableErrors).length > 0}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Zap className='mr-3 h-5 w-5' />
                                    {t('serverStartup.applySpellChange')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-startup-transfer-spell', 'after-header')} />

            <div className='grid grid-cols-3 gap-4'>
                {[
                    {
                        step: 1,
                        label: t('serverStartup.selectRealm'),
                        disabled: !isEnabled(settings?.server_allow_cross_realm_spell_change),
                    },
                    { step: 2, label: t('serverStartup.selectSpell'), disabled: false },
                    { step: 3, label: t('serverStartup.configureVariables'), disabled: false },
                ].map((s) => (
                    <div
                        key={s.step}
                        onClick={() => !s.disabled && currentStep > s.step && handleBackToStep(s.step as 1 | 2 | 3)}
                        className={cn(
                            'relative overflow-hidden rounded-xl border p-4 transition-all duration-300',
                            currentStep === s.step
                                ? 'bg-primary/10 border-primary/30'
                                : currentStep > s.step && !s.disabled
                                  ? 'cursor-pointer border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  : 'border-white/5 bg-white/5 opacity-40',
                            s.disabled && currentStep !== s.step && 'cursor-not-allowed',
                        )}
                    >
                        <div className='flex items-center justify-between'>
                            <span
                                className={cn(
                                    'text-[10px] font-black tracking-widest uppercase',
                                    currentStep === s.step
                                        ? 'text-primary'
                                        : currentStep > s.step
                                          ? 'text-emerald-500'
                                          : 'text-muted-foreground',
                                )}
                            >
                                {t('serverStartup.stepLabel', { step: String(s.step) })}
                            </span>
                            {currentStep > s.step && (
                                <Check className='animate-in zoom-in-0 h-4 w-4 text-emerald-500 duration-500' />
                            )}
                        </div>
                        <h3
                            className={cn(
                                'mt-1 text-sm font-bold tracking-tight uppercase',
                                currentStep === s.step
                                    ? 'text-foreground'
                                    : currentStep > s.step
                                      ? 'text-emerald-500/80'
                                      : 'text-muted-foreground/60',
                            )}
                        >
                            {s.label}
                        </h3>
                    </div>
                ))}
            </div>

            <div className='relative min-h-100'>
                {currentStep === 1 && (
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                        {loadingRealms ? (
                            <div className='col-span-full flex items-center justify-center py-12'>
                                <Loader2 className='text-primary h-8 w-8 animate-spin opacity-50' />
                            </div>
                        ) : (
                            availableRealms.map((realm) => (
                                <div
                                    key={realm.id}
                                    onClick={() => handleRealmSelect(String(realm.id))}
                                    className={cn(
                                        'group bg-card/10 hover:border-primary/40 hover:bg-card/30 relative cursor-pointer overflow-hidden rounded-3xl border border-white/5 p-8 transition-all duration-500',
                                        selectedRealmId === String(realm.id) && 'border-primary/50 bg-primary/5',
                                    )}
                                >
                                    <div className='bg-primary/5 group-hover:bg-primary/10 absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 blur-3xl transition-colors' />
                                    <div className='relative z-10 space-y-4'>
                                        <div className='bg-primary/10 border-primary/20 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3'>
                                            <Boxes className='text-primary h-7 w-7' />
                                        </div>
                                        <div>
                                            <h3 className='text-2xl font-black tracking-tight uppercase'>
                                                {realm.name}
                                            </h3>
                                            <p className='text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed font-medium'>
                                                {realm.description || t('serverStartup.discoverRealmsHelp')}
                                            </p>
                                        </div>
                                        <div className='text-primary flex translate-x-2.5 items-center pt-2 text-[10px] font-black tracking-widest uppercase opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100'>
                                            {t('serverStartup.viewSpells')} <ChevronRight className='ml-1 h-3 w-3' />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {currentStep === 2 && (
                    <div className='space-y-8'>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            {loadingSpells ? (
                                <div className='col-span-full flex items-center justify-center py-12'>
                                    <Loader2 className='text-primary h-8 w-8 animate-spin opacity-50' />
                                </div>
                            ) : (
                                availableSpells.map((spell) => (
                                    <div
                                        key={spell.id}
                                        onClick={() => handleSpellSelect(String(spell.id))}
                                        className={cn(
                                            'group bg-card/20 hover:border-primary/30 hover:bg-card/40 flex cursor-pointer items-center gap-6 rounded-3xl border border-white/5 p-6 transition-all duration-300',
                                            selectedSpellId === String(spell.id) && 'border-primary/40 bg-primary/5',
                                        )}
                                    >
                                        <div className='group-hover:border-primary/20 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all'>
                                            <Zap
                                                className={cn(
                                                    'h-8 w-8 transition-colors',
                                                    selectedSpellId === String(spell.id)
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground group-hover:text-primary/70',
                                                )}
                                            />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <h3 className='truncate text-xl font-bold tracking-tight uppercase'>
                                                {spell.name}
                                            </h3>
                                            <div className='mt-0.5 flex items-center gap-2'>
                                                <span className='text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-50'>
                                                    {t('serverStartup.apiId', { id: String(spell.id) })}
                                                </span>
                                                <div className='h-1 w-1 rounded-full bg-white/10' />
                                                <span className='text-primary/60 text-[9px] font-black tracking-widest uppercase'>
                                                    {t('serverStartup.compatible')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-white/5 opacity-0 transition-all group-hover:opacity-100'>
                                            <ChevronRight className='h-5 w-5' />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {currentStep === 3 && targetSpell && (
                    <div className='space-y-8'>
                        <div className='rounded-3xl border border-orange-500/10 bg-orange-500/5 p-8'>
                            <div className='flex items-start gap-6'>
                                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10'>
                                    <AlertTriangle className='h-7 w-7 text-orange-500' />
                                </div>
                                <div className='space-y-4'>
                                    <div className='space-y-1'>
                                        <h3 className='text-2xl font-black tracking-tight text-orange-500 uppercase'>
                                            {t('serverStartup.configureNewVariables')}
                                        </h3>
                                        <p className='font-medium text-orange-500/70'>
                                            {t('serverStartup.transitionTo')}{' '}
                                            <span className='text-foreground font-black uppercase underline decoration-2 underline-offset-4'>
                                                {targetSpell.name}
                                            </span>{' '}
                                            {t('serverStartup.requiresSettings')}
                                        </p>
                                    </div>

                                    <div className='flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4'>
                                        <div
                                            className='group/wipe relative flex cursor-pointer items-center select-none'
                                            onClick={() => setWipeFiles(!wipeFiles)}
                                        >
                                            <div
                                                className={cn(
                                                    'h-6 w-11 rounded-full border-2 transition-all duration-300',
                                                    wipeFiles
                                                        ? 'border-orange-500 bg-orange-500'
                                                        : 'border-white/10 bg-white/5',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-all duration-300',
                                                        wipeFiles ? 'translate-x-5' : 'translate-x-0',
                                                    )}
                                                />
                                            </div>
                                            <div className='ml-3'>
                                                <h4 className='text-xs font-black tracking-widest text-orange-500 uppercase'>
                                                    {t('serverStartup.wipeFilesOnSpellChange')}
                                                </h4>
                                                <p className='text-[10px] font-medium tracking-tighter text-orange-500/50 uppercase'>
                                                    {t('serverStartup.wipeFilesRecommendation')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {targetVariables.length === 0 ? (
                            <div className='bg-card/10 border-border/40 text-muted-foreground flex flex-col items-center justify-center space-y-4 rounded-3xl border border-dashed py-16 text-center'>
                                <Zap className='h-16 w-16 opacity-10' />
                                <p className='text-xs font-black tracking-widest uppercase opacity-50'>
                                    {t('serverStartup.unconfiguredVariables')}
                                </p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
                                {targetVariables.map((v) => (
                                    <div key={v.variable_id} className='group/var space-y-4'>
                                        <div className='ml-1 flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <div
                                                    className={cn(
                                                        'h-2 w-2 rounded-full transition-all duration-300',
                                                        variableErrors[v.variable_id]
                                                            ? 'bg-red-500'
                                                            : 'bg-primary/40 group-hover/var:bg-primary',
                                                    )}
                                                />
                                                <label className='text-muted-foreground group-hover/var:text-foreground text-xs font-black tracking-[0.15em] uppercase transition-all'>
                                                    {v.name}{' '}
                                                    {v.rules && v.rules.includes('required') && (
                                                        <span className='text-primary'>*</span>
                                                    )}
                                                </label>
                                            </div>
                                            {v.rules && v.rules.includes('required') && (
                                                <Badge
                                                    variant='outline'
                                                    className='border-primary/20 bg-primary/5 text-primary text-[8px] font-black tracking-widest uppercase'
                                                >
                                                    {t('serverStartup.required')}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className='relative'>
                                            <Input
                                                value={variableValues[v.variable_id] ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVariableValues((prev) => ({ ...prev, [v.variable_id]: val }));
                                                    validateOneVariable(v, val);
                                                }}
                                                disabled={saving}
                                                error={!!variableErrors[v.variable_id]}
                                                placeholder={v.default_value || t('serverStartup.enterValue')}
                                            />
                                        </div>

                                        {variableErrors[v.variable_id] ? (
                                            <p className='animate-in slide-in-from-left-2 ml-2 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                                {variableErrors[v.variable_id]}
                                            </p>
                                        ) : (
                                            v.description && (
                                                <p className='text-muted-foreground/40 ml-2 line-clamp-1 text-[9px] font-bold transition-all group-hover/var:line-clamp-none'>
                                                    {v.description}
                                                </p>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className='flex flex-col items-center border-t border-white/5 pt-8'>
                            <p className='text-muted-foreground/40 mb-6 text-[10px] font-black tracking-[0.2em] uppercase'>
                                {t('serverStartup.doubleCheckConfiguration')}
                            </p>
                            <Button
                                size='default'
                                variant='default'
                                onClick={handleSave}
                                disabled={saving}
                                className='h-14 px-16 text-lg'
                                loading={saving}
                            >
                                {saving ? (
                                    t('common.processing')
                                ) : (
                                    <>
                                        <Zap className='fill-primary-foreground mr-3 h-6 w-6' />
                                        {t('serverStartup.applyNewSoftware')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <WidgetRenderer widgets={getWidgets('server-startup-transfer-spell', 'bottom-of-page')} />
        </div>
    );
}
