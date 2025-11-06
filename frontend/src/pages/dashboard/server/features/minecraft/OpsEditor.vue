<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-vue-next';

interface OpEntry {
    uuid: string;
    name: string;
    level: number;
    bypassesPlayerLimit: boolean;
}

const props = withDefaults(
    defineProps<{
        content: string;
        readonly?: boolean;
        saving?: boolean;
    }>(),
    {
        readonly: false,
        saving: false,
    },
);

const emit = defineEmits<{
    save: [content: string];
    switchToRaw: [];
}>();

const { t } = useI18n();

const entries = reactive<OpEntry[]>(parseContent(props.content));

watch(
    () => props.content,
    (newContent) => {
        entries.splice(0, entries.length, ...parseContent(newContent));
    },
);

function parseContent(content: string): OpEntry[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                uuid: toString(item?.uuid),
                name: toString(item?.name),
                level: toNumber(item?.level, 0),
                bypassesPlayerLimit: toBoolean(item?.bypassesPlayerLimit, false),
            }));
        }
    } catch (error) {
        console.warn('Failed to parse ops.json:', error);
    }
    return [];
}

function toString(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

function toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
}

const handleAdd = () => {
    entries.push({
        uuid: '',
        name: '',
        level: 4,
        bypassesPlayerLimit: true,
    });
};

const handleRemove = (index: number) => {
    entries.splice(index, 1);
};

const handleSave = () => {
    const sanitized = entries.map((entry) => ({
        uuid: entry.uuid.trim(),
        name: entry.name.trim(),
        level: Number.isFinite(entry.level) ? Math.max(0, Math.min(4, Math.round(entry.level))) : 0,
        bypassesPlayerLimit: entry.bypassesPlayerLimit,
    }));
    emit('save', `${JSON.stringify(sanitized, null, 4)}\n`);
};

const handleSwitchToRaw = () => {
    emit('switchToRaw');
};
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader class="border-b border-border/40">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="space-y-2">
                    <CardTitle class="text-2xl font-bold">
                        {{ t('opsConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('opsConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('opsConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('opsConfig.actions.saving') }}</span>
                        <span v-else>{{ t('opsConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-6 p-6">
            <section class="space-y-3">
                <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
                    {{ t('opsConfig.notice') }}
                </div>
                <div class="flex justify-end">
                    <Button size="sm" variant="outline" class="gap-2" :disabled="props.readonly" @click="handleAdd">
                        <Plus class="h-4 w-4" />
                        {{ t('opsConfig.actions.add') }}
                    </Button>
                </div>
                <div
                    v-if="entries.length === 0"
                    class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                >
                    {{ t('opsConfig.emptyState') }}
                </div>
                <div
                    v-for="(entry, index) in entries"
                    :key="`op-${index}`"
                    class="space-y-3 rounded-lg border p-4 shadow-sm"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-2 flex-1">
                            <Label :for="`op-uuid-${index}`" class="text-sm font-semibold">
                                {{ t('opsConfig.fields.uuid') }}
                            </Label>
                            <Input
                                :id="`op-uuid-${index}`"
                                v-model="entry.uuid"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="00000000-0000-0000-0000-000000000000"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="text-muted-foreground hover:text-destructive"
                            :disabled="props.readonly"
                            @click="handleRemove(index)"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label :for="`op-name-${index}`" class="text-sm font-semibold">
                                {{ t('opsConfig.fields.name') }}
                            </Label>
                            <Input
                                :id="`op-name-${index}`"
                                v-model="entry.name"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="PlayerName"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label :for="`op-level-${index}`" class="text-sm font-semibold">
                                {{ t('opsConfig.fields.level') }}
                            </Label>
                            <Input
                                :id="`op-level-${index}`"
                                v-model.number="entry.level"
                                type="number"
                                min="0"
                                max="4"
                                :readonly="props.readonly"
                            />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label :for="`op-bypass-${index}`" class="text-sm font-semibold">
                            {{ t('opsConfig.fields.bypassesPlayerLimit') }}
                        </Label>
                        <div class="flex items-center gap-3">
                            <input
                                :id="`op-bypass-${index}`"
                                v-model="entry.bypassesPlayerLimit"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="ops-checkbox"
                            />
                            <span class="text-sm text-muted-foreground">
                                {{
                                    entry.bypassesPlayerLimit
                                        ? t('opsConfig.fields.enabled')
                                        : t('opsConfig.fields.disabled')
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>

<style scoped>
.ops-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.4rem;
    border: 2px solid hsl(var(--border));
    background-color: hsl(var(--background));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.ops-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.ops-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.ops-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.ops-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.ops-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.ops-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.ops-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.ops-checkbox:disabled::after {
    background-color: transparent;
}
</style>
