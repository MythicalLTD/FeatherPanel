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
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ApiKeys from '@/components/account/ApiKeys.vue';
import { Card, CardContent } from '@/components/ui/card';
import { KeyRound, Plug } from 'lucide-vue-next';
</script>
