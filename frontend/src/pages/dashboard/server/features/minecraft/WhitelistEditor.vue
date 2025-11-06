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

interface WhitelistEntry {
    uuid: string;
    name: string;
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

const entries = reactive<WhitelistEntry[]>(parseContent(props.content));

watch(
    () => props.content,
    (newContent) => {
        entries.splice(0, entries.length, ...parseContent(newContent));
    },
);

function parseContent(content: string): WhitelistEntry[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                uuid: toString(item?.uuid),
                name: toString(item?.name),
            }));
        }
    } catch (error) {
        console.warn('Failed to parse whitelist.json:', error);
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
        uuid: '',
        name: '',
    });
};

const handleRemove = (index: number) => {
    entries.splice(index, 1);
};

const handleSave = () => {
    const sanitized = entries.map((entry) => ({
        uuid: entry.uuid.trim(),
        name: entry.name.trim(),
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
                        {{ t('whitelistConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('whitelistConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('whitelistConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('whitelistConfig.actions.saving') }}</span>
                        <span v-else>{{ t('whitelistConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-6 p-6">
            <section class="space-y-3">
                <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
                    {{ t('whitelistConfig.notice') }}
                </div>
                <div class="flex justify-end">
                    <Button size="sm" variant="outline" class="gap-2" :disabled="props.readonly" @click="handleAdd">
                        <Plus class="h-4 w-4" />
                        {{ t('whitelistConfig.actions.add') }}
                    </Button>
                </div>
                <div
                    v-if="entries.length === 0"
                    class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                >
                    {{ t('whitelistConfig.emptyState') }}
                </div>
                <div
                    v-for="(entry, index) in entries"
                    :key="`whitelist-${index}`"
                    class="space-y-3 rounded-lg border p-4 shadow-sm"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-2 flex-1">
                            <Label :for="`whitelist-uuid-${index}`" class="text-sm font-semibold">
                                {{ t('whitelistConfig.fields.uuid') }}
                            </Label>
                            <Input
                                :id="`whitelist-uuid-${index}`"
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
                    <div class="space-y-2">
                        <Label :for="`whitelist-name-${index}`" class="text-sm font-semibold">
                            {{ t('whitelistConfig.fields.name') }}
                        </Label>
                        <Input
                            :id="`whitelist-name-${index}`"
                            v-model="entry.name"
                            type="text"
                            :readonly="props.readonly"
                            placeholder="PlayerName"
                        />
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>
