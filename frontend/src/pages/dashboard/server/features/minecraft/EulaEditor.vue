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
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft } from 'lucide-vue-next';

interface EulaState {
    headerLines: string[];
    accepted: boolean;
    footerLines: string[];
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

const state = reactive<EulaState>(parseEulaFile(props.content));

watch(
    () => props.content,
    (newContent) => {
        const parsed = parseEulaFile(newContent);
        state.headerLines = parsed.headerLines;
        state.footerLines = parsed.footerLines;
        state.accepted = parsed.accepted;
    },
);

function parseEulaFile(content: string): EulaState {
    const lines = content.split(/\r?\n/);
    const headerLines: string[] = [];
    const footerLines: string[] = [];
    let accepted = false;
    let eulaLineFound = false;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('eula=')) {
            eulaLineFound = true;
            accepted = trimmed.split('=')[1]?.toLowerCase() === 'true';
        } else if (!eulaLineFound) {
            headerLines.push(line);
        } else {
            footerLines.push(line);
        }
    });

    return {
        headerLines,
        accepted,
        footerLines: footerLines.filter((line, index, array) => !(line === '' && index === array.length - 1)),
    };
}

const handleSave = () => {
    const header = state.headerLines.join('\n');
    const footer = state.footerLines.length > 0 ? `\n${state.footerLines.join('\n')}` : '';
    const eulaLine = `eula=${state.accepted ? 'true' : 'false'}`;
    const output = [header, eulaLine].filter((section) => section.length > 0).join('\n');
    emit('save', `${output}${footer}`);
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
                        {{ t('eulaConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('eulaConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('eulaConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('eulaConfig.actions.saving') }}</span>
                        <span v-else>{{ t('eulaConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-6 p-6">
            <section class="space-y-3">
                <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                    {{ t('eulaConfig.notice') }}
                </div>
                <div class="space-y-2">
                    <Label for="eula-toggle" class="text-sm font-semibold">
                        {{ t('eulaConfig.fields.accept.label') }}
                    </Label>
                    <div class="flex items-center gap-3">
                        <input
                            id="eula-toggle"
                            v-model="state.accepted"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="eula-checkbox"
                        />
                        <span class="text-sm text-muted-foreground">
                            {{
                                state.accepted
                                    ? t('eulaConfig.fields.accept.true')
                                    : t('eulaConfig.fields.accept.false')
                            }}
                        </span>
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>

<style scoped>
.eula-checkbox {
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

.eula-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.eula-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.eula-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.eula-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.eula-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.eula-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.eula-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.eula-checkbox:disabled::after {
    background-color: transparent;
}
</style>
