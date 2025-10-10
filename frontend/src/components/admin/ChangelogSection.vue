<template>
    <div class="space-y-2">
        <h5 class="font-medium flex items-center gap-2" :class="`text-${color}-600`">
            <span class="w-2 h-2 rounded-full" :class="`bg-${color}-500`"></span>
            {{ title }}
        </h5>
        <ul class="space-y-1 text-sm text-muted-foreground">
            <li v-for="item in items" :key="item" class="flex items-start gap-2">
                <span :class="`text-${color}-500 mt-1`">{{ icon }}</span>
                <span>{{ item }}</span>
            </li>
        </ul>
    </div>
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

interface Props {
    title: string;
    items: string[];
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
    icon: string;
}

defineProps<Props>();
</script>
