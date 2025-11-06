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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-vue-next';

interface BannedIpEntry {
    ip: string;
    created: string;
    source: string;
    expires: string;
    reason: string;
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

const entries = reactive<BannedIpEntry[]>(parseContent(props.content));

watch(
    () => props.content,
    (newContent) => {
        entries.splice(0, entries.length, ...parseContent(newContent));
    },
);

function parseContent(content: string): BannedIpEntry[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                ip: toString(item?.ip),
                created: toString(item?.created),
                source: toString(item?.source),
                expires: toString(item?.expires),
                reason: toString(item?.reason),
            }));
        }
    } catch (error) {
        console.warn('Failed to parse banned-ips.json:', error);
    }
    return [];
}

function toString(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

const handleAdd = () => {
    entries.push({
        ip: '',
        created: '',
        source: '(Unknown)',
        expires: 'forever',
        reason: 'Banned by an operator.',
    });
};

const handleRemove = (index: number) => {
    entries.splice(index, 1);
};

const handleSave = () => {
    const sanitized = entries.map((entry) => ({
        ip: entry.ip.trim(),
        created: entry.created.trim(),
        source: entry.source.trim() || '(Unknown)',
        expires: entry.expires.trim() || 'forever',
        reason: entry.reason.trim() || 'Banned by an operator.',
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
                        {{ t('bannedIpsConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('bannedIpsConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('bannedIpsConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('bannedIpsConfig.actions.saving') }}</span>
                        <span v-else>{{ t('bannedIpsConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-6 p-6">
            <section class="space-y-3">
                <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
                    {{ t('bannedIpsConfig.notice') }}
                </div>
                <div class="flex justify-end">
                    <Button size="sm" variant="outline" class="gap-2" :disabled="props.readonly" @click="handleAdd">
                        <Plus class="h-4 w-4" />
                        {{ t('bannedIpsConfig.actions.add') }}
                    </Button>
                </div>
                <div
                    v-if="entries.length === 0"
                    class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                >
                    {{ t('bannedIpsConfig.emptyState') }}
                </div>
                <div
                    v-for="(entry, index) in entries"
                    :key="`banned-ip-${index}`"
                    class="space-y-3 rounded-lg border p-4 shadow-sm"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-2 flex-1">
                            <Label :for="`banned-ip-${index}`" class="text-sm font-semibold">
                                {{ t('bannedIpsConfig.fields.ip') }}
                            </Label>
                            <Input
                                :id="`banned-ip-${index}`"
                                v-model="entry.ip"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="192.168.0.1"
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
                            <Label class="text-sm font-semibold" :for="`banned-ip-created-${index}`">
                                {{ t('bannedIpsConfig.fields.created') }}
                            </Label>
                            <Input
                                :id="`banned-ip-created-${index}`"
                                v-model="entry.created"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="2025-01-01 12:00:00 +0000"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label class="text-sm font-semibold" :for="`banned-ip-source-${index}`">
                                {{ t('bannedIpsConfig.fields.source') }}
                            </Label>
                            <Input
                                :id="`banned-ip-source-${index}`"
                                v-model="entry.source"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="(Unknown)"
                            />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label class="text-sm font-semibold" :for="`banned-ip-expires-${index}`">
                                {{ t('bannedIpsConfig.fields.expires') }}
                            </Label>
                            <Input
                                :id="`banned-ip-expires-${index}`"
                                v-model="entry.expires"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="forever"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label class="text-sm font-semibold" :for="`banned-ip-reason-${index}`">
                                {{ t('bannedIpsConfig.fields.reason') }}
                            </Label>
                            <Textarea
                                :id="`banned-ip-reason-${index}`"
                                v-model="entry.reason"
                                rows="2"
                                :readonly="props.readonly"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>
