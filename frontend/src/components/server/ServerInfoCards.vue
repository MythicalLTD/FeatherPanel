<template>
    <div class="space-y-4">
        <div
            class="grid gap-4"
            :class="showLocationCard ? 'md:grid-cols-2 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-4'"
        >
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

            <!-- Ping Card with Animation -->
            <Card data-ping-card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">{{ t('serverConsole.ping') }}</CardTitle>
                    <div
                        v-if="ping !== null && ping !== undefined"
                        class="h-3 w-3 rounded-full cursor-pointer transition-transform hover:scale-125 active:scale-95"
                        :class="getPingDotColor(ping)"
                        @mousedown="startPingIndicatorHold"
                        @mouseup="stopPingIndicatorHold"
                        @mouseleave="stopPingIndicatorHold"
                    ></div>
                    <Monitor v-else class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div v-if="ping !== null && ping !== undefined" class="space-y-2">
                        <div
                            class="text-2xl font-bold cursor-pointer select-none transition-all hover:scale-105 active:scale-95"
                            :class="getPingColorClass(ping)"
                            @click="handlePingValueClick"
                        >
                            {{ ping }}ms
                        </div>
                        <!-- Mini network visualization (Easter Egg) -->
                        <Transition
                            enter-active-class="transition-all duration-500 ease-out"
                            enter-from-class="opacity-0 max-h-0"
                            enter-to-class="opacity-100 max-h-12"
                            leave-active-class="transition-all duration-500 ease-in"
                            leave-from-class="opacity-100 max-h-12"
                            leave-to-class="opacity-0 max-h-0"
                        >
                            <div
                                v-if="showPingAnimation"
                                class="relative h-12 bg-muted/30 rounded border border-border/50 overflow-hidden group"
                                @click="togglePingAnimation"
                            >
                                <!-- Close button (appears on hover) -->
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <button
                                            class="absolute top-1 right-1 z-20 h-5 w-5 rounded-full bg-background/80 hover:bg-background border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:scale-110 active:scale-95"
                                            @click.stop="togglePingAnimation"
                                        >
                                            <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span>{{ t('serverConsole.hideAnimation') || 'Hide animation' }}</span>
                                    </TooltipContent>
                                </Tooltip>
                                <!-- Client icon -->
                                <div class="absolute left-1.5 top-1/2 -translate-y-1/2 z-10">
                                    <div
                                        class="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30 shadow-sm"
                                    >
                                        <Monitor class="h-3.5 w-3.5 text-primary" />
                                    </div>
                                </div>
                                <!-- Server icon -->
                                <div class="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                                    <div
                                        class="h-6 w-6 rounded-md bg-green-500/20 flex items-center justify-center border border-green-500/30 shadow-sm"
                                    >
                                        <ServerIcon class="h-3.5 w-3.5 text-green-500" />
                                    </div>
                                </div>
                                <!-- Connection line with glow effect -->
                                <div
                                    class="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-linear-to-r from-primary/50 via-primary/30 to-green-500/50"
                                ></div>
                                <!-- Animated packets (Client → Server) -->
                                <div
                                    v-for="i in 3"
                                    :key="`ping-packet-send-${i}`"
                                    class="absolute top-1/2 packet-send"
                                    :style="{
                                        '--animation-duration': `${getAnimationDuration(ping)}s`,
                                        '--animation-delay': `${(i - 1) * (getAnimationDuration(ping) / 4)}s`,
                                    }"
                                >
                                    <div class="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/60"></div>
                                </div>
                                <!-- Animated packets (Server → Client) -->
                                <div
                                    v-for="i in 3"
                                    :key="`ping-packet-receive-${i}`"
                                    class="absolute top-1/2 packet-receive"
                                    :style="{
                                        '--animation-duration': `${getAnimationDuration(ping)}s`,
                                        '--animation-delay': `${(i - 1) * (getAnimationDuration(ping) / 4) + getAnimationDuration(ping) / 2}s`,
                                    }"
                                >
                                    <div class="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/60"></div>
                                </div>
                            </div>
                        </Transition>
                    </div>
                    <div v-else class="text-2xl font-bold text-muted-foreground">--</div>
                </CardContent>
            </Card>
            <!-- Location Card (only show if location has flag_code) -->
            <Card v-if="showLocationCard && server?.location?.flag_code">
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">{{ t('serverConsole.location') }}</CardTitle>
                    <MapPin class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div v-if="server?.location" class="flex items-center gap-2">
                        <div v-if="server.location.flag_code" class="shrink-0">
                            <img
                                :src="`https://flagcdn.com/16x12/${server.location.flag_code}.png`"
                                :srcset="`https://flagcdn.com/32x24/${server.location.flag_code}.png 2x, https://flagcdn.com/48x36/${server.location.flag_code}.png 3x`"
                                width="16"
                                height="12"
                                :alt="server.location.flag_code"
                                class="rounded-sm"
                            />
                        </div>
                        <div class="font-bold text-sm truncate" :title="server.location.name || 'Unknown'">
                            {{ server.location.name || 'Unknown' }}
                        </div>
                    </div>
                </CardContent>
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, Clock, Monitor, Server as ServerIcon, Copy, Check, X, MapPin } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/composables/types/server';
import { computed, ref, onMounted } from 'vue';

const { t } = useI18n();

interface Props {
    server: Server | null;
    wingsUptime?: number;
    wingsState?: string;
    ping?: number | null;
}

const props = defineProps<Props>();

// Check if location card should be shown (only if location has a valid flag_code)
const showLocationCard = computed(() => {
    return !!(
        props.server?.location &&
        props.server.location.flag_code &&
        typeof props.server.location.flag_code === 'string' &&
        props.server.location.flag_code.trim() !== ''
    );
});

const addressCopied = ref(false);
const showPingAnimation = ref(false);
const pingClickCount = ref(0);
const pingClickTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const pingIndicatorHeld = ref(false);
const pingIndicatorHoldTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

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

function getPingColorClass(ping: number | null | undefined): string {
    if (ping === null || ping === undefined) return 'text-muted-foreground';
    if (ping < 50) return 'text-green-500';
    if (ping < 150) return 'text-yellow-500';
    if (ping < 300) return 'text-orange-500';
    return 'text-red-500';
}

function getPingDotColor(ping: number | null | undefined): string {
    if (ping === null || ping === undefined) return 'bg-gray-500';
    if (ping < 50) return 'bg-green-500 animate-pulse';
    if (ping < 150) return 'bg-yellow-500 animate-pulse';
    if (ping < 300) return 'bg-orange-500 animate-pulse';
    return 'bg-red-500 animate-pulse';
}

function getAnimationDuration(ping: number | null | undefined): number {
    if (ping === null || ping === undefined) return 2;
    const baseTime = 1.5;
    const pingSeconds = ping / 1000;
    return Math.max(0.8, Math.min(3, baseTime + pingSeconds * 0.5));
}

// Easter Egg: Ping Animation Reveal
const EASTER_EGG_STORAGE_KEY = 'featherpanel_ping_animation_unlocked';
const PING_CLICK_TARGET = 5;
const PING_HOLD_DURATION = 2000; // 2 seconds

// Load easter egg state from localStorage
onMounted(() => {
    const unlocked = localStorage.getItem(EASTER_EGG_STORAGE_KEY);
    if (unlocked === 'true') {
        showPingAnimation.value = true;
    }
});

function handlePingValueClick(): void {
    pingClickCount.value++;

    // Reset count if too much time passes between clicks
    if (pingClickTimeout.value) {
        clearTimeout(pingClickTimeout.value);
    }

    pingClickTimeout.value = setTimeout(() => {
        pingClickCount.value = 0;
    }, 1500); // Reset after 1.5 seconds of no clicks

    // If user clicked 5 times in quick succession, unlock animation
    if (pingClickCount.value >= PING_CLICK_TARGET) {
        unlockPingAnimation();
        pingClickCount.value = 0;
        if (pingClickTimeout.value) {
            clearTimeout(pingClickTimeout.value);
            pingClickTimeout.value = null;
        }
    }
}

function startPingIndicatorHold(): void {
    pingIndicatorHeld.value = true;

    // After holding for 2 seconds, unlock animation
    pingIndicatorHoldTimeout.value = setTimeout(() => {
        unlockPingAnimation();
        stopPingIndicatorHold();
    }, PING_HOLD_DURATION);
}

function stopPingIndicatorHold(): void {
    pingIndicatorHeld.value = false;
    if (pingIndicatorHoldTimeout.value) {
        clearTimeout(pingIndicatorHoldTimeout.value);
        pingIndicatorHoldTimeout.value = null;
    }
}

function unlockPingAnimation(): void {
    if (!showPingAnimation.value) {
        showPingAnimation.value = true;
        localStorage.setItem(EASTER_EGG_STORAGE_KEY, 'true');

        // Add a subtle celebration effect
        const pingCard = document.querySelector('[data-ping-card]');
        if (pingCard) {
            pingCard.classList.add('easter-egg-reveal');
            setTimeout(() => {
                pingCard.classList.remove('easter-egg-reveal');
            }, 1000);
        }
    }
}

function togglePingAnimation(): void {
    showPingAnimation.value = !showPingAnimation.value;
    localStorage.setItem(EASTER_EGG_STORAGE_KEY, showPingAnimation.value ? 'true' : 'false');
}
</script>

<style scoped>
@keyframes sendPacket {
    from {
        left: 1.5rem;
        opacity: 0;
        transform: translateY(-50%) scale(0.5);
    }
    10% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
    }
    90% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
    }
    to {
        left: calc(100% - 1.5rem);
        opacity: 0;
        transform: translateY(-50%) scale(0.5);
    }
}

@keyframes receivePacket {
    from {
        right: 1.5rem;
        opacity: 0;
        transform: translateY(-50%) scale(0.5);
    }
    10% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
    }
    90% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
    }
    to {
        right: calc(100% - 1.5rem);
        opacity: 0;
        transform: translateY(-50%) scale(0.5);
    }
}

.packet-send {
    animation: sendPacket var(--animation-duration, 2s) ease-in-out infinite;
    animation-delay: var(--animation-delay, 0s);
}

.packet-receive {
    animation: receivePacket var(--animation-duration, 2s) ease-in-out infinite;
    animation-delay: var(--animation-delay, 0s);
}

/* Easter Egg Reveal Animation */
@keyframes easterEggReveal {
    0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
    50% {
        transform: scale(1.02);
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
}

.easter-egg-reveal {
    animation: easterEggReveal 1s ease-out;
}
</style>
