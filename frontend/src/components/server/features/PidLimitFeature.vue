<template>
    <Dialog :open="isOpen" @update:open="handleClose">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{{ t('features.pidLimit.title') }}</DialogTitle>
                <DialogDescription>
                    {{ t('features.pidLimit.description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-4">
                <div
                    class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
                >
                    <p class="text-sm text-orange-800 dark:text-orange-200">
                        {{ t('features.pidLimit.explanation') }}
                    </p>
                </div>

                <div class="space-y-3">
                    <p class="text-sm text-muted-foreground">
                        {{ t('features.pidLimit.suggestions') }}
                    </p>

                    <ul class="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>{{ t('features.pidLimit.suggestion1') }}</li>
                        <li>{{ t('features.pidLimit.suggestion2') }}</li>
                        <li>{{ t('features.pidLimit.suggestion3') }}</li>
                    </ul>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleClose">
                    {{ t('common.close') }}
                </Button>
                <Button :disabled="restarting" @click="restartServer">
                    {{ restarting ? t('serverConsole.serverRestarting') : t('features.pidLimit.restartServer') }}
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

import { ref } from 'vue';
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
import type { Server } from '@/composables/types/server';

const props = defineProps<{
    isOpen: boolean;
    server: Server;
}>();

const emit = defineEmits<{
    close: [];
    restarted: [];
}>();

const { t } = useI18n();
const toast = useToast();

const restarting = ref(false);

async function restartServer(): Promise<void> {
    try {
        restarting.value = true;

        const { data } = await axios.post(`/api/user/servers/${props.server.uuidShort}/power`, {
            action: 'restart',
        });

        if (!data.success) {
            throw new Error(data.message || 'Failed to restart server');
        }

        toast.success(t('features.pidLimit.serverRestarted'));
        emit('restarted');
        handleClose();
    } catch (error) {
        console.error('Failed to restart server:', error);
        toast.error(t('serverConsole.failedToRestartServer'));
    } finally {
        restarting.value = false;
    }
}

function handleClose(): void {
    emit('close');
}
</script>
