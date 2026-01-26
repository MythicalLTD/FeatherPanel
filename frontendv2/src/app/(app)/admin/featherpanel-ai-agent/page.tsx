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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { adminSettingsApi, Setting } from '@/lib/admin-settings-api';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios, { isAxiosError } from 'axios';
import { MessageSquare, Settings as SettingsIcon, Sparkles, Zap, Save, AlertCircle, RefreshCw } from 'lucide-react';

export default function FeatherAiAgentPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [chatbotSettings, setChatbotSettings] = useState<Record<string, Setting> | null>(null);
    const [originalSettings, setOriginalSettings] = useState<Record<string, Setting> | null>(null);
    const [systemPrompt, setSystemPrompt] = useState<string>('');
    const [loadingSystemPrompt, setLoadingSystemPrompt] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-ai-agent');

    const fetchChatbotSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminSettingsApi.fetchSettings();
            if (response.success) {
                const chatbotCategory = response.data.organized_settings.chatbot;

                if (chatbotCategory && chatbotCategory.settings) {
                    setChatbotSettings(JSON.parse(JSON.stringify(chatbotCategory.settings)));
                    setOriginalSettings(JSON.parse(JSON.stringify(chatbotCategory.settings)));
                } else {
                    toast.error(t('admin.featherai_agent.config.load_failed'));
                }
            } else {
                toast.error(response.message || t('admin.featherai_agent.config.load_failed'));
            }
        } catch (error) {
            console.error('Error fetching chatbot settings:', error);
            toast.error(t('admin.featherai_agent.config.load_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchSystemPrompt = useCallback(async () => {
        setLoadingSystemPrompt(true);
        try {
            const { data } = await axios.get('/api/admin/settings/chatbot/system-prompt');
            if (data && data.success) {
                setSystemPrompt(data.data.system_prompt || '');
            } else {
                toast.error(t('admin.featherai_agent.config.prompt_load_failed'));
            }
        } catch (error) {
            console.error('Error fetching system prompt:', error);
            toast.error(t('admin.featherai_agent.config.prompt_load_failed'));
        } finally {
            setLoadingSystemPrompt(false);
        }
    }, [t]);

    useEffect(() => {
        fetchWidgets();
        fetchChatbotSettings();
        fetchSystemPrompt();
    }, [fetchChatbotSettings, fetchSystemPrompt, fetchWidgets]);

    const saveSettings = async () => {
        if (!chatbotSettings || !originalSettings) return;

        const settingsToUpdate: Record<string, string | number | boolean> = {};

        Object.entries(chatbotSettings).forEach(([key, setting]) => {
            const originalSetting = originalSettings[key];

            if (originalSetting && String(originalSetting.value) === String(setting.value)) {
                return;
            }

            if (setting.type === 'password') {
                if (setting.value === '••••••••' || setting.value === '') {
                    return;
                }
            }

            settingsToUpdate[key] = setting.value;
        });

        if (Object.keys(settingsToUpdate).length === 0) {
            toast.info(t('admin.featherai_agent.config.no_changes'));
            return;
        }

        setSaving(true);
        try {
            const result = await adminSettingsApi.updateSettings(settingsToUpdate);

            if (result.success) {
                toast.success(t('admin.featherai_agent.config.save_success'));
                fetchChatbotSettings();
            } else {
                toast.error(result.message || t('admin.featherai_agent.config.save_failed'));
            }
        } catch (error) {
            let message = t('admin.featherai_agent.config.save_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = error.response.data.message;
            }
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const resetSettings = () => {
        if (!originalSettings) return;
        setChatbotSettings(JSON.parse(JSON.stringify(originalSettings)));
        toast.info(t('admin.featherai_agent.config.reset_success'));
    };

    const getSettingValue = (key: string): string | number | boolean => {
        if (!chatbotSettings || !chatbotSettings[key]) return '';
        return chatbotSettings[key].value;
    };

    const updateSettingValue = (key: string, value: string | number | boolean) => {
        setChatbotSettings((prev) => {
            if (!prev || !prev[key]) return prev;
            return {
                ...prev,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [key]: { ...prev[key], value: value } as any,
            };
        });
    };

    const providerValue = String(getSettingValue('chatbot_ai_provider'));

    return (
        <div className='min-h-screen space-y-8 pb-12 '>
            <WidgetRenderer widgets={getWidgets('admin-ai-agent', 'top-of-page')} />
            <PageHeader
                title={t('admin.featherai_agent.title')}
                description={t('admin.featherai_agent.subtitle')}
                icon={Sparkles}
            />

            <WidgetRenderer widgets={getWidgets('admin-ai-agent', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('admin-ai-agent', 'before-content')} />

            <PageCard
                title={t('admin.featherai_agent.config.title')}
                description={t('admin.featherai_agent.config.subtitle')}
                icon={SettingsIcon}
            >
                {loading ? (
                    <div className='flex flex-col items-center justify-center py-16 text-center space-y-4'>
                        <RefreshCw className='h-12 w-12 text-primary animate-spin' />
                        <div className='space-y-1'>
                            <h3 className='text-lg font-semibold'>
                                {t('admin.featherai_agent.config.loading_settings')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('admin.featherai_agent.config.loading_settings_description')}
                            </p>
                        </div>
                    </div>
                ) : chatbotSettings ? (
                    <form
                        className='space-y-10'
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveSettings();
                        }}
                    >
                        <div className='rounded-2xl border border-primary/20 bg-primary/5 p-6'>
                            <div className='flex items-center justify-between gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-lg font-bold text-foreground'>
                                        {t('admin.featherai_agent.config.enable')}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t('admin.featherai_agent.config.enable_description')}
                                    </p>
                                </div>
                                <Switch
                                    checked={
                                        getSettingValue('chatbot_enabled') === 'true' ||
                                        getSettingValue('chatbot_enabled') === true
                                    }
                                    onCheckedChange={(checked) =>
                                        updateSettingValue('chatbot_enabled', checked ? 'true' : 'false')
                                    }
                                />
                            </div>
                        </div>

                        <div className='space-y-8'>
                            <div className='flex items-center gap-3 border-b pb-4'>
                                <div className='p-2 bg-primary/10 rounded-lg'>
                                    <SettingsIcon className='h-5 w-5 text-primary' />
                                </div>
                                <h3 className='text-xl font-bold'>
                                    {t('admin.featherai_agent.config.general_settings')}
                                </h3>
                            </div>

                            <div className='grid gap-8 md:grid-cols-2'>
                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.featherai_agent.config.ai_provider')}
                                        </Label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.featherai_agent.config.ai_provider_description')}
                                        </p>
                                    </div>
                                    <Select
                                        value={providerValue || 'basic'}
                                        onChange={(e) => updateSettingValue('chatbot_ai_provider', e.target.value)}
                                    >
                                        <option value='basic'>Basic (No AI)</option>
                                        <option value='google_gemini'>Google Gemini</option>
                                        <option value='openai'>OpenAI</option>
                                        <option value='openrouter'>OpenRouter</option>
                                        <option value='ollama'>Ollama (Self-hosted)</option>
                                        <option value='grok'>Grok (xAI)</option>
                                        <option value='perplexity'>Perplexity</option>
                                    </Select>
                                </div>

                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.featherai_agent.config.temperature')}
                                        </Label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.featherai_agent.config.temperature_description')}
                                        </p>
                                    </div>
                                    <Input
                                        type='number'
                                        min='0'
                                        max='1'
                                        step='0.1'
                                        className='h-12 border-primary/20 bg-background/50 focus:ring-primary'
                                        value={Number(getSettingValue('chatbot_temperature') || 0.7)}
                                        onChange={(e) =>
                                            updateSettingValue('chatbot_temperature', Number(e.target.value))
                                        }
                                    />
                                </div>

                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.featherai_agent.config.max_tokens')}
                                        </Label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.featherai_agent.config.max_tokens_description')}
                                        </p>
                                    </div>
                                    <Input
                                        type='number'
                                        min='1'
                                        max='8192'
                                        className='h-12 border-primary/20 bg-background/50 focus:ring-primary'
                                        value={Number(getSettingValue('chatbot_max_tokens') || 2048)}
                                        onChange={(e) =>
                                            updateSettingValue('chatbot_max_tokens', Number(e.target.value))
                                        }
                                    />
                                </div>

                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.featherai_agent.config.max_history')}
                                        </Label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.featherai_agent.config.max_history_description')}
                                        </p>
                                    </div>
                                    <Input
                                        type='number'
                                        min='1'
                                        max='50'
                                        className='h-12 border-primary/20 bg-background/50 focus:ring-primary'
                                        value={Number(getSettingValue('chatbot_max_history') || 10)}
                                        onChange={(e) =>
                                            updateSettingValue('chatbot_max_history', Number(e.target.value))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {providerValue !== 'basic' && providerValue !== '' && (
                            <div className='rounded-3xl border border-primary/20 bg-muted/20 p-8 space-y-8 animate-in slide-in-from-left-4 duration-500'>
                                <div className='flex items-center gap-3'>
                                    <Badge variant='outline' className='px-4 py-1 text-xs font-bold uppercase'>
                                        {providerValue.split('_').join(' ')}
                                    </Badge>
                                </div>

                                <div className='grid gap-8 md:grid-cols-2'>
                                    {providerValue === 'google_gemini' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>API Key</Label>
                                                <Input
                                                    type='password'
                                                    placeholder='Enter API key to change'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_google_ai_api_key') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_google_ai_api_key', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Model</Label>
                                                <Input
                                                    placeholder='gemini-2.0-flash'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_google_ai_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_google_ai_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {providerValue === 'openai' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>API Key</Label>
                                                <Input
                                                    type='password'
                                                    placeholder='Enter API key to change'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_openai_api_key') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_openai_api_key', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Model</Label>
                                                <Input
                                                    placeholder='gpt-4o-mini'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_openai_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_openai_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3 md:col-span-2'>
                                                <Label className='text-sm font-semibold'>Base URL</Label>
                                                <Input
                                                    placeholder='https://api.openai.com'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_openai_base_url') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_openai_base_url', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {providerValue === 'openrouter' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>API Key</Label>
                                                <Input
                                                    type='password'
                                                    placeholder='Enter API key to change'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_openrouter_api_key') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_openrouter_api_key', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Model</Label>
                                                <Input
                                                    placeholder='openai/gpt-4o-mini'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_openrouter_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_openrouter_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {providerValue === 'ollama' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Base URL</Label>
                                                <Input
                                                    placeholder='http://localhost:11434'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_ollama_base_url') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_ollama_base_url', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Model</Label>
                                                <Input
                                                    placeholder='llama3.2'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_ollama_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_ollama_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {providerValue === 'grok' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>xAI (Grok) API Key</Label>
                                                <Input
                                                    type='password'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_grok_api_key') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_grok_api_key', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>xAI (Grok) Model</Label>
                                                <Input
                                                    placeholder='grok-2-1212'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_grok_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_grok_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {providerValue === 'perplexity' && (
                                        <>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>API Key</Label>
                                                <Input
                                                    type='password'
                                                    placeholder='Enter API key to change'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_perplexity_api_key') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_perplexity_api_key', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3'>
                                                <Label className='text-sm font-semibold'>Model</Label>
                                                <Input
                                                    placeholder='sonar-pro'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_perplexity_model') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue('chatbot_perplexity_model', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-3 md:col-span-2'>
                                                <Label className='text-sm font-semibold'>Base URL</Label>
                                                <Input
                                                    placeholder='https://api.perplexity.ai'
                                                    className='h-12'
                                                    value={String(getSettingValue('chatbot_perplexity_base_url') || '')}
                                                    onChange={(e) =>
                                                        updateSettingValue(
                                                            'chatbot_perplexity_base_url',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className='space-y-10'>
                            <div className='space-y-8'>
                                <div className='flex items-center justify-between border-b pb-4'>
                                    <div className='flex items-center gap-3'>
                                        <div className='p-2 bg-primary/10 rounded-lg'>
                                            <Zap className='h-5 w-5 text-primary' />
                                        </div>
                                        <h3 className='text-xl font-bold'>
                                            {t('admin.featherai_agent.config.system_prompt_core')}
                                        </h3>
                                    </div>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        disabled={loadingSystemPrompt}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            fetchSystemPrompt();
                                        }}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loadingSystemPrompt ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>

                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.featherai_agent.config.system_prompt_core_readonly')}
                                        </Label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.featherai_agent.config.system_prompt_core_description')}
                                        </p>
                                    </div>
                                    <Textarea
                                        readOnly
                                        disabled
                                        className='min-h-[200px] font-mono text-xs bg-muted/50 resize-none'
                                        value={systemPrompt}
                                    />
                                </div>
                            </div>

                            <div className='space-y-8'>
                                <div className='flex items-center gap-3 border-b pb-4'>
                                    <div className='p-2 bg-primary/10 rounded-lg'>
                                        <MessageSquare className='h-5 w-5 text-primary' />
                                    </div>
                                    <h3 className='text-xl font-bold'>
                                        {t('admin.featherai_agent.config.custom_prompts')}
                                    </h3>
                                </div>

                                <div className='grid gap-8'>
                                    <div className='space-y-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.featherai_agent.config.custom_system_prompt')}
                                            </Label>
                                            <p className='text-xs text-muted-foreground'>
                                                {t('admin.featherai_agent.config.custom_system_prompt_description')}
                                            </p>
                                        </div>
                                        <Textarea
                                            placeholder='You are a helpful assistant for FeatherPanel...'
                                            maxLength={1000}
                                            className='min-h-[120px] focus:ring-primary border-primary/20'
                                            value={String(getSettingValue('chatbot_system_prompt') || '')}
                                            onChange={(e) =>
                                                updateSettingValue('chatbot_system_prompt', e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className='space-y-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.featherai_agent.config.custom_user_prompt')}
                                            </Label>
                                            <p className='text-xs text-muted-foreground'>
                                                {t('admin.featherai_agent.config.custom_user_prompt_description')}
                                            </p>
                                        </div>
                                        <Textarea
                                            placeholder='User is an admin with full access...'
                                            maxLength={1000}
                                            className='min-h-[120px] focus:ring-primary border-primary/20'
                                            value={String(getSettingValue('chatbot_user_prompt') || '')}
                                            onChange={(e) => updateSettingValue('chatbot_user_prompt', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex items-center justify-end gap-3 pt-8 border-t'>
                            <Button variant='outline' className='h-12 px-8' onClick={resetSettings}>
                                Reset
                            </Button>
                            <Button
                                type='submit'
                                size='lg'
                                className='h-12 px-8 gap-2 shadow-lg shadow-primary/20'
                                disabled={saving}
                            >
                                {saving ? <RefreshCw className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className='flex flex-col items-center justify-center py-16 text-center space-y-4'>
                        <AlertCircle className='h-12 w-12 text-destructive' />
                        <div className='space-y-1'>
                            <h3 className='text-lg font-semibold'>{t('admin.featherai_agent.config.load_failed')}</h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('admin.featherai_agent.config.load_failed_description')}
                            </p>
                        </div>
                        <Button onClick={fetchChatbotSettings} variant='outline' className='mt-4'>
                            <RefreshCw className='h-4 w-4 mr-2' />
                            Try Again
                        </Button>
                    </div>
                )}
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-ai-agent', 'bottom-of-page')} />
        </div>
    );
}
