<template>
    <Dialog :open="isOpen" @update:open="handleClose">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{{ t('features.javaVersion.title') }}</DialogTitle>
                <DialogDescription>
                    {{ t('features.javaVersion.description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-4">
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p class="text-sm text-red-800 dark:text-red-200">
                        {{ detectedIssue }}
                    </p>
                </div>

                <div class="space-y-3">
                    <p class="text-sm text-muted-foreground">
                        {{ t('features.javaVersion.recommendation') }}
                    </p>

                    <div v-if="availableDockerImages.length > 0" class="space-y-2">
                        <Label>{{ t('serverStartup.availableImages') }}</Label>
                        <div class="grid gap-2">
                            <Button
                                v-for="(img, key) in availableDockerImages"
                                :key="key"
                                variant="outline"
                                size="sm"
                                class="justify-start text-left"
                                @click="selectDockerImage(img.value)"
                            >
                                <span class="font-medium mr-2">{{ img.label }}:</span>
                                <span class="text-xs text-muted-foreground truncate">{{ img.value }}</span>
                            </Button>
                        </div>
                    </div>

                    <div v-if="selectedImage" class="bg-muted p-3 rounded-lg">
                        <Label class="text-xs">{{ t('features.javaVersion.selectedImage') }}</Label>
                        <p class="text-sm font-mono mt-1">{{ selectedImage }}</p>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleClose">
                    {{ t('common.cancel') }}
                </Button>
                <Button :disabled="!selectedImage || updating" @click="updateDockerImage">
                    {{ updating ? t('common.saving') : t('features.javaVersion.updateImage') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

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

import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Server } from '@/types/server';

const props = defineProps<{
    isOpen: boolean;
    server: Server;
    detectedIssue: string;
}>();

const emit = defineEmits<{
    close: [];
    updated: [];
}>();

const { t } = useI18n();
const toast = useToast();

const updating = ref(false);
const selectedImage = ref<string>('');

// Parse available docker images from spell
const availableDockerImages = computed(() => {
    if (!props.server.spell) return [];

    try {
        const dockerImages = props.server.spell.docker_images;
        if (!dockerImages) return [];

        const dockerObj =
            typeof dockerImages === 'string' ? (JSON.parse(dockerImages) as Record<string, string>) : dockerImages;

        return Object.entries(dockerObj).map(([label, value]) => ({ label, value }));
    } catch {
        return [];
    }
});

function selectDockerImage(image: string): void {
    selectedImage.value = image;
}

async function updateDockerImage(): Promise<void> {
    if (!selectedImage.value) return;

    try {
        updating.value = true;

        const { data } = await axios.put(`/api/user/servers/${props.server.uuidShort}`, {
            image: selectedImage.value,
        });

        if (!data.success) {
            throw new Error(data.message || 'Failed to update Docker image');
        }

        toast.success(t('features.javaVersion.imageUpdated'));
        emit('updated');
        handleClose();
    } catch (error) {
        console.error('Failed to update Docker image:', error);
        toast.error(t('features.javaVersion.failedToUpdate'));
    } finally {
        updating.value = false;
    }
}

function handleClose(): void {
    selectedImage.value = '';
    emit('close');
}
</script>
