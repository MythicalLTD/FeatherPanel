<!--
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
-->

<template>
    <div class="mb-6">
        <div class="flex items-start justify-between mb-4">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <h1 class="text-3xl font-bold">{{ node.name }}</h1>
                    <div
                        :class="[
                            'h-3 w-3 rounded-full',
                            systemInfoError
                                ? 'bg-red-500 animate-pulse'
                                : systemInfoData
                                  ? 'bg-green-500'
                                  : 'bg-gray-400',
                        ]"
                        :title="systemInfoError ? 'Unhealthy' : systemInfoData ? 'Healthy' : 'Unknown'"
                    ></div>
                </div>
                <p class="text-muted-foreground text-lg">{{ node.fqdn }}</p>
                <p class="text-sm text-muted-foreground mt-1">Location: {{ locationName }}</p>
            </div>
            <div class="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" @click="$emit('databases')">
                    <Database :size="16" class="mr-2" />
                    Databases
                </Button>
                <Button variant="outline" size="sm" @click="$emit('allocations')">
                    <Network :size="16" class="mr-2" />
                    Allocations
                </Button>
                <Button variant="outline" size="sm" @click="$emit('back')">
                    <ArrowLeft :size="16" class="mr-2" />
                    Back
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems and Contributors
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

import { Button } from '@/components/ui/button';
import { Database, Network, ArrowLeft } from 'lucide-vue-next';
import type { Node, SystemInfoResponse } from '../types';

defineProps<{
    node: Node;
    locationName: string;
    systemInfoData: SystemInfoResponse | null;
    systemInfoError: string | null;
}>();

defineEmits<{
    databases: [];
    allocations: [];
    back: [];
}>();
</script>
