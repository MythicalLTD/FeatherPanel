<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Plugins', isCurrent: true, href: '/admin/plugins' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading plugins...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <div class="text-red-500 mb-4">
                    <AlertCircle class="h-12 w-12 mx-auto" />
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load plugins</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchPlugins">Try Again</Button>
            </div>

            <!-- Plugins Tabs -->
            <div v-else class="p-4 sm:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Plugins</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Manage installed plugins and their configurations
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Open plugins marketplace"
                            @click="router.push('/admin/feathercloud/plugins')"
                        >
                            <CloudDownload class="h-4 w-4 mr-2" />
                            Browse Marketplace
                        </Button>
                    </div>
                </div>

                <!-- Update Available Banner -->
                <div v-if="showUpdatesBanner && pluginsWithUpdates.length > 0" class="mb-4">
                    <div
                        class="rounded-md border border-blue-500/30 bg-blue-500/10 p-4 text-blue-700 dark:text-blue-400"
                    >
                        <div class="flex items-start gap-3">
                            <RefreshCw class="h-5 w-5 shrink-0 mt-0.5" />
                            <div class="flex-1">
                                <div class="font-semibold mb-2">Updates Available</div>
                                <p class="text-sm mb-2">
                                    Hey! It looks like there is an update for the following plugins:
                                </p>
                                <div class="flex flex-wrap gap-2 mb-2">
                                    <Badge
                                        v-for="plugin in pluginsWithUpdates"
                                        :key="plugin.identifier"
                                        variant="secondary"
                                        class="text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                        @click="checkForUpdate(plugin)"
                                    >
                                        {{ plugin.name || plugin.identifier }}
                                        <RefreshCw class="h-3 w-3 ml-1 inline" />
                                    </Badge>
                                </div>
                                <div class="flex items-center gap-2 mt-2">
                                    <Button size="sm" variant="outline" class="text-xs" @click="checkAllUpdates">
                                        <RefreshCw class="h-3 w-3 mr-1" />
                                        Check All Updates
                                    </Button>
                                </div>
                            </div>
                            <button
                                class="text-xs underline hover:no-underline shrink-0"
                                @click="showUpdatesBanner = false"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Banner -->
                <div v-if="banner" class="mb-4">
                    <div
                        class="rounded-md border p-3 flex items-start gap-2"
                        :class="{
                            'border-green-500/30 bg-green-500/10 text-green-700': banner.type === 'success',
                            'border-yellow-500/30 bg-yellow-500/10 text-yellow-700': banner.type === 'warning',
                            'border-red-500/30 bg-red-500/10 text-red-700': banner.type === 'error',
                            'border-blue-500/30 bg-blue-500/10 text-blue-700': banner.type === 'info',
                        }"
                    >
                        <span class="text-sm">{{ banner.text }}</span>
                        <button class="ml-auto text-xs underline" @click="banner = null">Dismiss</button>
                    </div>
                </div>

                <!-- Previously Installed Plugins Banner -->
                <div
                    v-if="showPreviouslyInstalledBanner && previouslyInstalledPlugins.length > 0"
                    class="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5"
                >
                    <div class="flex items-start gap-3">
                        <Info class="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                Previously Installed Plugins
                            </h3>
                            <p class="text-sm text-blue-800 dark:text-blue-400 mb-3">
                                You had {{ previouslyInstalledPlugins.length }} plugin{{
                                    previouslyInstalledPlugins.length !== 1 ? 's' : ''
                                }}
                                installed before. Would you like to reinstall
                                {{ previouslyInstalledPlugins.length === 1 ? 'it' : 'them' }}?
                            </p>
                            <div class="flex flex-wrap gap-2 mb-3">
                                <Badge
                                    v-for="plugin in previouslyInstalledPlugins"
                                    :key="plugin.id"
                                    variant="outline"
                                    class="text-xs border-blue-500/50 text-blue-700 dark:text-blue-400"
                                >
                                    {{ plugin.name }}
                                </Badge>
                            </div>
                            <div class="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="default"
                                    class="bg-blue-600 hover:bg-blue-700 text-white"
                                    @click="reinstallPreviouslyInstalledPlugins"
                                >
                                    <CloudDownload class="h-4 w-4 mr-2" />
                                    Reinstall All
                                </Button>
                                <Button size="sm" variant="outline" @click="showPreviouslyInstalledBanner = false">
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                        <div class="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                class="w-full sm:w-auto"
                                data-umami-event="Refresh plugins"
                                @click="fetchPlugins"
                            >
                                <RefreshCw class="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                class="w-full sm:w-auto"
                                :disabled="updateCheckLoading"
                                data-umami-event="Check plugin updates"
                                @click="checkAllUpdates"
                            >
                                <RefreshCw :class="['h-4 w-4 mr-2', updateCheckLoading && 'animate-spin']" />
                                Check Updates
                            </Button>
                            <label class="inline-block w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    as="span"
                                    class="w-full sm:w-auto"
                                    data-umami-event="Upload plugin"
                                >
                                    <Upload class="h-4 w-4 mr-2" />
                                    <span class="hidden sm:inline">Upload Plugin (.fpa)</span>
                                    <span class="sm:hidden">Upload (.fpa)</span>
                                </Button>
                                <input type="file" accept=".fpa" class="hidden" @change="onUploadPlugin" />
                            </label>
                        </div>
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Input v-model="installUrl" placeholder="Install from URL (.fpa)" class="w-full sm:w-72" />
                            <Button
                                :disabled="installingFromUrl || !installUrl"
                                class="w-full sm:w-auto"
                                data-umami-event="Install plugin from URL"
                                :data-umami-event-url="installUrl"
                                @click="openUrlInstallDialog"
                            >
                                <CloudDownload class="h-4 w-4 mr-2" />
                                <span class="hidden sm:inline">{{
                                    installingFromUrl ? 'Installing...' : 'Install URL'
                                }}</span>
                                <span class="sm:hidden">{{ installingFromUrl ? 'Installing...' : 'Install' }}</span>
                            </Button>
                        </div>
                    </div>

                    <div
                        v-if="plugins.length > 0"
                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                    >
                        <Card
                            v-for="plugin in plugins"
                            :key="plugin.identifier"
                            class="group hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
                            @click="openPluginConfig(plugin)"
                        >
                            <div class="p-4 sm:p-6 flex flex-col flex-1">
                                <!-- Header Section -->
                                <div class="flex items-start gap-3 mb-3">
                                    <div
                                        class="h-12 w-12 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                                    >
                                        <img
                                            v-if="plugin.icon"
                                            :src="plugin.icon"
                                            :alt="plugin.name || plugin.identifier"
                                            class="h-8 w-8 object-contain"
                                        />
                                        <component :is="getPluginIcon(plugin)" v-else class="h-6 w-6 text-primary" />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <h3 class="font-semibold text-base sm:text-lg truncate mb-0.5">
                                            {{ plugin.name || plugin.identifier }}
                                        </h3>
                                        <p class="text-xs text-muted-foreground truncate mb-1">
                                            {{ plugin.identifier }}
                                        </p>
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="secondary" class="text-xs">
                                                v{{ plugin.version || 'Unknown' }}
                                            </Badge>
                                            <Badge
                                                v-if="hasUpdateAvailable(plugin)"
                                                class="text-xs bg-blue-500 text-white border-0 animate-pulse"
                                            >
                                                <RefreshCw class="h-3 w-3 inline mr-1" />
                                                Update Available
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <!-- Description -->
                                <p class="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-10">
                                    {{ plugin.description || 'No description available' }}
                                </p>

                                <!-- Metadata Section -->
                                <div class="space-y-2.5 mb-4 flex-1">
                                    <div v-if="plugin.author" class="flex items-center gap-2 text-sm">
                                        <User class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span class="truncate text-muted-foreground">{{ plugin.author }}</span>
                                    </div>

                                    <!-- Flags and Target in same row -->
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <Badge v-if="plugin.target" variant="outline" class="text-xs">
                                            {{ plugin.target }}
                                        </Badge>
                                        <Badge
                                            v-for="flag in plugin.flags"
                                            :key="flag"
                                            variant="secondary"
                                            class="text-xs"
                                        >
                                            {{ flag }}
                                        </Badge>
                                    </div>

                                    <div v-if="plugin.website" class="flex items-center gap-2 text-sm">
                                        <Globe class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <a
                                            :href="plugin.website"
                                            target="_blank"
                                            class="text-primary hover:underline text-xs truncate"
                                            @click.stop
                                        >
                                            Visit Website
                                        </a>
                                    </div>

                                    <!-- Status Alerts -->
                                    <div
                                        v-if="plugin.unmetDependencies && plugin.unmetDependencies.length > 0"
                                        class="rounded-md border p-2.5 text-xs border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/5"
                                    >
                                        <div class="font-medium text-yellow-800 dark:text-yellow-600 mb-1.5">
                                            Missing Dependencies
                                        </div>
                                        <div class="flex flex-wrap gap-1">
                                            <Badge
                                                v-for="dep in plugin.unmetDependencies"
                                                :key="dep"
                                                variant="outline"
                                                class="text-[10px] border-yellow-600/30 bg-yellow-100/50 dark:bg-yellow-900/20"
                                            >
                                                {{ dep }}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div
                                        v-else-if="plugin.missingConfigs && plugin.missingConfigs.length > 0"
                                        class="rounded-md border p-2.5 text-xs border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/5"
                                    >
                                        <div class="font-medium text-blue-800 dark:text-blue-600 mb-1.5">
                                            Needs Configuration
                                        </div>
                                        <div class="flex flex-wrap gap-1">
                                            <Badge
                                                v-for="cfg in plugin.missingConfigs"
                                                :key="String(cfg)"
                                                variant="outline"
                                                class="text-[10px] border-blue-600/30 bg-blue-100/50 dark:bg-blue-900/20"
                                            >
                                                {{ String(cfg) }}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div
                                        v-else-if="plugin.loaded === false"
                                        class="rounded-md border border-muted bg-muted/30 p-2.5 text-xs text-muted-foreground"
                                    >
                                        <span class="font-medium">Not loaded</span>
                                    </div>
                                </div>

                                <!-- Actions Section -->
                                <div class="flex flex-col gap-2 mt-auto pt-4 border-t border-border/50">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        class="w-full justify-center hover:scale-105 hover:shadow-md transition-all duration-200"
                                        title="Configure plugin"
                                        @click.stop="openPluginConfig(plugin)"
                                    >
                                        <Settings class="h-4 w-4 mr-2" />
                                        Configure
                                    </Button>
                                    <div class="grid grid-cols-2 gap-2">
                                        <Button
                                            v-if="hasUpdateAvailable(plugin)"
                                            size="sm"
                                            variant="default"
                                            class="w-full justify-center hover:scale-110 hover:shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700"
                                            title="Check for update"
                                            :disabled="checkingUpdateId === plugin.identifier"
                                            @click.stop="checkForUpdate(plugin)"
                                        >
                                            <RefreshCw
                                                v-if="checkingUpdateId === plugin.identifier"
                                                class="h-4 w-4 animate-spin"
                                            />
                                            <RefreshCw v-else class="h-4 w-4" />
                                        </Button>
                                        <Button
                                            v-else
                                            size="sm"
                                            variant="outline"
                                            class="w-full justify-center hover:scale-110 hover:shadow-md transition-all duration-200"
                                            title="View plugin information"
                                            @click.stop="viewPluginInfo(plugin)"
                                        >
                                            <Info class="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            class="w-full justify-center hover:scale-110 hover:shadow-md transition-all duration-200"
                                            title="Uninstall plugin"
                                            @click.stop="requestUninstall(plugin)"
                                        >
                                            <Trash2 class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div v-else class="text-center py-12">
                        <div class="h-24 w-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <Puzzle class="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 class="text-lg font-semibold mb-2">No Plugins Installed</h3>
                        <p class="text-muted-foreground mb-4">No plugins are currently installed on your system.</p>
                        <Button
                            class="hover:scale-105 hover:shadow-md transition-all duration-200"
                            title="Refresh plugins list"
                            @click="fetchPlugins"
                        >
                            <RefreshCw class="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Plugins help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Upload class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Install & Upload</div>
                                <p>
                                    Upload .fpa files via the GUI or install via a direct URL. Use the actions below to
                                    configure, export, or uninstall plugins.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Settings class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Configuration</div>
                                <p>
                                    Click on any plugin card to configure its settings. Plugins may require specific
                                    configuration values to function properly.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-1">
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <AlertCircle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Security & Liability</div>
                                <p>
                                    Installing third‑party plugins can be risky (panel corruption or system compromise).
                                    FeatherPanel and its team are not liable for what you install or develop.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Puzzle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">A careful reminder</div>
                                <p>
                                    Always review documentation and source before installing plugins. Keep backups and
                                    test changes in a safe environment first.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>

        <!-- Plugin Configuration Drawer -->
        <Drawer
            class="w-full"
            :open="configDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeConfigDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedPlugin">
                <DrawerHeader>
                    <DrawerTitle>Plugin Configuration</DrawerTitle>
                    <DrawerDescription>
                        Configure settings for {{ selectedPlugin.name || selectedPlugin.identifier }}
                    </DrawerDescription>
                </DrawerHeader>

                <div class="px-4 sm:px-6 pt-4 sm:pt-6 min-h-[500px]">
                    <!-- Loading State -->
                    <div v-if="configLoading" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <div
                                class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                            ></div>
                            <span class="text-muted-foreground">Loading plugin configuration...</span>
                        </div>
                    </div>

                    <!-- Configuration Content -->
                    <div v-else-if="pluginConfig" class="space-y-6">
                        <!-- Plugin Info -->
                        <Card>
                            <div class="p-4">
                                <h3 class="font-semibold mb-3">Plugin Information</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span class="font-medium text-muted-foreground">Name:</span>
                                        <span class="ml-2">{{
                                            pluginConfig.plugin?.name || selectedPlugin.identifier
                                        }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Version:</span>
                                        <span class="ml-2">{{ pluginConfig.plugin?.version || 'Unknown' }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Author:</span>
                                        <span class="ml-2">{{ pluginConfig.plugin?.author || 'Unknown' }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Description:</span>
                                        <span class="ml-2">{{
                                            pluginConfig.plugin?.description || 'No description'
                                        }}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <!-- Plugin Settings -->
                        <Card>
                            <div class="p-4">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="font-semibold">Plugin Configuration</h3>
                                    <Badge v-if="hasConfigSchema" variant="outline" class="text-xs">
                                        {{ configFields.length }} fields
                                    </Badge>
                                </div>

                                <!-- Enhanced Config Fields -->
                                <div v-if="hasConfigSchema" class="space-y-4">
                                    <div v-for="field in configFields" :key="field.name" class="space-y-2">
                                        <div class="flex items-center justify-between">
                                            <label class="text-sm font-medium">{{ field.display_name }}</label>
                                            <Badge v-if="field.required" variant="secondary" class="text-xs"
                                                >Required</Badge
                                            >
                                        </div>
                                        <div class="relative">
                                            <Input
                                                v-if="
                                                    field.type === 'text' ||
                                                    field.type === 'url' ||
                                                    field.type === 'email'
                                                "
                                                v-model="pluginConfig.settings[field.name]"
                                                :type="field.type === 'email' ? 'email' : 'text'"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <Input
                                                v-else-if="field.type === 'password'"
                                                v-model="pluginConfig.settings[field.name]"
                                                type="password"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <Input
                                                v-else-if="field.type === 'number'"
                                                v-model="pluginConfig.settings[field.name]"
                                                type="number"
                                                :min="field.validation.min"
                                                :max="field.validation.max"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
                                                <input
                                                    v-model="pluginConfig.settings[field.name]"
                                                    type="checkbox"
                                                    :value="pluginConfig.settings[field.name] === 'true'"
                                                    @change="
                                                        pluginConfig.settings[field.name] = (
                                                            $event.target as HTMLInputElement
                                                        ).checked
                                                            ? 'true'
                                                            : 'false'
                                                    "
                                                />
                                                <span class="text-sm">{{ field.display_name }}</span>
                                            </div>
                                        </div>
                                        <p class="text-xs text-muted-foreground">{{ field.description }}</p>
                                        <p v-if="field.validation.message" class="text-xs text-orange-600">
                                            {{ field.validation.message }}
                                        </p>
                                    </div>
                                    <Button class="w-full" :disabled="savingSetting" @click="saveAllSettings">
                                        <Save v-if="!savingSetting" class="h-4 w-4 mr-2" />
                                        <div
                                            v-else
                                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                        ></div>
                                        {{ savingSetting ? 'Saving...' : 'Save All Settings' }}
                                    </Button>
                                </div>

                                <!-- No Config Schema Available -->
                                <div v-else class="text-center py-8 text-muted-foreground">
                                    <Settings class="h-8 w-8 mx-auto mb-2" />
                                    <p>This plugin doesn't have a configuration schema defined</p>
                                    <p class="text-xs mt-1">
                                        The plugin developer needs to add a config section to conf.yml
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="configError" class="text-center py-8">
                        <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p class="text-destructive">{{ configError }}</p>
                        <Button size="sm" variant="outline" class="mt-2" @click="loadPluginConfig"> Try Again </Button>
                    </div>
                </div>

                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeConfigDrawer">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Plugin Info Drawer -->
        <Drawer
            class="w-full"
            :open="infoDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeInfoDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedPlugin">
                <DrawerHeader>
                    <DrawerTitle>Plugin Information</DrawerTitle>
                    <DrawerDescription>
                        Detailed information about {{ selectedPlugin.name || selectedPlugin.identifier }}
                    </DrawerDescription>
                </DrawerHeader>

                <div class="px-4 sm:px-6 pt-4 sm:pt-6 space-y-4">
                    <!-- Loading State -->
                    <div v-if="configLoading" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <div
                                class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                            ></div>
                            <span class="text-muted-foreground">Loading plugin information...</span>
                        </div>
                    </div>

                    <!-- Plugin Information -->
                    <div v-else-if="pluginConfig" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span class="font-medium text-muted-foreground">Identifier:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.identifier }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Name:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.name || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Version:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.version || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Author:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.author || 'Unknown' }}</p>
                        </div>
                        <div v-if="pluginConfig.plugin.target">
                            <span class="font-medium text-muted-foreground">Target Version:</span>
                            <p class="mt-1">
                                <Badge variant="outline">{{ pluginConfig.plugin.target }}</Badge>
                            </p>
                        </div>
                        <div v-if="pluginConfig.plugin.flags && pluginConfig.plugin.flags.length > 0">
                            <span class="font-medium text-muted-foreground">Flags:</span>
                            <div class="mt-1 flex gap-1 flex-wrap">
                                <Badge
                                    v-for="flag in pluginConfig.plugin.flags"
                                    :key="flag"
                                    variant="secondary"
                                    class="text-xs"
                                >
                                    {{ flag }}
                                </Badge>
                            </div>
                        </div>
                        <div v-if="pluginConfig.plugin.website" class="sm:col-span-2">
                            <span class="font-medium text-muted-foreground">Website:</span>
                            <p class="mt-1">
                                <a
                                    :href="pluginConfig.plugin.website"
                                    target="_blank"
                                    class="text-primary hover:underline"
                                >
                                    {{ pluginConfig.plugin.website }}
                                </a>
                            </p>
                        </div>
                        <div v-if="pluginConfig.plugin.description" class="sm:col-span-2">
                            <span class="font-medium text-muted-foreground">Description:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.description }}</p>
                        </div>
                        <div
                            v-if="pluginConfig.plugin.dependencies && pluginConfig.plugin.dependencies.length > 0"
                            class="sm:col-span-2"
                        >
                            <span class="font-medium text-muted-foreground">Dependencies:</span>
                            <div class="mt-1">
                                <ul class="list-disc list-inside space-y-1">
                                    <li v-for="dep in pluginConfig.plugin.dependencies" :key="dep" class="text-sm">
                                        {{ dep }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div
                            v-if="pluginConfig.plugin.requiredConfigs && pluginConfig.plugin.requiredConfigs.length > 0"
                            class="sm:col-span-2"
                        >
                            <span class="font-medium text-muted-foreground">Required Configurations:</span>
                            <div class="mt-1">
                                <ul class="list-disc list-inside space-y-1">
                                    <li
                                        v-for="(config, index) in pluginConfig.plugin.requiredConfigs"
                                        :key="index"
                                        class="text-sm"
                                    >
                                        {{ String(config) }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="configError" class="text-center py-8">
                        <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p class="text-destructive">{{ configError }}</p>
                        <Button size="sm" variant="outline" class="mt-2" @click="loadPluginConfig(selectedPlugin!)">
                            Try Again
                        </Button>
                    </div>

                    <!-- Fallback to basic info if config loading fails -->
                    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span class="font-medium text-muted-foreground">Identifier:</span>
                            <p class="mt-1">{{ selectedPlugin.identifier }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Name:</span>
                            <p class="mt-1">{{ selectedPlugin.name || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Version:</span>
                            <p class="mt-1">{{ selectedPlugin.version || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Author:</span>
                            <p class="mt-1">{{ selectedPlugin.author || 'Unknown' }}</p>
                        </div>
                        <div v-if="selectedPlugin.description" class="sm:col-span-2">
                            <span class="font-medium text-muted-foreground">Description:</span>
                            <p class="mt-1">{{ selectedPlugin.description }}</p>
                        </div>
                    </div>
                </div>

                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeInfoDrawer">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Confirm Uninstall Dialog -->
        <Dialog v-model:open="confirmUninstallOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Uninstall Plugin</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to uninstall
                        {{ selectedPluginForUninstall?.name || selectedPluginForUninstall?.identifier }}?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        @click="selectedPluginForUninstall && onUninstall(selectedPluginForUninstall)"
                    >
                        Uninstall
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Confirm Install From URL Dialog -->
        <Dialog v-model:open="confirmUrlOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Install From URL</DialogTitle>
                    <DialogDescription> URL: {{ installUrl }} </DialogDescription>
                </DialogHeader>
                <div class="text-sm text-yellow-700">
                    Warning: It is unsafe to install plugins from URLs that are not from the official repository.
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button :disabled="installingFromUrl" @click="installFromUrl">
                        <div
                            v-if="installingFromUrl"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        Install
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Confirm Upload Dialog -->
        <Dialog v-model:open="confirmUploadOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload and Install Plugin</DialogTitle>
                    <DialogDescription> File: {{ pendingUploadFile?.name }} </DialogDescription>
                </DialogHeader>
                <div class="text-sm text-yellow-700">
                    Warning: Uploading and installing third-party plugins can be unsafe unless from our official repo.
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button @click="performUpload">Install</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Update Plugin Dialog -->
        <Dialog v-model:open="updateDialogOpen">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Update Plugin</DialogTitle>
                    <DialogDescription v-if="updateRequirements && selectedPlugin">
                        {{ updateRequirements.package.name }} ({{ updateRequirements.package.identifier }})
                    </DialogDescription>
                </DialogHeader>

                <div v-if="updateRequirementsLoading" class="flex items-center justify-center py-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Checking update requirements...</span>
                    </div>
                </div>

                <div v-else-if="updateRequirements" class="space-y-4">
                    <!-- Update Info -->
                    <div
                        class="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-600"
                    >
                        <div class="flex items-start gap-2">
                            <RefreshCw class="h-5 w-5 shrink-0 mt-0.5" />
                            <div class="flex-1">
                                <div class="font-semibold mb-1">Update Available</div>
                                <p>
                                    Update from
                                    <span class="font-medium">{{
                                        updateRequirements.installed_version || 'unknown'
                                    }}</span>
                                    to
                                    <span class="font-medium">{{
                                        updateRequirements.latest_version || 'unknown'
                                    }}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Warning -->
                    <div
                        class="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-600"
                    >
                        <div class="flex items-start gap-2">
                            <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold mb-1">Backup Recommended</div>
                                <p>
                                    It's recommended to backup your plugin configuration and data before updating. The
                                    update will replace the current plugin files.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        v-if="updateRequirements && selectedPlugin"
                        :disabled="
                            installingUpdateId === selectedPlugin.identifier ||
                            !updateRequirements.can_install ||
                            updateRequirementsLoading
                        "
                        @click="installUpdate(selectedPlugin)"
                    >
                        <div
                            v-if="installingUpdateId === selectedPlugin.identifier"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        {{
                            installingUpdateId === selectedPlugin.identifier
                                ? 'Updating...'
                                : `Update to v${updateRequirements.latest_version || 'latest'}`
                        }}
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

import { ref, onMounted, computed } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import {
    AlertCircle,
    RefreshCw,
    Settings,
    Info,
    User,
    Globe,
    Puzzle,
    Trash2,
    Upload,
    CloudDownload,
    Save,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
} from '@/components/ui/drawer';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';

// Types
interface Plugin {
    identifier: string;
    name?: string;
    version?: string;
    author?: string;
    description?: string;
    website?: string;
    icon?: string;
    flags?: string[];
    target?: string;
    requiredConfigs?: unknown[];
    dependencies?: string[];
    loaded?: boolean;
    unmetDependencies?: string[];
    missingConfigs?: string[];
    configSchema?: ConfigField[];
}

interface ConfigField {
    name: string;
    display_name: string;
    type: 'text' | 'email' | 'url' | 'password' | 'number' | 'boolean';
    description: string;
    required: boolean;
    validation: {
        regex?: string;
        message?: string;
        min?: number;
        max?: number;
    };
    default: string;
}

interface PluginConfig {
    config: Plugin;
    plugin: Plugin;
    settings: Record<string, string>;
    configSchema?: ConfigField[];
}

// Stores
const sessionStore = useSessionStore();
const router = useRouter();

// State
const loading = ref(true);
const message = ref<{ type: 'error' | 'success'; text: string } | null>(null);
const plugins = ref<Plugin[]>([]);
const banner = ref<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);

// Drawer states
const configDrawerOpen = ref(false);
const infoDrawerOpen = ref(false);
const selectedPlugin = ref<Plugin | null>(null);

// Configuration states
const configLoading = ref(false);
const configError = ref<string | null>(null);
const pluginConfig = ref<PluginConfig | null>(null);

// Setting states
const savingSetting = ref(false);
const installUrl = ref('');
const installingFromUrl = ref(false);
// Dialog states and selections
const confirmUninstallOpen = ref(false);
const confirmUrlOpen = ref(false);
const confirmUploadOpen = ref(false);
const selectedPluginForUninstall = ref<Plugin | null>(null);
const pendingUploadFile = ref<File | null>(null);

// Update checking states
const checkingUpdateId = ref<string | null>(null);
const onlinePluginsCache = ref<Map<string, { version: string; identifier: string }>>(new Map());
const updateCheckLoading = ref(false);
const updateDialogOpen = ref(false);
const updateRequirements = ref<{
    can_install: boolean;
    update_available: boolean;
    installed_version?: string | null;
    latest_version?: string | null;
    package: {
        identifier: string;
        name: string;
        version?: string;
    };
} | null>(null);
const updateRequirementsLoading = ref(false);
const installingUpdateId = ref<string | null>(null);
const showUpdatesBanner = ref(true);
const previouslyInstalledPlugins = ref<
    Array<{
        id: number;
        name: string;
        identifier: string;
        cloud_id?: number | null;
        version?: string | null;
        installed_at: string;
        uninstalled_at?: string | null;
    }>
>([]);
const showPreviouslyInstalledBanner = ref(false);

// Computed
const configFields = computed(() => {
    if (!pluginConfig.value?.configSchema) return [];
    return pluginConfig.value.configSchema;
});

const hasConfigSchema = computed(() => {
    const schema = pluginConfig.value?.configSchema;
    return schema && Array.isArray(schema) && schema.length > 0;
});

/**
 * Get all plugins that have updates available
 */
const pluginsWithUpdates = computed(() => {
    return plugins.value.filter((plugin) => hasUpdateAvailable(plugin));
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPluginIcon = (_plugin: Plugin) => {
    // You can customize this based on plugin type or add icon mapping
    return Settings;
};

/**
 * Normalize version string (remove 'v' prefix)
 */
const normalizeVersion = (v: string): string => {
    return v.replace(/^v/i, '');
};

/**
 * Compare two version strings
 */
const compareVersions = (v1: string, v2: string): number => {
    const parts1 = normalizeVersion(v1).split('.').map(Number);
    const parts2 = normalizeVersion(v2).split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 < part2) return -1;
        if (part1 > part2) return 1;
    }
    return 0;
};

/**
 * Check if an update is available for a plugin
 */
const hasUpdateAvailable = (plugin: Plugin): boolean => {
    if (!plugin.identifier || !plugin.version) {
        return false;
    }

    const onlinePlugin = onlinePluginsCache.value.get(plugin.identifier);
    if (!onlinePlugin || !onlinePlugin.version) {
        return false;
    }

    const installedVersion = plugin.version;
    const latestVersion = onlinePlugin.version;

    return compareVersions(installedVersion, latestVersion) < 0;
};

/**
 * Fetch online plugin information for update checking
 */
const fetchOnlinePluginInfo = async (identifier: string): Promise<void> => {
    if (onlinePluginsCache.value.has(identifier)) {
        return; // Already cached
    }

    try {
        const resp = await fetch(`/api/admin/plugins/online/${encodeURIComponent(identifier)}`, {
            credentials: 'include',
        });

        if (resp.ok) {
            const data = await resp.json();
            const packageData = data.data?.package;
            if (packageData?.latest_version?.version) {
                onlinePluginsCache.value.set(identifier, {
                    version: packageData.latest_version.version,
                    identifier: packageData.identifier,
                });
            }
        }
    } catch (error) {
        console.error(`Failed to fetch online info for plugin ${identifier}:`, error);
        // Silently fail - update checking is optional
    }
};

/**
 * Check for updates for all installed plugins
 */
const checkAllUpdates = async (): Promise<void> => {
    if (updateCheckLoading.value) return;

    updateCheckLoading.value = true;
    try {
        // Fetch online info for all installed plugins in parallel
        const promises = plugins.value.map((plugin) => fetchOnlinePluginInfo(plugin.identifier));
        await Promise.all(promises);

        // Show banner if updates are found
        if (pluginsWithUpdates.value.length > 0) {
            showUpdatesBanner.value = true;
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    } finally {
        updateCheckLoading.value = false;
    }
};

/**
 * Check for update for a specific plugin and open install dialog
 */
const checkForUpdate = async (plugin: Plugin): Promise<void> => {
    checkingUpdateId.value = plugin.identifier;
    updateRequirementsLoading.value = true;
    selectedPlugin.value = plugin;

    try {
        // Fetch requirements check which includes update info
        const resp = await fetch(`/api/admin/plugins/online/${encodeURIComponent(plugin.identifier)}/check`, {
            credentials: 'include',
        });

        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }

        const data = await resp.json();
        const requirements = data.data;

        if (requirements?.update_available) {
            // Open install dialog for update
            await openUpdateInstallDialog(plugin, requirements);
        } else {
            banner.value = {
                type: 'info',
                text: `${plugin.name || plugin.identifier} is already up to date`,
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to check for update';
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        checkingUpdateId.value = null;
        updateRequirementsLoading.value = false;
    }
};

/**
 * Open update install dialog
 */
const openUpdateInstallDialog = async (plugin: Plugin, requirements: unknown): Promise<void> => {
    updateDialogOpen.value = true;
    updateRequirements.value = requirements as typeof updateRequirements.value;
};

/**
 * Install update for a plugin
 */
const installUpdate = async (plugin: Plugin): Promise<void> => {
    installingUpdateId.value = plugin.identifier;

    try {
        const resp = await fetch('/api/admin/plugins/online/install', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: plugin.identifier }),
        });

        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }

        await resp.json();
        await fetchPlugins();
        await checkAllUpdates(); // Refresh update status

        const oldVersion = updateRequirements.value?.installed_version || 'unknown';
        const newVersion = updateRequirements.value?.latest_version || 'unknown';
        banner.value = {
            type: 'success',
            text: `Updated ${plugin.name || plugin.identifier} from v${oldVersion} to v${newVersion} successfully`,
        };

        // Update banner visibility based on remaining updates
        if (pluginsWithUpdates.value.length === 0) {
            showUpdatesBanner.value = false;
        }

        updateDialogOpen.value = false;
        updateRequirements.value = null;

        // Reload page to load updated plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to install update';
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        installingUpdateId.value = null;
    }
};

/**
 * Parse API error response and return a user-friendly error message
 */
const parseApiError = async (response: Response): Promise<string> => {
    try {
        const errorData = await response.json();

        // Check for detailed error message
        if (errorData.message && typeof errorData.message === 'string') {
            // Map common error codes to user-friendly messages
            const errorCode = errorData.error_code || '';
            const baseMessage = errorData.message;

            const errorMessages: Record<string, string> = {
                INVALID_URL:
                    'The URL you provided is invalid. Please check that it starts with http:// or https:// and is a valid link.',
                INVALID_IDENTIFIER:
                    'The plugin identifier is invalid. It should only contain letters, numbers, underscores, and hyphens.',
                ADDON_EXISTS: 'This plugin is already installed. Please uninstall it first if you want to reinstall.',
                ADDON_NOT_FOUND: 'The plugin could not be found in the repository.',
                ADDON_DOWNLOAD_FAILED:
                    'Failed to download the plugin. Please check your internet connection and try again.',
                ADDON_EXTRACT_FAILED: 'Failed to extract the plugin package. The file may be corrupted.',
                ADDON_INVALID: 'The plugin package is invalid or missing required files.',
                ADDON_CONF_PARSE_FAILED: 'Failed to read the plugin configuration file. The plugin may be corrupted.',
                ADDON_IDENTIFIER_INVALID: 'The plugin has an invalid identifier in its configuration.',
                ADDON_DIR_FAILED: 'Failed to create the plugin directory. Please check file permissions.',
                ADDON_MIGRATION_FAILED:
                    'The plugin installation failed during database migration. Check the error details.',
                ADDONS_DIR_CREATE_FAILED: 'Failed to create the plugins directory. Please check file permissions.',
                PACKAGES_API_FAILED:
                    'Failed to connect to the plugin repository. Please check your internet connection.',
                PREMIUM_ADDON_PURCHASE_REQUIRED: 'This is a premium plugin and must be purchased before installation.',
                ONLINE_LIST_FETCH_FAILED: 'Failed to load the plugin list. Please check your internet connection.',
                ONLINE_LIST_INVALID: 'Received invalid data from the plugin repository. Please try again later.',
                SETTING_REMOVE_FAILED: 'Failed to remove the plugin setting.',
                SETTING_SET_FAILED: 'Failed to save the plugin setting.',
            };

            // Return mapped message if available, otherwise use the API message
            if (errorCode && errorMessages[errorCode]) {
                return errorMessages[errorCode];
            }

            // If the API message is already user-friendly, use it
            if (baseMessage && baseMessage.length > 0 && !baseMessage.includes('HTTP')) {
                return baseMessage;
            }
        }

        // Check for errors array with details
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            const firstError = errorData.errors[0];
            if (firstError.detail && typeof firstError.detail === 'string') {
                return firstError.detail;
            }
        }

        // Fallback to status text
        return `An error occurred (${response.status}): ${response.statusText || 'Unknown error'}`;
    } catch {
        // If we can't parse the error, return a generic message
        return `An error occurred (${response.status}): ${response.statusText || 'Unknown error'}`;
    }
};

// Methods
const fetchPlugins = async () => {
    loading.value = true;
    message.value = null;

    try {
        const response = await fetch('/api/admin/plugins', {
            credentials: 'include',
        });

        if (!response.ok) {
            const errorMessage = await parseApiError(response);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        // Transform the nested plugin structure to a flat array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginsArray = Object.values(data.data.plugins || {}).map((pluginData: any) => {
            const plugin = pluginData.plugin;
            return {
                identifier: plugin.identifier,
                name: plugin.name,
                version: plugin.version,
                author: Array.isArray(plugin.author) ? plugin.author.join(', ') : plugin.author,
                description: plugin.description,
                website: plugin.website,
                icon: plugin.icon,
                flags: plugin.flags,
                target: plugin.target,
                requiredConfigs: plugin.requiredConfigs,
                dependencies: plugin.dependencies,
                loaded: plugin.loaded ?? true,
                unmetDependencies: Array.isArray(plugin.unmetDependencies) ? plugin.unmetDependencies : [],
                missingConfigs: Array.isArray(plugin.missingConfigs) ? plugin.missingConfigs : [],
                configSchema: pluginData.configSchema || [],
            };
        });
        plugins.value = pluginsArray;
    } catch (error) {
        console.error('Failed to fetch plugins:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to load plugins',
        };
    } finally {
        loading.value = false;
    }
};

const loadPluginConfig = async (plugin: Plugin) => {
    configLoading.value = true;
    configError.value = null;

    try {
        // First try to get settings from the config endpoint
        const response = await fetch(`/api/admin/plugins/${plugin.identifier}/config`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            // The API returns nested plugin data, so we need to extract it properly
            const apiData = data.data;
            // Convert settings array to object if needed
            let settings = {};
            if (Array.isArray(apiData.settings)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                settings = apiData.settings.reduce((acc: Record<string, string>, setting: any) => {
                    acc[setting.key] = setting.value;
                    return acc;
                }, {});
            } else if (apiData.settings && typeof apiData.settings === 'object') {
                settings = apiData.settings;
            }

            // Extract and normalize plugin data
            const configPlugin = apiData.config.plugin || apiData.config;
            const pluginData = apiData.plugin.plugin || apiData.plugin;

            // Normalize author field (convert array to string if needed)
            if (Array.isArray(configPlugin.author)) {
                configPlugin.author = configPlugin.author.join(', ');
            }
            if (Array.isArray(pluginData.author)) {
                pluginData.author = pluginData.author.join(', ');
            }

            pluginConfig.value = {
                config: configPlugin,
                plugin: pluginData,
                settings: settings,
                configSchema: apiData.configSchema || apiData.config || [],
            };
        } else {
            // If config endpoint fails, create a basic config with the plugin data we already have
            pluginConfig.value = {
                config: plugin,
                plugin: plugin,
                settings: {},
                configSchema: [],
            };
        }
    } catch (error) {
        console.error('Failed to fetch plugin config:', error);
        // Fallback to basic plugin data
        pluginConfig.value = {
            config: plugin,
            plugin: plugin,
            settings: {},
            configSchema: plugin.configSchema || [],
        };
    } finally {
        configLoading.value = false;
    }
};

const openPluginConfig = async (plugin: Plugin) => {
    selectedPlugin.value = plugin;
    configDrawerOpen.value = true;
    await loadPluginConfig(plugin);
};

const closeConfigDrawer = () => {
    configDrawerOpen.value = false;
    selectedPlugin.value = null;
    pluginConfig.value = null;
    configError.value = null;
};

const viewPluginInfo = async (plugin: Plugin) => {
    selectedPlugin.value = plugin;
    infoDrawerOpen.value = true;
    // Load full plugin configuration for detailed info
    await loadPluginConfig(plugin);
};

const closeInfoDrawer = () => {
    infoDrawerOpen.value = false;
    selectedPlugin.value = null;
    // Don't clear pluginConfig here as it might be used by config drawer
};

const saveAllSettings = async () => {
    if (!selectedPlugin.value || !pluginConfig.value?.settings) {
        return;
    }

    savingSetting.value = true;

    try {
        // Save each setting individually
        const savePromises = Object.entries(pluginConfig.value.settings).map(async ([key, value]) => {
            const response = await fetch(`/api/admin/plugins/${selectedPlugin.value!.identifier}/settings/set`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ key, value }),
            });

            if (!response.ok) {
                const errorMessage = await parseApiError(response);
                throw new Error(`Failed to save setting "${key}": ${errorMessage}`);
            }
        });

        await Promise.all(savePromises);

        // Reload plugin config
        await loadPluginConfig(selectedPlugin.value);

        message.value = {
            type: 'success',
            text: 'All settings saved successfully',
        };
    } catch (error) {
        console.error('Failed to save settings:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to save settings',
        };
    } finally {
        savingSetting.value = false;
    }
};

// Upload .fpa and install
const onUploadPlugin = async (evt: Event) => {
    const target = evt.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];
    if (file) {
        pendingUploadFile.value = file;
        confirmUploadOpen.value = true;
    }
};

const performUpload = async () => {
    if (!pendingUploadFile.value) return;
    try {
        const form = new FormData();
        form.append('file', pendingUploadFile.value);
        const resp = await fetch('/api/admin/plugins/upload/install', {
            method: 'POST',
            credentials: 'include',
            body: form,
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        await fetchPlugins();
        message.value = { type: 'success', text: 'Plugin installed successfully' };
        banner.value = { type: 'success', text: 'Plugin installed successfully' };

        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to upload and install plugin';
        message.value = { type: 'error', text: errorMessage };
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        confirmUploadOpen.value = false;
        pendingUploadFile.value = null;
        const inputs = document.querySelectorAll('input[type="file"][accept=".fpa"]');
        inputs.forEach((i) => ((i as HTMLInputElement).value = ''));
    }
};

const installFromUrl = async () => {
    if (!installUrl.value) return;
    installingFromUrl.value = true;
    try {
        const resp = await fetch('/api/admin/plugins/upload/install-url', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: installUrl.value }),
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        await fetchPlugins();
        message.value = { type: 'success', text: `Installed ${data.data?.identifier || 'plugin'}` };
        installUrl.value = '';
        banner.value = { type: 'success', text: `Installed ${data.data?.identifier || 'plugin'}` };

        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to install plugin from URL';
        message.value = { type: 'error', text: errorMessage };
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        installingFromUrl.value = false;
        confirmUrlOpen.value = false;
    }
};

const openUrlInstallDialog = () => {
    if (!installUrl.value) return;
    confirmUrlOpen.value = true;
};

// Uninstall plugin
const requestUninstall = (plugin: Plugin) => {
    selectedPluginForUninstall.value = plugin;
    confirmUninstallOpen.value = true;
};
const onUninstall = async (plugin: Plugin) => {
    try {
        const resp = await fetch(`/api/admin/plugins/${plugin.identifier}/uninstall`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        await fetchPlugins();
        message.value = { type: 'success', text: 'Plugin uninstalled' };
        banner.value = { type: 'success', text: `${plugin.name || plugin.identifier} uninstalled` };

        // Reload page to remove plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to uninstall plugin';
        message.value = { type: 'error', text: errorMessage };
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        confirmUninstallOpen.value = false;
        selectedPluginForUninstall.value = null;
    }
};

const fetchPreviouslyInstalledPlugins = async () => {
    try {
        const resp = await fetch('/api/admin/plugins/previously-installed', {
            credentials: 'include',
        });
        if (!resp.ok) {
            return;
        }
        const data = await resp.json();
        if (data.success && data.data?.plugins) {
            // Filter to only show uninstalled plugins (those with uninstalled_at set)
            const uninstalled = data.data.plugins.filter(
                (p: { uninstalled_at: string | null }) => p.uninstalled_at !== null,
            );
            // Only show plugins that are not currently installed
            // Use a computed set to check against current plugins
            const installedIdentifiers = new Set(plugins.value.map((p) => p.identifier));
            const uninstalledNotCurrent = uninstalled.filter(
                (p: { identifier: string }) => !installedIdentifiers.has(p.identifier),
            );
            previouslyInstalledPlugins.value = uninstalledNotCurrent;
            showPreviouslyInstalledBanner.value = uninstalledNotCurrent.length > 0;
        }
    } catch (e) {
        console.error('Failed to fetch previously installed plugins:', e);
    }
};

const reinstallPreviouslyInstalledPlugins = async () => {
    const toReinstall = previouslyInstalledPlugins.value;
    let successCount = 0;
    let failCount = 0;

    for (const plugin of toReinstall) {
        try {
            const resp = await fetch('/api/admin/plugins/online/install', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: plugin.identifier }),
            });
            if (resp.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (e) {
            failCount++;
            console.error(`Failed to reinstall ${plugin.identifier}:`, e);
        }
    }

    if (successCount > 0) {
        banner.value = {
            type: 'success',
            text: `Successfully reinstalled ${successCount} plugin${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        };
        showPreviouslyInstalledBanner.value = false;
        await fetchPlugins();
        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else if (failCount > 0) {
        banner.value = {
            type: 'error',
            text: `Failed to reinstall ${failCount} plugin${failCount !== 1 ? 's' : ''}`,
        };
    }
};

// Lifecycle
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    await fetchPlugins();
    // Check for updates in the background
    checkAllUpdates();
    // Fetch previously installed plugins
    await fetchPreviouslyInstalledPlugins();
});
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
