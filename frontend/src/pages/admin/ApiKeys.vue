<template>
    <DashboardLayout :breadcrumbs="[{ text: 'API Keys', isCurrent: true, href: '/admin/api-keys' }]">
        <div class="min-h-screen bg-background p-6">
            <!-- Reuse the existing ApiKeys component -->
            <div class="max-w-7xl mx-auto">
                <ApiKeys />
                <!-- Developer guidance cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <KeyRound class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">About API Keys</div>
                                    <p>
                                        API keys are primarily for developers and power users. Use them to extend
                                        FeatherPanel, automate tasks, or integrate with external platforms.
                                    </p>
                                    <p class="mt-2">
                                        Treat keys like passwords: keep them secret, rotate regularly, and scope to the
                                        minimum required.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Plug class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Pterodactyl Panel API (legacy)</div>
                                    <p>
                                        To use the legacy Pterodactyl API, install the extension from
                                        <b>/admin/plugins</b> named <b>Pterodactyl Panel Api</b>. After installation,
                                        we’ll guide you through configuration and usage.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>
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

import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ApiKeys from '@/components/account/ApiKeys.vue';
import { Card, CardContent } from '@/components/ui/card';
import { KeyRound, Plug } from 'lucide-vue-next';
</script>
