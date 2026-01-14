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

    // Permission checks
    const canChangeSpell = isEnabled(settings?.server_allow_egg_change);

    // State
    const [server, setServer] = React.useState<(Server & { variables: Variable[] }) | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [variableValues, setVariableValues] = React.useState<Record<number, string>>({});
    const [variableErrors, setVariableErrors] = React.useState<Record<number, string>>({});

    // Step state
    const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

    // Selection state
    const [availableRealms, setAvailableRealms] = React.useState<ServerRealm[]>([]);
    const [loadingRealms, setLoadingRealms] = React.useState(false);
    const [selectedRealmId, setSelectedRealmId] = React.useState<string>('');

    const [availableSpells, setAvailableSpells] = React.useState<ServerSpell[]>([]);
    const [loadingSpells, setLoadingSpells] = React.useState(false);
    const [selectedSpellId, setSelectedSpellId] = React.useState<string>('');

    // Changing spell details
    const [targetSpell, setTargetSpell] = React.useState<ServerSpell | null>(null);
    const [targetVariables, setTargetVariables] = React.useState<Variable[]>([]);
    const [wipeFiles, setWipeFiles] = React.useState(false);

    // Validation Logic Helpers
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

    // Data Fetching
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
                        // If restricted, jump to Step 2
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

    // Interaction Handlers
    const handleRealmSelect = (realmId: string) => {
        // Cross-realm check
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
        // Prevent going back to Step 1 if cross-realm is disabled
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

        // Final Validation
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
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canChangeSpell) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 '>
                <div className='relative'>
                    <div className='absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150' />
                    <div className='relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black uppercase tracking-tight'>
                        {t('serverStartup.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverStartup.noStartupPermission')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 rounded-2xl h-14 px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='max-w-6xl mx-auto space-y-8 pb-16  font-sans'>
            <WidgetRenderer widgets={getWidgets('server-startup-transfer-spell', 'top-of-page')} />
            {/* Header Section */}
            <PageHeader
                title={t('navigation.items.transferSpell')}
                description={t('serverStartup.spellSelectionHelp')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='plain'
                            size='default'
                            onClick={() => handleBackToStep(1)}
                            disabled={currentStep === 1 || saving}
                            className='bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-[10px]'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleSave}
                            disabled={currentStep !== 3 || saving || Object.keys(variableErrors).length > 0}
                            loading={saving}
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Zap className='h-5 w-5 mr-3' />
                                    {t('serverStartup.applySpellChange')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-startup-transfer-spell', 'after-header')} />

            {/* Step Indicator */}
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
                            'relative overflow-hidden p-4 rounded-xl border transition-all duration-300',
                            currentStep === s.step
                                ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5'
                                : currentStep > s.step && !s.disabled
                                  ? 'bg-emerald-500/5 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10'
                                  : 'bg-white/5 border-white/5 opacity-40',
                            s.disabled && currentStep !== s.step && 'cursor-not-allowed',
                        )}
                    >
                        <div className='flex items-center justify-between'>
                            <span
                                className={cn(
                                    'text-[10px] font-black uppercase tracking-widest',
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
                                <Check className='h-4 w-4 text-emerald-500 animate-in zoom-in-0 duration-500' />
                            )}
                        </div>
                        <h3
                            className={cn(
                                'text-sm font-bold uppercase tracking-tight mt-1',
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

            {/* Content Area */}
            <div className='relative min-h-[400px]'>
                {/* Step 1: Realm Selection */}
                {currentStep === 1 && (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 '>
                        {loadingRealms ? (
                            <div className='col-span-full flex items-center justify-center py-12'>
                                <Loader2 className='h-8 w-8 animate-spin text-primary opacity-50' />
                            </div>
                        ) : (
                            availableRealms.map((realm) => (
                                <div
                                    key={realm.id}
                                    onClick={() => handleRealmSelect(String(realm.id))}
                                    className={cn(
                                        'group relative overflow-hidden p-8 rounded-3xl bg-card/10 border border-white/5 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 cursor-pointer',
                                        selectedRealmId === String(realm.id) && 'border-primary/50 bg-primary/5',
                                    )}
                                >
                                    <div className='absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors' />
                                    <div className='space-y-4 relative z-10'>
                                        <div className='h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-primary/5'>
                                            <Boxes className='h-7 w-7 text-primary' />
                                        </div>
                                        <div>
                                            <h3 className='text-2xl font-black uppercase tracking-tight'>
                                                {realm.name}
                                            </h3>
                                            <p className='text-muted-foreground text-sm font-medium mt-1 leading-relaxed line-clamp-2'>
                                                {realm.description || t('serverStartup.discoverRealmsHelp')}
                                            </p>
                                        </div>
                                        <div className='pt-2 flex items-center text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0'>
                                            {t('serverStartup.viewSpells')} <ChevronRight className='h-3 w-3 ml-1' />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Step 2: Spell Selection */}
                {currentStep === 2 && (
                    <div className='space-y-8 '>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {loadingSpells ? (
                                <div className='col-span-full flex items-center justify-center py-12'>
                                    <Loader2 className='h-8 w-8 animate-spin text-primary opacity-50' />
                                </div>
                            ) : (
                                availableSpells.map((spell) => (
                                    <div
                                        key={spell.id}
                                        onClick={() => handleSpellSelect(String(spell.id))}
                                        className={cn(
                                            'group flex items-center gap-6 p-6 rounded-3xl bg-card/20 border border-white/5 hover:border-primary/30 hover:bg-card/40 transition-all duration-300 cursor-pointer',
                                            selectedSpellId === String(spell.id) && 'border-primary/40 bg-primary/5',
                                        )}
                                    >
                                        <div className='h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/20 transition-all'>
                                            <Zap
                                                className={cn(
                                                    'h-8 w-8 transition-colors',
                                                    selectedSpellId === String(spell.id)
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground group-hover:text-primary/70',
                                                )}
                                            />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <h3 className='text-xl font-bold uppercase tracking-tight truncate'>
                                                {spell.name}
                                            </h3>
                                            <div className='flex items-center gap-2 mt-0.5'>
                                                <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50'>
                                                    {t('serverStartup.apiId', { id: String(spell.id) })}
                                                </span>
                                                <div className='h-1 w-1 rounded-full bg-white/10' />
                                                <span className='text-[9px] font-black uppercase tracking-widest text-primary/60'>
                                                    {t('serverStartup.compatible')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='h-10 w-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all'>
                                            <ChevronRight className='h-5 w-5' />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Variable Configuration */}
                {currentStep === 3 && targetSpell && (
                    <div className='space-y-8 '>
                        <div className='bg-orange-500/5 border border-orange-500/10 rounded-3xl p-8 shadow-xl'>
                            <div className='flex items-start gap-6'>
                                <div className='h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0 shadow-lg shadow-orange-500/5'>
                                    <AlertTriangle className='h-7 w-7 text-orange-500' />
                                </div>
                                <div className='space-y-4'>
                                    <div className='space-y-1'>
                                        <h3 className='text-2xl font-black uppercase tracking-tight text-orange-500'>
                                            {t('serverStartup.configureNewVariables')}
                                        </h3>
                                        <p className='text-orange-500/70 font-medium'>
                                            {t('serverStartup.transitionTo')}{' '}
                                            <span className='text-foreground font-black uppercase underline decoration-2 underline-offset-4'>
                                                {targetSpell.name}
                                            </span>{' '}
                                            {t('serverStartup.requiresSettings')}
                                        </p>
                                    </div>

                                    <div className='flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5'>
                                        <div
                                            className='relative flex items-center cursor-pointer select-none group/wipe'
                                            onClick={() => setWipeFiles(!wipeFiles)}
                                        >
                                            <div
                                                className={cn(
                                                    'h-6 w-11 rounded-full transition-all duration-300 border-2',
                                                    wipeFiles
                                                        ? 'bg-orange-500 border-orange-500'
                                                        : 'bg-white/5 border-white/10',
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
                                                <h4 className='text-xs font-black uppercase tracking-widest text-orange-500'>
                                                    {t('serverStartup.wipeFilesOnSpellChange')}
                                                </h4>
                                                <p className='text-[10px] text-orange-500/50 font-medium uppercase tracking-tighter'>
                                                    {t('serverStartup.wipeFilesRecommendation')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {targetVariables.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-16 text-center space-y-4 bg-card/10 rounded-3xl border border-dashed border-border/40 text-muted-foreground'>
                                <Zap className='h-16 w-16 opacity-10' />
                                <p className='font-black uppercase tracking-widest text-xs opacity-50'>
                                    {t('serverStartup.unconfiguredVariables')}
                                </p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                                {targetVariables.map((v) => (
                                    <div key={v.variable_id} className='group/var space-y-4'>
                                        <div className='flex items-center justify-between ml-1'>
                                            <div className='flex items-center gap-3'>
                                                <div
                                                    className={cn(
                                                        'h-2 w-2 rounded-full transition-all duration-300',
                                                        variableErrors[v.variable_id]
                                                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                            : 'bg-primary/40 group-hover/var:bg-primary',
                                                    )}
                                                />
                                                <label className='text-xs font-black uppercase tracking-[0.15em] text-muted-foreground group-hover/var:text-foreground transition-all'>
                                                    {v.name}{' '}
                                                    {v.rules && v.rules.includes('required') && (
                                                        <span className='text-primary'>*</span>
                                                    )}
                                                </label>
                                            </div>
                                            {v.rules && v.rules.includes('required') && (
                                                <Badge
                                                    variant='outline'
                                                    className='text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary'
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
                                            <p className='text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest animate-in slide-in-from-left-2'>
                                                {variableErrors[v.variable_id]}
                                            </p>
                                        ) : (
                                            v.description && (
                                                <p className='text-[9px] font-bold text-muted-foreground/40 ml-2 line-clamp-1 group-hover/var:line-clamp-none transition-all'>
                                                    {v.description}
                                                </p>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className='pt-8 border-t border-white/5 flex flex-col items-center'>
                            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-6'>
                                {t('serverStartup.doubleCheckConfiguration')}
                            </p>
                            <Button
                                size='default'
                                variant='default'
                                onClick={handleSave}
                                disabled={saving}
                                className='h-14 px-16 text-lg' // Keeping large custom size but using component
                                loading={saving}
                            >
                                {saving ? (
                                    t('common.processing')
                                ) : (
                                    <>
                                        <Zap className='h-6 w-6 mr-3 fill-primary-foreground' />
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
