<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen flex flex-col space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- File Editor Header -->
            <div v-if="!loading && fileContent !== null && server" class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverFiles.edit') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ fileName }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            v-if="shouldOfferEulaEditor && !useEulaEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseEulaEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('eulaConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferCommandsEditor && !useCommandsEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseCommandsEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('commandsConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferSpigotEditor && !useSpigotEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseSpigotEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('spigotConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferMinecraftEditor && !useMinecraftEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseMinecraftEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('minecraftProperties.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferBukkitEditor && !useBukkitEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseBukkitEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bukkitConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferBannedIpsEditor && !useBannedIpsEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseBannedIpsEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bannedIpsConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferBannedPlayersEditor && !useBannedPlayersEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseBannedPlayersEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bannedPlayersConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferOpsEditor && !useOpsEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseOpsEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('opsConfig.prompt.useGui') }}
                        </Button>
                        <Button
                            v-if="shouldOfferWhitelistEditor && !useWhitelistEditor"
                            size="sm"
                            class="gap-2"
                            variant="outline"
                            @click="handleUseWhitelistEditor"
                        >
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('whitelistConfig.prompt.useGui') }}
                        </Button>
                        <Badge
                            v-if="!canUpdateFiles"
                            variant="outline"
                            class="text-sm px-3 py-1.5 bg-linear-to-r from-orange-500/20 to-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                        >
                            {{ t('common.readonly') }}
                        </Badge>
                    </div>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer
                v-if="!loading && fileContent !== null && server && widgetsAfterHeader.length > 0"
                :widgets="widgetsAfterHeader"
            />

            <!-- Minecraft server.properties prompt -->
            <Card v-if="shouldShowMinecraftPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('minecraftProperties.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('minecraftProperties.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <Button size="sm" class="gap-2" @click="handleUseMinecraftEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('minecraftProperties.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissMinecraftEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('minecraftProperties.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Bukkit bukkit.yml prompt -->
            <Card v-if="shouldShowBukkitPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('bukkitConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('bukkitConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseBukkitEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bukkitConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissBukkitEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('bukkitConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Spigot spigot.yml prompt -->
            <Card v-if="shouldShowSpigotPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('spigotConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('spigotConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseSpigotEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('spigotConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissSpigotEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('spigotConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Commands commands.yml prompt -->
            <Card v-if="shouldShowCommandsPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('commandsConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('commandsConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseCommandsEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('commandsConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissCommandsEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('commandsConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- EULA prompt -->
            <Card v-if="shouldShowEulaPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('eulaConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('eulaConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseEulaEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('eulaConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissEulaEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('eulaConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Banned IPs prompt -->
            <Card v-if="shouldShowBannedIpsPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('bannedIpsConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('bannedIpsConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseBannedIpsEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bannedIpsConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissBannedIpsEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('bannedIpsConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Banned players prompt -->
            <Card v-if="shouldShowBannedPlayersPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('bannedPlayersConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('bannedPlayersConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseBannedPlayersEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('bannedPlayersConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissBannedPlayersEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('bannedPlayersConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Ops prompt -->
            <Card v-if="shouldShowOpsPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('opsConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('opsConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseOpsEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('opsConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissOpsEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('opsConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Whitelist prompt -->
            <Card v-if="shouldShowWhitelistPrompt" class="border-primary/30 bg-primary/5 backdrop-blur">
                <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <CheckCircle2 class="h-6 w-6" />
                        </div>
                        <div class="space-y-2">
                            <CardTitle class="text-xl">
                                {{ t('whitelistConfig.prompt.title') }}
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                {{ t('whitelistConfig.prompt.description') }}
                            </CardDescription>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" class="gap-2" @click="handleUseWhitelistEditor">
                            <CheckCircle2 class="h-4 w-4" />
                            {{ t('whitelistConfig.prompt.useGui') }}
                        </Button>
                        <Button size="sm" variant="outline" class="gap-2" @click="handleDismissWhitelistEditor">
                            <FileCode2 class="h-4 w-4" />
                            {{ t('whitelistConfig.prompt.stayRaw') }}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <!-- Minecraft server.properties editor -->
            <MinecraftServerPropertiesEditor
                v-if="!loading && fileContent !== null && server && useMinecraftEditor && shouldOfferMinecraftEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawEditor"
            />

            <!-- Paper Bukkit configuration editor -->
            <BukkitConfigurationEditor
                v-else-if="!loading && fileContent !== null && server && useBukkitEditor && shouldOfferBukkitEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawBukkitEditor"
            />

            <!-- Paper Spigot configuration editor -->
            <SpigotConfigurationEditor
                v-else-if="!loading && fileContent !== null && server && useSpigotEditor && shouldOfferSpigotEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawSpigotEditor"
            />

            <!-- Commands.yml editor -->
            <CommandsConfigurationEditor
                v-else-if="!loading && fileContent !== null && server && useCommandsEditor && shouldOfferCommandsEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawCommandsEditor"
            />

            <!-- EULA editor -->
            <EulaEditor
                v-else-if="!loading && fileContent !== null && server && useEulaEditor && shouldOfferEulaEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawEulaEditor"
            />

            <!-- Banned IPs editor -->
            <BannedIpsEditor
                v-else-if="
                    !loading && fileContent !== null && server && useBannedIpsEditor && shouldOfferBannedIpsEditor
                "
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawBannedIpsEditor"
            />

            <!-- Banned players editor -->
            <BannedPlayersEditor
                v-else-if="
                    !loading &&
                    fileContent !== null &&
                    server &&
                    useBannedPlayersEditor &&
                    shouldOfferBannedPlayersEditor
                "
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawBannedPlayersEditor"
            />

            <!-- Ops editor -->
            <OpsEditor
                v-else-if="!loading && fileContent !== null && server && useOpsEditor && shouldOfferOpsEditor"
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawOpsEditor"
            />

            <!-- Whitelist editor -->
            <WhitelistEditor
                v-else-if="
                    !loading && fileContent !== null && server && useWhitelistEditor && shouldOfferWhitelistEditor
                "
                :content="fileContent"
                :readonly="readonly"
                :saving="isSaving"
                @save="handleSave"
                @switch-to-raw="handleSwitchToRawWhitelistEditor"
            />

            <!-- Monaco Editor -->
            <MonacoFileEditor
                v-else-if="!loading && fileContent !== null && fileContent !== undefined && server"
                :file-name="fileName || 'unknown.txt'"
                :file-path="filePath || '/'"
                :content="fileContent ?? ''"
                :readonly="readonly"
                @save="handleSave"
                @close="handleClose"
            />

            <!-- Loading State -->
            <div v-else-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Error State -->
            <div v-else class="flex flex-col items-center justify-center py-16 px-4">
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-destructive/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-destructive/20 to-destructive/5">
                                <AlertCircle class="h-16 w-16 text-destructive" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('fileEditor.loadError') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverFiles.failedToFetchServer') }}
                        </p>
                    </div>
                    <Button size="lg" class="gap-2 shadow-lg" @click="handleClose">
                        <ArrowLeft class="h-4 w-4" />
                        {{ t('common.back') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
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

import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast, TYPE } from 'vue-toastification';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import MonacoFileEditor from '@/components/server/MonacoFileEditor.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle2, FileCode2 } from 'lucide-vue-next';
import MinecraftServerPropertiesEditor from '@/pages/dashboard/server/features/minecraft/MinecraftServerPropertiesEditor.vue';
import BukkitConfigurationEditor from '@/pages/dashboard/server/features/minecraft/BukkitConfigurationEditor.vue';
import SpigotConfigurationEditor from '@/pages/dashboard/server/features/minecraft/SpigotConfigurationEditor.vue';
import CommandsConfigurationEditor from '@/pages/dashboard/server/features/minecraft/CommandsConfigurationEditor.vue';
import EulaEditor from '@/pages/dashboard/server/features/minecraft/EulaEditor.vue';
import BannedIpsEditor from '@/pages/dashboard/server/features/minecraft/BannedIpsEditor.vue';
import BannedPlayersEditor from '@/pages/dashboard/server/features/minecraft/BannedPlayersEditor.vue';
import OpsEditor from '@/pages/dashboard/server/features/minecraft/OpsEditor.vue';
import WhitelistEditor from '@/pages/dashboard/server/features/minecraft/WhitelistEditor.vue';
import { useSessionStore } from '@/stores/session';
import { useServerPermissions } from '@/composables/useServerPermissions';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import type { Server } from '@/composables/types/server';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canReadFiles = computed(() => hasServerPermission('file.read'));
const canUpdateFiles = computed(() => hasServerPermission('file.update'));

// Server state (following ServerFiles pattern)
const server = ref<Server | null>(null);

// Props from route params and query (with defensive initialization)
const serverUuid = route.params.uuidShort as string;
const fileName = ref<string>((route.query.file as string) || 'unknown.txt');
const filePath = ref<string>((route.query.path as string) || '/');

// Computed readonly state based on permissions and query param
const readonly = computed(() => {
    // If the route explicitly says readonly, make it readonly
    if ((route.query.readonly as string) === 'true') return true;
    // Otherwise, check if user has update permission
    return !canUpdateFiles.value;
});

// Editor state
const fileContent = ref<string | null>(null);
const loading = ref(true);
const isSaving = ref(false);

// Minecraft server.properties handling
const useMinecraftEditor = ref(false);
const promptDismissed = ref(false);
const useBukkitEditor = ref(false);
const bukkitPromptDismissed = ref(false);
const useSpigotEditor = ref(false);
const spigotPromptDismissed = ref(false);
const useCommandsEditor = ref(false);
const commandsPromptDismissed = ref(false);
const useEulaEditor = ref(false);
const eulaPromptDismissed = ref(false);
const useBannedIpsEditor = ref(false);
const bannedIpsPromptDismissed = ref(false);
const useBannedPlayersEditor = ref(false);
const bannedPlayersPromptDismissed = ref(false);
const useOpsEditor = ref(false);
const opsPromptDismissed = ref(false);
const useWhitelistEditor = ref(false);
const whitelistPromptDismissed = ref(false);

const isMinecraftProperties = computed(() => fileName.value.trim().toLowerCase() === 'server.properties');

const looksLikeMinecraftProperties = computed(() => {
    if (!fileContent.value) {
        return false;
    }

    const signatureKeys = ['motd=', 'gamemode=', 'difficulty=', 'level-name=', 'online-mode='];
    return signatureKeys.every((signature) => fileContent.value?.includes(signature));
});

const shouldOfferMinecraftEditor = computed(() => isMinecraftProperties.value && looksLikeMinecraftProperties.value);

const shouldShowMinecraftPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferMinecraftEditor.value &&
        !useMinecraftEditor.value &&
        !promptDismissed.value,
);

const isBukkitConfiguration = computed(() => fileName.value.trim().toLowerCase() === 'bukkit.yml');

const looksLikeBukkitConfiguration = computed(() => {
    if (!fileContent.value) {
        return false;
    }

    const signatureKeys = ['settings:', 'spawn-limits:', 'chunk-gc:', 'ticks-per:'];
    return signatureKeys.every((signature) => fileContent.value?.includes(signature));
});

const shouldOfferBukkitEditor = computed(() => isBukkitConfiguration.value && looksLikeBukkitConfiguration.value);

const shouldShowBukkitPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferBukkitEditor.value &&
        !useBukkitEditor.value &&
        !bukkitPromptDismissed.value,
);

const isSpigotConfiguration = computed(() => fileName.value.trim().toLowerCase() === 'spigot.yml');

const looksLikeSpigotConfiguration = computed(() => {
    if (!fileContent.value) {
        return false;
    }

    const signatureKeys = ['settings:', 'messages:', 'world-settings:', 'commands:'];
    return signatureKeys.every((signature) => fileContent.value?.includes(signature));
});

const shouldOfferSpigotEditor = computed(() => isSpigotConfiguration.value && looksLikeSpigotConfiguration.value);

const shouldShowSpigotPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferSpigotEditor.value &&
        !useSpigotEditor.value &&
        !spigotPromptDismissed.value,
);

const isCommandsConfiguration = computed(() => fileName.value.trim().toLowerCase() === 'commands.yml');

const looksLikeCommandsConfiguration = computed(() => {
    if (!fileContent.value) {
        return false;
    }

    const content = fileContent.value;
    const requiredMarkers = ['command-block-overrides', 'ignore-vanilla-permissions', 'aliases:'];

    return requiredMarkers.every((marker) => content.includes(marker));
});

const shouldOfferCommandsEditor = computed(() => isCommandsConfiguration.value && looksLikeCommandsConfiguration.value);

const shouldShowCommandsPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferCommandsEditor.value &&
        !useCommandsEditor.value &&
        !commandsPromptDismissed.value,
);

const isEulaFile = computed(() => fileName.value.trim().toLowerCase() === 'eula.txt');

const looksLikeEulaFile = computed(() => {
    if (!fileContent.value) {
        return false;
    }

    const content = fileContent.value;
    return /eula\s*=\s*(true|false)/i.test(content);
});

const shouldOfferEulaEditor = computed(() => isEulaFile.value && looksLikeEulaFile.value);

const shouldShowEulaPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferEulaEditor.value &&
        !useEulaEditor.value &&
        !eulaPromptDismissed.value,
);

function parseJsonSafe(content: string | null): unknown {
    if (!content) {
        return null;
    }
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

const bannedIpsData = computed(() => parseJsonSafe(fileContent.value));
const bannedPlayersData = computed(() => parseJsonSafe(fileContent.value));
const opsData = computed(() => parseJsonSafe(fileContent.value));
const whitelistData = computed(() => parseJsonSafe(fileContent.value));

const isBannedIpsFile = computed(() => fileName.value.trim().toLowerCase() === 'banned-ips.json');
const looksLikeBannedIpsFile = computed(() => {
    if (!isBannedIpsFile.value) {
        return false;
    }
    const data = bannedIpsData.value;
    return (
        Array.isArray(data) &&
        data.every(
            (entry) =>
                entry &&
                typeof entry === 'object' &&
                'ip' in entry &&
                'created' in entry &&
                'source' in entry &&
                'expires' in entry &&
                'reason' in entry,
        )
    );
});

const shouldOfferBannedIpsEditor = computed(() => isBannedIpsFile.value && looksLikeBannedIpsFile.value);

const shouldShowBannedIpsPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferBannedIpsEditor.value &&
        !useBannedIpsEditor.value &&
        !bannedIpsPromptDismissed.value,
);

const isBannedPlayersFile = computed(() => fileName.value.trim().toLowerCase() === 'banned-players.json');
const looksLikeBannedPlayersFile = computed(() => {
    if (!isBannedPlayersFile.value) {
        return false;
    }
    const data = bannedPlayersData.value;
    return (
        Array.isArray(data) &&
        data.every(
            (entry) =>
                entry &&
                typeof entry === 'object' &&
                'uuid' in entry &&
                'name' in entry &&
                'created' in entry &&
                'source' in entry &&
                'expires' in entry &&
                'reason' in entry,
        )
    );
});

const shouldOfferBannedPlayersEditor = computed(() => isBannedPlayersFile.value && looksLikeBannedPlayersFile.value);

const shouldShowBannedPlayersPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferBannedPlayersEditor.value &&
        !useBannedPlayersEditor.value &&
        !bannedPlayersPromptDismissed.value,
);

const isOpsFile = computed(() => fileName.value.trim().toLowerCase() === 'ops.json');
const looksLikeOpsFile = computed(() => {
    if (!isOpsFile.value) {
        return false;
    }
    const data = opsData.value;
    return (
        Array.isArray(data) &&
        data.every(
            (entry) =>
                entry &&
                typeof entry === 'object' &&
                'uuid' in entry &&
                'name' in entry &&
                'level' in entry &&
                'bypassesPlayerLimit' in entry,
        )
    );
});

const shouldOfferOpsEditor = computed(() => isOpsFile.value && looksLikeOpsFile.value);

const shouldShowOpsPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferOpsEditor.value &&
        !useOpsEditor.value &&
        !opsPromptDismissed.value,
);

const isWhitelistFile = computed(() => fileName.value.trim().toLowerCase() === 'whitelist.json');
const looksLikeWhitelistFile = computed(() => {
    if (!isWhitelistFile.value) {
        return false;
    }
    const data = whitelistData.value;
    return (
        Array.isArray(data) &&
        data.every((entry) => entry && typeof entry === 'object' && 'uuid' in entry && 'name' in entry)
    );
});

const shouldOfferWhitelistEditor = computed(() => isWhitelistFile.value && looksLikeWhitelistFile.value);

const shouldShowWhitelistPrompt = computed(
    () =>
        !loading.value &&
        fileContent.value !== null &&
        server.value !== null &&
        shouldOfferWhitelistEditor.value &&
        !useWhitelistEditor.value &&
        !whitelistPromptDismissed.value,
);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-file-editor');
const widgetsTopOfPage = computed(() => getWidgets('server-file-editor', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-file-editor', 'after-header'));
const widgetsBottomOfPage = computed(() => getWidgets('server-file-editor', 'bottom-of-page'));

// File size limit - 5MB
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

// Check if a file is editable based on extension
function isFileEditable(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Binary file extensions that should NOT be editable
    const binaryExtensions = [
        // Archives
        'zip',
        'tar',
        'gz',
        'tgz',
        '7z',
        'rar',
        'bz2',
        'xz',
        'lzma',
        'cab',
        'iso',
        'dmg',
        'jar',
        'war',
        'ear',
        // Images
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'svg',
        'ico',
        'webp',
        'tiff',
        'tif',
        'psd',
        // Videos
        'mp4',
        'avi',
        'mov',
        'wmv',
        'flv',
        'mkv',
        'webm',
        'm4v',
        'mpg',
        'mpeg',
        // Audio
        'mp3',
        'wav',
        'flac',
        'aac',
        'ogg',
        'wma',
        'm4a',
        'opus',
        // Executables
        'exe',
        'dll',
        'so',
        'dylib',
        'bin',
        'app',
        'deb',
        'rpm',
        'msi',
        // Documents (binary formats)
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'odt',
        'ods',
        'odp',
        // Fonts
        'ttf',
        'otf',
        'woff',
        'woff2',
        'eot',
        // Database files
        'db',
        'sqlite',
        'sqlite3',
        'mdb',
        // Other binary
        'class',
        'pyc',
        'pyo',
        'o',
        'a',
        'lib',
    ];

    return !binaryExtensions.includes(ext);
}

// Computed breadcrumbs (following ServerFiles pattern with defensive checks)
const breadcrumbs = computed(() => {
    const serverName = server.value?.name || t('common.server');
    const currentFileName = fileName.value || 'unknown.txt';

    return [
        { text: t('common.dashboard'), href: '/dashboard' },
        { text: t('common.servers'), href: '/dashboard' },
        { text: serverName, href: `/server/${route.params.uuidShort}` },
        { text: t('serverFiles.title'), href: `/server/${route.params.uuidShort}/files` },
        { text: `${t('serverFiles.edit')}: ${currentFileName}`, isCurrent: true },
    ];
});

// Server fetching (following ServerFiles pattern)
async function fetchServer(): Promise<void> {
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast(t('serverFiles.failedToFetchServer'), { type: TYPE.ERROR });
            router.push('/dashboard');
        }
    } catch {
        toast(t('serverFiles.failedToFetchServer'), { type: TYPE.ERROR });
        router.push('/dashboard');
    }
}

// Load file content
const loadFileContent = async () => {
    if (!serverUuid || !fileName.value) {
        toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
        return;
    }

    // Check if file is editable
    if (!isFileEditable(fileName.value)) {
        toast(t('fileEditor.cannotEditBinaryFile'), { type: TYPE.ERROR });
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
        return;
    }

    try {
        const response = await axios.get(`/api/user/servers/${serverUuid}/file`, {
            params: {
                path: `${filePath.value}/${fileName.value}`.replace(/\/+/g, '/'),
            },
        });

        // Handle different response types (matching ServerFiles pattern)
        if (typeof response.data === 'string') {
            // Empty strings are valid - allow them
            fileContent.value = response.data;
        } else if (response.data && typeof response.data === 'object') {
            // Check if this is an API response structure
            if (response.data.content !== undefined && response.data.content !== null) {
                // Handle empty strings in content field
                fileContent.value = String(response.data.content);
            } else if (response.data.data !== undefined && response.data.data !== null) {
                // Handle empty strings in data field
                fileContent.value = String(response.data.data);
            } else if (response.data.success === false) {
                // If API explicitly says it failed, throw error
                throw new Error(response.data.message || 'Failed to load file');
            } else if (response.data.success === true) {
                // API success response with data
                if (response.data.data !== undefined && response.data.data !== null) {
                    fileContent.value = String(response.data.data);
                } else {
                    fileContent.value = '';
                }
            } else {
                // This is likely a JSON file that was parsed by Axios
                // Check if file extension is .json to confirm
                const isJsonFile = fileName.value.toLowerCase().endsWith('.json');
                if (isJsonFile) {
                    // Stringify the parsed JSON with proper formatting
                    fileContent.value = JSON.stringify(response.data, null, 2);
                } else {
                    // For other object types, try to stringify
                    // This handles cases where non-JSON files might be parsed as objects
                    try {
                        fileContent.value = JSON.stringify(response.data, null, 2);
                    } catch {
                        // If stringify fails, treat as empty
                        fileContent.value = '';
                    }
                }
            }
        } else if (response.data === null || response.data === undefined) {
            // API returned null/undefined - treat as empty file (valid)
            fileContent.value = '';
        } else {
            // Fallback: convert to string, defaulting to empty string
            fileContent.value = String(response.data || '');
        }

        // Check file size after loading
        // fileContent.value can be string or null, but BlobPart does not accept null
        const contentString = fileContent.value ?? '';
        const contentSize = new Blob([contentString]).size;
        if (contentSize > FILE_SIZE_LIMIT) {
            toast(t('fileEditor.fileTooLarge'), { type: TYPE.ERROR });
            router.push({
                name: 'ServerFiles',
                params: { uuidShort: serverUuid },
                query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
            });
            return;
        }
    } catch (error) {
        console.error('Error loading file:', error);
        const err = error as {
            response?: { status?: number; data?: { message?: string; success?: boolean } };
            message?: string;
        };

        // Check if it's a 404 or "file not found" error - might be a new empty file
        const errorMessage = err.response?.data?.message || err.message || '';
        const isNotFoundError =
            err.response?.status === 404 ||
            errorMessage.toLowerCase().includes('not found') ||
            errorMessage.toLowerCase().includes('file not found');

        // If it's a 404, treat as empty file (newly created files might not exist yet)
        if (isNotFoundError) {
            fileContent.value = '';
            loading.value = false;
            return;
        }

        // For other errors, show error and redirect
        toast(err.response?.data?.message || t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push({
            name: 'ServerFiles',
            params: { uuidShort: serverUuid },
            query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
        });
    } finally {
        loading.value = false;
        const activateEditor = (
            shouldOffer: boolean,
            useRef: typeof useMinecraftEditor,
            dismissedRef: typeof promptDismissed,
        ) => {
            if (shouldOffer) {
                useRef.value = !dismissedRef.value;
            } else {
                dismissedRef.value = true;
                useRef.value = false;
            }
        };

        activateEditor(shouldOfferMinecraftEditor.value, useMinecraftEditor, promptDismissed);
        activateEditor(shouldOfferBukkitEditor.value, useBukkitEditor, bukkitPromptDismissed);
        activateEditor(shouldOfferSpigotEditor.value, useSpigotEditor, spigotPromptDismissed);
        activateEditor(shouldOfferCommandsEditor.value, useCommandsEditor, commandsPromptDismissed);
        activateEditor(shouldOfferEulaEditor.value, useEulaEditor, eulaPromptDismissed);
        activateEditor(shouldOfferBannedIpsEditor.value, useBannedIpsEditor, bannedIpsPromptDismissed);
        activateEditor(shouldOfferBannedPlayersEditor.value, useBannedPlayersEditor, bannedPlayersPromptDismissed);
        activateEditor(shouldOfferOpsEditor.value, useOpsEditor, opsPromptDismissed);
        activateEditor(shouldOfferWhitelistEditor.value, useWhitelistEditor, whitelistPromptDismissed);

        const activeEditors = [
            useMinecraftEditor,
            useBukkitEditor,
            useSpigotEditor,
            useCommandsEditor,
            useEulaEditor,
            useBannedIpsEditor,
            useBannedPlayersEditor,
            useOpsEditor,
            useWhitelistEditor,
        ];

        const firstActive = activeEditors.find((editor) => editor.value);
        if (firstActive) {
            activeEditors.forEach((editor) => {
                if (editor !== firstActive) {
                    editor.value = false;
                }
            });
        }
    }
};

// Save file content (matching ServerFiles pattern)
const handleSave = async (content: string) => {
    isSaving.value = true;
    try {
        const fullPath = `${filePath.value}/${fileName.value}`.replace(/\/+/g, '/');

        const response = await axios.post(
            `/api/user/servers/${serverUuid}/write-file?path=${encodeURIComponent(fullPath)}`,
            content,
            {
                headers: {
                    'Content-Type': 'text/plain',
                },
            },
        );

        if (response.data.success) {
            toast(t('fileEditor.saveSuccess'), { type: TYPE.SUCCESS });
            fileContent.value = content;
        } else {
            throw new Error(response.data.message || 'Failed to save file');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        const err = error as { response?: { data?: { message?: string } } };
        toast(err.response?.data?.message || t('fileEditor.saveError'), { type: TYPE.ERROR });
        throw error; // Re-throw to let the editor know saving failed
    } finally {
        isSaving.value = false;
    }
};

// Close editor
const handleClose = () => {
    router.push({
        name: 'ServerFiles',
        params: { uuidShort: serverUuid },
        query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
    });
};

const handleUseMinecraftEditor = () => {
    promptDismissed.value = false;
    useMinecraftEditor.value = true;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
};

const handleDismissMinecraftEditor = () => {
    useMinecraftEditor.value = false;
    promptDismissed.value = true;
};

const handleSwitchToRawEditor = () => {
    useMinecraftEditor.value = false;
    promptDismissed.value = false;
};

const handleUseBukkitEditor = () => {
    bukkitPromptDismissed.value = false;
    useBukkitEditor.value = true;
    useMinecraftEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissBukkitEditor = () => {
    useBukkitEditor.value = false;
    bukkitPromptDismissed.value = true;
};

const handleSwitchToRawBukkitEditor = () => {
    useBukkitEditor.value = false;
    bukkitPromptDismissed.value = false;
};

const handleUseSpigotEditor = () => {
    spigotPromptDismissed.value = false;
    useSpigotEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissSpigotEditor = () => {
    useSpigotEditor.value = false;
    spigotPromptDismissed.value = true;
};

const handleSwitchToRawSpigotEditor = () => {
    useSpigotEditor.value = false;
    spigotPromptDismissed.value = false;
};

const handleUseCommandsEditor = () => {
    commandsPromptDismissed.value = false;
    useCommandsEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissCommandsEditor = () => {
    useCommandsEditor.value = false;
    commandsPromptDismissed.value = true;
};

const handleSwitchToRawCommandsEditor = () => {
    useCommandsEditor.value = false;
    commandsPromptDismissed.value = false;
};

const handleUseEulaEditor = () => {
    eulaPromptDismissed.value = false;
    useEulaEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissEulaEditor = () => {
    useEulaEditor.value = false;
    eulaPromptDismissed.value = true;
};

const handleSwitchToRawEulaEditor = () => {
    useEulaEditor.value = false;
    eulaPromptDismissed.value = false;
};

const handleUseBannedIpsEditor = () => {
    bannedIpsPromptDismissed.value = false;
    useBannedIpsEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissBannedIpsEditor = () => {
    useBannedIpsEditor.value = false;
    bannedIpsPromptDismissed.value = true;
};

const handleSwitchToRawBannedIpsEditor = () => {
    useBannedIpsEditor.value = false;
    bannedIpsPromptDismissed.value = false;
};

const handleUseBannedPlayersEditor = () => {
    bannedPlayersPromptDismissed.value = false;
    useBannedPlayersEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useOpsEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissBannedPlayersEditor = () => {
    useBannedPlayersEditor.value = false;
    bannedPlayersPromptDismissed.value = true;
};

const handleSwitchToRawBannedPlayersEditor = () => {
    useBannedPlayersEditor.value = false;
    bannedPlayersPromptDismissed.value = false;
};

const handleUseOpsEditor = () => {
    opsPromptDismissed.value = false;
    useOpsEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useWhitelistEditor.value = false;
};

const handleDismissOpsEditor = () => {
    useOpsEditor.value = false;
    opsPromptDismissed.value = true;
};

const handleSwitchToRawOpsEditor = () => {
    useOpsEditor.value = false;
    opsPromptDismissed.value = false;
};

const handleUseWhitelistEditor = () => {
    whitelistPromptDismissed.value = false;
    useWhitelistEditor.value = true;
    useMinecraftEditor.value = false;
    useBukkitEditor.value = false;
    useSpigotEditor.value = false;
    useCommandsEditor.value = false;
    useEulaEditor.value = false;
    useBannedIpsEditor.value = false;
    useBannedPlayersEditor.value = false;
    useOpsEditor.value = false;
};

const handleDismissWhitelistEditor = () => {
    useWhitelistEditor.value = false;
    whitelistPromptDismissed.value = true;
};

const handleSwitchToRawWhitelistEditor = () => {
    useWhitelistEditor.value = false;
    whitelistPromptDismissed.value = false;
};

// Lifecycle (following ServerFiles pattern with error handling)
onMounted(async () => {
    try {
        // Validate required params
        if (!serverUuid) {
            toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
            router.push('/dashboard');
            return;
        }

        await sessionStore.checkSessionOrRedirect(router);
        // Settings are fetched once in App.vue - no need to fetch here
        await fetchServer();

        // Wait for permission check to complete
        while (permissionsLoading.value) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Check if user has permission to read files
        if (!canReadFiles.value) {
            toast(t('serverFiles.noFileReadPermission'), { type: TYPE.ERROR });
            router.push({
                name: 'ServerFiles',
                params: { uuidShort: serverUuid },
                query: { path: (filePath.value || '/').replace(/\/+$/, '') || '/' },
            });
            return;
        }

        await loadFileContent();

        // Fetch plugin widgets
        await fetchPluginWidgets();
    } catch (error) {
        console.error('Error in ServerFileEditor onMounted:', error);
        toast(t('fileEditor.loadError'), { type: TYPE.ERROR });
        router.push('/dashboard');
    }
});
</script>

<style scoped>
/* Full height layout */
:deep(.dashboard-layout) {
    height: 100vh;
    overflow: hidden;
}

:deep(.dashboard-content) {
    height: 100%;
    overflow: hidden;
}

/* Mobile optimizations */
@media (max-width: 640px) {
    :deep(.dashboard-layout) {
        height: 100vh;
        height: 100dvh; /* Use dynamic viewport height for mobile */
    }

    /* Ensure ACE editor takes full available space on mobile */
    :deep(.ace_editor) {
        min-height: calc(100vh - 200px);
        min-height: calc(100dvh - 200px);
    }

    /* Better touch targets for mobile */
    :deep(.ace_editor .ace_content) {
        touch-action: pan-x pan-y;
    }

    /* Optimize scrollbars for mobile */
    :deep(.ace_editor .ace_scrollbar) {
        -webkit-overflow-scrolling: touch;
    }
}
</style>
