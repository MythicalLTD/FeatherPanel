<script setup lang="ts">
/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { AlertTriangle, RefreshCw, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useRefreshWarning } from '@/composables/useRefreshWarning';
import { onMounted, onUnmounted } from 'vue';

const { showRefreshDialog, confirmRefresh, confirmRefreshAndDontAsk, cancelRefresh } = useRefreshWarning();

// Handle Escape key to close dialog
const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && showRefreshDialog.value) {
        console.log('Escape key pressed, closing refresh dialog');
        cancelRefresh();
    }
};

onMounted(() => {
    console.log('RefreshWarningDialog mounted');
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    console.log('RefreshWarningDialog unmounted');
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <Dialog :open="showRefreshDialog" @update:open="(value) => !value && cancelRefresh()">
        <DialogContent
            class="z-50 w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw] md:w-[80vw] md:max-w-[80vw] lg:w-[60vw] lg:max-w-[60vw] xl:w-[50vw] xl:max-w-[50vw]"
        >
            <DialogHeader>
                <div class="flex items-center gap-3">
                    <div
                        class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20"
                    >
                        <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <DialogTitle class="text-left"> Woah! This is a live app </DialogTitle>
                        <DialogDescription class="text-left">
                            Ctrl+R, F5, or refreshing the page won't do much...
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div class="space-y-4 py-4 px-1">
                <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                    <div class="flex items-start gap-3">
                        <RefreshCw class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div class="text-sm text-blue-800 dark:text-blue-200 min-w-0 flex-1">
                            <p class="font-medium mb-1">Better alternatives:</p>
                            <ul class="space-y-1 text-blue-700 dark:text-blue-300">
                                <li>• Use the refresh buttons on the page</li>
                                <li>• Navigate to another route and come back</li>
                                <li>• Use the app's built-in refresh functionality</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="text-sm text-muted-foreground px-1">
                    <p class="wrap-break-word">
                        This is a single-page application (SPA) that updates content dynamically. A browser refresh will
                        reload the entire app unnecessarily.
                    </p>
                </div>
            </div>

            <DialogFooter class="flex-col sm:flex-row gap-2 px-1">
                <Button variant="outline" class="w-full sm:w-auto" @click="cancelRefresh">
                    <X class="h-4 w-4 mr-2" />
                    Do Nothing
                </Button>

                <div class="flex gap-2 w-full sm:w-auto">
                    <Button variant="secondary" class="flex-1 sm:flex-none min-w-0" @click="confirmRefresh">
                        <RefreshCw class="h-4 w-4 mr-2 shrink-0" />
                        <span class="truncate">Refresh Anyway</span>
                    </Button>

                    <Button class="flex-1 sm:flex-none min-w-0" @click="confirmRefreshAndDontAsk">
                        <RefreshCw class="h-4 w-4 mr-2 shrink-0" />
                        <span class="truncate">Refresh & Don't Ask Again</span>
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
