<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="space-y-4">
            <div>
                <h3 class="text-lg font-semibold">{{ $t('servers.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.description') }}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div class="flex flex-wrap gap-2">
                    <Button
                        v-if="!isMobile"
                        variant="outline"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        data-umami-event="Create folder"
                        @click="createFolder"
                    >
                        <FolderPlus class="h-4 w-4 mr-2" />
                        <span class="hidden sm:inline">{{ $t('servers.createFolder') }}</span>
                        <span class="sm:hidden">{{ $t('servers.createFolder') }}</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        :disabled="loading"
                        data-umami-event="Validate servers"
                        @click="validateAndCleanupServers"
                    >
                        <Shield class="h-4 w-4 mr-2" />
                        <span class="hidden sm:inline">{{ $t('servers.validate') }}</span>
                        <span class="sm:hidden">{{ $t('servers.validate') }}</span>
                    </Button>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                    :disabled="loading"
                    data-umami-event="Refresh servers"
                    @click="fetchServers"
                >
                    <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                    {{ $t('servers.refresh') }}
                </Button>
            </div>
        </div>

        <!-- Search and Filters -->
        <div class="flex flex-col gap-4">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('servers.searchPlaceholder')"
                    class="pl-10"
                    @input="handleSearch"
                />
            </div>
            <div v-if="!isMobile" class="flex items-center gap-2 overflow-x-auto pb-2">
                <Button
                    :variant="viewMode === 'folders' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'folders'"
                >
                    <FolderOpen class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.folderView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.folderView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'list' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'list'"
                >
                    <List class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.listView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.listView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'table' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'table'"
                >
                    <Table class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.tableView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.tableView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'compact' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'compact'"
                >
                    <Grid3X3 class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.compactView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.compactView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'detailed' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'detailed'"
                >
                    <LayoutGrid class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.detailedView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.detailedView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'status-grouped' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'status-grouped'"
                >
                    <Layers class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.statusGroupedView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.statusGroupedView') }}</span>
                </Button>
                <Button
                    :variant="viewMode === 'minimal' ? 'default' : 'outline'"
                    size="sm"
                    class="shrink-0"
                    @click="viewMode = 'minimal'"
                >
                    <Minimize2 class="h-4 w-4 mr-2" />
                    <span class="hidden lg:inline">{{ $t('servers.minimalView') }}</span>
                    <span class="lg:hidden">{{ $t('servers.minimalView') }}</span>
                </Button>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-2">
                <RefreshCw class="h-5 w-5 animate-spin" />
                <span class="text-sm text-muted-foreground">{{ $t('servers.loading') }}</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.errorTitle') }}</h3>
                <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
                <Button @click="fetchServers">{{ $t('servers.retry') }}</Button>
            </div>
        </div>

        <!-- Servers Grid (also show folders even if servers list is empty) -->
        <div v-else-if="serverFolders.length > 0 || servers.length > 0" class="space-y-4">
            <!-- Folder View -->
            <div v-if="viewMode === 'folders'" class="space-y-6">
                <div v-for="folder in serverFolders" :key="folder.id" class="space-y-3">
                    <!-- Folder Header -->
                    <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div class="flex items-center gap-2">
                            <FolderOpen class="h-5 w-5 text-primary" />
                            <h4 class="font-semibold">{{ folder.name }}</h4>
                            <Badge variant="secondary">{{ folder.servers.length }} {{ $t('servers.servers') }}</Badge>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="editFolder(folder)">
                                <Edit class="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                class="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                @click="deleteFolder(folder.id)"
                            >
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <!-- Servers in Folder -->
                    <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <ContextMenu v-for="server in folder.servers" :key="server.id">
                            <ContextMenuTrigger as-child>
                                <div
                                    class="group bg-card border-2 border-border rounded-lg transition-all duration-200 overflow-hidden"
                                    :class="{
                                        'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:scale-[1.02]':
                                            isServerAccessible(server),
                                        'cursor-not-allowed opacity-75': !isServerAccessible(server),
                                    }"
                                    @click="openServerDetails(server)"
                                >
                                    <!-- Spell Banner - Full Width, No Padding -->
                                    <div class="relative w-full h-24 sm:h-32">
                                        <!-- Spell Banner Background -->
                                        <div
                                            v-if="server.spell?.banner"
                                            class="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                            :style="{ backgroundImage: `url(${server.spell.banner})` }"
                                        />

                                        <!-- Dark overlay for better text readability -->
                                        <div
                                            class="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"
                                        />

                                        <!-- Access Restriction Overlay -->
                                        <div
                                            v-if="!isServerAccessible(server)"
                                            class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
                                        >
                                            <div class="text-center text-white p-4">
                                                <div class="text-sm font-semibold mb-2">
                                                    {{
                                                        server.node?.maintenance_mode
                                                            ? $t('servers.nodeMaintenance')
                                                            : getAccessRestrictionReason(server)
                                                    }}
                                                </div>
                                                <div class="text-xs opacity-90 leading-relaxed">
                                                    {{
                                                        server.node?.maintenance_mode
                                                            ? $t('servers.nodeMaintenanceLong')
                                                            : $t('servers.accessRestrictedDescription')
                                                    }}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Content overlaid on banner -->
                                        <div class="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <h3
                                                        class="text-base sm:text-lg font-bold text-white drop-shadow-sm truncate"
                                                    >
                                                        {{ server.name }}
                                                    </h3>
                                                    <p
                                                        class="text-xs sm:text-sm text-white/80 drop-shadow-sm truncate mt-1"
                                                    >
                                                        {{ server.description || $t('servers.noDescription') }}
                                                    </p>
                                                </div>
                                                <div class="flex flex-col gap-1">
                                                    <Badge
                                                        :variant="getStatusVariant(displayStatus(server))"
                                                        class="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs"
                                                    >
                                                        {{ $t(`servers.status.${displayStatus(server)}`) }}
                                                    </Badge>
                                                    <!-- Subuser Access Badge -->
                                                    <Badge
                                                        v-if="server.is_subuser"
                                                        variant="outline"
                                                        class="bg-blue-500/20 text-blue-100 border-blue-300/30 text-xs"
                                                    >
                                                        {{ $t('servers.subuserAccess') }}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <!-- Spell name at bottom of header -->
                                            <div class="flex items-center gap-2 text-xs sm:text-sm">
                                                <Sparkles class="h-3 w-3 sm:h-4 sm:w-4 text-white drop-shadow-sm" />
                                                <span class="text-white/90 font-medium drop-shadow-sm"
                                                    >{{ $t('servers.spell') }}:</span
                                                >
                                                <span class="font-bold text-white truncate drop-shadow-sm">{{
                                                    server.spell?.name || 'N/A'
                                                }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Card Content -->
                                    <div class="p-3 sm:p-4 bg-card">
                                        <div class="space-y-2 sm:space-y-3">
                                            <!-- Server Info -->
                                            <div
                                                class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm"
                                            >
                                                <div class="flex items-center gap-2">
                                                    <Server
                                                        class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0"
                                                    />
                                                    <span class="text-muted-foreground">{{ $t('servers.node') }}:</span>
                                                    <span class="font-medium truncate">{{
                                                        server.node?.name || 'N/A'
                                                    }}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <Hash
                                                        class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0"
                                                    />
                                                    <span class="text-muted-foreground"
                                                        >{{ $t('servers.realm') }}:</span
                                                    >
                                                    <span class="font-medium truncate">{{
                                                        server.realm?.name || 'N/A'
                                                    }}</span>
                                                </div>
                                            </div>

                                            <!-- Resources -->
                                            <div class="grid grid-cols-3 gap-1 sm:gap-2 text-xs">
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.memory === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatMemory(server.memory) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.memory') }}
                                                    </div>
                                                </div>
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.disk === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatDisk(server.disk) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.disk') }}
                                                    </div>
                                                </div>
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.cpu === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatCpu(server.cpu) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.cpu') }}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Click indicator -->
                                            <div class="flex items-center justify-end pt-1 sm:pt-2">
                                                <div
                                                    class="text-xs text-muted-foreground group-hover:text-primary transition-colors"
                                                >
                                                    {{ $t('servers.clickToView') }} →
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        <FolderOpen class="h-4 w-4 mr-2" />
                                        {{ $t('servers.moveToFolder') }}
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        <ContextMenuItem
                                            v-for="folderItem in serverFolders"
                                            :key="folderItem.id"
                                            :class="{ 'text-primary': folder.id === folderItem.id }"
                                            @click="moveServerToFolder(server, folderItem.id)"
                                        >
                                            <FolderOpen class="h-4 w-4 mr-2" />
                                            {{ folderItem.name }}
                                            <span v-if="folder.id === folderItem.id" class="ml-auto text-xs">{{
                                                $t('servers.current')
                                            }}</span>
                                        </ContextMenuItem>
                                        <ContextMenuItem @click="moveServerToFolder(server, null)">
                                            <Server class="h-4 w-4 mr-2" />
                                            {{ $t('servers.unassigned') }}
                                        </ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuSeparator />
                                <ContextMenuItem @click="createFolderForServer(server)">
                                    <FolderPlus class="h-4 w-4 mr-2" />
                                    {{ $t('servers.createNewFolder') }}
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                </div>

                <!-- Unassigned Servers -->
                <div v-if="unassignedServers.length > 0" class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div class="flex items-center gap-2">
                            <Server class="h-5 w-5 text-muted-foreground" />
                            <h4 class="font-semibold">{{ $t('servers.unassigned') }}</h4>
                            <Badge variant="secondary"
                                >{{ unassignedServers.length }} {{ $t('servers.servers') }}</Badge
                            >
                        </div>
                    </div>

                    <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <ContextMenu v-for="server in unassignedServers" :key="server.id">
                            <ContextMenuTrigger as-child>
                                <div
                                    class="group bg-card border-2 border-border rounded-lg transition-all duration-200 overflow-hidden"
                                    :class="{
                                        'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:scale-[1.02]':
                                            isServerAccessible(server),
                                        'cursor-not-allowed opacity-75': !isServerAccessible(server),
                                    }"
                                    @click="openServerDetails(server)"
                                >
                                    <!-- Spell Banner - Full Width, No Padding -->
                                    <div class="relative w-full h-24 sm:h-32">
                                        <!-- Spell Banner Background -->
                                        <div
                                            v-if="server.spell?.banner"
                                            class="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                            :style="{ backgroundImage: `url(${server.spell.banner})` }"
                                        />

                                        <!-- Dark overlay for better text readability -->
                                        <div
                                            class="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"
                                        />

                                        <!-- Access Restriction Overlay -->
                                        <div
                                            v-if="!isServerAccessible(server)"
                                            class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
                                        >
                                            <div class="text-center text-white p-4">
                                                <div class="text-sm font-semibold mb-2">
                                                    {{
                                                        server.node?.maintenance_mode
                                                            ? $t('servers.nodeMaintenance')
                                                            : getAccessRestrictionReason(server)
                                                    }}
                                                </div>
                                                <div class="text-xs opacity-90 leading-relaxed">
                                                    {{
                                                        server.node?.maintenance_mode
                                                            ? $t('servers.nodeMaintenanceLong')
                                                            : $t('servers.accessRestrictedDescription')
                                                    }}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Content overlaid on banner -->
                                        <div class="relative z-10 p-3 sm:p-4 h-full flex flex-col justify-between">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <h3
                                                        class="text-base sm:text-lg font-bold text-white drop-shadow-sm truncate"
                                                    >
                                                        {{ server.name }}
                                                    </h3>
                                                    <p
                                                        class="text-xs sm:text-sm text-white/80 drop-shadow-sm truncate mt-1"
                                                    >
                                                        {{ server.description || $t('servers.noDescription') }}
                                                    </p>
                                                </div>
                                                <div class="flex flex-col gap-1">
                                                    <Badge
                                                        :variant="getStatusVariant(displayStatus(server))"
                                                        class="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs"
                                                    >
                                                        {{ $t(`servers.status.${displayStatus(server)}`) }}
                                                    </Badge>
                                                    <!-- Subuser Access Badge -->
                                                    <Badge
                                                        v-if="server.is_subuser"
                                                        variant="outline"
                                                        class="bg-blue-500/20 text-blue-100 border-blue-300/30 text-xs"
                                                    >
                                                        {{ $t('servers.subuserAccess') }}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <!-- Spell name at bottom of header -->
                                            <div class="flex items-center gap-2 text-xs sm:text-sm">
                                                <Sparkles class="h-3 w-3 sm:h-4 sm:w-4 text-white drop-shadow-sm" />
                                                <span class="text-white/90 font-medium drop-shadow-sm"
                                                    >{{ $t('servers.spell') }}:</span
                                                >
                                                <span class="font-bold text-white truncate drop-shadow-sm">{{
                                                    server.spell?.name || 'N/A'
                                                }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Card Content -->
                                    <div class="p-3 sm:p-4 bg-card">
                                        <div class="space-y-2 sm:space-y-3">
                                            <!-- Server Info -->
                                            <div
                                                class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm"
                                            >
                                                <div class="flex items-center gap-2">
                                                    <Server
                                                        class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0"
                                                    />
                                                    <span class="text-muted-foreground">{{ $t('servers.node') }}:</span>
                                                    <span class="font-medium truncate">{{
                                                        server.node?.name || 'N/A'
                                                    }}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <Hash
                                                        class="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0"
                                                    />
                                                    <span class="text-muted-foreground"
                                                        >{{ $t('servers.realm') }}:</span
                                                    >
                                                    <span class="font-medium truncate">{{
                                                        server.realm?.name || 'N/A'
                                                    }}</span>
                                                </div>
                                            </div>

                                            <!-- Resources -->
                                            <div class="grid grid-cols-3 gap-1 sm:gap-2 text-xs">
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.memory === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatMemory(server.memory) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.memory') }}
                                                    </div>
                                                </div>
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.disk === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatDisk(server.disk) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.disk') }}
                                                    </div>
                                                </div>
                                                <div
                                                    class="text-center p-1.5 sm:p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                                >
                                                    <div
                                                        class="font-semibold text-xs sm:text-sm"
                                                        :class="
                                                            server.cpu === 0
                                                                ? 'text-green-600 dark:text-green-400 text-lg'
                                                                : 'text-primary'
                                                        "
                                                    >
                                                        {{ formatCpu(server.cpu) }}
                                                    </div>
                                                    <div class="text-muted-foreground text-xs">
                                                        {{ $t('servers.cpu') }}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Click indicator -->
                                            <div class="flex items-center justify-end pt-1 sm:pt-2">
                                                <div
                                                    class="text-xs text-muted-foreground group-hover:text-primary transition-colors"
                                                >
                                                    {{ $t('servers.clickToView') }} →
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        <FolderOpen class="h-4 w-4 mr-2" />
                                        {{ $t('servers.moveToFolder') }}
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        <ContextMenuItem
                                            v-for="folder in serverFolders"
                                            :key="folder.id"
                                            @click="moveServerToFolder(server, folder.id)"
                                        >
                                            <FolderOpen class="h-4 w-4 mr-2" />
                                            {{ folder.name }}
                                        </ContextMenuItem>
                                        <ContextMenuItem class="text-primary" @click="moveServerToFolder(server, null)">
                                            <Server class="h-4 w-4 mr-2" />
                                            {{ $t('servers.unassigned') }}
                                            <span class="ml-auto text-xs">{{ $t('servers.current') }}</span>
                                        </ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuSeparator />
                                <ContextMenuItem @click="createFolderForServer(server)">
                                    <FolderPlus class="h-4 w-4 mr-2" />
                                    {{ $t('servers.createNewFolder') }}
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                </div>
            </div>

            <!-- List View (Original) -->
            <div v-else-if="viewMode === 'list'" class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <ContextMenu v-for="server in servers" :key="server.id">
                    <ContextMenuTrigger as-child>
                        <div
                            class="group bg-card border-2 border-border rounded-lg transition-all duration-200 overflow-hidden"
                            :class="{
                                'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:scale-[1.02]':
                                    isServerAccessible(server),
                                'cursor-not-allowed opacity-75': !isServerAccessible(server),
                            }"
                            @click="openServerDetails(server)"
                        >
                            <!-- Spell Banner - Full Width, No Padding -->
                            <div class="relative w-full h-32">
                                <!-- Spell Banner Background -->
                                <div
                                    v-if="server.spell?.banner"
                                    class="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                    :style="{ backgroundImage: `url(${server.spell.banner})` }"
                                />

                                <!-- Dark overlay for better text readability -->
                                <div
                                    class="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"
                                />

                                <!-- Access Restriction Overlay -->
                                <div
                                    v-if="!isServerAccessible(server)"
                                    class="absolute inset-0 bg-red-500/20 flex items-center justify-center z-20"
                                >
                                    <div class="text-center text-white">
                                        <div class="text-sm font-semibold">
                                            {{ getAccessRestrictionReason(server) }}
                                        </div>
                                        <div class="text-xs opacity-80">
                                            {{ $t('servers.accessRestrictedDescription') }}
                                        </div>
                                    </div>
                                </div>

                                <!-- Content overlaid on banner -->
                                <div class="relative z-10 p-4 h-full flex flex-col justify-between">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-lg font-bold text-white drop-shadow-sm truncate">
                                                {{ server.name }}
                                            </h3>
                                            <p class="text-sm text-white/80 drop-shadow-sm truncate mt-1">
                                                {{ server.description || $t('servers.noDescription') }}
                                            </p>
                                        </div>
                                        <div class="flex flex-col gap-1">
                                            <Badge
                                                :variant="getStatusVariant(displayStatus(server))"
                                                class="bg-white/20 text-white border-white/30 hover:bg-white/30"
                                            >
                                                {{ $t(`servers.status.${displayStatus(server)}`) }}
                                            </Badge>
                                            <!-- Subuser Access Badge -->
                                            <Badge
                                                v-if="server.is_subuser"
                                                variant="outline"
                                                class="bg-blue-500/20 text-blue-100 border-blue-300/30 text-xs"
                                            >
                                                {{ $t('servers.subuserAccess') }}
                                            </Badge>
                                        </div>
                                    </div>

                                    <!-- Spell name at bottom of header -->
                                    <div class="flex items-center gap-2 text-sm">
                                        <Sparkles class="h-4 w-4 text-white drop-shadow-sm" />
                                        <span class="text-white/90 font-medium drop-shadow-sm"
                                            >{{ $t('servers.spell') }}:</span
                                        >
                                        <span class="font-bold text-white truncate drop-shadow-sm">{{
                                            server.spell?.name || 'N/A'
                                        }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Card Content -->
                            <div class="p-4 bg-card">
                                <div class="space-y-3">
                                    <!-- Server Info -->
                                    <div class="grid grid-cols-2 gap-3 text-sm">
                                        <div class="flex items-center gap-2">
                                            <Server class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.node') }}:</span>
                                            <span class="font-medium truncate">{{ server.node?.name || 'N/A' }}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <Hash class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.realm') }}:</span>
                                            <span class="font-medium truncate">{{ server.realm?.name || 'N/A' }}</span>
                                        </div>
                                    </div>

                                    <!-- Resources -->
                                    <div class="grid grid-cols-3 gap-2 text-xs">
                                        <div
                                            class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                        >
                                            <div
                                                class="font-semibold"
                                                :class="
                                                    server.memory === 0
                                                        ? 'text-green-600 dark:text-green-400 text-lg'
                                                        : 'text-primary'
                                                "
                                            >
                                                {{ formatMemory(server.memory) }}
                                            </div>
                                            <div class="text-muted-foreground">{{ $t('servers.memory') }}</div>
                                        </div>
                                        <div
                                            class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                        >
                                            <div
                                                class="font-semibold"
                                                :class="
                                                    server.disk === 0
                                                        ? 'text-green-600 dark:text-green-400 text-lg'
                                                        : 'text-primary'
                                                "
                                            >
                                                {{ formatDisk(server.disk) }}
                                            </div>
                                            <div class="text-muted-foreground">{{ $t('servers.disk') }}</div>
                                        </div>
                                        <div
                                            class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                        >
                                            <div
                                                class="font-semibold"
                                                :class="
                                                    server.cpu === 0
                                                        ? 'text-green-600 dark:text-green-400 text-lg'
                                                        : 'text-primary'
                                                "
                                            >
                                                {{ formatCpu(server.cpu) }}
                                            </div>
                                            <div class="text-muted-foreground">{{ $t('servers.cpu') }}</div>
                                        </div>
                                    </div>

                                    <!-- Click indicator -->
                                    <div class="flex items-center justify-end pt-2">
                                        <div
                                            class="text-xs text-muted-foreground group-hover:text-primary transition-colors"
                                        >
                                            {{ $t('servers.clickToView') }} →
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <FolderOpen class="h-4 w-4 mr-2" />
                                {{ $t('servers.moveToFolder') }}
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                                <ContextMenuItem
                                    v-for="folder in serverFolders"
                                    :key="folder.id"
                                    @click="moveServerToFolder(server, folder.id)"
                                >
                                    <FolderOpen class="h-4 w-4 mr-2" />
                                    {{ folder.name }}
                                </ContextMenuItem>
                                <ContextMenuItem @click="moveServerToFolder(server, null)">
                                    <Server class="h-4 w-4 mr-2" />
                                    {{ $t('servers.unassigned') }}
                                </ContextMenuItem>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem @click="createFolderForServer(server)">
                            <FolderPlus class="h-4 w-4 mr-2" />
                            {{ $t('servers.createNewFolder') }}
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>

            <!-- Table View -->
            <div v-else-if="viewMode === 'table'" class="space-y-4">
                <div class="rounded-lg border border-border bg-card">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-muted/50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.name') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.statusColumn') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.spell') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.node') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.realm') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.memory') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.disk') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.cpu') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.swap') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.allocation') }}
                                    </th>
                                    <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.created') }}
                                    </th>
                                    <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                        {{ $t('servers.actions') }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                <tr
                                    v-for="server in servers"
                                    :key="server.id"
                                    class="hover:bg-muted/50 transition-colors"
                                    :class="{ 'opacity-50': !isServerAccessible(server) }"
                                >
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="shrink-0">
                                                <div
                                                    class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"
                                                >
                                                    <Server class="h-4 w-4 text-primary" />
                                                </div>
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <div class="font-medium text-sm truncate">{{ server.name }}</div>
                                                <div class="text-xs text-muted-foreground truncate">
                                                    {{ server.description || $t('servers.noDescription') }}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <Badge :variant="getStatusVariant(displayStatus(server))" class="text-xs">
                                                {{ $t(`servers.status.${displayStatus(server)}`) }}
                                            </Badge>
                                            <Badge
                                                v-if="server.is_subuser"
                                                variant="outline"
                                                class="text-xs bg-blue-500/20 text-blue-600"
                                            >
                                                {{ $t('servers.subuserAccess') }}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <Sparkles class="h-3 w-3 text-muted-foreground" />
                                            <span class="text-sm truncate">{{ server.spell?.name || 'N/A' }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <Server class="h-3 w-3 text-muted-foreground" />
                                            <span class="text-sm truncate">{{ server.node?.name || 'N/A' }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <Hash class="h-3 w-3 text-muted-foreground" />
                                            <span class="text-sm truncate">{{ server.realm?.name || 'N/A' }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span
                                            class="text-sm font-medium"
                                            :class="
                                                server.memory === 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-primary'
                                            "
                                        >
                                            {{ formatMemory(server.memory) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span
                                            class="text-sm font-medium"
                                            :class="
                                                server.disk === 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-primary'
                                            "
                                        >
                                            {{ formatDisk(server.disk) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span
                                            class="text-sm font-medium"
                                            :class="
                                                server.cpu === 0 ? 'text-green-600 dark:text-green-400' : 'text-primary'
                                            "
                                        >
                                            {{ formatCpu(server.cpu) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span
                                            class="text-sm font-medium"
                                            :class="
                                                server.swap === 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-primary'
                                            "
                                        >
                                            {{ formatSwap(server.swap || 0) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class="text-sm font-medium">
                                            {{
                                                server.allocation
                                                    ? `${server.allocation.ip}:${server.allocation.port}`
                                                    : 'N/A'
                                            }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class="text-sm text-muted-foreground">
                                            {{ formatDate(server.created_at) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex items-center justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                class="h-8 w-8 p-0"
                                                :disabled="!isServerAccessible(server)"
                                                data-umami-event="Open server"
                                                :data-umami-event-server="server.name"
                                                @click="openServerDetails(server)"
                                            >
                                                <Eye class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Compact View -->
            <div v-else-if="viewMode === 'compact'" class="space-y-4">
                <div class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <ContextMenu v-for="server in servers" :key="server.id">
                        <ContextMenuTrigger as-child>
                            <div
                                class="group bg-card border border-border rounded-md transition-all duration-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/20"
                                :class="{ 'opacity-50': !isServerAccessible(server) }"
                                @click="openServerDetails(server)"
                            >
                                <!-- Compact Header -->
                                <div class="relative h-16 bg-linear-to-r from-primary/10 to-primary/5 p-2">
                                    <div class="flex items-center justify-between h-full">
                                        <div class="flex-1 min-w-0">
                                            <h4 class="text-sm font-semibold truncate">{{ server.name }}</h4>
                                            <p class="text-xs text-muted-foreground truncate">
                                                {{ server.spell?.name || 'N/A' }}
                                            </p>
                                        </div>
                                        <Badge :variant="getStatusVariant(displayStatus(server))" class="text-xs">
                                            {{ $t(`servers.status.${displayStatus(server)}`) }}
                                        </Badge>
                                    </div>
                                </div>

                                <!-- Compact Content -->
                                <div class="p-2 space-y-1">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-muted-foreground">{{ $t('servers.memory') }}</span>
                                        <span class="font-medium">{{ formatMemory(server.memory) }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-muted-foreground">{{ $t('servers.disk') }}</span>
                                        <span class="font-medium">{{ formatDisk(server.disk) }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-muted-foreground">{{ $t('servers.cpu') }}</span>
                                        <span class="font-medium">{{ formatCpu(server.cpu) }}</span>
                                    </div>
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                            <ContextMenuSeparator />
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    <FolderOpen class="h-4 w-4 mr-2" />
                                    {{ $t('servers.moveToFolder') }}
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                    <ContextMenuItem
                                        v-for="folder in serverFolders"
                                        :key="folder.id"
                                        @click="moveServerToFolder(server, folder.id)"
                                    >
                                        <FolderOpen class="h-4 w-4 mr-2" />
                                        {{ folder.name }}
                                    </ContextMenuItem>
                                    <ContextMenuItem @click="moveServerToFolder(server, null)">
                                        <Server class="h-4 w-4 mr-2" />
                                        {{ $t('servers.unassigned') }}
                                    </ContextMenuItem>
                                </ContextMenuSubContent>
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                            <ContextMenuItem @click="createFolderForServer(server)">
                                <FolderPlus class="h-4 w-4 mr-2" />
                                {{ $t('servers.createNewFolder') }}
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </div>
            </div>

            <!-- Detailed View -->
            <div v-else-if="viewMode === 'detailed'" class="space-y-4">
                <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <ContextMenu v-for="server in servers" :key="server.id">
                        <ContextMenuTrigger as-child>
                            <div
                                class="group bg-card border-2 border-border rounded-xl transition-all duration-200 overflow-hidden"
                                :class="{
                                    'cursor-pointer hover:shadow-xl hover:border-primary/30 hover:scale-[1.02]':
                                        isServerAccessible(server),
                                    'cursor-not-allowed opacity-75': !isServerAccessible(server),
                                }"
                                data-umami-event="Open server"
                                :data-umami-event-server="server.name"
                                @click="openServerDetails(server)"
                            >
                                <!-- Detailed Banner -->
                                <div class="relative h-40">
                                    <div
                                        v-if="server.spell?.banner"
                                        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                        :style="{ backgroundImage: `url(${server.spell.banner})` }"
                                    />
                                    <div
                                        class="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent"
                                    />

                                    <!-- Detailed Content -->
                                    <div class="relative z-10 p-6 h-full flex flex-col justify-between">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-xl font-bold text-white drop-shadow-lg">
                                                    {{ server.name }}
                                                </h3>
                                                <p class="text-sm text-white/90 drop-shadow-md mt-1">
                                                    {{ server.description || $t('servers.noDescription') }}
                                                </p>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <Badge
                                                    :variant="getStatusVariant(displayStatus(server))"
                                                    class="bg-white/20 text-white border-white/30"
                                                >
                                                    {{ $t(`servers.status.${displayStatus(server)}`) }}
                                                </Badge>
                                                <Badge
                                                    v-if="server.is_subuser"
                                                    variant="outline"
                                                    class="bg-blue-500/20 text-blue-100 border-blue-300/30"
                                                >
                                                    {{ $t('servers.subuserAccess') }}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3 text-sm">
                                            <div class="flex items-center gap-2">
                                                <Sparkles class="h-4 w-4 text-white drop-shadow-sm" />
                                                <span class="text-white/90 font-medium"
                                                    >{{ $t('servers.spell') }}:</span
                                                >
                                                <span class="font-bold text-white">{{
                                                    server.spell?.name || 'N/A'
                                                }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Detailed Content -->
                                <div class="p-6 space-y-6">
                                    <!-- Server Info -->
                                    <div class="grid grid-cols-2 gap-4 text-sm">
                                        <div class="flex items-center gap-3">
                                            <Server class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.node') }}:</span>
                                            <span class="font-medium">{{ server.node?.name || 'N/A' }}</span>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <Hash class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.realm') }}:</span>
                                            <span class="font-medium">{{ server.realm?.name || 'N/A' }}</span>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <Globe class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.allocation') }}:</span>
                                            <span class="font-medium">{{
                                                server.allocation
                                                    ? `${server.allocation.ip}:${server.allocation.port}`
                                                    : 'N/A'
                                            }}</span>
                                        </div>
                                        <div v-if="server.allocation?.ip_alias" class="flex items-center gap-3">
                                            <Globe class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.ipAlias') }}:</span>
                                            <span class="font-medium">{{ server.allocation.ip_alias }}</span>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <User class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.ownerId') }}:</span>
                                            <span class="font-medium">{{ server.owner_id || 'N/A' }}</span>
                                        </div>
                                    </div>

                                    <!-- Resources -->
                                    <div class="space-y-3">
                                        <h4 class="text-sm font-semibold text-muted-foreground">
                                            {{ $t('servers.resources') }}
                                        </h4>
                                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div
                                                    class="text-lg font-bold"
                                                    :class="
                                                        server.memory === 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-primary'
                                                    "
                                                >
                                                    {{ formatMemory(server.memory) }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.memory') }}
                                                </div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div
                                                    class="text-lg font-bold"
                                                    :class="
                                                        server.disk === 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-primary'
                                                    "
                                                >
                                                    {{ formatDisk(server.disk) }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.disk') }}
                                                </div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div
                                                    class="text-lg font-bold"
                                                    :class="
                                                        server.cpu === 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-primary'
                                                    "
                                                >
                                                    {{ formatCpu(server.cpu) }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">{{ $t('servers.cpu') }}</div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div
                                                    class="text-lg font-bold"
                                                    :class="
                                                        (server.swap || 0) === 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-primary'
                                                    "
                                                >
                                                    {{ formatSwap(server.swap || 0) }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.swap') }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div
                                                    class="text-lg font-bold"
                                                    :class="
                                                        (server.io || 0) === 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-primary'
                                                    "
                                                >
                                                    {{ formatIO(server.io || 0) }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">{{ $t('servers.io') }}</div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div class="text-lg font-bold text-primary">
                                                    {{ server.allocation_limit || '∞' }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.allocationLimit') }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Limits -->
                                    <div class="space-y-3">
                                        <h4 class="text-sm font-semibold text-muted-foreground">
                                            {{ $t('servers.limits') }}
                                        </h4>
                                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div class="text-lg font-bold text-primary">
                                                    {{ server.database_limit || '∞' }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.databaseLimit') }}
                                                </div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div class="text-lg font-bold text-primary">
                                                    {{ server.backup_limit || '∞' }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.backupLimit') }}
                                                </div>
                                            </div>
                                            <div class="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
                                                <div class="text-lg font-bold text-primary">
                                                    {{ server.allocation_limit || '∞' }}
                                                </div>
                                                <div class="text-xs text-muted-foreground">
                                                    {{ $t('servers.allocationLimit') }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Server Settings -->
                                    <div class="space-y-3">
                                        <h4 class="text-sm font-semibold text-muted-foreground">
                                            {{ $t('servers.settings') }}
                                        </h4>
                                        <div class="flex items-center gap-4 text-sm">
                                            <div class="flex items-center gap-2">
                                                <Settings class="h-4 w-4 text-muted-foreground" />
                                                <span class="text-muted-foreground"
                                                    >{{ $t('servers.skipScripts') }}:</span
                                                >
                                                <Badge
                                                    :variant="server.skip_scripts ? 'destructive' : 'secondary'"
                                                    class="text-xs"
                                                >
                                                    {{
                                                        server.skip_scripts
                                                            ? $t('servers.enabled')
                                                            : $t('servers.disabled')
                                                    }}
                                                </Badge>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <Shield class="h-4 w-4 text-muted-foreground" />
                                                <span class="text-muted-foreground"
                                                    >{{ $t('servers.oomDisabled') }}:</span
                                                >
                                                <Badge
                                                    :variant="server.oom_disabled ? 'destructive' : 'secondary'"
                                                    class="text-xs"
                                                >
                                                    {{
                                                        server.oom_disabled
                                                            ? $t('servers.enabled')
                                                            : $t('servers.disabled')
                                                    }}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div v-if="server.threads" class="flex items-center gap-2 text-sm">
                                            <Settings class="h-4 w-4 text-muted-foreground" />
                                            <span class="text-muted-foreground">{{ $t('servers.threads') }}:</span>
                                            <span class="font-medium">{{ server.threads }}</span>
                                        </div>
                                    </div>

                                    <!-- Dates -->
                                    <div class="space-y-3">
                                        <h4 class="text-sm font-semibold text-muted-foreground">
                                            {{ $t('servers.dates') }}
                                        </h4>
                                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                                            <div class="flex items-center gap-3">
                                                <Calendar class="h-4 w-4 text-muted-foreground" />
                                                <span class="text-muted-foreground">{{ $t('servers.created') }}:</span>
                                                <span class="font-medium">{{ formatDate(server.created_at) }}</span>
                                            </div>
                                            <div class="flex items-center gap-3">
                                                <Clock class="h-4 w-4 text-muted-foreground" />
                                                <span class="text-muted-foreground">{{ $t('servers.updated') }}:</span>
                                                <span class="font-medium">{{ formatDate(server.updated_at) }}</span>
                                            </div>
                                            <div v-if="server.installed_at" class="flex items-center gap-3">
                                                <CheckCircle class="h-4 w-4 text-muted-foreground" />
                                                <span class="text-muted-foreground"
                                                    >{{ $t('servers.installed') }}:</span
                                                >
                                                <span class="font-medium">{{ formatDate(server.installed_at) }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Click indicator -->
                                    <div class="flex items-center justify-end pt-2">
                                        <div
                                            class="text-sm text-muted-foreground group-hover:text-primary transition-colors"
                                        >
                                            {{ $t('servers.clickToView') }} →
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                            <ContextMenuSeparator />
                            <ContextMenuSub>
                                <ContextMenuSubTrigger>
                                    <FolderOpen class="h-4 w-4 mr-2" />
                                    {{ $t('servers.moveToFolder') }}
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent>
                                    <ContextMenuItem
                                        v-for="folder in serverFolders"
                                        :key="folder.id"
                                        @click="moveServerToFolder(server, folder.id)"
                                    >
                                        <FolderOpen class="h-4 w-4 mr-2" />
                                        {{ folder.name }}
                                    </ContextMenuItem>
                                    <ContextMenuItem @click="moveServerToFolder(server, null)">
                                        <Server class="h-4 w-4 mr-2" />
                                        {{ $t('servers.unassigned') }}
                                    </ContextMenuItem>
                                </ContextMenuSubContent>
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                            <ContextMenuItem @click="createFolderForServer(server)">
                                <FolderPlus class="h-4 w-4 mr-2" />
                                {{ $t('servers.createNewFolder') }}
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </div>
            </div>

            <!-- Status Grouped View -->
            <div v-else-if="viewMode === 'status-grouped'" class="space-y-6">
                <div v-for="statusGroup in statusGroups" :key="statusGroup.status" class="space-y-3">
                    <!-- Status Group Header -->
                    <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div class="flex items-center gap-2">
                            <div class="h-3 w-3 rounded-full" :class="getStatusColor(statusGroup.status)"></div>
                            <h4 class="font-semibold">{{ $t(`servers.status.${statusGroup.status}`) }}</h4>
                            <Badge variant="secondary"
                                >{{ statusGroup.servers.length }} {{ $t('servers.servers') }}</Badge
                            >
                        </div>
                    </div>

                    <!-- Servers in Status Group -->
                    <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <ContextMenu v-for="server in statusGroup.servers" :key="server.id">
                            <ContextMenuTrigger as-child>
                                <div
                                    class="group bg-card border-2 border-border rounded-lg transition-all duration-200 overflow-hidden"
                                    :class="{
                                        'cursor-pointer hover:shadow-lg hover:border-primary/20 hover:scale-[1.02]':
                                            isServerAccessible(server),
                                        'cursor-not-allowed opacity-75': !isServerAccessible(server),
                                    }"
                                    @click="openServerDetails(server)"
                                >
                                    <!-- Status Banner -->
                                    <div class="relative w-full h-20" :class="getStatusBgColor(statusGroup.status)">
                                        <div class="absolute inset-0 bg-black/20" />
                                        <div class="relative z-10 p-3 h-full flex flex-col justify-between">
                                            <div class="flex items-start justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <h3 class="text-sm font-bold text-white drop-shadow-sm truncate">
                                                        {{ server.name }}
                                                    </h3>
                                                    <p class="text-xs text-white/80 drop-shadow-sm truncate mt-1">
                                                        {{ server.spell?.name || 'N/A' }}
                                                    </p>
                                                </div>
                                                <Badge
                                                    v-if="server.is_subuser"
                                                    variant="outline"
                                                    class="bg-blue-500/20 text-blue-100 border-blue-300/30 text-xs"
                                                >
                                                    {{ $t('servers.subuserAccess') }}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Card Content -->
                                    <div class="p-3 bg-card">
                                        <div class="space-y-2">
                                            <div class="grid grid-cols-3 gap-1 text-xs">
                                                <div class="text-center p-1.5 bg-muted/50 rounded border">
                                                    <div class="font-semibold text-primary">
                                                        {{ formatMemory(server.memory) }}
                                                    </div>
                                                    <div class="text-muted-foreground">{{ $t('servers.memory') }}</div>
                                                </div>
                                                <div class="text-center p-1.5 bg-muted/50 rounded border">
                                                    <div class="font-semibold text-primary">
                                                        {{ formatDisk(server.disk) }}
                                                    </div>
                                                    <div class="text-muted-foreground">{{ $t('servers.disk') }}</div>
                                                </div>
                                                <div class="text-center p-1.5 bg-muted/50 rounded border">
                                                    <div class="font-semibold text-primary">
                                                        {{ formatCpu(server.cpu) }}
                                                    </div>
                                                    <div class="text-muted-foreground">{{ $t('servers.cpu') }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuLabel>{{ server.name }}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                        <FolderOpen class="h-4 w-4 mr-2" />
                                        {{ $t('servers.moveToFolder') }}
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                        <ContextMenuItem
                                            v-for="folder in serverFolders"
                                            :key="folder.id"
                                            @click="moveServerToFolder(server, folder.id)"
                                        >
                                            <FolderOpen class="h-4 w-4 mr-2" />
                                            {{ folder.name }}
                                        </ContextMenuItem>
                                        <ContextMenuItem @click="moveServerToFolder(server, null)">
                                            <Server class="h-4 w-4 mr-2" />
                                            {{ $t('servers.unassigned') }}
                                        </ContextMenuItem>
                                    </ContextMenuSubContent>
                                </ContextMenuSub>
                                <ContextMenuSeparator />
                                <ContextMenuItem @click="createFolderForServer(server)">
                                    <FolderPlus class="h-4 w-4 mr-2" />
                                    {{ $t('servers.createNewFolder') }}
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                </div>
            </div>

            <!-- Minimal View -->
            <div v-else-if="viewMode === 'minimal'" class="space-y-2">
                <div class="space-y-1">
                    <div
                        v-for="server in servers"
                        :key="server.id"
                        class="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                        :class="{ 'opacity-50': !isServerAccessible(server) }"
                        @click="openServerDetails(server)"
                    >
                        <div class="shrink-0">
                            <div class="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Server class="h-4 w-4 text-primary" />
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium truncate">{{ server.name }}</span>
                                <Badge :variant="getStatusVariant(displayStatus(server))" class="text-xs">
                                    {{ $t(`servers.status.${displayStatus(server)}`) }}
                                </Badge>
                                <Badge v-if="server.is_subuser" variant="outline" class="text-xs">
                                    {{ $t('servers.subuserAccess') }}
                                </Badge>
                            </div>
                            <div class="text-xs text-muted-foreground truncate">{{ server.spell?.name || 'N/A' }}</div>
                        </div>
                        <div class="shrink-0 text-xs text-muted-foreground">
                            {{ formatMemory(server.memory) }} / {{ formatDisk(server.disk) }} /
                            {{ formatCpu(server.cpu) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div
                v-if="pagination.total_pages > 1"
                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div class="text-sm text-muted-foreground text-center sm:text-left">
                    {{
                        $t('servers.showing', {
                            from: pagination.from,
                            to: pagination.to,
                            total: pagination.total_records,
                        })
                    }}
                </div>
                <div class="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        :disabled="!pagination.has_prev"
                        @click="changePage(pagination.current_page - 1)"
                    >
                        <ChevronLeft class="h-4 w-4" />
                        <span class="hidden sm:inline ml-1">{{ $t('servers.previous') }}</span>
                    </Button>
                    <div class="flex items-center gap-1 px-2">
                        <span class="text-sm font-medium">{{ pagination.current_page }}</span>
                        <span class="text-sm text-muted-foreground">/</span>
                        <span class="text-sm text-muted-foreground">{{ pagination.total_pages }}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        :disabled="!pagination.has_next"
                        @click="changePage(pagination.current_page + 1)"
                    >
                        <span class="hidden sm:inline mr-1">{{ $t('servers.next') }}</span>
                        <ChevronRight class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex items-center justify-center py-12">
            <div class="text-center">
                <Server class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.noServers') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.noServersDescription') }}</p>
            </div>
        </div>

        <!-- No Search Results -->
        <div
            v-if="!loading && !error && filteredServers.length === 0 && servers.length > 0"
            class="flex items-center justify-center py-12"
        >
            <div class="text-center">
                <Search class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.noSearchResults') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.tryDifferentSearch') }}</p>
            </div>
        </div>
    </div>

    <!-- Folder Management Dialogs -->
    <Dialog v-model:open="folderDialogOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ editingFolder ? $t('servers.editFolder') : $t('servers.createFolder') }}</DialogTitle>
            </DialogHeader>
            <div class="space-y-4">
                <div>
                    <label for="folder-name" class="block mb-2 text-sm font-medium">{{
                        $t('servers.folderName')
                    }}</label>
                    <Input
                        id="folder-name"
                        v-model="folderForm.name"
                        :placeholder="$t('servers.folderNamePlaceholder')"
                        @keyup.enter="saveFolder"
                    />
                </div>
                <div class="flex justify-end gap-2">
                    <Button variant="outline" @click="folderDialogOpen = false">
                        {{ $t('servers.cancel') }}
                    </Button>
                    <Button :disabled="!folderForm.name.trim()" @click="saveFolder">
                        {{ editingFolder ? $t('servers.update') : $t('servers.create') }}
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>

    <!-- Confirmation Dialog -->
    <Dialog v-model:open="showConfirmDialog" @update:open="confirmLoading = false">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ confirmDialog.title }}</DialogTitle>
            </DialogHeader>
            <div class="py-4 text-sm text-muted-foreground">
                {{ confirmDialog.description }}
            </div>
            <div class="flex justify-end gap-2">
                <Button
                    variant="outline"
                    @click="
                        showConfirmDialog = false;
                        confirmAction = null;
                    "
                >
                    {{ $t('servers.cancel') }}
                </Button>
                <Button :variant="confirmDialog.variant" :disabled="confirmLoading" @click="confirmAction?.()">
                    {{ confirmDialog.confirmText }}
                </Button>
            </div>
        </DialogContent>
    </Dialog>
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

import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import {
    Search,
    RefreshCw,
    Server,
    Hash,
    Sparkles,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    FolderPlus,
    FolderOpen,
    List,
    Table,
    Edit,
    Trash2,
    Shield,
    Eye,
    Grid3X3,
    LayoutGrid,
    Layers,
    Minimize2,
    Globe,
    User,
    Settings,
    Calendar,
    Clock,
    CheckCircle,
} from 'lucide-vue-next';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useToast } from 'vue-toastification';

const sessionStore = useSessionStore();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Define emits
const emit = defineEmits<{
    'servers-updated': [servers: Server[]];
}>();

interface ServerNode {
    id: number;
    name: string;
    fqdn: string;
    maintenance_mode?: number;
}

interface ServerRealm {
    id: number;
    name: string;
}

interface ServerSpell {
    id: number;
    name: string;
    banner?: string;
}

interface ServerAllocation {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string;
}

interface Server {
    id: number;
    name: string;
    uuidShort: string;
    description: string;
    status: string | null;
    suspended?: number;
    memory: number;
    disk: number;
    cpu: number;
    swap?: number;
    io?: number;
    threads?: string | null;
    startup?: string;
    image?: string;
    database_limit?: number;
    backup_limit?: number;
    allocation_limit?: number;
    skip_scripts?: number;
    oom_disabled?: number;
    external_id?: string;
    owner_id: number;
    node_id: number;
    realms_id: number;
    spell_id: number;
    allocation_id: number;
    is_subuser?: boolean;
    subuser_permissions?: string[];
    subuser_id?: number | null;
    node?: ServerNode;
    realm?: ServerRealm;
    spell?: ServerSpell;
    allocation?: ServerAllocation;
    created_at: string;
    updated_at: string;
    installed_at?: string;
}

interface Folder {
    id: number;
    name: string;
    servers: Server[];
}

interface Pagination {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

const servers = ref<Server[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const pagination = ref<Pagination>({
    current_page: 1,
    per_page: 10,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
    from: 0,
    to: 0,
});

const viewMode = ref<'folders' | 'list' | 'table' | 'compact' | 'detailed' | 'status-grouped' | 'minimal'>('folders');
const folderDialogOpen = ref(false);
const editingFolder = ref<Folder | null>(null);
const folderForm = ref({ name: '' });

// Detect mobile device
const isMobile = computed(() => {
    return window.innerWidth < 768; // Tailwind's md breakpoint
});

// Load view mode from localStorage, but force list view on mobile
const savedViewMode = localStorage.getItem('featherpanel-server_view_mode');
if (isMobile.value) {
    viewMode.value = 'list';
} else if (
    savedViewMode &&
    ['folders', 'list', 'table', 'compact', 'detailed', 'status-grouped', 'minimal'].includes(savedViewMode)
) {
    viewMode.value = savedViewMode as typeof viewMode.value;
}

const serverFolders = ref<Folder[]>([]);
const unassignedServers = ref<Server[]>([]);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'default' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);

// Interval for periodic server validation
let validationInterval: number | undefined = undefined;

const filteredServers = computed(() => {
    if (!searchQuery.value.trim()) {
        return servers.value;
    }
    const query = searchQuery.value.toLowerCase();
    return servers.value.filter(
        (server) =>
            server.name.toLowerCase().includes(query) ||
            server.description?.toLowerCase().includes(query) ||
            server.node?.name.toLowerCase().includes(query) ||
            server.realm?.name.toLowerCase().includes(query) ||
            server.spell?.name.toLowerCase().includes(query),
    );
});

// Status grouped view computed property
const statusGroups = computed(() => {
    const groups: { [key: string]: Server[] } = {};

    servers.value.forEach((server) => {
        const status = displayStatus(server);
        if (!groups[status]) {
            groups[status] = [];
        }
        groups[status].push(server);
    });

    // Convert to array and sort by status priority
    const statusPriority = ['running', 'starting', 'stopped', 'installing', 'suspended', 'error', 'unknown'];
    return Object.entries(groups)
        .map(([status, servers]) => ({ status, servers }))
        .sort((a, b) => {
            const aIndex = statusPriority.indexOf(a.status);
            const bIndex = statusPriority.indexOf(b.status);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
});

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();

    // Add resize event listener to force list view on mobile
    window.addEventListener('resize', handleResize);

    // Force list view on mobile on initial mount
    if (isMobile.value) {
        viewMode.value = 'list';
    }

    // Load folders from local storage FIRST
    loadFoldersFromStorage();

    // If no folders exist, create a default one
    if (serverFolders.value.length === 0) {
        serverFolders.value.push({
            id: Date.now(),
            name: t('servers.defaultFolderName'),
            servers: [],
        });
        saveFoldersToStorage();
    }

    // Now fetch servers
    await fetchServers();

    // Organize servers into folders (but preserve existing assignments)
    await organizeServersIntoFolders();

    // Set up periodic server validation (every 5 minutes)
    validationInterval = setInterval(
        async () => {
            try {
                // Fetch a minimal list of servers just to validate existence
                const response = await axios.get('/api/user/servers', {
                    params: { page: 1, limit: 1000 }, // Get all servers for validation
                });

                if (response.data.success) {
                    const validServerIds = new Set(response.data.data.servers.map((server: Server) => server.id));

                    // Clean up any deleted servers from folders
                    let hasChanges = false;
                    serverFolders.value.forEach((folder) => {
                        const originalLength = folder.servers.length;
                        folder.servers = folder.servers.filter((server) => validServerIds.has(server.id));
                        if (folder.servers.length !== originalLength) {
                            hasChanges = true;
                        }
                    });

                    // Clean up any deleted servers from unassigned
                    const originalUnassignedLength = unassignedServers.value.length;
                    unassignedServers.value = unassignedServers.value.filter((server) => validServerIds.has(server.id));
                    if (unassignedServers.value.length !== originalUnassignedLength) {
                        hasChanges = true;
                    }

                    // Save changes if any servers were removed
                    if (hasChanges) {
                        saveFoldersToStorage();
                    }
                }
            } catch (error) {
                console.warn('Periodic server validation failed:', error);
            }
        },
        5 * 60 * 1000,
    ); // 5 minutes
});

// Clean up interval and event listener
onUnmounted(() => {
    clearInterval(validationInterval);
    window.removeEventListener('resize', handleResize);
});

// Watch for servers changes and emit updates
watch(
    servers,
    (newServers) => {
        emit('servers-updated', newServers);
    },
    { immediate: true },
);

// Watch for view mode changes and save to localStorage (but not on mobile)
watch(viewMode, (newMode) => {
    if (!isMobile.value) {
        localStorage.setItem('featherpanel-server_view_mode', newMode);
    }
});

// Watch for window resize and force list view on mobile
const handleResize = () => {
    if (isMobile.value) {
        viewMode.value = 'list';
    }
};

async function fetchServers() {
    loading.value = true;
    error.value = null;

    try {
        const response = await axios.get('/api/user/servers', {
            params: {
                page: currentPage.value,
                limit: pagination.value.per_page,
                search: searchQuery.value.trim(),
            },
        });

        if (response.data.success) {
            servers.value = response.data.data.servers;
            pagination.value = response.data.data.pagination;

            // After fetching servers, organize them into folders
            await organizeServersIntoFolders();
        } else {
            error.value = response.data.message || 'Failed to fetch servers';
        }
    } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        error.value = axiosError.response?.data?.message || 'An error occurred while fetching servers';
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    currentPage.value = 1;
    fetchServers();
}

async function changePage(page: number) {
    currentPage.value = page;
    await fetchServers();
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'running':
            return 'default';
        case 'stopped':
            return 'secondary';
        case 'installing':
            return 'outline';
        case 'suspended':
            return 'destructive';
        case 'error':
            return 'destructive';
        default:
            return 'outline';
    }
}

function displayStatus(server: Server): string {
    if (server.suspended) {
        return 'suspended';
    }
    if (!server.status) {
        return 'unknown';
    }
    return server.status.toLowerCase();
}

function formatMemory(memory: number): string {
    if (memory === 0) {
        return '∞';
    }
    if (memory >= 1024) {
        return `${(memory / 1024).toFixed(1)} GB`;
    }
    return `${memory} MB`;
}

function formatDisk(disk: number): string {
    if (disk === 0) {
        return '∞';
    }
    if (disk >= 1024) {
        return `${(disk / 1024).toFixed(1)} GB`;
    }
    return `${disk} MB`;
}

function formatCpu(cpu: number): string {
    if (cpu === 0) {
        return '∞';
    }
    return `${cpu}%`;
}

function formatSwap(swap: number): string {
    if (swap === 0) {
        return '∞';
    }
    if (swap >= 1024) {
        return `${(swap / 1024).toFixed(1)} GB`;
    }
    return `${swap} MB`;
}

function formatIO(io: number): string {
    if (io === 0) {
        return '∞';
    }
    return `${io} MB/s`;
}

function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString();
    } catch {
        return 'N/A';
    }
}

function isServerAccessible(server: Server): boolean {
    // Check if server is suspended
    if (server.suspended) {
        return false;
    }

    // Check if node is in maintenance mode
    if (server.node?.maintenance_mode) {
        return false;
    }

    return true;
}

function getAccessRestrictionReason(server: Server): string | null {
    if (server.suspended) {
        return t('servers.status.suspended');
    }

    if (server.node?.maintenance_mode) {
        return t('servers.nodeMaintenance');
    }

    return null;
}

function openServerDetails(server: Server) {
    if (!isServerAccessible(server)) {
        if (server.node?.maintenance_mode) {
            toast.error(t('servers.nodeMaintenanceLong'));
        } else {
            const reason = getAccessRestrictionReason(server);
            if (reason) {
                toast.error(t('servers.accessRestrictedDescription') + ` (${reason})`);
            } else {
                toast.error(t('servers.accessRestrictedDescription'));
            }
        }
        return;
    }
    router.push(`/server/${server.uuidShort}`);
}

function createFolder() {
    editingFolder.value = null;
    folderForm.value.name = '';
    folderDialogOpen.value = true;
}

function editFolder(folder: Folder) {
    editingFolder.value = folder;
    folderForm.value.name = folder.name;
    folderDialogOpen.value = true;
}

function saveFolder() {
    if (!folderForm.value.name.trim()) {
        return;
    }

    if (editingFolder.value) {
        // Edit existing folder
        const index = serverFolders.value.findIndex((f) => f.id === editingFolder.value!.id);
        if (index !== -1 && serverFolders.value[index]) {
            serverFolders.value[index].name = folderForm.value.name;
        }
    } else {
        // Create new folder
        const newFolder: Folder = {
            id: Date.now(), // Simple ID generation for local storage
            name: folderForm.value.name,
            servers: [],
        };
        serverFolders.value.push(newFolder);
    }

    // Save to local storage
    saveFoldersToStorage();
    folderDialogOpen.value = false;
}

function deleteFolder(folderId: number) {
    const folder = serverFolders.value.find((f) => f.id === folderId);
    if (!folder) return;

    confirmDialog.value = {
        title: t('servers.confirmDeleteFolderTitle'),
        description: t('servers.confirmDeleteFolderDescription', { folderName: folder.name }),
        confirmText: t('servers.confirm'),
        variant: 'destructive',
    };
    confirmAction.value = async () => {
        try {
            confirmLoading.value = true;

            // Move all servers from deleted folder to unassigned
            unassignedServers.value.push(...folder.servers);

            // Remove folder
            serverFolders.value = serverFolders.value.filter((f) => f.id !== folderId);

            // Save to local storage
            saveFoldersToStorage();

            toast.success(t('servers.folderDeleted'));
        } catch (error) {
            console.error('Error deleting folder:', error);
            toast.error(t('servers.folderDeleteFailed'));
        } finally {
            confirmLoading.value = false;
            showConfirmDialog.value = false;
        }
    };
    showConfirmDialog.value = true;
}

async function validateAndCleanupServers() {
    try {
        loading.value = true;

        // Fetch current server list to validate existence
        const response = await axios.get('/api/user/servers', {
            params: { page: 1, limit: 1000 }, // Get all servers for validation
        });

        if (response.data.success) {
            const validServerIds = new Set(response.data.data.servers.map((server: Server) => server.id));
            let removedCount = 0;

            // Clean up any deleted servers from folders
            serverFolders.value.forEach((folder) => {
                const originalLength = folder.servers.length;
                folder.servers = folder.servers.filter((server) => validServerIds.has(server.id));
                removedCount += originalLength - folder.servers.length;
            });

            // Clean up any deleted servers from unassigned
            const originalUnassignedLength = unassignedServers.value.length;
            unassignedServers.value = unassignedServers.value.filter((server) => validServerIds.has(server.id));
            removedCount += originalUnassignedLength - unassignedServers.value.length;

            // Save changes if any servers were removed
            if (removedCount > 0) {
                saveFoldersToStorage();
                // Show success message
                toast.warning(t('servers.validationCompleteRemoved', { count: removedCount }));
            } else {
                toast.info(t('servers.validationCompleteAllValid'));
            }
        }
    } catch (error) {
        console.error('Server validation failed:', error);
        toast.error(t('servers.validationFailed'));
    } finally {
        loading.value = false;
    }
}

// Local Storage Functions
function saveFoldersToStorage() {
    try {
        localStorage.setItem('featherpanel-server_folders', JSON.stringify(serverFolders.value));
        localStorage.setItem('featherpanel-unassigned_servers', JSON.stringify(unassignedServers.value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFoldersFromStorage() {
    try {
        const savedFolders = localStorage.getItem('featherpanel-server_folders');
        const savedUnassigned = localStorage.getItem('featherpanel-unassigned_servers');

        if (savedFolders) {
            serverFolders.value = JSON.parse(savedFolders);
        }

        if (savedUnassigned) {
            unassignedServers.value = JSON.parse(savedUnassigned);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Reset to default if there's an error
        serverFolders.value = [];
        unassignedServers.value = [];
    }
}

async function organizeServersIntoFolders() {
    try {
        // Get all servers that are currently assigned to folders
        const assignedServerIds = new Set<number>();
        serverFolders.value.forEach((folder) => {
            folder.servers.forEach((server) => {
                assignedServerIds.add(server.id);
            });
        });

        // Get all servers that are currently in unassigned
        const unassignedServerIds = new Set<number>();
        unassignedServers.value.forEach((server) => {
            unassignedServerIds.add(server.id);
        });

        // Create a set of valid server IDs from the API response
        const validServerIds = new Set(servers.value.map((server) => server.id));

        // Filter out deleted/non-existent servers from folders
        serverFolders.value.forEach((folder) => {
            folder.servers = folder.servers.filter((server) => {
                const isValid = validServerIds.has(server.id);
                return isValid;
            });
        });

        // Filter out deleted/non-existent servers from unassigned
        unassignedServers.value = unassignedServers.value.filter((server) => {
            const isValid = validServerIds.has(server.id);
            return isValid;
        });

        // For each server from the API, check if it's already assigned somewhere and update existing data
        servers.value.forEach((apiServer) => {
            // Update existing server data in folders
            serverFolders.value.forEach((folder) => {
                folder.servers.forEach((folderServer) => {
                    if (folderServer.id === apiServer.id) {
                        // Update the server data with fresh API data
                        Object.assign(folderServer, apiServer);
                    }
                });
            });

            // Update existing server data in unassigned
            unassignedServers.value.forEach((unassignedServer) => {
                if (unassignedServer.id === apiServer.id) {
                    // Update the server data with fresh API data
                    Object.assign(unassignedServer, apiServer);
                }
            });

            // If server is not assigned anywhere, add it to unassigned
            if (!assignedServerIds.has(apiServer.id) && !unassignedServerIds.has(apiServer.id)) {
                unassignedServers.value.push(apiServer);
            }
        });

        // Save to local storage
        saveFoldersToStorage();
    } catch (error) {
        console.error('Error organizing servers into folders:', error);
        // Continue with existing organization if there's an error
    }
}

function moveServerToFolder(server: Server, targetFolderId: number | null) {
    if (!server) return;

    // Find where the server currently is
    let currentFolderId: number | null = null;

    // Check if server is in any folder
    for (const folder of serverFolders.value) {
        if (folder.servers.some((s) => s.id === server.id)) {
            currentFolderId = folder.id;
            break;
        }
    }

    // If server is in unassigned, currentFolderId remains null

    // Don't move if it's the same location
    if (currentFolderId === targetFolderId) {
        return;
    }

    // Remove from current location
    if (currentFolderId !== null) {
        const currentFolder = serverFolders.value.find((f) => f.id === currentFolderId);
        if (currentFolder) {
            currentFolder.servers = currentFolder.servers.filter((s) => s.id !== server.id);
        }
    } else {
        // Remove from unassigned
        unassignedServers.value = unassignedServers.value.filter((s) => s.id !== server.id);
    }

    // Add to new location
    if (targetFolderId !== null) {
        const targetFolder = serverFolders.value.find((f) => f.id === targetFolderId);
        if (targetFolder) {
            targetFolder.servers.push(server);
        }
    } else {
        // Add to unassigned
        unassignedServers.value.push(server);
    }

    // Save to local storage
    saveFoldersToStorage();
}

function createFolderForServer(server: Server) {
    if (!server) return;

    const newFolderName = t('servers.folderFor', { serverName: server.name });
    const newFolder: Folder = {
        id: Date.now(),
        name: newFolderName,
        servers: [server],
    };

    // Remove server from current location
    let currentFolderId: number | null = null;

    // Check if server is in any folder
    for (const folder of serverFolders.value) {
        if (folder.servers.some((s) => s.id === server.id)) {
            currentFolderId = folder.id;
            break;
        }
    }

    if (currentFolderId !== null) {
        const currentFolder = serverFolders.value.find((f) => f.id === currentFolderId);
        if (currentFolder) {
            currentFolder.servers = currentFolder.servers.filter((s) => s.id !== server.id);
        }
    } else {
        // Remove from unassigned
        unassignedServers.value = unassignedServers.value.filter((s) => s.id !== server.id);
    }

    serverFolders.value.push(newFolder);
    saveFoldersToStorage();
}

// Helper functions for status grouped view
function getStatusColor(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-green-500';
        case 'starting':
            return 'bg-blue-500';
        case 'stopped':
            return 'bg-gray-500';
        case 'installing':
            return 'bg-yellow-500';
        case 'suspended':
            return 'bg-red-500';
        case 'error':
            return 'bg-red-600';
        default:
            return 'bg-gray-400';
    }
}

function getStatusBgColor(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-green-500';
        case 'starting':
            return 'bg-blue-500';
        case 'stopped':
            return 'bg-gray-500';
        case 'installing':
            return 'bg-yellow-500';
        case 'suspended':
            return 'bg-red-500';
        case 'error':
            return 'bg-red-600';
        default:
            return 'bg-gray-400';
    }
}
</script>
