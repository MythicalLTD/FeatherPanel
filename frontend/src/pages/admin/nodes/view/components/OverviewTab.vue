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
    <div class="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Node Overview</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Name</div>
                        <div class="text-sm">{{ node.name }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">FQDN</div>
                        <div class="text-sm">{{ node.fqdn }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Location</div>
                        <div class="text-sm">{{ locationName }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Memory</div>
                        <div class="text-sm">{{ node.memory }} MiB</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Disk</div>
                        <div class="text-sm">{{ node.disk }} MiB</div>
                    </div>
                    <div v-if="node.public_ip_v4">
                        <div class="text-sm font-medium text-muted-foreground">Public IPv4</div>
                        <div class="text-sm font-mono">{{ node.public_ip_v4 }}</div>
                    </div>
                    <div v-if="node.public_ip_v6">
                        <div class="text-sm font-medium text-muted-foreground">Public IPv6</div>
                        <div class="text-sm font-mono">{{ node.public_ip_v6 }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Created</div>
                        <div class="text-sm">{{ node.created_at }}</div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card v-if="node.description">
            <CardHeader>
                <CardTitle class="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
                <p class="text-sm text-muted-foreground">{{ node.description }}</p>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Node } from '../types';

defineProps<{
    node: Node;
    locationName: string;
}>();
</script>
