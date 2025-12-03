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
                <CardTitle class="text-lg">Self-Update Options</CardTitle>
                <CardDescription>Configure how Wings should update itself on this node.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
                <!-- Source selection -->
                <div class="space-y-3">
                    <label class="text-sm font-medium">Update Source</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            :class="[
                                'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                options.source === 'github'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            @click="options.source = 'github'"
                        >
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                    options.source === 'github' ? 'border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <div
                                    v-if="options.source === 'github'"
                                    class="h-2.5 w-2.5 rounded-full bg-primary"
                                ></div>
                            </div>
                            <div class="text-left">
                                <div class="text-sm font-medium">GitHub Release</div>
                                <div class="text-xs text-muted-foreground">Pull from GitHub repo (default).</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                options.source === 'url'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            @click="options.source = 'url'"
                        >
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                    options.source === 'url' ? 'border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <div v-if="options.source === 'url'" class="h-2.5 w-2.5 rounded-full bg-primary"></div>
                            </div>
                            <div class="text-left">
                                <div class="text-sm font-medium">Direct URL</div>
                                <div class="text-xs text-muted-foreground">Download from a custom URL.</div>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- GitHub fields -->
                <div v-if="options.source === 'github'" class="space-y-4 rounded-lg border bg-card/40 p-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label class="text-sm font-medium" for="self-update-repo-owner">Repository Owner</Label>
                            <Input
                                id="self-update-repo-owner"
                                v-model="options.repoOwner"
                                placeholder="e.g. pterodactyl"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label class="text-sm font-medium" for="self-update-repo-name">Repository Name</Label>
                            <Input id="self-update-repo-name" v-model="options.repoName" placeholder="e.g. wings" />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium" for="self-update-version">Version (optional)</Label>
                        <Input id="self-update-version" v-model="options.version" placeholder="e.g. v1.11.0" />
                        <p class="text-xs text-muted-foreground">
                            Leave empty to fetch the latest release from the selected repository.
                        </p>
                    </div>
                </div>

                <!-- Direct URL fields -->
                <div v-if="options.source === 'url'" class="space-y-4 rounded-lg border bg-card/40 p-4">
                    <div class="space-y-2">
                        <Label class="text-sm font-medium" for="self-update-url">Download URL</Label>
                        <Input
                            id="self-update-url"
                            v-model="options.url"
                            type="url"
                            placeholder="https://example.com/wings.tar.gz"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium" for="self-update-sha">SHA256 checksum (optional)</Label>
                        <Input
                            id="self-update-sha"
                            v-model="options.sha256"
                            placeholder="Provide checksum to verify download integrity"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label class="text-sm font-medium" for="self-update-version-direct">Version (optional)</Label>
                        <Input
                            id="self-update-version-direct"
                            v-model="options.version"
                            placeholder="Identifies the installed version after update"
                        />
                    </div>
                </div>

                <!-- Toggles -->
                <div class="space-y-3">
                    <label class="text-sm font-medium">Update Flags</label>
                    <div class="space-y-3">
                        <div
                            class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                            @click="options.force = !options.force"
                        >
                            <div class="flex items-center h-5">
                                <div
                                    :class="[
                                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                        options.force ? 'bg-primary border-primary' : 'border-muted-foreground',
                                    ]"
                                >
                                    <svg
                                        v-if="options.force"
                                        class="h-3 w-3 text-primary-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="3"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm font-medium">Force Update</div>
                                <div class="text-xs text-muted-foreground mt-0.5">
                                    Reinstall Wings even if it is already on the requested version.
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="options.source === 'url'"
                            class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                            @click="options.disableChecksum = !options.disableChecksum"
                        >
                            <div class="flex items-center h-5">
                                <div
                                    :class="[
                                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                        options.disableChecksum
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground',
                                    ]"
                                >
                                    <svg
                                        v-if="options.disableChecksum"
                                        class="h-3 w-3 text-primary-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="3"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm font-medium">Disable Checksum Validation</div>
                                <div class="text-xs text-muted-foreground mt-0.5">
                                    Skip checksum verification for the downloaded artifact.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Submit button -->
                <div class="pt-4 border-t">
                    <Button type="button" class="w-full" :loading="loading" @click="$emit('submit')">
                        <svg v-if="!loading" class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v8m4-4H8m12 6H4a2 2 0 01-2-2V6a2 2 0 012-2h12l4 4v12a2 2 0 01-2 2z"
                            />
                        </svg>
                        Trigger Self-Update
                    </Button>
                </div>
            </CardContent>
        </Card>

        <!-- Result & Error -->
        <Card v-if="error || message || result">
            <CardHeader>
                <CardTitle class="text-lg flex items-center gap-2">
                    <div :class="['h-3 w-3 rounded-full', error ? 'bg-red-500 animate-pulse' : 'bg-emerald-500']"></div>
                    {{ error ? 'Self-Update Failed' : 'Self-Update Status' }}
                </CardTitle>
                <CardDescription>
                    {{
                        error
                            ? 'Review the details below and adjust the options before trying again.'
                            : message || 'Self-update request accepted. Wings will handle the update in the background.'
                    }}
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <template v-if="error">
                    <div
                        class="rounded-lg border border-red-300/70 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-inner"
                    >
                        <div class="font-semibold text-red-200">Unable to trigger self-update</div>
                        <p class="mt-2 whitespace-pre-line text-red-100/90">{{ error }}</p>
                    </div>
                </template>
                <template v-else>
                    <div
                        class="rounded-lg border border-emerald-300/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner"
                    >
                        <div class="font-semibold text-emerald-200">Self-update queued successfully</div>
                        <p class="mt-2 text-emerald-100/90">
                            Wings received the request and will install the update shortly. You can monitor progress
                            from the node logs if needed.
                        </p>
                    </div>
                    <div class="space-y-2">
                        <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Response details
                        </div>
                        <pre
                            class="max-h-80 overflow-y-auto overflow-x-auto rounded-lg border bg-muted/60 p-4 text-xs font-mono text-muted-foreground"
                            >{{ formatResult(result) }}</pre
                        >
                    </div>
                </template>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_SELF_UPDATE = {
    repoOwner: 'mythicalltd',
    repoName: 'featherwings',
    downloadUrl: 'https://github.com/mythicalltd/featherwings/releases/latest/download/featherwings',
};

const options = reactive({
    source: 'github' as 'github' | 'url',
    repoOwner: DEFAULT_SELF_UPDATE.repoOwner,
    repoName: DEFAULT_SELF_UPDATE.repoName,
    version: '',
    url: DEFAULT_SELF_UPDATE.downloadUrl,
    sha256: '',
    force: false,
    disableChecksum: false,
});

defineProps<{
    loading: boolean;
    result: Record<string, unknown> | null;
    message: string | null;
    error: string | null;
}>();

defineEmits<{
    submit: [];
}>();

defineExpose({
    options,
});

function formatResult(result: Record<string, unknown> | null): string {
    if (!result) {
        return 'No additional response data returned.';
    }
    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}
</script>
