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

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import type { Server } from '@/types/server';

const currentServer = ref<Server | null>(null);
const isLoading = ref(false);
const lastFetchedUuid = ref<string | null>(null);

export function useServerContext() {
    const route = useRoute();

    const fetchServerInfo = async (uuidShort: string): Promise<void> => {
        // Avoid refetching if already loaded
        if (lastFetchedUuid.value === uuidShort && currentServer.value) {
            return;
        }

        isLoading.value = true;
        try {
            const response = await axios.get(`/api/user/servers/${uuidShort}`);
            if (response.data.success) {
                currentServer.value = response.data.data;
                lastFetchedUuid.value = uuidShort;
            }
        } catch (error) {
            console.error('Failed to fetch server info:', error);
            currentServer.value = null;
            lastFetchedUuid.value = null;
        } finally {
            isLoading.value = false;
        }
    };

    // Auto-fetch when route changes to a server route
    watch(
        () => route.params.uuidShort,
        (newUuid) => {
            if (newUuid && typeof newUuid === 'string' && route.path.startsWith('/server')) {
                fetchServerInfo(newUuid);
            } else {
                // Clear server context when leaving server routes
                currentServer.value = null;
                lastFetchedUuid.value = null;
            }
        },
        { immediate: true },
    );

    const clearServer = () => {
        currentServer.value = null;
        lastFetchedUuid.value = null;
    };

    return {
        currentServer,
        isLoading,
        fetchServerInfo,
        clearServer,
    };
}
