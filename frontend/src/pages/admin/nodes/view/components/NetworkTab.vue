<template>
    <div class="space-y-4">
        <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <div v-else-if="error" class="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg flex items-center gap-2">
                        <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                        Network Data Unavailable
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <div class="space-y-3">
                            <div class="font-medium">Failed to fetch network information</div>
                            <div class="text-sm">{{ error }}</div>
                        </div>
                    </Alert>
                </CardContent>
            </Card>
        </div>

        <div v-else-if="data" class="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Configured Public Addresses</CardTitle>
                    <CardDescription>
                        These addresses are stored in FeatherPanel. Set the IPv4 when using the subdomain manager.
                    </CardDescription>
                </CardHeader>
                <CardContent class="grid gap-4 md:grid-cols-2">
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Public IPv4</div>
                        <div class="text-sm font-mono">{{ node.public_ip_v4 ?? 'Not set' }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Public IPv6</div>
                        <div class="text-sm font-mono">{{ node.public_ip_v6 ?? 'Not set' }}</div>
                    </div>
                </CardContent>
            </Card>

            <!-- IP Addresses -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Network Interfaces</CardTitle>
                    <CardDescription>Available IP addresses on this node</CardDescription>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="(ip, index) in data.ips.ip_addresses"
                            :key="index"
                            class="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                            <div class="flex items-center gap-3">
                                <div class="h-2 w-2 bg-green-500 rounded-full"></div>
                                <span class="font-mono text-sm">{{ ip }}</span>
                                <span
                                    v-if="isIPv6(ip)"
                                    class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                >
                                    IPv6
                                </span>
                                <span
                                    v-else-if="isPrivateIP(ip)"
                                    class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                                >
                                    Private
                                </span>
                                <span
                                    v-else
                                    class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full"
                                >
                                    Public
                                </span>
                            </div>
                            <Button size="sm" variant="ghost" class="h-8 w-8 p-0" @click="$emit('copy', ip)">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    ></path>
                                </svg>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Network Statistics -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Network Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <div class="text-2xl font-bold">{{ data.ips.ip_addresses.length }}</div>
                            <div class="text-sm text-muted-foreground">Total IPs</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold text-green-600">
                                {{ getPublicIPs(data.ips.ip_addresses).length }}
                            </div>
                            <div class="text-sm text-muted-foreground">Public IPs</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold text-blue-600">
                                {{ getIPv6IPs(data.ips.ip_addresses).length }}
                            </div>
                            <div class="text-sm text-muted-foreground">IPv6 IPs</div>
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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { NetworkResponse, Node } from '../types';

defineProps<{
    node: Node;
    loading: boolean;
    data: NetworkResponse | null;
    error: string | null;
}>();

defineEmits<{
    copy: [ip: string];
}>();

function isIPv6(ip: string): boolean {
    return ip.includes(':');
}

function isPrivateIP(ip: string): boolean {
    if (isIPv6(ip)) {
        return ip.startsWith('fd') || ip.startsWith('fe80');
    }
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4) return false;
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    return false;
}

function getPublicIPs(ips: string[]): string[] {
    return ips.filter((ip) => !isPrivateIP(ip) && !isIPv6(ip));
}

function getIPv6IPs(ips: string[]): string[] {
    return ips.filter((ip) => isIPv6(ip));
}
</script>
