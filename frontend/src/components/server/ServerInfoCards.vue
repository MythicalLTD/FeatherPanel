<template>
    <div class="grid gap-4 md:grid-cols-4">
        <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium">{{ t('serverConsole.address') }}</CardTitle>
                <Wifi class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold font-mono text-sm truncate" :title="serverAddress || 'N/A'">
                        {{ serverAddress || 'N/A' }}
                    </div>
                    <div class="shrink-0">
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <Button variant="outline" size="icon" class="h-8 w-8" @click="copyServerAddress">
                                    <Copy v-if="!addressCopied" class="h-4 w-4" />
                                    <Check v-else class="h-4 w-4 text-green-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <span>{{
                                    addressCopied ? t('common.copied') || 'Copied' : t('common.copy') || 'Copy'
                                }}</span>
                            </TooltipContent>
                        </Tooltip>
                    </div>
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, Clock, Fingerprint, Copy, Check } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';
import { computed, ref } from 'vue';

const { t } = useI18n();

interface Props {
    server: Server | null;
    wingsUptime?: number;
    wingsState?: string;
}

const props = defineProps<Props>();

const addressCopied = ref(false);

const serverAddress = computed(() => {
    const ip =
        (props.server?.allocation?.ip_alias as string | undefined) ||
        (props.server?.allocation?.ip as string | undefined);
    const port = props.server?.allocation?.port as number | undefined;
    if (!ip || !port) return '';
    return `${ip}:${port}`;
});

async function copyServerAddress(): Promise<void> {
    if (!serverAddress.value) return;
    try {
        await navigator.clipboard.writeText(serverAddress.value);
        addressCopied.value = true;
        setTimeout(() => (addressCopied.value = false), 1200);
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = serverAddress.value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        addressCopied.value = true;
        setTimeout(() => (addressCopied.value = false), 1200);
    }
}
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
