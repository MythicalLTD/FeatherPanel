<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Customization Panel -->
            <Card v-if="showCustomization" class="border-2 p-4 sm:p-6">
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
                                    <Select
                                        class="w-32"
                                        :model-value="filter.enabled ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => setFilterEnabled(filter.id, value === 'enabled')
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    filter.enabled
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
                :can-start="hasServerPermission('control.start')"
                :can-stop="hasServerPermission('control.stop')"
                :can-restart="hasServerPermission('control.restart')"
                :can-kill="hasServerPermission('control.console')"
                @start="startServer"
                @restart="restartServer"
                @stop="stopServer"
                @kill="killServer"
            />
            <div class="fixed top-20 right-4 sm:top-6 sm:right-6 z-40">
                <Button
                    variant="outline"
                    size="sm"
                    class="shadow-lg backdrop-blur-sm bg-background/95 flex items-center gap-2"
                    @click="showCustomization = !showCustomization"
                >
                    <Settings :class="['h-3.5 w-3.5 sm:h-4 sm:w-4', showCustomization && 'animate-spin']" />
                    <span class="text-xs sm:text-sm">{{
                        showCustomization ? t('serverConsole.hideLayout') : t('serverConsole.customizeLayout')
                    }}</span>
                </Button>
            </div>

            <!-- Wings Connection Status (Only show when NOT healthy) -->
            <Card
                v-if="!customization.components.wingsStatus && wingsConnectionInfo.status !== 'healthy'"
                class="border-2 transition-all overflow-hidden"
                :class="{
                    'border-yellow-500/50 bg-yellow-500/5': wingsConnectionInfo.status === 'error',
                    'border-red-500/50 bg-red-500/5': wingsConnectionInfo.status === 'disconnected',
                    'border-blue-500/50 bg-blue-500/5': wingsConnectionInfo.status === 'connecting',
                }"
            >
                <CardContent class="p-4">
                    <div class="flex items-center gap-4">
                        <div
                            class="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 text-2xl"
                            :class="{
                                'bg-yellow-500/10': wingsConnectionInfo.status === 'error',
                                'bg-red-500/10': wingsConnectionInfo.status === 'disconnected',
                                'bg-blue-500/10': wingsConnectionInfo.status === 'connecting',
                            }"
                        >
                            {{ wingsConnectionInfo.icon }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p
                                class="font-semibold text-base leading-tight truncate"
                                :class="wingsConnectionInfo.color"
                            >
                                {{ wingsConnectionInfo.message }}
                            </p>
                        </div>
                        <div v-if="wingsConnectionInfo.status === 'connecting'" class="shrink-0">
                            <div
                                class="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                            ></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Server Info Cards -->
            <ServerInfoCards
                v-if="!customization.components.serverInfo"
                :server="server"
                :wings-uptime="wingsUptime"
                :wings-state="wingsState"
            />

            <!-- XTerm.js Terminal Console -->
            <Card class="border-2 transition-colors overflow-hidden">
                <CardHeader class="border-b">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Terminal class="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle class="text-lg">{{ t('common.console') }}</CardTitle>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                class="hidden sm:flex items-center gap-2"
                                data-umami-event="Console history"
                                @click="showCommandHistory = true"
                            >
                                <Clock class="h-3.5 w-3.5" />
                                <span class="text-xs sm:text-sm">{{ t('serverConsole.history') }}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                class="hidden sm:flex items-center gap-2"
                                :disabled="
                                    uploading || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                data-umami-event="Upload logs"
                                @click="uploadConsoleLogs"
                            >
                                <Upload class="h-3.5 w-3.5" />
                                <span class="text-xs sm:text-sm">{{ t('serverLogs.uploadToMcloGs') }}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                class="h-8 w-8 p-0"
                                data-umami-event="Clear console"
                                @click="clearTerminal"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="p-0 relative">
                    <div
                        ref="terminalContainer"
                        class="w-full h-[500px] sm:h-[600px] bg-black overflow-hidden"
                        @wheel.stop
                        @touchmove.stop
                    ></div>
                    <!-- Scroll to bottom button -->
                    <Button
                        v-if="showScrollToBottom"
                        variant="outline"
                        size="sm"
                        class="absolute top-4 right-4 z-10 shadow-lg backdrop-blur-sm bg-background/95 hover:bg-background"
                        @click="scrollToBottom"
                    >
                        <ChevronDown class="h-4 w-4 mr-2" />
                        <span class="hidden sm:inline">{{ t('serverConsole.scrollToBottom') }}</span>
                    </Button>

                    <!-- Command Input Bar -->
                    <div v-if="hasServerPermission('control.console')" class="border-t p-3 bg-muted/30">
                        <div class="flex gap-2">
                            <Input
                                ref="commandInputRef"
                                v-model="commandInput"
                                type="text"
                                class="flex-1 text-sm font-mono"
                                :placeholder="t('serverConsole.enterCommandPlaceholder')"
                                :disabled="
                                    sendingCommand || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @keydown.enter="sendCommand"
                                @keydown.up.prevent="navigateHistoryUp"
                                @keydown.down.prevent="navigateHistoryDown"
                            />
                            <Button
                                size="sm"
                                class="h-9 w-9 p-0"
                                :disabled="
                                    sendingCommand ||
                                    !commandInput.trim() ||
                                    !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @click="sendCommand"
                            >
                                <Send :class="['h-3.5 w-3.5', sendingCommand && 'animate-pulse']" />
                            </Button>
                            <!-- Mobile upload button -->
                            <Button
                                variant="outline"
                                size="sm"
                                class="sm:hidden h-9 w-9 p-0"
                                :disabled="
                                    uploading || !(server?.status === 'running' || server?.status === 'starting')
                                "
                                @click="uploadConsoleLogs"
                            >
                                <Upload :class="['h-3.5 w-3.5', uploading && 'animate-pulse']" />
                            </Button>
                        </div>
                        <p
                            v-if="server && server.status !== 'running' && server.status !== 'starting'"
                            class="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1.5"
                        >
                            <span>⚠️</span>
                            <span>{{ t('serverConsole.serverMustBeRunningCommands') }}</span>
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

        <!-- Command History Dialog -->
        <Dialog v-model:open="showCommandHistory">
            <DialogContent class="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock class="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>{{ t('serverConsole.commandHistory') }}</DialogTitle>
                            <DialogDescription>{{ t('serverConsole.commandHistoryDescription') }}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <!-- History Tabs -->
                <div class="border-b">
                    <div class="flex gap-4">
                        <button
                            :class="[
                                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                historyTab === 'server'
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            ]"
                            @click="historyTab = 'server'"
                        >
                            {{ t('serverConsole.thisServer') }}
                            <Badge variant="secondary" class="ml-2">{{ serverCommandHistory.length }}</Badge>
                        </button>
                        <button
                            :class="[
                                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                historyTab === 'global'
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            ]"
                            @click="historyTab = 'global'"
                        >
                            {{ t('serverConsole.allServers') }}
                            <Badge variant="secondary" class="ml-2">{{ globalCommandHistory.length }}</Badge>
                        </button>
                    </div>
                </div>

                <!-- History Content -->
                <div class="overflow-y-auto max-h-[50vh] py-4">
                    <div v-if="currentHistoryList.length === 0" class="text-center py-8 text-muted-foreground">
                        <Clock class="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p class="text-sm">{{ t('serverConsole.noCommandHistory') }}</p>
                    </div>

                    <div v-else class="space-y-2">
                        <div
                            v-for="(cmd, index) in currentHistoryList"
                            :key="index"
                            class="group flex items-center gap-3 p-3 border-2 rounded-lg hover:border-primary/50 transition-colors bg-card"
                        >
                            <div class="flex-1 min-w-0">
                                <code class="text-sm font-mono break-all">{{ cmd.command }}</code>
                                <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span class="flex items-center gap-1">
                                        <Calendar class="h-3 w-3" />
                                        {{ formatDate(cmd.timestamp) }}
                                    </span>
                                    <span
                                        v-if="historyTab === 'global' && cmd.serverName"
                                        class="flex items-center gap-1"
                                    >
                                        <ServerIcon class="h-3 w-3" />
                                        {{ cmd.serverName }}
                                    </span>
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    @click="useHistoryCommand(cmd.command)"
                                >
                                    <Terminal class="h-3.5 w-3.5 mr-1" />
                                    <span class="text-xs">{{ t('serverConsole.use') }}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    @click="copyToClipboard(cmd.command)"
                                >
                                    <Copy class="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter class="flex items-center justify-between">
                    <Button variant="outline" size="sm" @click="clearHistory">
                        <Trash2 class="h-3.5 w-3.5 mr-2" />
                        {{ t('serverConsole.clearHistory') }}
                    </Button>
                    <Button variant="outline" @click="showCommandHistory = false">
                        {{ t('common.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerHeader from '@/components/server/ServerHeader.vue';
import ServerInfoCards from '@/components/server/ServerInfoCards.vue';
import ServerPerformance from '@/components/server/ServerPerformance.vue';
import { Button } from '@/components/ui/button';
import {
    Settings,
    RotateCcw,
    Save,
    Terminal,
    Trash2,
    Send,
    Upload,
    Plus,
    Pencil,
    Clock,
    Copy,
    Calendar,
    Server as ServerIcon,
    ChevronDown,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server, NetworkStats } from '@/types/server';
import { useWingsWebSocket, type WingsStats } from '@/composables/useWingsWebSocket';
import { useServerPermissions } from '@/composables/useServerPermissions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission check
const hasConsolePermission = computed(() => hasServerPermission('websocket.connect'));

// Terminal container ref
const terminalContainer = ref<HTMLElement | null>(null);
const commandInputRef = ref<InstanceType<typeof Input> | null>(null);

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

// Scroll to bottom button state
const showScrollToBottom = ref(false);
let scrollCheckInterval: number | null = null;

// Command History
interface CommandHistoryEntry {
    command: string;
    timestamp: string;
    serverName?: string;
    serverUuid?: string;
}

const showCommandHistory = ref(false);
const historyTab = ref<'server' | 'global'>('server');
const serverCommandHistory = ref<CommandHistoryEntry[]>([]);
const globalCommandHistory = ref<CommandHistoryEntry[]>([]);
const historyIndex = ref(-1); // Current position in history navigation
const temporaryInput = ref(''); // Store current input when navigating history

const currentHistoryList = computed(() => {
    return historyTab.value === 'server' ? serverCommandHistory.value : globalCommandHistory.value;
});

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
let lastJwtErrorTime = 0;
const JWT_ERROR_THROTTLE_MS = 10000; // Only show error once every 10 seconds

// Auth success callback - defined before onMounted for cleanup access
function onAuthSuccessCallback(): void {
    requestServerStats();
    requestServerLogs();
}

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

    // Enable Ctrl/Cmd + C to copy current selection to clipboard
    terminal.attachCustomKeyEventHandler((e) => {
        const isCopyKey = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
        if (isCopyKey) {
            const selection = terminal?.getSelection();
            if (selection && selection.length > 0) {
                copyToClipboard(selection, false);
                // Prevent xterm from handling Ctrl+C as input/interrupt
                return false;
            }
        }
        return true;
    });

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

    // Set up scroll position monitoring
    setupScrollMonitoring();
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
        writeTimeout = window.setTimeout(() => {
            flushWriteBuffer();
            // After writing, check if we should auto-scroll (only if already at bottom)
            if (!showScrollToBottom.value) {
                scrollToBottom();
            }
        }, WRITE_DELAY);
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
    // After clearing, scroll to bottom
    scrollToBottom();
}

// Check if terminal is scrolled to bottom
function checkScrollPosition(): void {
    if (!terminal) {
        showScrollToBottom.value = false;
        return;
    }

    // Get terminal scroll position
    const viewportElement = terminalContainer.value?.querySelector('.xterm-viewport') as HTMLElement;
    if (!viewportElement) {
        showScrollToBottom.value = false;
        return;
    }

    const scrollTop = viewportElement.scrollTop;
    const scrollHeight = viewportElement.scrollHeight;
    const clientHeight = viewportElement.clientHeight;

    // Check if scrolled to bottom (with 5px threshold for rounding errors)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
    showScrollToBottom.value = !isAtBottom;
}

// Set up scroll monitoring
function setupScrollMonitoring(): void {
    // Wait for terminal to be ready
    setTimeout(() => {
        // Clear existing interval if any
        if (scrollCheckInterval !== null) {
            clearInterval(scrollCheckInterval);
        }

        // Check scroll position periodically
        scrollCheckInterval = window.setInterval(() => {
            checkScrollPosition();
        }, 100);

        // Also check on scroll events
        const viewportElement = terminalContainer.value?.querySelector('.xterm-viewport') as HTMLElement;
        if (viewportElement) {
            viewportElement.addEventListener('scroll', checkScrollPosition);
        }

        // Initial check
        checkScrollPosition();
    }, 200);
}

// Scroll terminal to bottom
function scrollToBottom(): void {
    if (!terminal) return;

    // Scroll terminal to bottom
    terminal.scrollToBottom();

    // Also ensure viewport is scrolled
    const viewportElement = terminalContainer.value?.querySelector('.xterm-viewport') as HTMLElement;
    if (viewportElement) {
        viewportElement.scrollTop = viewportElement.scrollHeight;
    }

    // Update button state
    checkScrollPosition();
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

function setFilterEnabled(filterId: string, enabled: boolean): void {
    const filter = customization.value.filters.find((f) => f.id === filterId);
    if (filter) {
        filter.enabled = enabled;
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

    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has permission to access console
    if (!hasConsolePermission.value) {
        toast.error(t('serverConsole.noConsolePermission'));
        await router.push(`/dashboard`);
        return;
    }

    // Load customization settings
    await loadCustomization();

    // Load command history
    loadCommandHistory();

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

    // Logs and stats will be requested automatically after authentication succeeds
    // via the onAuthSuccess callback

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

    // Register callback to request logs and stats after successful authentication
    wingsWebSocket.onAuthSuccess(onAuthSuccessCallback);

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

    // Clean up scroll monitoring
    if (scrollCheckInterval !== null) {
        clearInterval(scrollCheckInterval);
        scrollCheckInterval = null;
    }

    // Remove scroll event listener
    const viewportElement = terminalContainer.value?.querySelector('.xterm-viewport') as HTMLElement;
    if (viewportElement) {
        viewportElement.removeEventListener('scroll', checkScrollPosition);
    }

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

    // Remove auth success callback
    wingsWebSocket.removeAuthSuccessCallback(onAuthSuccessCallback);

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
                // Throttle error toasts to avoid spam (show once every 10 seconds max)
                const now = Date.now();
                if (now - lastJwtErrorTime > JWT_ERROR_THROTTLE_MS) {
                    toast.error(t('serverConsole.authErrorRefresh'));
                    lastJwtErrorTime = now;
                }
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

// Command History Functions
function loadCommandHistory(): void {
    try {
        // Load server-specific history
        const serverKey = `featherpanel-console-history-${route.params.uuidShort}`;
        const serverHistoryData = localStorage.getItem(serverKey);
        if (serverHistoryData) {
            serverCommandHistory.value = JSON.parse(serverHistoryData);
        }

        // Load global history
        const globalHistoryData = localStorage.getItem('featherpanel-console-history-global');
        if (globalHistoryData) {
            globalCommandHistory.value = JSON.parse(globalHistoryData);
        }
    } catch (error) {
        console.error('Error loading command history:', error);
    }
}

function saveCommandHistory(): void {
    try {
        // Save server-specific history (max 100 commands)
        const serverKey = `featherpanel-console-history-${route.params.uuidShort}`;
        const serverHistory = serverCommandHistory.value.slice(-100);
        localStorage.setItem(serverKey, JSON.stringify(serverHistory));

        // Save global history (max 200 commands)
        const globalHistory = globalCommandHistory.value.slice(-200);
        localStorage.setItem('featherpanel-console-history-global', JSON.stringify(globalHistory));
    } catch (error) {
        console.error('Error saving command history:', error);
    }
}

function addToCommandHistory(command: string): void {
    const entry: CommandHistoryEntry = {
        command,
        timestamp: new Date().toISOString(),
        serverName: server.value?.name,
        serverUuid: route.params.uuidShort as string,
    };

    // Add to server-specific history
    serverCommandHistory.value.push(entry);

    // Add to global history
    globalCommandHistory.value.push(entry);

    // Save to localStorage
    saveCommandHistory();

    // Reset history navigation
    historyIndex.value = -1;
    temporaryInput.value = '';
}

function navigateHistoryUp(): void {
    if (serverCommandHistory.value.length === 0) return;

    // Store current input when starting history navigation
    if (historyIndex.value === -1) {
        temporaryInput.value = commandInput.value;
    }

    if (historyIndex.value < serverCommandHistory.value.length - 1) {
        historyIndex.value++;
        const cmd = serverCommandHistory.value[serverCommandHistory.value.length - 1 - historyIndex.value];
        if (cmd) {
            commandInput.value = cmd.command;
        }
    }
}

function navigateHistoryDown(): void {
    if (historyIndex.value > 0) {
        historyIndex.value--;
        const cmd = serverCommandHistory.value[serverCommandHistory.value.length - 1 - historyIndex.value];
        if (cmd) {
            commandInput.value = cmd.command;
        }
    } else if (historyIndex.value === 0) {
        // Restore the temporary input
        historyIndex.value = -1;
        commandInput.value = temporaryInput.value;
        temporaryInput.value = '';
    }
}

async function useHistoryCommand(command: string): Promise<void> {
    commandInput.value = command;
    showCommandHistory.value = false;
    // Focus the input
    await nextTick();
    const inputEl = commandInputRef.value?.$el as HTMLInputElement | undefined;
    inputEl?.focus();
}

function clearHistory(): void {
    if (historyTab.value === 'server') {
        serverCommandHistory.value = [];
        const serverKey = `featherpanel-console-history-${route.params.uuidShort}`;
        localStorage.removeItem(serverKey);
        toast.success(t('serverConsole.serverHistoryCleared'));
    } else {
        globalCommandHistory.value = [];
        localStorage.removeItem('featherpanel-console-history-global');
        toast.success(t('serverConsole.globalHistoryCleared'));
    }
}

function copyToClipboard(text: string, showToast: boolean = true): void {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            if (showToast) {
                toast.success(t('common.copied'));
            }
        })
        .catch(() => {
            if (showToast) {
                toast.error(t('serverConsole.failedToCopy'));
            }
        });
}

function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
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
        await axios.post(`/api/user/servers/${route.params.uuidShort}/command`, {
            command: command,
        });

        // Add to command history
        addToCommandHistory(command);

        // Clear input after successful send
        commandInput.value = '';

        // Reset history navigation
        historyIndex.value = -1;
        temporaryInput.value = '';

        // Refocus the input
        await nextTick();
        const inputEl = commandInputRef.value?.$el as HTMLInputElement | undefined;
        inputEl?.focus();
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
