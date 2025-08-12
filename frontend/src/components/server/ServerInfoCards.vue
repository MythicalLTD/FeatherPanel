<template>
    <div class="grid gap-4 md:grid-cols-4">
        <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.address') }}</CardTitle>
                <Wifi class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="font-bold font-mono text-sm">
                    {{ server?.allocation?.ip || 'N/A' }}:{{ server?.allocation?.port || 'N/A' }}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.status') }}</CardTitle>
                <div class="w-3 h-3 rounded-full" :class="getStatusColor(server?.status || wingsState)"></div>
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold capitalize">{{ server?.status || wingsState || 'Unknown' }}</div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.uptime') }}</CardTitle>
                <Clock class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="text-2xl font-bold">{{ formatUptime(wingsUptime) }}</div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.serverId') }}</CardTitle>
                <Fingerprint class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="font-bold font-mono text-sm">{{ server?.uuidShort || 'N/A' }}</div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Clock, Fingerprint } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';

const { t } = useI18n();

interface Props {
    server: Server | null;
    wingsUptime?: number;
    wingsState?: string;
}

defineProps<Props>();
function formatUptime(uptimeMs?: number): string {
    if (!uptimeMs) return '0s';

    // Wings sends uptime in milliseconds, convert to seconds
    const uptimeInSeconds = Math.floor(uptimeMs / 1000);

    const days = Math.floor(uptimeInSeconds / 86400);
    const hours = Math.floor((uptimeInSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeInSeconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

function getStatusColor(status?: string): string {
    switch (status?.toLowerCase()) {
        case 'running':
            return 'bg-green-500';
        case 'starting':
            return 'bg-yellow-500';
        case 'stopping':
            return 'bg-orange-500';
        case 'stopped':
        case 'offline':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}
</script>
