<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Marketplace', href: '/admin/feathercloud/marketplace' },
            { text: 'Plugins', isCurrent: true, href: '/admin/feathercloud/plugins' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-4 sm:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Plugins</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Browse and install plugins from the online repository
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" @click="router.push('/admin/feathercloud/marketplace')">
                            <ArrowLeft class="h-4 w-4 mr-2" />
                            Back to Marketplace
                        </Button>
                    </div>
                </div>

                <!-- Cloud Account Missing Banner -->
                <div v-if="!cloudAccountConfigured" class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                    <div class="flex items-start gap-3">
                        <AlertCircle class="h-5 w-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-red-900 dark:text-red-300 mb-2">Cloud Account Missing</h3>
                            <p class="text-sm text-red-800 dark:text-red-400 mb-3">
                                FeatherCloud credentials are not configured. You cannot download premium plugins until
                                you configure your cloud account credentials in Cloud Management.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                class="border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                                @click="router.push('/admin/cloud-management')"
                            >
                                <Key class="h-4 w-4 mr-2" />
                                Configure Cloud Account
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- Cloud Account Info Banner -->
                <div
                    v-if="cloudAccountConfigured && (cloudCredits || cloudTeam)"
                    class="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5"
                >
                    <div class="flex items-start gap-3">
                        <Info class="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-blue-900 dark:text-blue-300 mb-2">Cloud Account Connected</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div v-if="cloudCredits" class="flex items-center gap-2">
                                    <Coins class="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    <span class="text-blue-800 dark:text-blue-400">
                                        <span class="font-medium">Credits:</span>
                                        {{ cloudCredits.total_credits.toFixed(2) }}
                                    </span>
                                </div>
                                <div v-if="cloudTeam?.team" class="flex items-center gap-2">
                                    <Users class="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    <span class="text-blue-800 dark:text-blue-400">
                                        <span class="font-medium">Team:</span>
                                        {{ cloudTeam.team.name }}
                                    </span>
                                </div>
                            </div>
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
                                    @click="openReinstallDialog"
                                >
                                    <CloudDownload class="h-4 w-4 mr-2" />
                                    Select Plugins to Reinstall
                                </Button>
                                <Button size="sm" variant="outline" @click="showPreviouslyInstalledBanner = false">
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Online Plugins Content -->
                <!-- Publish Banner (dismissible) -->
                <div v-if="showPluginsOnlineBanner" class="mb-4">
                    <div
                        class="rounded-xl p-5 bg-linear-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow relative"
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
                                Share it with the community on our cloud platform. Our team aims to review and publish
                                within 48 hours.
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
                <!-- Popular Packages Section -->
                <div
                    v-if="popularAddons.length > 0 && !onlineSearch && !selectedTag && currentOnlinePage === 1"
                    class="mb-6"
                >
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-lg font-semibold text-foreground">Popular Plugins</h2>
                        <Button variant="ghost" size="sm" @click="fetchPopularAddons">
                            <RefreshCw class="h-4 w-4" />
                        </Button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <Card
                            v-for="addon in popularAddons.slice(0, 4)"
                            :key="addon.identifier"
                            class="hover:shadow-md transition-all duration-200 cursor-pointer"
                            @click="viewPackageDetails(addon)"
                        >
                            <div class="p-3 flex items-center gap-2">
                                <div
                                    class="h-10 w-10 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                                >
                                    <img
                                        v-if="addon.icon"
                                        :src="addon.icon"
                                        :alt="addon.name"
                                        class="h-6 w-6 object-contain"
                                    />
                                    <Puzzle v-else class="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div class="min-w-0 flex-1">
                                    <h4 class="font-medium text-sm truncate">{{ addon.name }}</h4>
                                    <p class="text-xs text-muted-foreground truncate">
                                        {{ addon.downloads }} downloads
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <!-- Filters and Search -->
                <div class="mb-4 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div class="relative flex-1 sm:flex-none">
                            <Input
                                v-model="onlineSearch"
                                placeholder="Search online addons..."
                                class="pr-10 w-full sm:w-64"
                                @keyup.enter="submitOnlineSearch"
                            />
                            <button
                                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                @click="submitOnlineSearch"
                            >
                                <CloudDownload class="h-4 w-4" />
                            </button>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                :class="{
                                    'bg-primary text-white border-primary hover:bg-primary/90 hover:text-white dark:bg-primary dark:text-white dark:hover:bg-primary/90':
                                        verifiedOnly,
                                }"
                                @click="toggleVerifiedOnly"
                            >
                                <BadgeCheck class="h-4 w-4 mr-1" />
                                Verified Only
                            </Button>
                            <Select v-model="sortBy" @update:model-value="submitOnlineSearch">
                                <SelectTrigger class="w-[140px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created_at">Newest</SelectItem>
                                    <SelectItem value="downloads">Downloads</SelectItem>
                                    <SelectItem value="updated_at">Recently Updated</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select v-model="sortOrder" @update:model-value="submitOnlineSearch">
                                <SelectTrigger class="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DESC">Desc</SelectItem>
                                    <SelectItem value="ASC">Asc</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div v-if="selectedTag" class="flex items-center gap-2">
                        <Badge variant="secondary" class="gap-1">
                            Tag: {{ selectedTag }}
                            <button class="ml-1 hover:text-destructive" @click="clearTagFilter">
                                <X class="h-3 w-3" />
                            </button>
                        </Badge>
                    </div>
                    <div v-if="onlinePagination" class="text-xs text-muted-foreground">
                        Page {{ currentOnlinePage }} / {{ onlinePagination.total_pages }} •
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
                    <Button
                        size="sm"
                        variant="outline"
                        class="mt-2 hover:scale-110 hover:shadow-md transition-all duration-200"
                        title="Retry loading online plugins"
                        @click="fetchOnlineAddons()"
                    >
                        Try Again
                    </Button>
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
                                    class="h-12 w-12 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
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
                                        <Badge v-if="addon.latest_version?.version" variant="secondary" class="text-xs">
                                            v{{ addon.latest_version.version }}
                                        </Badge>
                                        <Badge
                                            v-if="hasUpdateAvailable(addon)"
                                            class="text-xs bg-blue-500 text-white border-0 animate-pulse"
                                        >
                                            <RefreshCw class="h-3 w-3 inline mr-1" />
                                            Update Available
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
                                            class="text-xs bg-linear-to-r from-yellow-500 to-amber-600 text-white border-0 flex items-center gap-1"
                                        >
                                            <Crown class="h-3 w-3" />
                                            Premium
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <!-- Description -->
                            <p class="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-10">
                                {{ addon.description || 'No description available' }}
                            </p>

                            <!-- Warning for unverified -->
                            <div
                                v-if="!addon.verified"
                                class="mb-3 text-xs text-yellow-700 dark:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-md p-2"
                            >
                                ⚠️ Unverified addon - review source before installing
                            </div>

                            <!-- Premium Price & Purchase Status -->
                            <div v-if="addon.premium === 1" class="mb-3 space-y-2">
                                <div
                                    v-if="addon.premium_price"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-linear-to-r from-yellow-500/10 to-amber-600/10 border border-yellow-500/30"
                                >
                                    <Crown class="h-4 w-4 text-yellow-700 dark:text-yellow-500" />
                                    <span class="text-base font-bold text-yellow-700 dark:text-yellow-500"
                                        >€{{ addon.premium_price }}</span
                                    >
                                    <span class="text-xs text-muted-foreground">EUR</span>
                                </div>
                                <div
                                    v-if="isPremiumPluginPurchased(addon)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30"
                                >
                                    <BadgeCheck class="h-4 w-4 text-green-700 dark:text-green-400" />
                                    <span class="text-sm font-medium text-green-700 dark:text-green-400"
                                        >Purchased</span
                                    >
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
                                        class="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                        @click.stop="filterByTag(tag)"
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
                            <div class="mt-auto pt-3 border-t border-border/50 space-y-2">
                                <div class="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        class="flex-1"
                                        @click.stop="viewPackageDetails(addon)"
                                    >
                                        <Info class="h-4 w-4 mr-1" />
                                        Details
                                    </Button>
                                    <template v-if="installedIds.has(addon.identifier)">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            class="flex-1"
                                            @click.stop="checkForUpdate(addon)"
                                        >
                                            <RefreshCw class="h-4 w-4 mr-1" />
                                            Check Update
                                        </Button>
                                    </template>
                                    <template v-else-if="addon.premium === 1">
                                        <Button
                                            v-if="!cloudAccountConfigured"
                                            size="sm"
                                            class="flex-1 bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white opacity-50 cursor-not-allowed"
                                            disabled
                                            title="Cloud account not configured - cannot download premium plugins"
                                        >
                                            <Crown class="h-4 w-4 mr-1" />
                                            Requires Cloud Account
                                        </Button>
                                        <Button
                                            v-else-if="isPremiumPluginPurchased(addon)"
                                            size="sm"
                                            class="flex-1 bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-white"
                                            :disabled="installingOnlineId === addon.identifier"
                                            :title="
                                                installingOnlineId === addon.identifier
                                                    ? 'Installing...'
                                                    : 'Install premium plugin'
                                            "
                                            @click.stop="openOnlineInstallDialog(addon)"
                                        >
                                            <Crown
                                                v-if="installingOnlineId !== addon.identifier"
                                                class="h-4 w-4 mr-1"
                                            />
                                            <div
                                                v-else
                                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                            ></div>
                                            {{ installingOnlineId === addon.identifier ? 'Installing...' : 'Install' }}
                                        </Button>
                                        <Button
                                            v-else
                                            size="sm"
                                            as="a"
                                            :href="addon.premium_link || '#'"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex-1 bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-white"
                                            title="Purchase premium plugin"
                                        >
                                            <Crown class="h-4 w-4 mr-1" />
                                            Purchase
                                        </Button>
                                    </template>
                                    <template v-else>
                                        <Button
                                            size="sm"
                                            class="flex-1 hover:scale-105 hover:shadow-md transition-all duration-200"
                                            :disabled="installingOnlineId === addon.identifier"
                                            :title="
                                                installingOnlineId === addon.identifier
                                                    ? 'Installing...'
                                                    : 'Install plugin'
                                            "
                                            @click.stop="openOnlineInstallDialog(addon)"
                                        >
                                            <div
                                                v-if="installingOnlineId === addon.identifier"
                                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                            ></div>
                                            {{ installingOnlineId === addon.identifier ? 'Installing...' : 'Install' }}
                                        </Button>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div
                    v-if="onlinePagination && onlinePagination.total_pages > 1 && onlineAddons.length > 0"
                    class="mt-6 flex justify-center"
                >
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="currentOnlinePage === 1 || onlineLoading"
                            @click="changeOnlinePage(currentOnlinePage - 1)"
                        >
                            <ChevronLeft class="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <template v-for="(page, index) in getVisibleOnlinePages()" :key="`addon-page-${page}-${index}`">
                            <span
                                v-if="typeof page === 'string'"
                                class="px-2 text-sm text-muted-foreground select-none"
                            >
                                &hellip;
                            </span>
                            <Button
                                v-else
                                size="sm"
                                :variant="page === currentOnlinePage ? 'default' : 'outline'"
                                :disabled="page === currentOnlinePage"
                                @click="changeOnlinePage(page)"
                            >
                                {{ page }}
                            </Button>
                        </template>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="
                                !onlinePagination || currentOnlinePage === onlinePagination.total_pages || onlineLoading
                            "
                            @click="changeOnlinePage(currentOnlinePage + 1)"
                        >
                            Next
                            <ChevronRight class="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <!-- Plugins help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Globe class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Online Repository</div>
                                <p>
                                    Like spells, there's an online repo with community plugins and even paid options.
                                    Browse and install directly from this page.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <CloudDownload class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Install Plugins</div>
                                <p>
                                    Browse the online repository and install plugins with a single click. Verified
                                    plugins are marked with a checkmark for your safety.
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

        <!-- Package Details Dialog -->
        <Dialog v-model:open="packageDetailsOpen">
            <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Package Details</DialogTitle>
                    <DialogDescription v-if="packageDetails">
                        {{ packageDetails.package.name }} ({{ packageDetails.package.identifier }})
                    </DialogDescription>
                </DialogHeader>
                <div v-if="packageDetailsLoading" class="flex items-center justify-center py-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading package details...</span>
                    </div>
                </div>
                <div v-else-if="packageDetails" class="space-y-4">
                    <!-- Package Header -->
                    <div class="flex items-start gap-4">
                        <div
                            class="h-16 w-16 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                        >
                            <img
                                v-if="packageDetails.package.icon"
                                :src="packageDetails.package.icon"
                                :alt="packageDetails.package.name"
                                class="h-12 w-12 object-contain"
                            />
                            <Puzzle v-else class="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div class="flex-1">
                            <h3 class="text-xl font-semibold mb-1">{{ packageDetails.package.name }}</h3>
                            <p class="text-sm text-muted-foreground mb-2">{{ packageDetails.package.identifier }}</p>
                            <div class="flex flex-wrap gap-2">
                                <Badge v-if="packageDetails.package.verified" variant="secondary" class="text-xs">
                                    ✓ Verified
                                </Badge>
                                <Badge
                                    v-if="packageDetails.package.premium === 1"
                                    class="text-xs bg-linear-to-r from-yellow-500 to-amber-600 text-white border-0"
                                >
                                    Premium
                                </Badge>
                                <Badge variant="outline" class="text-xs">
                                    {{ packageDetails.package.downloads }} downloads
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div>
                        <h4 class="font-semibold mb-2">Description</h4>
                        <p class="text-sm text-muted-foreground">
                            {{ packageDetails.package.description || 'No description available' }}
                        </p>
                    </div>

                    <!-- Author & Website -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div v-if="packageDetails.package.author">
                            <h4 class="font-semibold mb-1 text-sm">Author</h4>
                            <p class="text-sm text-muted-foreground">{{ packageDetails.package.author }}</p>
                        </div>
                        <div v-if="packageDetails.package.website">
                            <h4 class="font-semibold mb-1 text-sm">Website</h4>
                            <a
                                :href="packageDetails.package.website"
                                target="_blank"
                                class="text-sm text-primary hover:underline"
                            >
                                {{ packageDetails.package.website }}
                            </a>
                        </div>
                    </div>

                    <!-- Tags -->
                    <div v-if="packageDetails.package.tags && packageDetails.package.tags.length > 0">
                        <h4 class="font-semibold mb-2 text-sm">Tags</h4>
                        <div class="flex flex-wrap gap-1">
                            <Badge
                                v-for="tag in packageDetails.package.tags"
                                :key="tag"
                                variant="outline"
                                class="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                @click="filterByTag(tag)"
                            >
                                #{{ tag }}
                            </Badge>
                        </div>
                    </div>

                    <!-- Latest Version Info -->
                    <div v-if="packageDetails.package.latest_version">
                        <h4 class="font-semibold mb-2 text-sm">Latest Version</h4>
                        <div class="bg-muted/50 rounded-md p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium">Version</span>
                                <Badge variant="secondary">{{ packageDetails.package.latest_version.version }}</Badge>
                            </div>
                            <div
                                v-if="packageDetails.package.latest_version.file_size"
                                class="flex items-center justify-between"
                            >
                                <span class="text-sm font-medium">File Size</span>
                                <span class="text-sm text-muted-foreground">
                                    {{ formatFileSize(packageDetails.package.latest_version.file_size) }}
                                </span>
                            </div>
                            <div v-if="packageDetails.package.latest_version.changelog" class="mt-2">
                                <span class="text-sm font-medium">Changelog</span>
                                <p class="text-sm text-muted-foreground mt-1">
                                    {{ packageDetails.package.latest_version.changelog }}
                                </p>
                            </div>
                            <div
                                v-if="
                                    packageDetails.package.latest_version.dependencies &&
                                    packageDetails.package.latest_version.dependencies.length > 0
                                "
                                class="mt-2"
                            >
                                <span class="text-sm font-medium">Dependencies</span>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    <Badge
                                        v-for="dep in packageDetails.package.latest_version.dependencies"
                                        :key="dep"
                                        variant="outline"
                                        class="text-xs"
                                    >
                                        {{ dep }}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- All Versions -->
                    <div v-if="packageDetails.versions && packageDetails.versions.length > 0">
                        <h4 class="font-semibold mb-2 text-sm">All Versions</h4>
                        <div class="space-y-2 max-h-48 overflow-y-auto">
                            <div
                                v-for="version in packageDetails.versions"
                                :key="version.id"
                                class="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                            >
                                <div>
                                    <Badge variant="secondary" class="text-xs">{{ version.version }}</Badge>
                                    <span v-if="version.downloads" class="text-xs text-muted-foreground ml-2">
                                        {{ version.downloads }} downloads
                                    </span>
                                </div>
                                <span v-if="version.created_at" class="text-xs text-muted-foreground">
                                    {{ formatDate(version.created_at) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else-if="packageDetailsError" class="text-center py-8">
                    <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p class="text-destructive">{{ packageDetailsError }}</p>
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <template v-if="packageDetails && !installedIds.has(packageDetails.package.identifier)">
                        <Button
                            v-if="packageDetails.package.premium === 1 && !cloudAccountConfigured"
                            disabled
                            class="bg-linear-to-r from-yellow-500 to-amber-600 text-white opacity-50 cursor-not-allowed"
                            title="Cloud account not configured - cannot download premium plugins"
                        >
                            <Crown class="h-4 w-4 mr-2" />
                            Requires Cloud Account
                        </Button>
                        <Button
                            v-else-if="
                                packageDetails.package.premium === 1 && isPremiumPluginPurchased(packageDetails.package)
                            "
                            :disabled="installingOnlineId === packageDetails.package.identifier"
                            class="bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-white"
                            title="Install premium plugin"
                            @click="openOnlineInstallDialog(packageDetails.package)"
                        >
                            <Crown
                                v-if="installingOnlineId !== packageDetails.package.identifier"
                                class="h-4 w-4 mr-2"
                            />
                            <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {{ installingOnlineId === packageDetails.package.identifier ? 'Installing...' : 'Install' }}
                        </Button>
                        <Button
                            v-else-if="packageDetails.package.premium === 1"
                            as="a"
                            :href="packageDetails.package.premium_link || '#'"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-white"
                            title="Purchase premium plugin"
                        >
                            <Crown class="h-4 w-4 mr-2" />
                            Purchase
                        </Button>
                        <Button
                            v-else
                            :disabled="installingOnlineId === packageDetails.package.identifier"
                            @click="openOnlineInstallDialog(packageDetails.package)"
                        >
                            <div
                                v-if="installingOnlineId === packageDetails.package.identifier"
                                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                            ></div>
                            Install Plugin
                        </Button>
                    </template>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Reinstall Previously Installed Plugins Dialog -->
        <Dialog v-model:open="reinstallDialogOpen">
            <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Plugins to Reinstall</DialogTitle>
                    <DialogDescription>
                        Choose which previously installed plugins you would like to reinstall.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-3 py-4">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <Button size="sm" variant="outline" @click="selectAllPlugins = !selectAllPlugins">
                                {{ selectAllPlugins ? 'Deselect All' : 'Select All' }}
                            </Button>
                            <span class="text-sm text-muted-foreground">
                                {{ selectedPluginsToReinstall.size }} of
                                {{ previouslyInstalledPlugins.length }} selected
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div
                            v-for="plugin in previouslyInstalledPlugins"
                            :key="plugin.id"
                            class="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                            <input
                                type="checkbox"
                                class="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                                :checked="selectedPluginsToReinstall.has(plugin.identifier)"
                                @change="
                                    (e) =>
                                        togglePluginSelection(plugin.identifier, (e.target as HTMLInputElement).checked)
                                "
                            />
                            <div class="flex-1 min-w-0">
                                <div class="font-medium">{{ plugin.name }}</div>
                                <div class="text-sm text-muted-foreground">{{ plugin.identifier }}</div>
                                <div v-if="plugin.version" class="text-xs text-muted-foreground mt-1">
                                    Version: {{ plugin.version }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        :disabled="selectedPluginsToReinstall.size === 0 || reinstallingPlugins"
                        @click="reinstallSelectedPlugins"
                    >
                        <CloudDownload v-if="!reinstallingPlugins" class="h-4 w-4 mr-2" />
                        <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {{
                            reinstallingPlugins
                                ? 'Reinstalling...'
                                : `Reinstall ${selectedPluginsToReinstall.size} Plugin${selectedPluginsToReinstall.size !== 1 ? 's' : ''}`
                        }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Confirm Online Install Dialog -->
        <Dialog v-model:open="confirmOnlineOpen">
            <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Install Plugin</DialogTitle>
                    <DialogDescription v-if="installRequirements">
                        {{ installRequirements.package.name }} ({{ installRequirements.package.identifier }})
                    </DialogDescription>
                </DialogHeader>

                <!-- Loading State -->
                <div v-if="installRequirementsLoading" class="flex items-center justify-center py-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Checking requirements...</span>
                    </div>
                </div>

                <!-- Requirements Check Results -->
                <div v-else-if="installRequirements" class="space-y-4">
                    <!-- Package Info -->
                    <div class="bg-muted/50 rounded-md p-4 space-y-2">
                        <div class="flex items-start gap-3">
                            <div
                                v-if="selectedAddonForInstall?.icon"
                                class="h-12 w-12 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                            >
                                <img
                                    :src="selectedAddonForInstall.icon"
                                    :alt="installRequirements.package.name"
                                    class="h-8 w-8 object-contain"
                                />
                            </div>
                            <div class="flex-1">
                                <h3 class="font-semibold text-lg">{{ installRequirements.package.name }}</h3>
                                <p class="text-sm text-muted-foreground">
                                    {{ installRequirements.package.identifier }}
                                </p>
                                <div class="flex flex-wrap gap-2 mt-2">
                                    <Badge
                                        v-if="installRequirements.package.version"
                                        variant="secondary"
                                        class="text-xs"
                                    >
                                        v{{ installRequirements.package.version }}
                                    </Badge>
                                    <Badge
                                        v-if="installRequirements.package.verified"
                                        variant="secondary"
                                        class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    >
                                        ✓ Verified
                                    </Badge>
                                    <Badge
                                        v-if="!installRequirements.package.verified"
                                        variant="outline"
                                        class="text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-500"
                                    >
                                        Unverified
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <p v-if="installRequirements.package.description" class="text-sm text-muted-foreground mt-2">
                            {{ installRequirements.package.description }}
                        </p>
                        <div v-if="installRequirements.package.author" class="text-sm text-muted-foreground">
                            <span class="font-medium">Author:</span> {{ installRequirements.package.author }}
                        </div>
                    </div>

                    <!-- Warning for unverified -->
                    <div
                        v-if="!installRequirements.package.verified"
                        class="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-600"
                    >
                        <div class="flex items-start gap-2">
                            <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold mb-1">Unverified Plugin</div>
                                <p>
                                    This plugin is not verified. Installing unverified plugins can be unsafe. Please
                                    review the source code before installing.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Already Installed / Update Available -->
                    <div
                        v-if="installRequirements.already_installed"
                        class="rounded-md border p-3 text-sm"
                        :class="{
                            'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-600':
                                installRequirements.update_available,
                            'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-600':
                                !installRequirements.update_available,
                        }"
                    >
                        <div class="flex items-start gap-2">
                            <RefreshCw v-if="installRequirements.update_available" class="h-5 w-5 shrink-0 mt-0.5" />
                            <Info v-else class="h-5 w-5 shrink-0 mt-0.5" />
                            <div class="flex-1">
                                <div class="font-semibold mb-1">
                                    {{
                                        installRequirements.update_available ? 'Update Available' : 'Already Installed'
                                    }}
                                </div>
                                <p v-if="installRequirements.update_available">
                                    Update from
                                    <span class="font-medium">{{ installRequirements.installed_version }}</span>
                                    to
                                    <span class="font-medium">{{ installRequirements.latest_version }}</span>
                                </p>
                                <p v-else>
                                    This plugin is already installed at version
                                    <span class="font-medium">{{
                                        installRequirements.installed_version || 'unknown'
                                    }}</span
                                    >. No updates available.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Panel Version Check -->
                    <div
                        v-if="installRequirements.panel_version.min || installRequirements.panel_version.max"
                        class="rounded-md border p-3"
                        :class="{
                            'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-600':
                                installRequirements.panel_version.ok,
                            'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-600':
                                !installRequirements.panel_version.ok,
                        }"
                    >
                        <div class="flex items-start gap-2">
                            <BadgeCheck v-if="installRequirements.panel_version.ok" class="h-5 w-5 shrink-0 mt-0.5" />
                            <AlertCircle v-else class="h-5 w-5 shrink-0 mt-0.5" />
                            <div class="flex-1">
                                <div class="font-semibold mb-1">Panel Version</div>
                                <p v-if="installRequirements.panel_version.ok" class="text-sm">
                                    Compatible with your panel version
                                </p>
                                <p v-else class="text-sm">
                                    {{ installRequirements.panel_version.message }}
                                </p>
                                <div
                                    v-if="installRequirements.panel_version.min"
                                    class="text-xs mt-1 text-muted-foreground"
                                >
                                    Minimum: {{ installRequirements.panel_version.min }}
                                </div>
                                <div v-if="installRequirements.panel_version.max" class="text-xs text-muted-foreground">
                                    Maximum: {{ installRequirements.panel_version.max }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dependencies Check -->
                    <div v-if="installRequirements.dependencies.checks.length > 0" class="space-y-2">
                        <h4 class="font-semibold text-sm">Dependencies</h4>
                        <div class="space-y-2">
                            <div
                                v-for="(check, index) in installRequirements.dependencies.checks"
                                :key="index"
                                class="rounded-md border p-3"
                                :class="{
                                    'border-green-500/30 bg-green-500/10': check.met,
                                    'border-red-500/30 bg-red-500/10': !check.met,
                                }"
                            >
                                <div class="flex items-start gap-2">
                                    <BadgeCheck
                                        v-if="check.met"
                                        class="h-5 w-5 shrink-0 mt-0.5 text-green-700 dark:text-green-400"
                                    />
                                    <AlertCircle
                                        v-else
                                        class="h-5 w-5 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                                    />
                                    <div class="flex-1">
                                        <div
                                            class="text-sm font-medium"
                                            :class="{
                                                'text-green-700 dark:text-green-400': check.met,
                                                'text-red-700 dark:text-red-600': !check.met,
                                            }"
                                        >
                                            {{ check.message }}
                                        </div>
                                        <div v-if="!check.met" class="text-xs text-muted-foreground mt-1">
                                            {{ check.dependency }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- All Dependencies Met -->
                    <div
                        v-if="
                            installRequirements.dependencies.checks.length > 0 &&
                            installRequirements.dependencies.all_met
                        "
                        class="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-600"
                    >
                        <div class="flex items-center gap-2">
                            <BadgeCheck class="h-5 w-5 shrink-0" />
                            <span class="font-semibold">All dependencies are met</span>
                        </div>
                    </div>

                    <!-- Cloud Account Required for Premium -->
                    <div
                        v-if="installRequirements.package.premium === 1 && !cloudAccountConfigured"
                        class="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-600"
                    >
                        <div class="flex items-start gap-2">
                            <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold mb-1">Cloud Account Required</div>
                                <p>
                                    This is a premium plugin. You must configure your FeatherCloud account credentials
                                    before you can download premium plugins. Please configure your cloud account in
                                    Cloud Management.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="mt-2 border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                                    @click="router.push('/admin/cloud-management')"
                                >
                                    <Key class="h-4 w-4 mr-2" />
                                    Configure Cloud Account
                                </Button>
                            </div>
                        </div>
                    </div>

                    <!-- Error Summary -->
                    <div
                        v-if="
                            !installRequirements.can_install &&
                            !installRequirementsLoading &&
                            (installRequirements.package.premium !== 1 || cloudAccountConfigured)
                        "
                        class="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-600"
                    >
                        <div class="flex items-start gap-2">
                            <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold mb-1">Cannot Install</div>
                                <p>Please resolve the issues above before installing this plugin.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Loading Requirements -->
                <div v-else-if="installRequirementsError" class="text-center py-8">
                    <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p class="text-destructive">{{ installRequirementsError }}</p>
                </div>

                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        :disabled="
                            installingOnlineId === selectedAddonForInstall?.identifier ||
                            (installRequirements && !installRequirements.can_install) ||
                            installRequirementsLoading ||
                            (installRequirements?.package.premium === 1 && !cloudAccountConfigured)
                        "
                        @click="proceedOnlineInstall"
                    >
                        <div
                            v-if="installingOnlineId === selectedAddonForInstall?.identifier"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        {{
                            installRequirements?.package.premium === 1 && !cloudAccountConfigured
                                ? 'Cloud Account Required'
                                : installRequirements?.update_available
                                  ? `Update to v${installRequirements.latest_version}`
                                  : 'Install'
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

import { ref, onMounted, computed, watch } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import {
    AlertCircle,
    User,
    Globe,
    Puzzle,
    CloudDownload,
    ChevronLeft,
    ChevronRight,
    BadgeCheck,
    X,
    Info,
    RefreshCw,
    ArrowLeft,
    Crown,
    Key,
    Coins,
    Users,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
    useFeatherCloud,
    type ProductPurchase,
    type CloudSummary,
    type CreditsData,
    type TeamData,
} from '@/composables/useFeatherCloud';

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
        changelog?: string | null;
        dependencies?: string[];
        min_panel_version?: string | null;
        max_panel_version?: string | null;
    };
}

interface PackageDetails {
    package: OnlineAddon;
    versions: Array<{
        id: number;
        version: string;
        download_url?: string;
        file_size?: number;
        file_hash?: string;
        changelog?: string;
        dependencies: string[];
        min_panel_version?: string | null;
        max_panel_version?: string | null;
        downloads: number;
        created_at?: string;
        updated_at?: string;
    }>;
}

type OnlinePagination = {
    current_page: number;
    total_pages: number;
    total_records: number;
};

type OnlinePaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

// Stores
const sessionStore = useSessionStore();
const router = useRouter();
const { fetchProducts, fetchSummary, fetchCredits, fetchTeam } = useFeatherCloud();

// Purchased products tracking
const purchasedProducts = ref<Set<string>>(new Set());
const purchasedProductsLoading = ref(false);

// Cloud account info
const cloudSummary = ref<CloudSummary | null>(null);
const cloudCredits = ref<CreditsData | null>(null);
const cloudTeam = ref<TeamData | null>(null);
const cloudAccountConfigured = ref(false);

// State
const plugins = ref<Plugin[]>([]);
const banner = ref<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);
const showPluginsOnlineBanner = ref(true);
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
const reinstallDialogOpen = ref(false);
const selectedPluginsToReinstall = ref<Set<string>>(new Set());
const selectAllPlugins = ref(false);
const reinstallingPlugins = ref(false);

// State for installed plugins check (used to show "Installed" badge)
const installedIds = computed<Set<string>>(() => new Set(plugins.value.map((p) => p.identifier)));

// Helper to get installed plugin version
const getInstalledVersion = (identifier: string): string | null => {
    const plugin = plugins.value.find((p) => p.identifier === identifier);
    return plugin?.version || null;
};

// Helper to check if update is available
const hasUpdateAvailable = (addon: OnlineAddon): boolean => {
    if (!installedIds.value.has(addon.identifier)) {
        return false;
    }
    const installedVersion = getInstalledVersion(addon.identifier);
    const latestVersion = addon.latest_version?.version;

    if (!installedVersion || !latestVersion) {
        return false;
    }

    // Normalize versions (remove 'v' prefix)
    const normalizeVersion = (v: string): string => v.replace(/^v/i, '');
    const installedNormalized = normalizeVersion(installedVersion);
    const latestNormalized = normalizeVersion(latestVersion);

    // Compare versions
    const compareVersions = (v1: string, v2: string): number => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    };

    return compareVersions(installedNormalized, latestNormalized) < 0;
};

// Extract product identifier from premium_link URL
const extractProductIdentifier = (premiumLink: string | null | undefined): string | null => {
    if (!premiumLink) return null;
    try {
        const url = new URL(premiumLink);
        // Extract identifier from path like /market/my-product
        const match = url.pathname.match(/\/market\/([^/]+)/);
        return match && match[1] ? match[1] : null;
    } catch {
        return null;
    }
};

// Check if premium plugin is purchased
const isPremiumPluginPurchased = (addon: OnlineAddon): boolean => {
    if (addon.premium !== 1 || !addon.premium_link) return false;
    const productId = extractProductIdentifier(addon.premium_link);
    return productId !== null && purchasedProducts.value.has(productId);
};

// Popular packages
const popularAddons = ref<OnlineAddon[]>([]);
const popularLoading = ref(false);

// Package details
const packageDetailsOpen = ref(false);
const packageDetails = ref<PackageDetails | null>(null);
const packageDetailsLoading = ref(false);
const packageDetailsError = ref<string | null>(null);

// Filters and sorting
const verifiedOnly = ref(false);
const sortBy = ref('created_at');
const sortOrder = ref('DESC');
const selectedTag = ref<string | null>(null);

// Dialog states and selections
const confirmOnlineOpen = ref(false);
const selectedAddonForInstall = ref<OnlineAddon | null>(null);
const installRequirements = ref<{
    can_install: boolean;
    already_installed: boolean;
    update_available: boolean;
    installed_version?: string | null;
    latest_version?: string | null;
    package: {
        identifier: string;
        name: string;
        description?: string;
        version?: string;
        author?: string;
        verified: boolean;
        premium: number;
    };
    dependencies: {
        checks: Array<{
            dependency: string;
            met: boolean;
            message: string;
        }>;
        all_met: boolean;
    };
    panel_version: {
        ok: boolean;
        message?: string;
        min?: string;
        max?: string;
    };
} | null>(null);
const installRequirementsLoading = ref(false);
const installRequirementsError = ref<string | null>(null);

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
        // Silently fail - we only need this to check installed status
    }
};

// Online addons
const onlineAddons = ref<OnlineAddon[]>([]);
const onlineLoading = ref(false);
const onlineError = ref<string | null>(null);
const installingOnlineId = ref<string | null>(null);
const onlinePagination = ref<OnlinePagination | null>(null);
const currentOnlinePage = ref(1);
const ONLINE_ADDONS_PER_PAGE = 20;
const onlineSearch = ref('');

function isOnlinePagination(value: unknown): value is OnlinePagination {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    return (
        typeof record.current_page === 'number' &&
        typeof record.total_pages === 'number' &&
        typeof record.total_records === 'number'
    );
}

const fetchOnlineAddons = async (page = currentOnlinePage.value) => {
    onlineLoading.value = true;
    onlineError.value = null;

    // If tag is selected, use tag endpoint
    if (selectedTag.value) {
        const params = new URLSearchParams({
            page: String(page),
            per_page: String(ONLINE_ADDONS_PER_PAGE),
        });

        try {
            const resp = await fetch(
                `/api/admin/plugins/online/tag/${encodeURIComponent(selectedTag.value)}?${params.toString()}`,
                { credentials: 'include' },
            );
            if (!resp.ok) {
                const errorMessage = await parseApiError(resp);
                throw new Error(errorMessage);
            }
            const data = await resp.json();
            onlineAddons.value = Array.isArray(data.data?.addons) ? (data.data.addons as OnlineAddon[]) : [];

            const paginationData = data.data?.pagination;
            if (isOnlinePagination(paginationData)) {
                onlinePagination.value = paginationData;
                currentOnlinePage.value = paginationData.current_page;
            } else {
                onlinePagination.value = null;
                currentOnlinePage.value = page;
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to load packages by tag';
            onlineError.value = errorMessage;
        } finally {
            onlineLoading.value = false;
        }
        return;
    }

    // Regular list endpoint with filters
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(ONLINE_ADDONS_PER_PAGE),
    });

    if (onlineSearch.value) {
        params.set('q', onlineSearch.value);
    }
    if (verifiedOnly.value) {
        params.set('verified_only', 'true');
    }
    if (sortBy.value) {
        params.set('sort_by', sortBy.value);
    }
    if (sortOrder.value) {
        params.set('sort_order', sortOrder.value);
    }

    try {
        const resp = await fetch(`/api/admin/plugins/online/list?${params.toString()}`, { credentials: 'include' });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        onlineAddons.value = Array.isArray(data.data?.addons) ? (data.data.addons as OnlineAddon[]) : [];

        const paginationData = data.data?.pagination;
        if (isOnlinePagination(paginationData)) {
            onlinePagination.value = paginationData;
            currentOnlinePage.value = paginationData.current_page;
        } else {
            onlinePagination.value = null;
            currentOnlinePage.value = page;
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load online addons';
        onlineError.value = errorMessage;
    } finally {
        onlineLoading.value = false;
    }
};
const onlineInstall = async (identifier: string, isUpdate = false, version?: string) => {
    // Check if this is a premium plugin and cloud account is not configured
    const addon = onlineAddons.value.find((a) => a.identifier === identifier);
    if (addon?.premium === 1 && !cloudAccountConfigured.value) {
        banner.value = {
            type: 'error',
            text: 'Cloud account not configured. Please configure your FeatherCloud credentials in Cloud Management to download premium plugins.',
        };
        return;
    }

    installingOnlineId.value = identifier;
    try {
        const body: { identifier: string; version?: string } = { identifier };
        if (version) {
            body.version = version;
        }

        const resp = await fetch('/api/admin/plugins/online/install', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        await fetchPlugins();

        if (isUpdate && data.data?.is_update) {
            const oldVersion = data.data.old_version || 'unknown';
            const newVersion = data.data.new_version || 'unknown';
            banner.value = {
                type: 'success',
                text: `Updated ${identifier} from v${oldVersion} to v${newVersion} successfully`,
            };
        } else {
            banner.value = { type: 'success', text: `Installed ${identifier} successfully` };
        }

        // Reload page to load plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to install plugin';
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        installingOnlineId.value = null;
    }
};

const openOnlineInstallDialog = async (addon: OnlineAddon) => {
    selectedAddonForInstall.value = addon;
    confirmOnlineOpen.value = true;
    installRequirements.value = null;
    installRequirementsError.value = null;
    installRequirementsLoading.value = true;

    // Fetch requirements check
    try {
        const resp = await fetch(`/api/admin/plugins/online/${encodeURIComponent(addon.identifier)}/check`, {
            credentials: 'include',
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        installRequirements.value = data.data;
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to check requirements';
        installRequirementsError.value = errorMessage;
    } finally {
        installRequirementsLoading.value = false;
    }
};

const proceedOnlineInstall = async () => {
    if (!selectedAddonForInstall.value) return;
    const isUpdate = installRequirements.value?.update_available ?? false;
    const version = selectedAddonForInstall.value.latest_version?.version || undefined;
    await onlineInstall(selectedAddonForInstall.value.identifier, isUpdate, version);
    confirmOnlineOpen.value = false;
    selectedAddonForInstall.value = null;
    installRequirements.value = null;
    installRequirementsError.value = null;
};

const checkForUpdate = async (addon: OnlineAddon) => {
    await openOnlineInstallDialog(addon);
};

function getVisibleOnlinePages(): OnlinePaginationItem[] {
    const paginationState = onlinePagination.value;

    if (!paginationState) {
        return [];
    }

    const totalPages = paginationState.total_pages;
    const currentPage = currentOnlinePage.value;

    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => (index + 1) as OnlinePaginationItem);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);

    if (currentPage > 1) {
        pages.add(currentPage - 1);
    }

    if (currentPage < totalPages) {
        pages.add(currentPage + 1);
    }

    if (currentPage <= 3) {
        for (let pageNumber = 2; pageNumber <= Math.min(4, totalPages - 1); pageNumber += 1) {
            pages.add(pageNumber);
        }
    } else if (currentPage >= totalPages - 2) {
        for (let pageNumber = Math.max(totalPages - 3, 2); pageNumber <= totalPages - 1; pageNumber += 1) {
            pages.add(pageNumber);
        }
    }

    const sortedPages = Array.from(pages)
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
        .sort((a, b) => a - b);

    const visible: OnlinePaginationItem[] = [];
    let hasLeftEllipsis = false;
    let hasRightEllipsis = false;
    let previousNumber: number | null = null;

    for (const pageNumber of sortedPages) {
        if (previousNumber !== null && pageNumber - previousNumber > 1) {
            if (pageNumber > currentPage) {
                if (!hasRightEllipsis) {
                    visible.push('ellipsis-right');
                    hasRightEllipsis = true;
                }
            } else if (!hasLeftEllipsis) {
                visible.push('ellipsis-left');
                hasLeftEllipsis = true;
            }
        }

        visible.push(pageNumber as OnlinePaginationItem);
        previousNumber = pageNumber;
    }

    return visible;
}

function changeOnlinePage(page: number) {
    if (onlineLoading.value) {
        return;
    }

    const paginationState = onlinePagination.value;
    const totalPages = paginationState?.total_pages ?? page;

    if (page < 1 || page > totalPages || page === currentOnlinePage.value) {
        return;
    }

    fetchOnlineAddons(page);
}

const submitOnlineSearch = () => {
    currentOnlinePage.value = 1;
    fetchOnlineAddons(1);
};

const toggleVerifiedOnly = () => {
    verifiedOnly.value = !verifiedOnly.value;
    currentOnlinePage.value = 1;
    fetchOnlineAddons(1);
};

const fetchPopularAddons = async () => {
    popularLoading.value = true;
    try {
        const resp = await fetch('/api/admin/plugins/online/popular?limit=10', { credentials: 'include' });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        popularAddons.value = Array.isArray(data.data?.addons) ? (data.data.addons as OnlineAddon[]) : [];
    } catch (e) {
        console.error('Failed to fetch popular addons:', e);
        // Silently fail for popular addons
    } finally {
        popularLoading.value = false;
    }
};

const viewPackageDetails = async (addon: OnlineAddon) => {
    packageDetailsOpen.value = true;
    packageDetailsLoading.value = true;
    packageDetailsError.value = null;
    packageDetails.value = null;

    try {
        const resp = await fetch(`/api/admin/plugins/online/${encodeURIComponent(addon.identifier)}`, {
            credentials: 'include',
        });
        if (!resp.ok) {
            const errorMessage = await parseApiError(resp);
            throw new Error(errorMessage);
        }
        const data = await resp.json();
        packageDetails.value = data.data as PackageDetails;
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load package details';
        packageDetailsError.value = errorMessage;
    } finally {
        packageDetailsLoading.value = false;
    }
};

const filterByTag = (tag: string) => {
    selectedTag.value = tag;
    currentOnlinePage.value = 1;
    fetchOnlineAddons(1);
};

const clearTagFilter = () => {
    selectedTag.value = null;
    currentOnlinePage.value = 1;
    fetchOnlineAddons(1);
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateString;
    }
};

const dismissPluginsOnlineBanner = () => {
    showPluginsOnlineBanner.value = false;
    localStorage.setItem('featherpanel_plugins_online_banner_dismissed', 'true');
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
            // Filter: exclude plugins with uninstalled_at set AND exclude currently installed plugins
            const notCurrentlyInstalled = data.data.plugins.filter(
                (p: { identifier: string; uninstalled_at: string | null }) =>
                    p.uninstalled_at === null && !installedIds.value.has(p.identifier),
            );
            previouslyInstalledPlugins.value = notCurrentlyInstalled;
            showPreviouslyInstalledBanner.value = notCurrentlyInstalled.length > 0;
        }
    } catch (e) {
        console.error('Failed to fetch previously installed plugins:', e);
    }
};

const fetchPurchasedProducts = async () => {
    // Don't fetch if cloud account is not configured
    if (!cloudAccountConfigured.value) {
        purchasedProductsLoading.value = false;
        return;
    }

    purchasedProductsLoading.value = true;
    try {
        // Fetch all pages of purchased products
        let page = 1;
        const allPurchases: ProductPurchase[] = [];
        let hasMore = true;

        while (hasMore) {
            const data = await fetchProducts(page, 100);
            if (data && data.purchases) {
                allPurchases.push(...data.purchases);
                hasMore = data.purchases.length === 100 && page < 10; // Limit to 10 pages max
                page++;
            } else {
                hasMore = false;
            }
        }

        // Extract product identifiers
        const productIds = new Set<string>();
        allPurchases.forEach((purchase) => {
            if (purchase.product?.identifier) {
                productIds.add(purchase.product.identifier);
            }
        });
        purchasedProducts.value = productIds;
    } catch (e) {
        // Silently fail - premium plugins will show purchase button if fetch fails
        // Don't log errors if credentials aren't configured
        const error = e as { response?: { data?: { error_code?: string } } };
        if (error.response?.data?.error_code !== 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
            console.error('Failed to fetch purchased products:', e);
        }
    } finally {
        purchasedProductsLoading.value = false;
    }
};

const fetchCloudAccountInfo = async () => {
    try {
        // Try to fetch cloud summary to check if account is configured
        // Silently check - don't show errors if credentials aren't configured
        const summary = await fetchSummary();
        if (summary) {
            cloudAccountConfigured.value = true;
            cloudSummary.value = summary;

            // Fetch credits and team info (only if summary succeeded)
            try {
                const credits = await fetchCredits();
                if (credits) {
                    cloudCredits.value = credits;
                }
            } catch {
                // Silently fail - credits might not be available
            }

            try {
                const team = await fetchTeam();
                if (team) {
                    cloudTeam.value = team;
                }
            } catch {
                // Silently fail - team might not be available
            }
        } else {
            cloudAccountConfigured.value = false;
        }
    } catch (e) {
        // If fetch fails with credentials error, silently mark as not configured
        const error = e as { response?: { data?: { error_code?: string } } };
        if (error.response?.data?.error_code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
            cloudAccountConfigured.value = false;
            return;
        }
        // For other errors, silently assume not configured
        cloudAccountConfigured.value = false;
    }
};

const openReinstallDialog = () => {
    // Select all by default
    selectedPluginsToReinstall.value = new Set(previouslyInstalledPlugins.value.map((p) => p.identifier));
    selectAllPlugins.value = true;
    reinstallDialogOpen.value = true;
};

const togglePluginSelection = (identifier: string, checked: boolean) => {
    if (checked) {
        selectedPluginsToReinstall.value.add(identifier);
    } else {
        selectedPluginsToReinstall.value.delete(identifier);
    }
    // Update select all state
    selectAllPlugins.value = selectedPluginsToReinstall.value.size === previouslyInstalledPlugins.value.length;
};

// Watch selectAllPlugins to update individual selections
watch(selectAllPlugins, (newValue) => {
    if (newValue) {
        selectedPluginsToReinstall.value = new Set(previouslyInstalledPlugins.value.map((p) => p.identifier));
    } else {
        selectedPluginsToReinstall.value.clear();
    }
});

const reinstallSelectedPlugins = async () => {
    if (selectedPluginsToReinstall.value.size === 0) {
        return;
    }

    reinstallingPlugins.value = true;
    const toReinstall = previouslyInstalledPlugins.value.filter((p) =>
        selectedPluginsToReinstall.value.has(p.identifier),
    );
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

    reinstallingPlugins.value = false;
    reinstallDialogOpen.value = false;

    if (successCount > 0) {
        banner.value = {
            type: 'success',
            text: `Successfully reinstalled ${successCount} plugin${successCount !== 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        };
        showPreviouslyInstalledBanner.value = false;
        await fetchPlugins();
        await fetchOnlineAddons();
        await fetchPreviouslyInstalledPlugins();
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

    const dismissed = localStorage.getItem('featherpanel_plugins_online_banner_dismissed');
    showPluginsOnlineBanner.value = dismissed !== 'true';

    // Fetch cloud account info first
    await fetchCloudAccountInfo();
    // Fetch installed plugins to check which ones are already installed (for badge display)
    await fetchPlugins();
    // Fetch purchased products to check premium plugin access (only if cloud account is configured)
    if (cloudAccountConfigured.value) {
        await fetchPurchasedProducts();
    }
    // Fetch popular packages
    await fetchPopularAddons();
    // Fetch online plugins to display
    await fetchOnlineAddons();
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
