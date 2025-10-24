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
                        <Tabs v-model="activeTab" class="w-full sm:w-auto">
                            <TabsList class="grid w-full grid-cols-2 sm:inline-flex">
                                <TabsTrigger value="installed" class="text-xs sm:text-sm">Installed</TabsTrigger>
                                <TabsTrigger value="online" class="text-xs sm:text-sm">Online</TabsTrigger>
                            </TabsList>
                        </Tabs>
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

                <Tabs v-model="activeTab">
                    <TabsContent value="installed">
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                            <div class="flex flex-wrap items-center gap-2">
                                <Button variant="outline" class="w-full sm:w-auto" @click="fetchPlugins">
                                    <RefreshCw class="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                                <label class="inline-block w-full sm:w-auto">
                                    <Button variant="outline" as="span" class="w-full sm:w-auto">
                                        <Upload class="h-4 w-4 mr-2" />
                                        <span class="hidden sm:inline">Upload Plugin (.fpa)</span>
                                        <span class="sm:hidden">Upload (.fpa)</span>
                                    </Button>
                                    <input type="file" accept=".fpa" class="hidden" @change="onUploadPlugin" />
                                </label>
                            </div>
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <Input
                                    v-model="installUrl"
                                    placeholder="Install from URL (.fpa)"
                                    class="w-full sm:w-72"
                                />
                                <Button
                                    :disabled="installingFromUrl || !installUrl"
                                    class="w-full sm:w-auto"
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
                                            class="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                                        >
                                            <img
                                                v-if="plugin.icon"
                                                :src="plugin.icon"
                                                :alt="plugin.name || plugin.identifier"
                                                class="h-8 w-8 object-contain"
                                            />
                                            <component
                                                :is="getPluginIcon(plugin)"
                                                v-else
                                                class="h-6 w-6 text-primary"
                                            />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h3 class="font-semibold text-base sm:text-lg truncate mb-0.5">
                                                {{ plugin.name || plugin.identifier }}
                                            </h3>
                                            <p class="text-xs text-muted-foreground truncate mb-1">
                                                {{ plugin.identifier }}
                                            </p>
                                            <Badge variant="secondary" class="text-xs">
                                                v{{ plugin.version || 'Unknown' }}
                                            </Badge>
                                        </div>
                                    </div>

                                    <!-- Description -->
                                    <p class="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
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
                                            class="w-full justify-center"
                                            @click.stop="openPluginConfig(plugin)"
                                        >
                                            <Settings class="h-4 w-4 mr-2" />
                                            Configure
                                        </Button>
                                        <div class="grid grid-cols-3 gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                class="w-full justify-center"
                                                @click.stop="viewPluginInfo(plugin)"
                                            >
                                                <Info class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                class="w-full justify-center"
                                                @click.stop="onExport(plugin)"
                                            >
                                                <Download class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                class="w-full justify-center"
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
                            <Button @click="fetchPlugins">
                                <RefreshCw class="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="online">
                        <!-- Publish Banner (dismissible) -->
                        <div v-if="showPluginsOnlineBanner" class="mb-4">
                            <div
                                class="rounded-xl p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow relative"
                            >
                                <button
                                    class="absolute top-3 right-3 text-white/80 hover:text-white text-xs underline"
                                    @click="dismissPluginsOnlineBanner"
                                >
                                    Dismiss
                                </button>
                                <div class="flex flex-col gap-3">
                                    <div class="text-lg font-semibold leading-snug">Built a plugin?</div>
                                    <p class="text-white/90 text-sm">
                                        Share it with the community on our cloud platform. Our team aims to review and
                                        publish within 48 hours.
                                    </p>
                                    <div class="flex items-center gap-2">
                                        <Button
                                            as="a"
                                            href="https://cloud.mythical.systems"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            size="sm"
                                            class="bg-white text-indigo-700 hover:bg-white/90"
                                        >
                                            Publish Plugin
                                        </Button>
                                        <Button
                                            as="a"
                                            href="https://cloud.mythical.systems"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            size="sm"
                                            variant="secondary"
                                            class="bg-white/15 hover:bg-white/20 text-white"
                                        >
                                            Learn more
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                            <div class="flex items-center gap-2">
                                <div class="relative flex-1 sm:flex-none">
                                    <Input
                                        v-model="onlineSearch"
                                        placeholder="Search online addons..."
                                        class="pr-10 w-full sm:w-64"
                                        @keyup.enter="fetchOnlineAddons"
                                    />
                                    <button
                                        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        @click="fetchOnlineAddons"
                                    >
                                        <CloudDownload class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div v-if="onlinePagination" class="text-xs text-muted-foreground text-center sm:text-left">
                                Page {{ onlinePagination.current_page }} / {{ onlinePagination.total_pages }} •
                                {{ onlinePagination.total_records }} results
                            </div>
                        </div>

                        <div v-if="onlineLoading" class="flex items-center justify-center py-8">
                            <div class="flex items-center gap-3">
                                <div
                                    class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                                ></div>
                                <span class="text-muted-foreground">Loading online addons...</span>
                            </div>
                        </div>
                        <div v-else-if="onlineError" class="text-center py-8">
                            <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                            <p class="text-destructive">{{ onlineError }}</p>
                            <Button size="sm" variant="outline" class="mt-2" @click="fetchOnlineAddons"
                                >Try Again</Button
                            >
                        </div>
                        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card
                                v-for="addon in onlineAddons"
                                :key="addon.identifier"
                                class="hover:shadow-lg transition-all duration-200 flex flex-col"
                            >
                                <div class="p-4 sm:p-5 flex flex-col flex-1">
                                    <!-- Header Section -->
                                    <div class="flex items-start gap-3 mb-3">
                                        <div
                                            class="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                                        >
                                            <img
                                                v-if="addon.icon"
                                                :src="addon.icon"
                                                :alt="addon.name"
                                                class="h-8 w-8 object-contain"
                                            />
                                            <Puzzle v-else class="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h3 class="font-semibold text-base truncate mb-0.5">{{ addon.name }}</h3>
                                            <p class="text-xs text-muted-foreground truncate mb-1">
                                                {{ addon.identifier }}
                                            </p>
                                            <div class="flex items-center gap-1.5 flex-wrap">
                                                <Badge
                                                    v-if="addon.latest_version?.version"
                                                    variant="secondary"
                                                    class="text-xs"
                                                >
                                                    v{{ addon.latest_version.version }}
                                                </Badge>
                                                <Badge
                                                    v-if="addon.verified"
                                                    variant="secondary"
                                                    class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                                                >
                                                    ✓ Verified
                                                </Badge>
                                                <Badge
                                                    v-else
                                                    variant="outline"
                                                    class="text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-500"
                                                >
                                                    Unverified
                                                </Badge>
                                                <Badge
                                                    v-if="addon.premium === 1"
                                                    class="text-xs bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0"
                                                >
                                                    Premium
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Description -->
                                    <p class="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                                        {{ addon.description || 'No description available' }}
                                    </p>

                                    <!-- Warning for unverified -->
                                    <div
                                        v-if="!addon.verified"
                                        class="mb-3 text-xs text-yellow-700 dark:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-md p-2"
                                    >
                                        ⚠️ Unverified addon - review source before installing
                                    </div>

                                    <!-- Premium Price -->
                                    <div v-if="addon.premium === 1 && addon.premium_price" class="mb-3">
                                        <div
                                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-yellow-500/10 to-amber-600/10 border border-yellow-500/30"
                                        >
                                            <span class="text-base font-bold text-yellow-700 dark:text-yellow-500"
                                                >€{{ addon.premium_price }}</span
                                            >
                                            <span class="text-xs text-muted-foreground">EUR</span>
                                        </div>
                                    </div>

                                    <!-- Metadata Section -->
                                    <div class="space-y-2 mb-3 flex-1">
                                        <div v-if="addon.author" class="flex items-center gap-2 text-sm">
                                            <User class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span class="truncate text-muted-foreground">{{ addon.author }}</span>
                                        </div>

                                        <!-- Tags -->
                                        <div v-if="addon.tags && addon.tags.length > 0" class="flex flex-wrap gap-1">
                                            <Badge
                                                v-for="tag in addon.tags.slice(0, 3)"
                                                :key="tag"
                                                variant="outline"
                                                class="text-xs"
                                            >
                                                #{{ tag }}
                                            </Badge>
                                            <Badge v-if="addon.tags.length > 3" variant="outline" class="text-xs">
                                                +{{ addon.tags.length - 3 }}
                                            </Badge>
                                        </div>

                                        <!-- Stats -->
                                        <div class="flex items-center justify-between text-xs text-muted-foreground">
                                            <span v-if="addon.downloads">
                                                <CloudDownload class="h-3 w-3 inline mr-1" />{{ addon.downloads }}
                                                downloads
                                            </span>
                                            <a
                                                v-if="addon.website"
                                                :href="addon.website"
                                                target="_blank"
                                                class="text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Globe class="h-3 w-3" />
                                                Website
                                            </a>
                                        </div>
                                    </div>

                                    <!-- Actions Section -->
                                    <div class="mt-auto pt-3 border-t border-border/50">
                                        <template v-if="installedIds.has(addon.identifier)">
                                            <Button size="sm" variant="outline" disabled class="w-full">
                                                ✓ Installed
                                            </Button>
                                        </template>
                                        <template v-else-if="addon.premium === 1">
                                            <Button
                                                size="sm"
                                                as="a"
                                                :href="addon.premium_link || '#'"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white"
                                            >
                                                Purchase Plugin
                                            </Button>
                                        </template>
                                        <template v-else>
                                            <Button
                                                size="sm"
                                                class="w-full"
                                                :disabled="installingOnlineId === addon.identifier"
                                                @click="openOnlineInstallDialog(addon)"
                                            >
                                                <div
                                                    v-if="installingOnlineId === addon.identifier"
                                                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                                ></div>
                                                {{
                                                    installingOnlineId === addon.identifier
                                                        ? 'Installing...'
                                                        : 'Install Plugin'
                                                }}
                                            </Button>
                                        </template>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                <!-- Plugins help cards under the tabs -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Globe class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Online Repository</div>
                                <p>
                                    Like spells, there's an online repo with community plugins and even paid options.
                                    Browse and install directly from the Online tab.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Upload class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Install & Upload</div>
                                <p>
                                    Install from the repo or upload .fpa files via the GUI. You can also install via a
                                    direct URL. Use the Installed tab actions to configure or export.
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
                                    Only trust plugins from our official online repo. Installing third‑party code can be
                                    risky (panel corruption or system compromise). FeatherPanel and its team are not
                                    liable for what you install or develop.
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
                                    The world can be dangerous—always review documentation and source before installing,
                                    even for plugins from our repo. Keep backups and test changes in a safe environment
                                    first.
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

                <div class="px-4 sm:px-6 pt-4 sm:pt-6">
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

        <!-- Confirm Online Install Dialog -->
        <Dialog v-model:open="confirmOnlineOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Install Addon</DialogTitle>
                    <DialogDescription>
                        {{ selectedAddonForInstall?.name }} ({{ selectedAddonForInstall?.identifier }})
                    </DialogDescription>
                </DialogHeader>
                <div v-if="selectedAddonForInstall && !selectedAddonForInstall.verified" class="text-sm">
                    <div class="text-yellow-700">
                        Warning: This addon is not verified. Installing unverified addons can be unsafe.
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        :disabled="installingOnlineId === selectedAddonForInstall?.identifier"
                        @click="proceedOnlineInstall"
                    >
                        <div
                            v-if="installingOnlineId === selectedAddonForInstall?.identifier"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        Install
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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

import { ref, onMounted, watch, computed } from 'vue';
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
    Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
interface OnlineAddon {
    id: number;
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    author_email?: string | null;
    maintainers: string[];
    tags: string[];
    verified: boolean;
    downloads: number;
    premium: number; // 0 = free, 1 = premium
    premium_link?: string | null;
    premium_price?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    latest_version: {
        version?: string | null;
        download_url?: string | null;
        file_size?: number | null;
        created_at?: string | null;
    };
}

// Stores
const sessionStore = useSessionStore();
const router = useRouter();

// State
const loading = ref(false);
const message = ref<{ type: 'error' | 'success'; text: string } | null>(null);
const plugins = ref<Plugin[]>([]);
const activeTab = ref<'installed' | 'online'>('installed');
const banner = ref<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);
const showPluginsOnlineBanner = ref(true);

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
const installedIds = computed<Set<string>>(() => new Set(plugins.value.map((p) => p.identifier)));
// Dialog states and selections
const confirmOnlineOpen = ref(false);
const confirmUninstallOpen = ref(false);
const confirmUrlOpen = ref(false);
const confirmUploadOpen = ref(false);
const selectedAddonForInstall = ref<OnlineAddon | null>(null);
const selectedPluginForUninstall = ref<Plugin | null>(null);
const pendingUploadFile = ref<File | null>(null);

// Computed
const configFields = computed(() => {
    if (!pluginConfig.value?.configSchema) return [];
    return pluginConfig.value.configSchema;
});

const hasConfigSchema = computed(() => {
    const schema = pluginConfig.value?.configSchema;
    return schema && Array.isArray(schema) && schema.length > 0;
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPluginIcon = (_plugin: Plugin) => {
    // You can customize this based on plugin type or add icon mapping
    return Settings;
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
                throw new Error(`Failed to save setting ${key}: HTTP ${response.status}`);
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
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        await fetchPlugins();
        message.value = { type: 'success', text: 'Plugin installed successfully' };
        banner.value = { type: 'success', text: 'Plugin installed successfully' };

        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        message.value = { type: 'error', text: e instanceof Error ? e.message : 'Upload failed' };
        banner.value = { type: 'error', text: e instanceof Error ? e.message : 'Upload failed' };
    } finally {
        confirmUploadOpen.value = false;
        pendingUploadFile.value = null;
        const inputs = document.querySelectorAll('input[type="file"][accept=".fpa"]');
        inputs.forEach((i) => ((i as HTMLInputElement).value = ''));
    }
};

// Online addons
const onlineAddons = ref<OnlineAddon[]>([]);
const onlineLoading = ref(false);
const onlineError = ref<string | null>(null);
const installingOnlineId = ref<string | null>(null);
const onlinePagination = ref<{ current_page: number; total_pages: number; total_records: number } | null>(null);
const onlineSearch = ref('');

const fetchOnlineAddons = async () => {
    onlineLoading.value = true;
    onlineError.value = null;
    try {
        const q = onlineSearch.value ? `?q=${encodeURIComponent(onlineSearch.value)}` : '';
        const resp = await fetch(`/api/admin/plugins/online/list${q}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const data = await resp.json();
        onlineAddons.value = Array.isArray(data.data?.addons) ? (data.data.addons as OnlineAddon[]) : [];
        onlinePagination.value = data.data?.pagination ?? null;
    } catch (e) {
        onlineError.value = e instanceof Error ? e.message : 'Failed to load online addons';
    } finally {
        onlineLoading.value = false;
    }
};
const onlineInstall = async (identifier: string) => {
    installingOnlineId.value = identifier;
    try {
        const resp = await fetch('/api/admin/plugins/online/install', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        await fetchPlugins();
        message.value = { type: 'success', text: `Installed ${identifier}` };
        banner.value = { type: 'success', text: `Installed ${identifier} successfully` };

        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        message.value = { type: 'error', text: e instanceof Error ? e.message : 'Install failed' };
        banner.value = { type: 'error', text: e instanceof Error ? e.message : 'Install failed' };
    } finally {
        installingOnlineId.value = null;
    }
};

const openOnlineInstallDialog = (addon: OnlineAddon) => {
    selectedAddonForInstall.value = addon;
    confirmOnlineOpen.value = true;
};
const proceedOnlineInstall = async () => {
    if (!selectedAddonForInstall.value) return;
    await onlineInstall(selectedAddonForInstall.value.identifier);
    confirmOnlineOpen.value = false;
    selectedAddonForInstall.value = null;
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
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
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
        message.value = { type: 'error', text: e instanceof Error ? e.message : 'Install from URL failed' };
        banner.value = { type: 'error', text: e instanceof Error ? e.message : 'Install from URL failed' };
    } finally {
        installingFromUrl.value = false;
        confirmUrlOpen.value = false;
    }
};

const openUrlInstallDialog = () => {
    if (!installUrl.value) return;
    confirmUrlOpen.value = true;
};

const dismissPluginsOnlineBanner = () => {
    showPluginsOnlineBanner.value = false;
    localStorage.setItem('featherpanel_plugins_online_banner_dismissed', 'true');
};

watch(activeTab, (v) => {
    if (v === 'online' && !onlineLoading.value && onlineAddons.value.length === 0) {
        fetchOnlineAddons();
    }
});

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
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        await fetchPlugins();
        message.value = { type: 'success', text: 'Plugin uninstalled' };
        banner.value = { type: 'success', text: `${plugin.name || plugin.identifier} uninstalled` };

        // Reload page to remove plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        message.value = { type: 'error', text: e instanceof Error ? e.message : 'Uninstall failed' };
        banner.value = { type: 'error', text: e instanceof Error ? e.message : 'Uninstall failed' };
    } finally {
        confirmUninstallOpen.value = false;
        selectedPluginForUninstall.value = null;
    }
};

// Export plugin
const onExport = async (plugin: Plugin) => {
    try {
        const resp = await fetch(`/api/admin/plugins/${plugin.identifier}/export`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plugin.identifier}.fpa`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        message.value = { type: 'error', text: e instanceof Error ? e.message : 'Export failed' };
    }
};
// Lifecycle
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    const dismissed = localStorage.getItem('featherpanel_plugins_online_banner_dismissed');
    showPluginsOnlineBanner.value = dismissed !== 'true';

    await Promise.all([fetchPlugins(), fetchOnlineAddons()]);
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
