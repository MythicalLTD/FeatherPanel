<template>
    <div class="p-6 space-y-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
            <Zap :size="20" class="text-primary" />
            Quick Links
        </h2>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
                v-for="link in quickLinks"
                :key="link.name"
                class="p-4 hover:shadow-lg transition-all cursor-pointer group hover:scale-105 duration-200"
                @click="navigateTo(link.path)"
            >
                <div class="flex flex-col items-center text-center gap-3">
                    <div
                        class="h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                        :class="`bg-${link.color}-500/10 group-hover:bg-${link.color}-500/20`"
                    >
                        <component :is="link.icon" :size="24" :class="`text-${link.color}-600`" />
                    </div>
                    <div class="font-medium text-sm">{{ link.name }}</div>
                </div>
            </Card>
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

import { Server, Users, Network, Settings, Database, FileText, Sparkles, Zap } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useRouter } from 'vue-router';
import type { Component } from 'vue';

const router = useRouter();

interface QuickLink {
    name: string;
    path: string;
    icon: Component;
    color: string;
}

const quickLinks: QuickLink[] = [
    { name: 'Servers', path: '/admin/servers', icon: Server, color: 'blue' },
    { name: 'Users', path: '/admin/users', icon: Users, color: 'green' },
    { name: 'Nodes', path: '/admin/nodes', icon: Network, color: 'purple' },
    { name: 'Settings', path: '/admin/settings', icon: Settings, color: 'gray' },
    { name: 'Database', path: '/admin/database', icon: Database, color: 'indigo' },
    { name: 'Logs', path: '/admin/logs', icon: FileText, color: 'amber' },
    { name: 'Spells', path: '/admin/spells', icon: Sparkles, color: 'pink' },
];

const navigateTo = (path: string) => {
    router.push(path);
};
</script>
