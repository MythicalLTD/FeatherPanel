<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Customization Panel -->
            <Card v-if="showCustomization" class="p-4 sm:p-6">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Settings class="h-5 w-5" />
                        {{ t('serverConsole.customizeLayout') }}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- Component Visibility -->
                        <div class="space-y-4">
                            <div>
                                <h4 class="font-medium text-sm">{{ t('serverConsole.componentVisibility') }}</h4>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ t('serverConsole.componentVisibilityDescription') }}
                                </p>
                            </div>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="wingsStatus">{{ t('serverConsole.wingsConnectionStatus') }}</Label>
                                    <Select
                                        :model-value="customization.components.wingsStatus ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.wingsStatus = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.wingsStatus
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="serverInfo">{{ t('serverConsole.serverInfoCards') }}</Label>
                                    <Select
                                        :model-value="customization.components.serverInfo ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.serverInfo = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.serverInfo
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="performance">{{ t('serverConsole.performanceMonitoring') }}</Label>
                                    <Select
                                        :model-value="customization.components.performance ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.performance = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.performance
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <!-- Terminal Settings -->
                        <div class="space-y-4">
                            <h4 class="font-medium text-sm">{{ t('serverConsole.terminalSettings') }}</h4>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="fontSize">{{ t('serverConsole.fontSize') }}</Label>
                                    <Select
                                        :model-value="customization.terminal.fontSize"
                                        @update:model-value="
                                            (value) => {
                                                customization.terminal.fontSize = Number(value);
                                                applyTerminalSettings();
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue :placeholder="customization.terminal.fontSize.toString()" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem :value="12">12px</SelectItem>
                                            <SelectItem :value="14">14px</SelectItem>
                                            <SelectItem :value="16">16px (Default)</SelectItem>
                                            <SelectItem :value="18">18px</SelectItem>
                                            <SelectItem :value="20">20px</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div class="space-y-2">
                                    <Label for="scrollback">{{ t('serverConsole.scrollbackLines') }}</Label>
                                    <Select
                                        :model-value="customization.terminal.scrollback"
                                        @update:model-value="
                                            (value) => {
                                                customization.terminal.scrollback = Number(value);
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue :placeholder="customization.terminal.scrollback.toString()" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem :value="1000">1,000</SelectItem>
                                            <SelectItem :value="5000">5,000</SelectItem>
                                            <SelectItem :value="10000">10,000 (Default)</SelectItem>
                                            <SelectItem :value="50000">50,000</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <!-- Performance Chart Settings -->
                        <div class="space-y-4">
                            <h4 class="font-medium text-sm">{{ t('serverConsole.performanceCharts') }}</h4>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="showCPU">{{ t('serverConsole.showCPUChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showCPU ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showCPU = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showCPU
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showMemory">{{ t('serverConsole.showMemoryChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showMemory ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showMemory = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showMemory
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showDisk">{{ t('serverConsole.showDiskChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showDisk ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showDisk = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showDisk
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showNetwork">{{ t('serverConsole.showNetworkChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showNetwork ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showNetwork = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showNetwork
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="dataPoints">{{ t('serverConsole.dataPoints') }}</Label>
                                    <Select
                                        :model-value="customization.charts.dataPoints"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.dataPoints = Number(value);
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue :placeholder="customization.charts.dataPoints.toString()" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem :value="30">{{ t('serverConsole.dataPoints30') }}</SelectItem>
                                            <SelectItem :value="60">{{ t('serverConsole.dataPoints60') }}</SelectItem>
                                            <SelectItem :value="120">{{ t('serverConsole.dataPoints120') }}</SelectItem>
                                            <SelectItem :value="300">{{ t('serverConsole.dataPoints300') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <!-- Console Filters -->
                        <div class="space-y-4 lg:col-span-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h4 class="font-medium text-sm">{{ t('serverConsole.consoleFilters') }}</h4>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        {{ t('serverConsole.consoleFiltersDescription') }}
                                    </p>
                                </div>
                                <Button size="sm" @click="addFilter">
                                    <Plus class="h-4 w-4 mr-2" />
                                    {{ t('serverConsole.addFilterButton') }}
                                </Button>
                            </div>

                            <!-- Filter List -->
                            <div v-if="customization.filters.length > 0" class="space-y-2">
                                <div
                                    v-for="filter in customization.filters"
                                    :key="filter.id"
                                    class="flex items-center gap-3 p-3 border rounded-lg bg-card"
                                >
                                    <Switch :checked="filter.enabled" @update:checked="() => toggleFilter(filter.id)" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2">
                                            <span class="font-medium text-sm">{{ filter.name }}</span>
                                            <Badge variant="outline" class="text-xs">
                                                {{ filter.type }}
                                            </Badge>
                                        </div>
                                        <code class="text-xs text-muted-foreground break-all">{{
                                            filter.pattern
                                        }}</code>
                                    </div>
                                    <div class="flex gap-1">
                                        <Button size="sm" variant="ghost" @click="editFilter(filter)">
                                            <Pencil class="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" @click="deleteFilter(filter.id)">
                                            <Trash2 class="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <p v-else class="text-sm text-muted-foreground text-center py-4">
                                {{ t('serverConsole.noFiltersConfigured') }}
                            </p>
                        </div>
                    </div>

                    <!-- Reset Button -->
                    <div class="mt-6 pt-4 border-t flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            class="w-full sm:w-auto"
                            @click="async () => await resetCustomization()"
                        >
                            <RotateCcw class="h-4 w-4 mr-2" />
                            {{ t('serverConsole.resetToDefaults') }}
                        </Button>

                        <Button class="w-full sm:flex-1" @click="async () => await saveAndApplyCustomization()">
                            <Save class="h-4 w-4 mr-2" />
                            {{ t('serverConsole.saveAndApply') }}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <!-- Filter Dialog -->
            <Dialog :open="showFilterDialog" @update:open="(val) => (showFilterDialog = val)">
                <DialogContent class="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{{
                            editingFilter ? t('serverConsole.editFilter') : t('serverConsole.addFilter')
                        }}</DialogTitle>
                    </DialogHeader>

                    <div class="space-y-4 py-4">
                        <div class="space-y-2">
                            <Label for="filter-name">{{ t('serverConsole.filterName') }}</Label>
                            <Input
                                id="filter-name"
                                v-model="filterForm.name"
                                :placeholder="t('serverConsole.filterNamePlaceholder')"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="filter-pattern">{{ t('serverConsole.regexPattern') }}</Label>
                            <Input
                                id="filter-pattern"
                                v-model="filterForm.pattern"
                                :placeholder="t('serverConsole.regexPatternPlaceholder')"
                                class="font-mono text-sm"
                            />
                            <p class="text-xs text-muted-foreground">{{ t('serverConsole.regexSyntaxHelp') }}</p>
                        </div>

                        <div class="space-y-2">
                            <Label for="filter-type">{{ t('serverConsole.filterType') }}</Label>
                            <Select v-model="filterForm.type">
                                <SelectTrigger>
                                    <SelectValue :placeholder="filterForm.type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="remove">{{ t('serverConsole.filterTypeRemove') }}</SelectItem>
                                    <SelectItem value="highlight">{{
                                        t('serverConsole.filterTypeHighlight')
                                    }}</SelectItem>
                                    <SelectItem value="replace">{{ t('serverConsole.filterTypeReplace') }}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div v-if="filterForm.type === 'highlight'" class="space-y-2">
                            <Label for="filter-color">{{ t('serverConsole.highlightColor') }}</Label>
                            <div class="flex gap-2">
                                <Input
                                    id="filter-color"
                                    v-model="filterForm.highlightColor"
                                    type="color"
                                    class="w-20 h-10"
                                />
                                <Input v-model="filterForm.highlightColor" placeholder="#ffff00" class="flex-1" />
                            </div>
                        </div>

                        <div v-if="filterForm.type === 'replace'" class="space-y-2">
                            <Label for="filter-replacement">{{ t('serverConsole.replacementTextLabel') }}</Label>
                            <Input
                                id="filter-replacement"
                                v-model="filterForm.replacementText"
                                :placeholder="t('serverConsole.replacementTextPlaceholder')"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" @click="showFilterDialog = false">{{ t('common.cancel') }}</Button>
                        <Button @click="saveFilter">{{
                            editingFilter ? t('serverConsole.updateFilter') : t('serverConsole.addNewFilter')
                        }}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- Header Section -->
            <ServerHeader
                v-if="!customization.components.serverHeader"
                :server="server"
                :loading="loading"
                :wings-state="wingsState"
                @start="startServer"
                @restart="restartServer"
                @stop="stopServer"
                @kill="killServer"
            />
            <div class="fixed top-6 right-6 z-40">
                <Button variant="outline" size="sm" class="shadow-lg" @click="showCustomization = !showCustomization">
                    <Settings class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{
                        showCustomization ? t('serverConsole.hideLayout') : t('serverConsole.customizeLayout')
                    }}</span>
                    <span class="sm:hidden">{{
                        showCustomization ? t('serverConsole.hideLayout') : t('serverConsole.customizeLayout')
                    }}</span>
                </Button>
            </div>

            <!-- Wings Panel: Professional Design -->
            <div
                v-if="!customization.components.wingsStatus"
                class="flex items-center gap-4 px-5 py-3 border rounded-lg shadow-sm transition-colors"
                :class="{
                    'border-green-300 bg-green-50 dark:bg-green-900/50 dark:border-green-700':
                        wingsConnectionInfo.status === 'healthy',
                    'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/40 dark:border-yellow-600':
                        wingsConnectionInfo.status === 'error',
                    'border-red-300 bg-red-50 dark:bg-red-900/45 dark:border-red-700':
                        wingsConnectionInfo.status === 'disconnected',
                    'border-blue-300 bg-blue-50 dark:bg-blue-900/50 dark:border-blue-600':
                        wingsConnectionInfo.status === 'connecting',
                }"
            >
                <span
                    class="flex items-center justify-center h-9 w-9 rounded-full border"
                    :class="{
                        'border-green-400 bg-green-100 dark:bg-green-800/80 dark:border-green-500':
                            wingsConnectionInfo.status === 'healthy',
                        'border-yellow-400 bg-yellow-100 dark:bg-yellow-800/60 dark:border-yellow-400':
                            wingsConnectionInfo.status === 'error',
                        'border-red-400 bg-red-100 dark:bg-red-800/70 dark:border-red-500':
                            wingsConnectionInfo.status === 'disconnected',
                        'border-blue-400 bg-blue-100 dark:bg-blue-800/70 dark:border-blue-500':
                            wingsConnectionInfo.status === 'connecting',
                    }"
                    aria-hidden="true"
                >
                    <span class="text-xl">{{ wingsConnectionInfo.icon }}</span>
                </span>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-base leading-tight truncate" :class="wingsConnectionInfo.color">
                        {{ wingsConnectionInfo.message }}
                    </div>
                </div>
                <div v-if="wingsConnectionInfo.status === 'connecting'" class="flex-shrink-0 ml-2">
                    <div class="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>

            <!-- Server Info Cards -->
            <ServerInfoCards
                v-if="!customization.components.serverInfo"
                :server="server"
                :wings-uptime="wingsUptime"
                :wings-state="wingsState"
            />

            <!-- XTerm.js Terminal Console -->
            <Card class="overflow-hidden">
                <CardHeader class="border-b">
                    <div class="flex items-center justify-between">
                        <CardTitle class="flex items-center gap-2">
                            <Terminal class="h-5 w-5" />
                            {{ t('common.console') }}
                        </CardTitle>
                        <div class="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                class="hidden sm:flex"
                                :disabled="
                                    uploading || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @click="uploadConsoleLogs"
                            >
                                <Upload class="h-4 w-4 mr-2" />
                                {{ t('serverLogs.uploadToMcloGs') }}
                            </Button>
                            <Button variant="outline" size="sm" @click="clearTerminal">
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="p-0">
                    <div
                        ref="terminalContainer"
                        class="w-full h-[500px] sm:h-[600px] bg-black overflow-hidden"
                        @wheel.stop
                        @touchmove.stop
                    ></div>

                    <!-- Command Input Bar -->
                    <div class="border-t p-3">
                        <div class="flex gap-2">
                            <Input
                                v-model="commandInput"
                                type="text"
                                class="flex-1"
                                :placeholder="t('serverConsole.enterCommandPlaceholder')"
                                :disabled="
                                    sendingCommand || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @keydown.enter="sendCommand"
                            />
                            <Button
                                size="sm"
                                :disabled="
                                    sendingCommand ||
                                    !commandInput.trim() ||
                                    !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @click="sendCommand"
                            >
                                <Send class="h-4 w-4" />
                            </Button>
                            <!-- Mobile upload button -->
                            <Button
                                variant="outline"
                                size="sm"
                                class="sm:hidden"
                                :disabled="
                                    uploading || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @click="uploadConsoleLogs"
                            >
                                <Upload class="h-4 w-4" />
                            </Button>
                        </div>
                        <p
                            v-if="server && server.status !== 'running' && server.status !== 'starting'"
                            class="text-xs text-yellow-500 mt-2"
                        >
                            {{ t('serverConsole.serverMustBeRunningCommands') }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- Performance Monitoring -->
            <ServerPerformance
                v-if="!customization.components.performance"
                :server="server"
                :cpu-data="filteredCpuData"
                :memory-data="filteredMemoryData"
                :disk-data="filteredDiskData"
                :network-data="filteredNetworkData"
                :network-stats="networkStats"
                :show-cpu="customization.charts.showCPU"
                :show-memory="customization.charts.showMemory"
                :show-disk="customization.charts.showDisk"
                :show-network="customization.charts.showNetwork"
            />
        </div>

        <!-- Feature Dialogs -->
        <EulaFeature
            v-if="server"
            :server-uuid="server.uuidShort"
            :is-open="showEulaDialog"
            @close="showEulaDialog = false"
            @accepted="handleEulaAccepted"
        />

        <JavaVersionFeature
            v-if="server"
            :server="server"
            :is-open="showJavaVersionDialog"
            :detected-issue="detectedJavaIssue"
            @close="showJavaVersionDialog = false"
            @updated="
                () => {
                    detectedFeatures.delete('java_version');
                    fetchServer();
                }
            "
        />

        <PidLimitFeature
            v-if="server"
            :server="server"
            :is-open="showPidLimitDialog"
            @close="showPidLimitDialog = false"
            @restarted="
                () => {
                    detectedFeatures.delete('pid_limit');
                }
            "
        />
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

import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerHeader from '@/components/server/ServerHeader.vue';
import ServerInfoCards from '@/components/server/ServerInfoCards.vue';
import ServerPerformance from '@/components/server/ServerPerformance.vue';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Save, Terminal, Trash2, Send, Upload, Plus, Pencil } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server, NetworkStats } from '@/types/server';
import { useWingsWebSocket, type WingsStats } from '@/composables/useWingsWebSocket';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import EulaFeature from '@/components/server/features/EulaFeature.vue';
import JavaVersionFeature from '@/components/server/features/JavaVersionFeature.vue';
import PidLimitFeature from '@/components/server/features/PidLimitFeature.vue';
import { detectFeature } from '@/components/server/features/featureDetector';

// XTerm.js imports
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Terminal container ref
const terminalContainer = ref<HTMLElement | null>(null);

// XTerm instance and addons
let terminal: XTerm | null = null;
let fitAddon: FitAddon | null = null;

// Buffer for batching terminal writes (improves performance)
let writeBuffer: string[] = [];
let writeTimeout: number | null = null;
const WRITE_DELAY = 16; // ~60fps

// Command input
const commandInput = ref('');
const sendingCommand = ref(false);
const uploading = ref(false);

// Console filter types
interface ConsoleFilter {
    id: string;
    name: string;
    pattern: string;
    type: 'remove' | 'highlight' | 'replace';
    enabled: boolean;
    highlightColor?: string;
    replacementText?: string;
}

// Customization system
const showCustomization = ref(false);
const customization = ref({
    components: {
        serverHeader: false,
        wingsStatus: false,
        serverInfo: false,
        performance: false,
    },
    terminal: {
        fontSize: 16,
        scrollback: 10000,
    },
    charts: {
        showCPU: true,
        showMemory: true,
        showDisk: true,
        showNetwork: true,
        dataPoints: 60,
    },
    filters: [] as ConsoleFilter[],
});

// Filter management
const showFilterDialog = ref(false);
const editingFilter = ref<ConsoleFilter | null>(null);
const filterForm = ref({
    name: '',
    pattern: '',
    type: 'remove' as 'remove' | 'highlight' | 'replace',
    highlightColor: '#ffff00',
    replacementText: '',
});

// Feature detection
const showEulaDialog = ref(false);
const showJavaVersionDialog = ref(false);
const showPidLimitDialog = ref(false);
const detectedFeatures = ref<Set<string>>(new Set());
const detectedJavaIssue = ref<string>('');

// Flag to track if user is navigating away
const isNavigatingAway = ref(false);

// Track if WebSocket handlers are set up
const handlersSetup = ref(false);
let messageHandler: ((event: MessageEvent) => void) | null = null;

const server = ref<Server | null>(null);
const loading = ref(false);
const networkStats = ref<NetworkStats>({
    upload: '0 B',
    download: '0 B',
});

// Wings real-time data
const wingsState = ref<string>('');
const wingsUptime = ref<number>(0);

// Terminal and WebSocket functionality
const wingsWebSocket = useWingsWebSocket(route.params.uuidShort as string, isNavigatingAway);

// Stats request interval
let statsInterval: number | null = null;

// Real-time performance data
const cpuData = ref<Array<{ timestamp: number; value: number }>>([]);
const memoryData = ref<Array<{ timestamp: number; value: number }>>([]);
const diskData = ref<Array<{ timestamp: number; value: number }>>([]);
const networkData = ref<Array<{ timestamp: number; value: number }>>([]);

// Performance data configuration
const maxDataPoints = computed(() => customization.value.charts.dataPoints);

// Initialize charts with initial data point
const initTimestamp = Date.now();
cpuData.value.push({ timestamp: initTimestamp, value: 0 });
memoryData.value.push({ timestamp: initTimestamp, value: 0 });
diskData.value.push({ timestamp: initTimestamp, value: 0 });
networkData.value.push({ timestamp: initTimestamp, value: 0 });

// Filtered data based on customization
const filteredCpuData = computed(() => (customization.value.charts.showCPU ? cpuData.value : []));
const filteredMemoryData = computed(() => (customization.value.charts.showMemory ? memoryData.value : []));
const filteredDiskData = computed(() => (customization.value.charts.showDisk ? diskData.value : []));
const filteredNetworkData = computed(() => (customization.value.charts.showNetwork ? networkData.value : []));

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('common.console'), isCurrent: true, href: `/server/${route.params.uuidShort}` },
]);

// Wings connection status display
const wingsConnectionInfo = computed(() => {
    if (!wingsWebSocket.isConnected) {
        return {
            status: 'disconnected',
            message: t('serverConsole.wingsDaemonDisconnected'),
            color: 'text-red-500',
            icon: '🔌',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'healthy') {
        return {
            status: 'healthy',
            message: t('serverConsole.wingsDaemonConnected'),
            color: 'text-green-500',
            icon: '✅',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'error') {
        return {
            status: 'error',
            message: t('serverConsole.wingsDaemonError'),
            color: 'text-yellow-500',
            icon: '⚠️',
        };
    } else {
        return {
            status: 'connecting',
            message: t('serverConsole.connectingToWings'),
            color: 'text-blue-500',
            icon: '🔄',
        };
    }
});

// Initialize XTerm.js
function initializeTerminal(): void {
    if (!terminalContainer.value || terminal) return;

    // Create terminal with custom theme
    terminal = new XTerm({
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: customization.value.terminal.fontSize,
        theme: {
            background: '#000000',
            foreground: '#d1d5db',
            cursor: '#ffffff',
            black: '#000000',
            red: '#e74c3c',
            green: '#2ecc71',
            yellow: '#f39c12',
            blue: '#3498db',
            magenta: '#9b59b6',
            cyan: '#1abc9c',
            white: '#ecf0f1',
            brightBlack: '#95a5a6',
            brightRed: '#ff6b6b',
            brightGreen: '#51cf66',
            brightYellow: '#ffd43b',
            brightBlue: '#74c0fc',
            brightMagenta: '#da77f2',
            brightCyan: '#3bc9db',
            brightWhite: '#ffffff',
        },
        cursorBlink: false, // Disable cursor blink for read-only
        cursorStyle: 'underline',
        scrollback: customization.value.terminal.scrollback,
        convertEol: false, // We handle line endings manually for better control
        allowTransparency: false,
        cols: 80, // Default width
        rows: 24, // Default height
        lineHeight: 1.2,
        letterSpacing: 0,
        allowProposedApi: false,
        disableStdin: true, // Disable user input - this is read-only
    });

    // Load addons
    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    // Open terminal in container
    terminal.open(terminalContainer.value);

    // Fit terminal to container
    fitAddon.fit();

    // Prevent scroll propagation from terminal to page
    if (terminalContainer.value) {
        terminalContainer.value.addEventListener(
            'wheel',
            (e) => {
                e.stopPropagation();
            },
            { passive: true },
        );

        terminalContainer.value.addEventListener(
            'touchmove',
            (e) => {
                e.stopPropagation();
            },
            { passive: true },
        );
    }

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
        if (fitAddon && terminal) {
            fitAddon.fit();
        }
    });

    if (terminalContainer.value) {
        resizeObserver.observe(terminalContainer.value);
    }

    // Write a pretty console welcome message (no emojis)
    writeToTerminal('\r\n\x1b[1;36m╔' + '═'.repeat(48) + '╗\x1b[0m\r\n');
    writeToTerminal('\x1b[1;36m║       Welcome to the FeatherPanel Console      ║\x1b[0m\r\n');
    writeToTerminal('\x1b[1;36m╚' + '═'.repeat(48) + '╝\x1b[0m\r\n');
    writeToTerminal('\x1b[90m' + '─'.repeat(52) + '\x1b[0m\r\n');

    if (server.value?.status !== 'running') {
        writeToTerminal('\r\n\x1b[33mServer is offline. Use the power buttons above to start the server.\x1b[0m\r\n');
        writeToTerminal('\x1b[36mServer status: offline\x1b[0m\r\n\r\n');
    } else {
        writeToTerminal('\x1b[36mServer status: ' + server.value.status + '\x1b[0m\r\n\r\n');
    }
}

// Replace brand names in console output
function replaceBrandNames(text: string): string {
    const appName = String(settingsStore.settings?.app_name || 'FeatherPanel');

    // Replace various forms of Pterodactyl and Pelican with FeatherPanel
    let result = text;

    // Case-insensitive replacements
    result = result.replace(/Pterodactyl/gi, (match) => {
        if (match === match.toUpperCase()) return appName.toUpperCase();
        if (match === match.toLowerCase()) return appName.toLowerCase();
        return appName;
    });

    result = result.replace(/Pelican/gi, (match) => {
        if (match === match.toUpperCase()) return appName.toUpperCase();
        if (match === match.toLowerCase()) return appName.toLowerCase();
        return appName;
    });

    return result;
}

// Flush the write buffer to terminal
function flushWriteBuffer(): void {
    if (terminal && writeBuffer.length > 0) {
        // Join all buffered writes and send at once
        const data = writeBuffer.join('');
        writeBuffer = [];
        terminal.write(data);
    }
    writeTimeout = null;
}

// Apply console filters to output
function applyConsoleFilters(data: string): string | null {
    let processedData = data;

    for (const filter of customization.value.filters) {
        if (!filter.enabled) continue;

        try {
            const regex = new RegExp(filter.pattern, 'gi');

            if (filter.type === 'remove') {
                // If pattern matches, return null to skip this line
                if (regex.test(processedData)) {
                    return null;
                }
            } else if (filter.type === 'highlight') {
                // Highlight matching text with ANSI color codes
                // Convert hex to ANSI color (simplified - using yellow for highlights)
                const ansiColor = '\x1b[43m\x1b[30m'; // Yellow background, black text
                const ansiReset = '\x1b[0m';
                processedData = processedData.replace(regex, (match) => `${ansiColor}${match}${ansiReset}`);
            } else if (filter.type === 'replace') {
                // Replace matching text
                processedData = processedData.replace(regex, filter.replacementText || '');
            }
        } catch (error) {
            console.warn(`Invalid regex pattern in filter "${filter.name}":`, error);
        }
    }

    return processedData;
}

// Detect features from console output
function checkForFeatures(data: string): void {
    if (!server.value?.spell?.features) return;

    // Normalize features to always be an array
    const features = Array.isArray(server.value.spell.features)
        ? server.value.spell.features
        : [server.value.spell.features];

    const detection = detectFeature(data, features);

    if (detection && detection.matched) {
        // Prevent showing the same feature dialog multiple times
        if (detectedFeatures.value.has(detection.feature)) {
            return;
        }

        detectedFeatures.value.add(detection.feature);

        // Handle specific features
        switch (detection.feature) {
            case 'eula':
                showEulaDialog.value = true;
                break;
            case 'java_version':
                detectedJavaIssue.value = detection.message || '';
                showJavaVersionDialog.value = true;
                break;
            case 'pid_limit':
                showPidLimitDialog.value = true;
                break;
            default:
                break;
        }
    }
}

// Write to terminal with buffering for better performance
function writeToTerminal(data: string): void {
    if (!terminal) return;

    // Replace brand names
    let processedData = replaceBrandNames(data);

    // Check for features in the original output (before filtering)
    checkForFeatures(processedData);

    // Apply console filters
    const filteredData = applyConsoleFilters(processedData);
    if (filteredData === null) {
        // Output was filtered out - don't write to terminal
        return;
    }
    processedData = filteredData;

    // Ensure proper line endings for terminal
    // Replace \n with \r\n for proper terminal display
    const formattedData = processedData.replace(/\r?\n/g, '\r\n');

    // Add to buffer
    writeBuffer.push(formattedData);

    // Schedule flush if not already scheduled
    if (writeTimeout === null) {
        writeTimeout = window.setTimeout(flushWriteBuffer, WRITE_DELAY);
    }
}

// Immediate write without buffering (for important messages)
function writeToTerminalImmediate(data: string): void {
    if (!terminal) return;

    // Flush any pending buffer first
    if (writeBuffer.length > 0) {
        flushWriteBuffer();
    }

    // Replace brand names (important messages should always be shown regardless of filter)
    const processedData = replaceBrandNames(data);
    const formattedData = processedData.replace(/\r?\n/g, '\r\n');
    terminal.write(formattedData);
}

// Clear terminal
function clearTerminal(): void {
    if (terminal) {
        terminal.clear();
        writeToTerminal('\r\n\x1b[1;36mTerminal cleared\x1b[0m\r\n\r\n');
    }
}

// Upload console logs to mclo.gs
async function uploadConsoleLogs(): Promise<void> {
    if (!terminal) {
        toast.warning(t('serverConsole.noConsoleContent'));
        return;
    }

    // Check if server is running or starting
    if (server.value?.status !== 'running' && server.value?.status !== 'starting') {
        toast.error(t('serverConsole.serverMustBeRunningUpload'));
        return;
    }

    try {
        uploading.value = true;

        // Get terminal content - we'll use the server logs API as fallback
        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/logs/upload`);

        if (response.data && response.data.success) {
            const mclogsUrl = response.data.data.url;

            // Copy URL to clipboard
            try {
                await navigator.clipboard.writeText(mclogsUrl);
                toast.success(t('serverLogs.logsUploaded'));
            } catch {
                toast.success(`Console logs uploaded: ${mclogsUrl}`);
            }
        } else {
            toast.error(t('serverLogs.failedToUpload'));
        }
    } catch (error) {
        console.error('Error uploading console logs:', error);
        toast.error(t('serverLogs.failedToUpload'));
    } finally {
        uploading.value = false;
    }
}

// Apply terminal settings
function applyTerminalSettings(): void {
    if (terminal) {
        terminal.options.fontSize = customization.value.terminal.fontSize;
        terminal.options.scrollback = customization.value.terminal.scrollback;
        if (fitAddon) {
            fitAddon.fit();
        }
    }
}

// Filter management functions
function addFilter(): void {
    editingFilter.value = null;
    filterForm.value = {
        name: '',
        pattern: '',
        type: 'remove',
        highlightColor: '#ffff00',
        replacementText: '',
    };
    showFilterDialog.value = true;
}

function editFilter(filter: ConsoleFilter): void {
    editingFilter.value = filter;
    filterForm.value = {
        name: filter.name,
        pattern: filter.pattern,
        type: filter.type,
        highlightColor: filter.highlightColor || '#ffff00',
        replacementText: filter.replacementText || '',
    };
    showFilterDialog.value = true;
}

function saveFilter(): void {
    if (!filterForm.value.name || !filterForm.value.pattern) {
        toast.error(t('serverConsole.filterMissingFields'));
        return;
    }

    // Test regex validity
    try {
        new RegExp(filterForm.value.pattern);
    } catch {
        toast.error(t('serverConsole.invalidRegexPattern'));
        return;
    }

    if (editingFilter.value) {
        // Update existing filter
        const index = customization.value.filters.findIndex((f) => f.id === editingFilter.value?.id);
        if (index !== -1) {
            const existingFilter = customization.value.filters[index];
            if (existingFilter) {
                customization.value.filters[index] = {
                    id: existingFilter.id,
                    enabled: existingFilter.enabled,
                    name: filterForm.value.name,
                    pattern: filterForm.value.pattern,
                    type: filterForm.value.type,
                    highlightColor: filterForm.value.highlightColor,
                    replacementText: filterForm.value.replacementText,
                };
            }
        }
    } else {
        // Add new filter
        customization.value.filters.push({
            id: Date.now().toString(),
            name: filterForm.value.name,
            pattern: filterForm.value.pattern,
            type: filterForm.value.type,
            enabled: true,
            highlightColor: filterForm.value.highlightColor,
            replacementText: filterForm.value.replacementText,
        });
    }

    showFilterDialog.value = false;
    saveCustomization();
    toast.success(editingFilter.value ? t('serverConsole.filterUpdated') : t('serverConsole.filterAdded'));
}

function deleteFilter(filterId: string): void {
    customization.value.filters = customization.value.filters.filter((f) => f.id !== filterId);
    saveCustomization();
    toast.success(t('serverConsole.filterDeleted'));
}

function toggleFilter(filterId: string): void {
    const filter = customization.value.filters.find((f) => f.id === filterId);
    if (filter) {
        filter.enabled = !filter.enabled;
        saveCustomization();
    }
}

// Handle EULA acceptance
function handleEulaAccepted(): void {
    // Clear the detected feature so it can be detected again if needed
    detectedFeatures.value.delete('eula');

    // Write a message to the terminal
    writeToTerminalImmediate('\r\n\x1b[32m✅ EULA accepted! You can now start the server.\x1b[0m\r\n\r\n');

    // Optionally restart the server automatically
    toast.success(t('features.eula.eulaAccepted'));
}

// Customization functions
async function saveCustomization(): Promise<void> {
    try {
        const customizationData = {
            components: customization.value.components,
            terminal: customization.value.terminal,
            charts: customization.value.charts,
            filters: customization.value.filters,
        };

        localStorage.setItem('featherpanel-console-customization', JSON.stringify(customizationData));
    } catch (error) {
        console.error('Error saving console customization:', error);
    }
}

async function loadCustomization(): Promise<void> {
    try {
        const localSaved = localStorage.getItem('featherpanel-console-customization');
        if (localSaved) {
            const parsed = JSON.parse(localSaved);

            if (
                parsed &&
                typeof parsed === 'object' &&
                'components' in parsed &&
                'terminal' in parsed &&
                'charts' in parsed
            ) {
                const typedParsed = parsed as {
                    components: Record<string, boolean>;
                    terminal: Record<string, unknown>;
                    charts: Record<string, unknown>;
                    filters?: ConsoleFilter[];
                };

                customization.value = {
                    components: { ...customization.value.components, ...typedParsed.components },
                    terminal: {
                        ...customization.value.terminal,
                        ...typedParsed.terminal,
                    },
                    charts: { ...customization.value.charts, ...typedParsed.charts },
                    filters: typedParsed.filters || [],
                };
            }
        }
    } catch (error) {
        console.error('Error loading console customization:', error);
    }
}

async function resetCustomization(): Promise<void> {
    customization.value = {
        components: {
            serverHeader: false,
            wingsStatus: false,
            serverInfo: false,
            performance: false,
        },
        terminal: {
            fontSize: 16,
            scrollback: 10000,
        },
        charts: {
            showCPU: true,
            showMemory: true,
            showDisk: true,
            showNetwork: true,
            dataPoints: 60,
        },
        filters: [],
    };
    await saveCustomization();
    applyTerminalSettings();
    toast.success(t('serverConsole.layoutResetToDefaults'));
}

async function saveAndApplyCustomization(): Promise<void> {
    await saveCustomization();
    applyTerminalSettings();
    toast.success(t('serverConsole.customizationSaved'));
}

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();

    // Load customization settings
    await loadCustomization();

    await fetchServer();

    // Initialize XTerm.js terminal after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeTerminal();
    }, 100);

    // Set up navigation detection
    const unsubscribe = router.beforeEach((to, from, next) => {
        if (from.path.includes('/server/')) {
            isNavigatingAway.value = true;
        }
        next();
    });

    onUnmounted(() => {
        unsubscribe();
    });

    // Connect to Wings daemon
    await wingsWebSocket.connect();

    // Request stats and logs
    requestServerStats();
    requestServerLogs();

    // Set up periodic stats requests
    statsInterval = setInterval(() => {
        if (wingsWebSocket.isConnected) {
            requestServerStats();
        }
    }, 5000);

    // Initialize performance charts for offline servers
    if (server.value?.status !== 'running') {
        const timestamp = Date.now();
        addDataPoint(cpuData.value, timestamp, 0);
        addDataPoint(memoryData.value, timestamp, 0);
        addDataPoint(diskData.value, timestamp, 0);
        addDataPoint(networkData.value, timestamp, 0);
    }

    // Set up WebSocket handlers
    watch(
        () => wingsWebSocket.websocket.value,
        (newWebSocket) => {
            if (newWebSocket) {
                setupWebSocketHandlers();
            }
        },
        { immediate: true },
    );

    watch(
        () => wingsWebSocket.isConnected.value,
        (isConnected, wasConnected) => {
            if (isConnected && wasConnected === false) {
                if (wingsWebSocket.websocket.value) {
                    setupWebSocketHandlers();
                }
            }
        },
    );

    watch(
        () => wingsWebSocket.wingsStatus?.value,
        (wingsStatus, previousStatus) => {
            if (wingsStatus === 'error' && previousStatus === 'healthy') {
                toast.error(t('serverConsole.wingsStoppedResponding'));
            }
        },
    );

    // Watch for server status changes to update terminal
    watch(
        () => server.value?.status,
        (newStatus, oldStatus) => {
            if (newStatus !== oldStatus && terminal) {
                writeToTerminalImmediate(`\r\n\x1b[36m¶ Server status: ${newStatus}\x1b[0m\r\n`);

                if (newStatus === 'offline' || newStatus === 'stopped') {
                    writeToTerminalImmediate(
                        '\x1b[33m⚠ Server is offline. Use the power buttons above to start the server.\x1b[0m\r\n\r\n',
                    );
                } else if (newStatus === 'running') {
                    writeToTerminalImmediate('\x1b[32m✅ Server is now running\x1b[0m\r\n\r\n');
                }
            }
        },
    );
});

onUnmounted(() => {
    // Clear any pending write timeout
    if (writeTimeout !== null) {
        clearTimeout(writeTimeout);
        writeTimeout = null;
    }

    // Clear write buffer
    writeBuffer = [];

    // Clean up message handler
    if (messageHandler && wingsWebSocket.websocket.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }
    handlersSetup.value = false;
    messageHandler = null;

    // Dispose of XTerm.js terminal
    if (terminal) {
        terminal.dispose();
        terminal = null;
    }
    fitAddon = null;

    wingsWebSocket.cleanup();
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
});

async function fetchServer(): Promise<void> {
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
        } else {
            toast.error(t('serverConsole.failedToFetch'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverConsole.failedToFetch'));
        router.push('/dashboard');
    } finally {
        loading.value = false;
    }
}

function setupWebSocketHandlers(): void {
    if (!wingsWebSocket.websocket.value) return;

    if (messageHandler && handlersSetup.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }

    messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.event === 'console output') {
                const output = data.args[0];
                // Clean Wings daemon prefixes and ensure proper formatting
                let cleanedOutput = output.replace(/^>\s*/gm, '');
                // If the output doesn't end with a newline, add one
                if (!cleanedOutput.endsWith('\n') && !cleanedOutput.endsWith('\r\n')) {
                    cleanedOutput += '\n';
                }
                writeToTerminal(cleanedOutput);
            } else if (data.event === 'status') {
                const newStatus = data.args[0];
                wingsState.value = newStatus;
                if (server.value) {
                    server.value.status = newStatus;
                }

                writeToTerminalImmediate(`\r\n\x1b[36m⚡ Server status: ${newStatus}\x1b[0m\r\n`);

                if (newStatus === 'running') {
                    requestServerLogs();
                    if (!statsInterval) {
                        statsInterval = setInterval(() => {
                            if (wingsWebSocket.isConnected) {
                                requestServerStats();
                            }
                        }, 5000);
                    }
                } else if (newStatus === 'offline' || newStatus === 'stopped') {
                    if (statsInterval) {
                        clearInterval(statsInterval);
                        statsInterval = null;
                    }
                }
            } else if (data.event === 'stats') {
                try {
                    const stats: WingsStats = JSON.parse(data.args[0]);
                    updateServerStats(stats);
                    updatePerformanceCharts(stats);
                    wingsState.value = stats.state;
                    wingsUptime.value = stats.uptime;
                } catch (parseError) {
                    console.warn('Failed to parse stats:', parseError);
                }
            } else if (data.event === 'daemon error') {
                writeToTerminalImmediate(
                    `\r\n\x1b[31m${t('serverConsole.daemonErrorPrefix', { message: data.args?.[0] ?? '' })}\x1b[0m\r\n`,
                );
            } else if (data.event === 'jwt error') {
                writeToTerminalImmediate(
                    `\r\n\x1b[31m${t('serverConsole.jwtErrorPrefix', { message: data.args?.[0] ?? '' })}\x1b[0m\r\n`,
                );
                toast.error(t('serverConsole.authErrorRefresh'));
            } else if (data.event === 'install started') {
                writeToTerminalImmediate('\r\n\x1b[33m📦 Installation started...\x1b[0m\r\n');
            } else if (data.event === 'install output') {
                let installOutput = data.args[0];
                if (!installOutput.endsWith('\n') && !installOutput.endsWith('\r\n')) {
                    installOutput += '\n';
                }
                writeToTerminal(installOutput);
            } else if (data.event === 'install completed') {
                writeToTerminalImmediate('\r\n\x1b[32m✅ Installation completed!\x1b[0m\r\n');
                toast.success(t('serverConsole.installCompleted'));
            } else if (data.event === 'backup completed') {
                writeToTerminalImmediate('\r\n\x1b[32m✅ Backup completed!\x1b[0m\r\n');
                toast.success(t('serverConsole.backupCompleted'));
            } else if (data.event === 'deleted') {
                writeToTerminalImmediate('\r\n\x1b[31m⛔ Server has been deleted\x1b[0m\r\n');
                toast.error(t('serverConsole.serverDeleted'));
                router.push('/dashboard');
            }
        } catch {
            // Handle raw text output
            let rawOutput = event.data;
            if (!rawOutput.endsWith('\n') && !rawOutput.endsWith('\r\n')) {
                rawOutput += '\n';
            }
            writeToTerminal(rawOutput);
        }
    };

    wingsWebSocket.websocket.value.addEventListener('message', messageHandler);
    handlersSetup.value = true;
}

function updateServerStats(stats: WingsStats): void {
    if (!server.value) return;

    // Update current usage (NOT limits - those come from the API)
    server.value.cpuUsage = Math.round(stats.cpu_absolute || 0);
    server.value.memoryUsage = Math.round((stats.memory_bytes || 0) / (1024 * 1024));
    server.value.diskUsage = Math.round((stats.disk_bytes || 0) / (1024 * 1024));

    networkStats.value = {
        upload: formatBytes(stats.network?.tx_bytes || 0),
        download: formatBytes(stats.network?.rx_bytes || 0),
    };
}

function updatePerformanceCharts(stats: WingsStats): void {
    const timestamp = Date.now();

    addDataPoint(cpuData.value, timestamp, stats.cpu_absolute);
    addDataPoint(memoryData.value, timestamp, (stats.memory_bytes || 0) / (1024 * 1024));
    addDataPoint(diskData.value, timestamp, (stats.disk_bytes || 0) / (1024 * 1024));

    const totalNetwork = (stats.network?.rx_bytes || 0) + (stats.network?.tx_bytes || 0);
    addDataPoint(networkData.value, timestamp, totalNetwork);
}

function addDataPoint(dataArray: Array<{ timestamp: number; value: number }>, timestamp: number, value: number): void {
    dataArray.push({ timestamp, value });

    if (dataArray.length > maxDataPoints.value) {
        dataArray.shift();
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Send command to server
async function sendCommand(): Promise<void> {
    if (!commandInput.value.trim() || sendingCommand.value) return;

    // Check if server is running
    if (server.value?.status !== 'running') {
        toast.error(t('serverConsole.serverMustBeRunning'));
        return;
    }

    const command = commandInput.value.trim();

    try {
        sendingCommand.value = true;

        // Send command to backend API
        // Note: We don't echo the command here because the server will echo it back via WebSocket
        await axios.post(`/api/user/servers/${route.params.uuidShort}/command`, {
            command: command,
        });

        // Clear input after successful send
        commandInput.value = '';
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || t('serverConsole.failedToSendCommand');
            toast.error(errorMessage);
            writeToTerminalImmediate(
                `\r\n\x1b[31m${t('serverConsole.errorPrefix', { message: errorMessage })}\x1b[0m\r\n`,
            );
        } else {
            toast.error(t('serverConsole.failedToSendCommand'));
            writeToTerminalImmediate(
                `\r\n\x1b[31m${t('serverConsole.errorPrefix', { message: t('serverConsole.failedToSendCommand') })}\x1b[0m\r\n`,
            );
        }
    } finally {
        sendingCommand.value = false;
    }
}

async function startServer(): Promise<void> {
    try {
        loading.value = true;

        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            if (server.value) {
                server.value.status = 'starting';
            }
            wingsState.value = 'starting';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['start'],
                }),
            );
            toast.success(t('serverConsole.serverStarting'));

            if (!statsInterval) {
                statsInterval = setInterval(() => {
                    if (wingsWebSocket.isConnected) {
                        requestServerStats();
                    }
                }, 5000);
            }
        } else {
            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/start`);
            toast.success(t('serverConsole.serverStarting'));
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        if (server.value) {
            server.value.status = 'offline';
        }
        wingsState.value = 'offline';
        toast.error(t('serverConsole.failedToStartServer'));
        console.error('Start server error:', error);
    } finally {
        loading.value = false;
    }
}

async function stopServer(): Promise<void> {
    try {
        loading.value = true;

        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['stop'],
                }),
            );
            toast.success(t('serverConsole.serverStopping'));
        } else {
            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/stop`);
            toast.success(t('serverConsole.serverStopping'));
        }

        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        toast.error(t('serverConsole.failedToStopServer'));
        console.error('Stop server error:', error);
    } finally {
        loading.value = false;
    }
}

async function restartServer(): Promise<void> {
    try {
        loading.value = true;

        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['restart'],
                }),
            );
            toast.success(t('serverConsole.serverRestarting'));
        } else {
            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/restart`);
            toast.success(t('serverConsole.serverRestarting'));
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        toast.error(t('serverConsole.failedToRestartServer'));
        console.error('Restart server error:', error);
    } finally {
        loading.value = false;
    }
}

async function killServer(): Promise<void> {
    try {
        loading.value = true;

        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            if (server.value) {
                server.value.status = 'offline';
            }
            wingsState.value = 'offline';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['kill'],
                }),
            );
            toast.success(t('serverConsole.serverKilling'));
        } else {
            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/kill`);
            toast.success(t('serverConsole.serverKilling'));
        }

        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        toast.error(t('serverConsole.failedToKillServer'));
        console.error('Kill server error:', error);
    } finally {
        loading.value = false;
    }
}

function requestServerStats(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send stats',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server stats:', error);
        }
    }
}

function requestServerLogs(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send logs',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server logs:', error);
        }
    }
}
</script>

<style scoped>
/* XTerm.js container styling */
:deep(.xterm) {
    padding: 1rem;
    height: 100%;
    width: 100%;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

:deep(.xterm-viewport) {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    /* Prevent scroll chaining to parent */
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
    width: 8px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
    background: transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.5);
}

:deep(.xterm-screen) {
    cursor: text;
}

:deep(.xterm-rows) {
    font-variant-ligatures: none;
    line-height: 1.2;
}

/* Ensure terminal container takes full width */
:deep(.xterm-helper-textarea) {
    position: absolute;
    opacity: 0;
    left: -9999em;
    top: 0;
    width: 0;
    height: 0;
    z-index: -10;
}

/* Terminal cursor styling */
:deep(.xterm-cursor-layer) {
    z-index: 2;
}

/* Fix terminal focus and selection */
:deep(.xterm-screen) {
    user-select: text;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
    :deep(.xterm) {
        padding: 0.5rem;
        font-size: 12px;
    }
}

/* Make the xterm console more transparent */
:deep(.xterm) {
    background-color: rgba(20, 20, 20, 0.65) !important; /* more transparent */
    backdrop-filter: blur(4px) saturate(140%);
    /* Remove any box-shadow that may cause opacity issues */
    box-shadow: none !important;
}
/* Also target the actual terminal viewport for transparency */
:deep(.xterm-viewport) {
    background-color: transparent !important;
}

</style>
