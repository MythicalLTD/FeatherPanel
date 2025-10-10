<template>
    <div class="p-6 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-lg">
        <div class="flex flex-col md:flex-row items-center gap-6">
            <div class="flex-shrink-0">
                <div
                    class="h-24 w-24 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-xl"
                >
                    <Sparkles :size="48" class="text-white" />
                </div>
            </div>
            <div class="flex-1 text-center md:text-left">
                <h2 class="text-2xl font-bold mb-2">
                    Welcome to
                    <span class="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent"
                        >FeatherPanel</span
                    >
                </h2>
                <p class="text-muted-foreground mb-4">
                    Manage your servers with ease. Here are some quick actions to get you started.
                </p>
                <div class="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Button
                        variant="default"
                        size="sm"
                        class="flex items-center gap-2"
                        @click="navigateTo('/admin/servers/create')"
                    >
                        <Plus :size="16" />
                        Create Server
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        class="flex items-center gap-2"
                        @click="navigateTo('/admin/users')"
                    >
                        <UserPlus :size="16" />
                        Add User
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        class="flex items-center gap-2"
                        @click="navigateTo('/admin/nodes')"
                    >
                        <Server :size="16" />
                        Manage Nodes
                    </Button>
                </div>
            </div>
        </div>
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

import { Sparkles, Plus, UserPlus, Server } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useRouter } from 'vue-router';

const router = useRouter();

const navigateTo = (path: string) => {
    router.push(path);
};
</script>
