<script lang="ts">
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

import { defineComponent, ref } from 'vue';
import DebugPanel from './components/DebugPanel.vue';
import KernXWebExecutor from './components/KernXWebExecutor.vue';

export default defineComponent({
    name: 'App',
    components: {
        DebugPanel,
        KernXWebExecutor,
    },
    setup() {
        const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
        const kernXExecutor = ref<InstanceType<typeof KernXWebExecutor> | null>(null);

        return {
            debugPanel,
            kernXExecutor,
        };
    },
});
</script>
<template>
    <div class="app-container">
        <!-- Router view without global transitions - layouts handle their own content transitions -->
        <router-view v-slot="{ Component }">
            <component :is="Component" />
        </router-view>

        <!-- Debug Panel -->
        <DebugPanel ref="debugPanel" />

        <!-- KernX WebExecutor -->
        <KernXWebExecutor ref="kernXExecutor" />
    </div>
</template>
