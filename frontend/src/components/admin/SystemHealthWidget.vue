<template>
    <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
                <Activity :size="20" class="text-primary" />
                System Health
            </h2>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-sm text-muted-foreground">All systems operational</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- API Status -->
            <Card class="p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Zap :size="20" class="text-green-600" />
                        </div>
                        <div>
                            <div class="font-medium">API Status</div>
                            <div class="text-sm text-muted-foreground">Response time: ~45ms</div>
                        </div>
                    </div>
                    <CheckCircle2 :size="24" class="text-green-600" />
                </div>
            </Card>

            <!-- Database Status -->
            <Card class="p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Database :size="20" class="text-blue-600" />
                        </div>
                        <div>
                            <div class="font-medium">Database</div>
                            <div class="text-sm text-muted-foreground">Connected & healthy</div>
                        </div>
                    </div>
                    <CheckCircle2 :size="24" class="text-green-600" />
                </div>
            </Card>

            <!-- Cache Status -->
            <Card class="p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <HardDrive :size="20" class="text-purple-600" />
                        </div>
                        <div>
                            <div class="font-medium">Cache</div>
                            <div class="text-sm text-muted-foreground">85% hit rate</div>
                        </div>
                    </div>
                    <CheckCircle2 :size="24" class="text-green-600" />
                </div>
            </Card>

            <!-- Background Jobs -->
            <Card class="p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Clock :size="20" class="text-amber-600" />
                        </div>
                        <div>
                            <div class="font-medium">Background Jobs</div>
                            <div class="text-sm text-muted-foreground">Processing normally</div>
                        </div>
                    </div>
                    <CheckCircle2 :size="24" class="text-green-600" />
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

import { Activity, Zap, Database, HardDrive, Clock, CheckCircle2 } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
</script>
