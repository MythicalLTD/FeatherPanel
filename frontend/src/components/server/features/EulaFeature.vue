<template>
    <Dialog :open="isOpen" @update:open="handleClose">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <AlertCircle class="h-5 w-5 text-yellow-500" />
                    {{ t('features.eula.title') }}
                </DialogTitle>
                <DialogDescription>
                    {{ t('features.eula.description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-4">
                <div
                    class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                >
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">
                        {{ t('features.eula.eulaMessage') }}
                    </p>
                </div>

                <div class="space-y-2">
                    <p class="text-sm text-muted-foreground">
                        {{ t('features.eula.eulaExplanation') }}
                    </p>
                    <a
                        href="https://www.minecraft.net/en-us/eula"
                        target="_blank"
                        class="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        {{ t('features.eula.readEula') }}
                        <ExternalLink class="h-3 w-3" />
                    </a>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleClose">{{ t('common.cancel') }}</Button>
                <Button :disabled="accepting" @click="acceptEula">
                    <span v-if="accepting">{{ t('features.eula.accepting') }}</span>
                    <span v-else>{{ t('features.eula.accept') }}</span>
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
import { AlertCircle, ExternalLink } from 'lucide-vue-next';

const props = defineProps<{
    serverUuid: string;
    isOpen: boolean;
}>();

const emit = defineEmits<{
    close: [];
    accepted: [];
}>();

const { t } = useI18n();
const toast = useToast();

const accepting = ref(false);

function handleClose(): void {
    if (!accepting.value) {
        emit('close');
    }
}
// Uses new /write-file API endpoint: accepts raw content as octet-stream, NOT JSON body (see docs/annotations).
async function acceptEula(): Promise<void> {
    try {
        accepting.value = true;

        // Build the eula.txt file content.
        const eulaContent = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://www.minecraft.net/en-us/eula).
#${new Date().toUTCString()}
eula=true
`;

        // Write eula.txt via the binary-content endpoint.
        await axios.post(`/api/user/servers/${props.serverUuid}/write-file?path=/eula.txt`, eulaContent, {
            headers: { 'Content-Type': 'application/octet-stream' },
            responseType: 'json',
        });

        // Start the server after successfully writing eula.txt.
        try {
            const startResp = await axios.post(`/api/user/servers/${props.serverUuid}/power/start`);
            if (startResp.data && startResp.data.response) {
                toast.success(t('features.eula.eulaAcceptedAndServerStarted'));
            } else {
                toast.success(t('features.eula.eulaAccepted'));
                toast.warning(t('features.eula.serverStartMayHaveFailed'));
            }
        } catch {
            toast.success(t('features.eula.eulaAccepted'));
            toast.error(t('features.eula.failedToStartServer'));
        }
        emit('accepted');
        emit('close');
    } catch (error: unknown) {
        // Handle status 415 from backend (wrong content-type)
        if (axios.isAxiosError(error) && error.response?.status === 415) {
            toast.error(t('features.eula.failedToAccept') + ' (Invalid upload content-type, please contact support)');
        } else if (axios.isAxiosError(error) && error.response?.data?.message) {
            toast.error(t('features.eula.failedToAccept') + ': ' + error.response.data.message);
        } else {
            console.error('Error accepting EULA:', error);
            toast.error(t('features.eula.failedToAccept'));
        }
    } finally {
        accepting.value = false;
    }
}
</script>
