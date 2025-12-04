<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Servers', isCurrent: true, href: '/admin/servers' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading servers...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <div class="text-red-500 mb-4">
                    <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load servers</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchServers">Try Again</Button>
            </div>

            <!-- Servers Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Servers"
                    description="Manage all servers in your system."
                    :columns="tableColumns"
                    :data="servers"
                    search-placeholder="Search by name, description, or status..."
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-servers-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button
                            variant="outline"
                            size="sm"
                            data-umami-event="Create server"
                            @click="$router.push('/admin/servers/create')"
                        >
                            <Plus class="h-4 w-4 mr-2" />
                            Create Server
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-name="{ item }">
                        <div class="max-w-[200px] truncate" :title="(item as ApiServer).name">
                            <span class="text-sm font-medium">{{ (item as ApiServer).name }}</span>
                        </div>
                    </template>

                    <template #cell-status="{ item }">
                        <Badge :variant="getStatusVariant(displayStatus(item as ApiServer))" class="capitalize">
                            {{ displayStatus(item as ApiServer) }}
                        </Badge>
                    </template>

                    <template #cell-owner="{ item }">
                        <div class="flex items-center gap-2">
                            <Avatar class="h-6 w-6">
                                <AvatarImage
                                    :src="(item as ApiServer).owner?.avatar || ''"
                                    :alt="(item as ApiServer).owner?.username || 'Unknown'"
                                />
                                <AvatarFallback class="text-xs">{{
                                    (item as ApiServer).owner?.username?.[0] || '?'
                                }}</AvatarFallback>
                            </Avatar>
                            <span class="text-sm">{{ (item as ApiServer).owner?.username || 'Unknown' }}</span>
                        </div>
                    </template>

                    <template #cell-node="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).node?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-realm="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).realm?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-spell="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).spell?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-resources="{ item }">
                        <div class="flex gap-2">
                            <div
                                class="flex flex-col items-center justify-center px-2 py-1 bg-muted/50 rounded border border-border/50 min-w-[60px]"
                            >
                                <div
                                    class="font-mono text-xs font-semibold"
                                    :class="
                                        (item as ApiServer).memory === 0
                                            ? 'text-green-600 dark:text-green-400 text-base'
                                            : 'text-primary'
                                    "
                                >
                                    {{ formatMemory((item as ApiServer).memory) }}
                                </div>
                                <div class="text-[10px] text-muted-foreground uppercase">RAM</div>
                            </div>
                            <div
                                class="flex flex-col items-center justify-center px-2 py-1 bg-muted/50 rounded border border-border/50 min-w-[60px]"
                            >
                                <div
                                    class="font-mono text-xs font-semibold"
                                    :class="
                                        (item as ApiServer).cpu === 0
                                            ? 'text-green-600 dark:text-green-400 text-base'
                                            : 'text-primary'
                                    "
                                >
                                    {{ formatCpu((item as ApiServer).cpu) }}
                                </div>
                                <div class="text-[10px] text-muted-foreground uppercase">CPU</div>
                            </div>
                            <div
                                class="flex flex-col items-center justify-center px-2 py-1 bg-muted/50 rounded border border-border/50 min-w-[60px]"
                            >
                                <div
                                    class="font-mono text-xs font-semibold"
                                    :class="
                                        (item as ApiServer).disk === 0
                                            ? 'text-green-600 dark:text-green-400 text-base'
                                            : 'text-primary'
                                    "
                                >
                                    {{ formatDisk((item as ApiServer).disk) }}
                                </div>
                                <div class="text-[10px] text-muted-foreground uppercase">Disk</div>
                            </div>
                        </div>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View server details"
                                data-umami-event="View server"
                                :data-umami-event-server="(item as ApiServer).name"
                                @click="onView(item as ApiServer)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit server"
                                data-umami-event="Edit server"
                                :data-umami-event-server="(item as ApiServer).name"
                                @click="onEdit(item as ApiServer)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="border-primary/50 text-primary hover:bg-primary/10 hover:scale-110 hover:shadow-md transition-all duration-200"
                                :class="{
                                    'animate-pulse': scanningServers.has((item as ApiServer).uuid),
                                }"
                                title="Scan server for issues"
                                data-umami-event="Scan server"
                                :data-umami-event-server="(item as ApiServer).name"
                                :disabled="scanningServers.has((item as ApiServer).uuid)"
                                @click="quickScanServer(item as ApiServer)"
                            >
                                <ShieldCheck
                                    :size="16"
                                    :class="{
                                        'animate-spin': scanningServers.has((item as ApiServer).uuid),
                                    }"
                                />
                            </Button>
                            <template v-if="confirmDeleteRow === String((item as ApiServer).id)">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete server"
                                    :data-umami-event-server="(item as ApiServer).name"
                                    @click="confirmDelete(item as ApiServer, false)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Hard delete server (permanent)"
                                    data-umami-event="Hard delete server"
                                    :data-umami-event-server="(item as ApiServer).name"
                                    @click="onHardDelete(item as ApiServer)"
                                >
                                    Hard Delete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :disabled="deleting"
                                    title="Cancel deletion"
                                    @click="onCancelDelete"
                                >
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="Delete server"
                                    data-umami-event="Delete server"
                                    :data-umami-event-server="(item as ApiServer).name"
                                    @click="onDelete(item as ApiServer)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                            <template v-if="(item as ApiServer).status === 'transferring'">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:scale-110 hover:shadow-md transition-all duration-200 animate-pulse"
                                    title="Cancel server transfer"
                                    data-umami-event="Cancel server transfer"
                                    :data-umami-event-server="(item as ApiServer).name"
                                    :disabled="cancellingTransfer === (item as ApiServer).id"
                                    @click="onCancelTransfer(item as ApiServer)"
                                >
                                    <X v-if="cancellingTransfer !== (item as ApiServer).id" :size="16" />
                                    <Loader2 v-else :size="16" class="animate-spin" />
                                </Button>
                            </template>
                            <template v-else>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    title="Transfer server to another node"
                                    data-umami-event="Open transfer server dialog"
                                    :data-umami-event-server="(item as ApiServer).name"
                                    @click="onOpenTransfer(item as ApiServer)"
                                >
                                    <ArrowLeftRight :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Servers help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Server class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Managing Servers</div>
                                    <p>
                                        View, create, edit, and delete servers. Use search and pagination to quickly
                                        navigate large fleets.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Layers class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Relationships</div>
                                    <p>
                                        Each server belongs to an Owner (user), runs on a Node (machine), and is grouped
                                        by Realm & Spell (template/runtime). These links are visible in the details
                                        drawer.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Gauge class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Resources & Limits</div>
                                    <p>
                                        Resource usage (RAM/CPU/Disk) and limits (allocations, databases, backups) are
                                        summarized per server. Use these to right-size capacity.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <HelpCircle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-semibold text-foreground mb-1">Tips</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Keep descriptions meaningful to identify purpose at a glance.</li>
                                        <li>Review suspended/unknown statuses regularly to clean up stale hosts.</li>
                                        <li>Align Realm/Spell choices with the intended workload/runtime.</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Help Cards -->
                <WidgetRenderer v-if="widgetsAfterHelpCards.length > 0" :widgets="widgetsAfterHelpCards" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Hard Delete Warning Dialog -->
        <AlertDialog
            :open="showHardDeleteWarning"
            @update:open="
                (val: boolean) => {
                    if (!val) cancelHardDelete();
                }
            "
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2 text-red-600 dark:text-red-500">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                        Woah! Hard Delete Warning
                    </AlertDialogTitle>
                    <AlertDialogDescription class="space-y-3 pt-4">
                        <p class="text-base font-semibold text-foreground">
                            Hard deleting a server should only be used if:
                        </p>
                        <ul class="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            <li>You have lost connection to Wings (the node daemon)</li>
                            <li>The node this server is on is permanently dead/offline</li>
                            <li>You need to remove the server from the database without contacting Wings</li>
                        </ul>
                        <div
                            class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3 mt-4"
                        >
                            <p class="text-sm text-red-800 dark:text-red-400 font-medium">
                                ⚠️ Hard delete will ONLY remove the server from the database. It will NOT delete the
                                server files, containers, or any data from Wings!
                            </p>
                        </div>
                        <p class="text-sm text-muted-foreground pt-2">
                            If the node is still operational, use the regular "Confirm Delete" option instead to
                            properly clean up all server resources.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="cancelHardDelete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                        @click="confirmHardDelete"
                    >
                        Yes, Hard Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- View Drawer -->
        <Drawer
            class="w-full"
            :open="viewing"
            @update:open="
                (val: boolean) => {
                    if (!val) closeView();
                }
            "
        >
            <DrawerContent v-if="selectedServer">
                <DrawerHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <DrawerTitle>Server Details</DrawerTitle>
                            <DrawerDescription>Viewing details for server: {{ selectedServer.name }}</DrawerDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            @click="$router.push(`/server/${selectedServer.uuidShort}`)"
                        >
                            <Server class="h-4 w-4 mr-2" />
                            View Console
                        </Button>
                    </div>
                </DrawerHeader>
                <div class="flex items-center gap-4 mb-6 px-6 pt-6">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Server class="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div class="font-bold text-xl">{{ selectedServer.name }}</div>
                            <div class="text-muted-foreground text-sm">{{ selectedServer.description }}</div>
                        </div>
                    </div>
                </div>
                <section class="px-6 pb-6 min-h-[500px]">
                    <Tabs default-value="details">
                        <TabsList class="mb-4">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="resources">Resources</TabsTrigger>
                            <TabsTrigger value="relationships">Relationships</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Basic Information</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Status:</span>
                                            <Badge
                                                :variant="getStatusVariant(displayStatus(selectedServer))"
                                                class="capitalize"
                                            >
                                                {{ displayStatus(selectedServer) }}
                                            </Badge>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">UUID:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.uuid }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Short UUID:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.uuidShort }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Created:</span>
                                            <span>{{ formatDate(selectedServer.created_at) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Updated:</span>
                                            <span>{{ formatDate(selectedServer.updated_at) }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Configuration</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Image:</span>
                                            <span>{{ selectedServer.image }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Startup:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.startup }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Skip Scripts:</span>
                                            <span>{{ selectedServer.skip_scripts ? 'Yes' : 'No' }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">OOM Disabled:</span>
                                            <span>{{ selectedServer.oom_disabled ? 'Yes' : 'No' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="resources">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-3">Resource Limits</h4>
                                    <div class="space-y-3 text-sm">
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Memory:</span>
                                            <span
                                                class="font-mono font-semibold"
                                                :class="
                                                    selectedServer.memory === 0
                                                        ? 'text-green-600 dark:text-green-400 text-base'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ formatMemory(selectedServer.memory) }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Swap:</span>
                                            <span
                                                class="font-mono font-semibold"
                                                :class="
                                                    selectedServer.swap === 0
                                                        ? 'text-green-600 dark:text-green-400 text-base'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ formatMemory(selectedServer.swap) }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Disk:</span>
                                            <span
                                                class="font-mono font-semibold"
                                                :class="
                                                    selectedServer.disk === 0
                                                        ? 'text-green-600 dark:text-green-400 text-base'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ formatDisk(selectedServer.disk) }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">CPU:</span>
                                            <span
                                                class="font-mono font-semibold"
                                                :class="
                                                    selectedServer.cpu === 0
                                                        ? 'text-green-600 dark:text-green-400 text-base'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ formatCpu(selectedServer.cpu) }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">IO:</span>
                                            <span class="font-mono font-semibold text-foreground">{{
                                                selectedServer.io
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-3">Limits</h4>
                                    <div class="space-y-3 text-sm">
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Allocation Limit:</span>
                                            <span
                                                class="font-semibold"
                                                :class="
                                                    selectedServer.allocation_limit === 0 ||
                                                    !selectedServer.allocation_limit
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ selectedServer.allocation_limit || '∞' }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Database Limit:</span>
                                            <span
                                                class="font-semibold"
                                                :class="
                                                    selectedServer.database_limit === 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ selectedServer.database_limit || '∞' }}
                                            </span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-muted-foreground">Backup Limit:</span>
                                            <span
                                                class="font-semibold"
                                                :class="
                                                    selectedServer.backup_limit === 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-foreground'
                                                "
                                            >
                                                {{ selectedServer.backup_limit || '∞' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="relationships">
                            <div class="space-y-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Owner</h4>
                                    <div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <Avatar>
                                            <AvatarImage
                                                :src="selectedServer.owner?.avatar || ''"
                                                :alt="selectedServer.owner?.username || 'Unknown'"
                                            />
                                            <AvatarFallback>{{
                                                selectedServer.owner?.username?.[0] || '?'
                                            }}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div class="font-medium">
                                                {{ selectedServer.owner?.username || 'Unknown' }}
                                            </div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.owner?.email || 'No email' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Node</h4>
                                    <div class="p-3 bg-muted rounded-lg">
                                        <div class="font-medium">{{ selectedServer.node?.name || 'Unknown' }}</div>
                                        <div class="text-sm text-muted-foreground">
                                            {{ selectedServer.node?.fqdn || 'No FQDN' }}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Realm & Spell</h4>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="p-3 bg-muted rounded-lg">
                                            <div class="font-medium">{{ selectedServer.realm?.name || 'Unknown' }}</div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.realm?.description || 'No description' }}
                                            </div>
                                        </div>
                                        <div class="p-3 bg-muted rounded-lg">
                                            <div class="font-medium">{{ selectedServer.spell?.name || 'Unknown' }}</div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.spell?.description || 'No description' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeView">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Transfer Server Dialog -->
        <AlertDialog
            :open="transferDialogOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) cancelTransferDialog();
                }
            "
        >
            <AlertDialogContent class="sm:max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2">
                        <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
                            <path
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 7h12m0 0-4-4m4 4-4 4m0 6H4m0 0 4 4m-4-4 4-4"
                            />
                        </svg>
                        Transfer Server
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Transfer this server to a different node and choose the new primary allocation (IP:Port) it
                        should use on the destination node.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div class="space-y-4 py-2">
                    <div v-if="transferServer" class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Server:</span>
                            <span class="font-medium">{{ transferServer.name }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Current Node:</span>
                            <span>{{ transferServer.node?.name || 'Unknown' }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Current Primary Allocation:</span>
                            <span class="font-mono text-xs">
                                <span v-if="transferServer.allocation">
                                    {{ transferServer.allocation.ip }}:{{ transferServer.allocation.port }}
                                </span>
                                <span v-else>Unknown</span>
                            </span>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="block mb-1 text-sm font-medium">Destination Node</label>
                            <Button
                                type="button"
                                variant="outline"
                                class="w-full justify-between"
                                :disabled="initiatingTransfer"
                                @click="openTransferNodeModal"
                            >
                                {{ getTransferDestinationNodeName() || 'Select destination node...' }}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 ml-2 opacity-60"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </Button>
                            <p class="text-xs text-muted-foreground mt-1">
                                Choose a different node to transfer this server to.
                            </p>
                        </div>

                        <div>
                            <label class="block mb-1 text-sm font-medium">Destination Primary Allocation (Port)</label>
                            <Button
                                type="button"
                                variant="outline"
                                class="w-full justify-between"
                                :disabled="!transferDestinationNodeId || initiatingTransfer"
                                @click="openTransferAllocationModal"
                            >
                                {{ getTransferDestinationAllocationName() || 'Select destination allocation...' }}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 ml-2 opacity-60"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </Button>
                            <p class="text-xs text-muted-foreground mt-1">
                                Only free allocations on the selected destination node are shown here.
                            </p>
                        </div>
                    </div>

                    <!-- Critical Warning Banner -->
                    <div
                        class="p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded-lg"
                    >
                        <div class="flex items-start gap-3">
                            <svg
                                class="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div>
                                <p class="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-wide">
                                    ⚠️ USE AT YOUR OWN RISK ⚠️
                                </p>
                                <p class="text-xs text-red-700 dark:text-red-300 mt-1">
                                    Server transfers are
                                    <span class="font-bold">NOT RECOMMENDED</span> in Pterodactyl, Pelican, or
                                    FeatherPanel. This feature exists but is known to be unreliable.
                                    <span class="font-bold">Things CAN and WILL go wrong.</span>
                                    Data loss, corruption, and failed transfers are possible. Only use this if you have
                                    no other option and have verified backups stored externally.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Warnings -->
                    <div
                        class="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg space-y-2"
                    >
                        <p class="text-sm font-semibold text-orange-900 dark:text-orange-100">
                            BETA / Experimental Feature - Proceed with Extreme Caution
                        </p>
                        <ul class="text-xs text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
                            <li>
                                Transfers can be cancelled from the server list while in progress, but
                                <span class="font-semibold">partial data may remain on the destination node</span>.
                            </li>
                            <li>The server will be stopped and unavailable during the transfer.</li>
                            <li>
                                The selected allocation will become the
                                <span class="font-semibold">only</span> primary allocation on the destination node.
                            </li>
                            <li>
                                <span class="font-semibold">
                                    All extra allocations on the source node for this server will be released
                                </span>
                                after a successful transfer.
                            </li>
                            <li>
                                <span class="font-semibold">Backups will be deleted</span>. Backup records are removed
                                during transfer; backup files on the source node become orphaned.
                            </li>
                            <li>
                                <span class="font-semibold">Install logs and server logs are not transferred</span>.
                                Historical logs will stay on the source node; only the server data itself is moved.
                            </li>
                            <li>
                                <span class="font-semibold">Always create and verify backups EXTERNALLY</span> before
                                transferring. Do not rely on panel backups.
                            </li>
                            <li>
                                <span class="font-semibold">Network issues, timeouts, or node problems</span> can cause
                                partial transfers or data corruption.
                            </li>
                        </ul>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel :disabled="initiatingTransfer" @click="cancelTransferDialog">
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        class="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
                        :disabled="
                            initiatingTransfer ||
                            !transferDestinationNodeId ||
                            !transferDestinationAllocationId ||
                            !transferServer
                        "
                        :data-umami-event-server="transferServer?.name"
                        data-umami-event="Confirm server transfer"
                        @click="initiateServerTransfer"
                    >
                        {{ initiatingTransfer ? 'Starting Transfer...' : 'I Understand - Start Transfer' }}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Transfer Node Selection Modal -->
        <SelectionModal
            :is-open="transferNodeModal.state.value.isOpen"
            title="Select Destination Node"
            description="Choose a node to transfer this server to"
            item-type="node"
            search-placeholder="Search nodes by name or FQDN..."
            :items="transferNodeModal.state.value.items"
            :loading="transferNodeModal.state.value.loading"
            :current-page="transferNodeModal.state.value.currentPage"
            :total-pages="transferNodeModal.state.value.totalPages"
            :total-items="transferNodeModal.state.value.totalItems"
            :page-size="20"
            :selected-item="transferNodeModal.state.value.selectedItem"
            :search-query="transferNodeModal.state.value.searchQuery"
            @update:open="transferNodeModal.closeModal"
            @search="transferNodeModal.handleSearch"
            @search-query-update="transferNodeModal.handleSearchQueryUpdate"
            @page-change="transferNodeModal.handlePageChange"
            @select="transferNodeModal.selectItem"
            @confirm="selectTransferDestinationNode(transferNodeModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.name }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">{{ item.fqdn || 'No FQDN' }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Badge
                            v-if="transferServer && String(item.id) === String(transferServer.node_id)"
                            variant="secondary"
                            class="text-xs"
                        >
                            Current Node
                        </Badge>
                        <div v-if="isSelected" class="shrink-0 ml-2 sm:ml-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 sm:h-5 sm:w-5 text-primary"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </template>
        </SelectionModal>

        <!-- Transfer Allocation Selection Modal -->
        <SelectionModal
            :is-open="transferAllocationModal.state.value.isOpen"
            title="Select Destination Allocation"
            description="Choose a free allocation (IP:Port) on the destination node"
            item-type="allocation"
            search-placeholder="Search allocations by IP or port..."
            :items="transferAllocationModal.state.value.items"
            :loading="transferAllocationModal.state.value.loading"
            :current-page="transferAllocationModal.state.value.currentPage"
            :total-pages="transferAllocationModal.state.value.totalPages"
            :total-items="transferAllocationModal.state.value.totalItems"
            :page-size="20"
            :selected-item="transferAllocationModal.state.value.selectedItem"
            :search-query="transferAllocationModal.state.value.searchQuery"
            @update:open="transferAllocationModal.closeModal"
            @search="transferAllocationModal.handleSearch"
            @search-query-update="transferAllocationModal.handleSearchQueryUpdate"
            @page-change="transferAllocationModal.handlePageChange"
            @select="transferAllocationModal.selectItem"
            @confirm="selectTransferDestinationAllocation(transferAllocationModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.ip }}:{{ item.port }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">Node ID: {{ item.node_id }}</p>
                    </div>
                    <div v-if="isSelected" class="shrink-0 ml-2 sm:ml-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 sm:h-5 sm:w-5 text-primary"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
            </template>
        </SelectionModal>
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

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    Eye,
    Pencil,
    Trash2,
    Plus,
    Server,
    Layers,
    Gauge,
    HelpCircle,
    ShieldCheck,
    ArrowLeftRight,
    X,
    Loader2,
} from 'lucide-vue-next';
import axios from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from 'vue-toastification';
import { SelectionModal } from '@/components/ui/selection-modal';
import { useSelectionModal } from '@/composables/useSelectionModal';
import type { ApiNode, ApiAllocation } from '@/composables/types/admin/server';

const router = useRouter();
const toast = useToast();

// Type for axios error responses
type AxiosError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

type ApiServer = {
    id: number;
    uuid: string;
    uuidShort: string;
    node_id: number;
    name: string;
    description: string;
    status?: string;
    suspended?: number;
    skip_scripts: number;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads?: string;
    oom_disabled: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    allocation_limit?: number;
    database_limit: number;
    backup_limit: number;
    created_at: string;
    updated_at: string;
    installed_at?: string;
    external_id?: string;
    owner?: {
        id: number;
        username: string;
        email: string;
        avatar?: string;
    };
    node?: {
        id: number;
        name: string;
        fqdn?: string;
    };
    realm?: {
        id: number;
        name: string;
        description?: string;
    };
    spell?: {
        id: number;
        name: string;
        description?: string;
    };
    allocation?: {
        id: number;
        ip: string;
        port: number;
    };
};

const servers = ref<ApiServer[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const loading = ref(true);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<string | null>(null);
const selectedServer = ref<ApiServer | null>(null);
const viewing = ref(false);
const showHardDeleteWarning = ref(false);
const serverToHardDelete = ref<ApiServer | null>(null);
const scanningServers = ref<Set<string>>(new Set());

// Transfer state
const transferDialogOpen = ref(false);
const transferServer = ref<ApiServer | null>(null);
const transferDestinationNodeId = ref<string>('');
const transferDestinationNode = ref<ApiNode | null>(null);
const transferDestinationAllocationId = ref<string>('');
const transferDestinationAllocation = ref<ApiAllocation | null>(null);
const initiatingTransfer = ref(false);
const cancellingTransfer = ref<number | null>(null);

const transferNodeAdditionalParams = computed(() => ({
    exclude_node_id: transferServer.value?.node_id || null,
}));

const transferNodeModal = useSelectionModal('/api/admin/nodes', 20, 'search', 'page', transferNodeAdditionalParams);

const transferAllocationAdditionalParams = computed(() => ({
    node_id: transferDestinationNodeId.value || null,
}));

const transferAllocationModal = useSelectionModal(
    '/api/admin/allocations?not_used=true',
    20,
    'search',
    'page',
    transferAllocationAdditionalParams,
);

function onOpenTransfer(server: ApiServer) {
    transferServer.value = server;
    transferDestinationNodeId.value = '';
    transferDestinationNode.value = null;
    transferDestinationAllocationId.value = '';
    transferDestinationAllocation.value = null;
    transferDialogOpen.value = true;
}

function cancelTransferDialog() {
    if (initiatingTransfer.value) return;
    transferDialogOpen.value = false;
    transferServer.value = null;
    transferDestinationNodeId.value = '';
    transferDestinationNode.value = null;
    transferDestinationAllocationId.value = '';
    transferDestinationAllocation.value = null;
}

function openTransferNodeModal() {
    transferNodeModal.openModal();
}

function openTransferAllocationModal() {
    if (!transferDestinationNodeId.value) return;
    transferAllocationModal.openModal();
}

function selectTransferDestinationNode(node: ApiNode) {
    if (!node || !node.id) {
        return;
    }

    if (transferServer.value && String(node.id) === String(transferServer.value.node_id)) {
        toast.warning('Cannot transfer to the current node. Please choose a different node.');
        return;
    }

    transferDestinationNodeId.value = String(node.id);
    transferDestinationNode.value = node;
    transferNodeModal.closeModal();

    // Reset allocation when node changes
    transferDestinationAllocationId.value = '';
    transferDestinationAllocation.value = null;
}

function getTransferDestinationNodeName() {
    if (transferNodeModal.state.value.selectedItem) {
        const node = transferNodeModal.state.value.selectedItem;
        return `${node.name} (${node.fqdn})`;
    }
    if (transferDestinationNode.value) {
        return `${transferDestinationNode.value.name} (${transferDestinationNode.value.fqdn})`;
    }
    return '';
}

function selectTransferDestinationAllocation(allocation: ApiAllocation) {
    if (!allocation || !allocation.id) {
        return;
    }

    transferDestinationAllocationId.value = String(allocation.id);
    transferDestinationAllocation.value = allocation;
    transferAllocationModal.closeModal();
}

function getTransferDestinationAllocationName() {
    if (transferAllocationModal.state.value.selectedItem) {
        const allocation = transferAllocationModal.state.value.selectedItem;
        return `${allocation.ip}:${allocation.port}`;
    }
    if (transferDestinationAllocation.value) {
        return `${transferDestinationAllocation.value.ip}:${transferDestinationAllocation.value.port}`;
    }
    return '';
}

async function initiateServerTransfer() {
    if (!transferServer.value || !transferDestinationNodeId.value || !transferDestinationAllocationId.value) {
        toast.warning('Please select both a destination node and allocation');
        return;
    }

    initiatingTransfer.value = true;
    try {
        const { data } = await axios.post(`/api/admin/servers/${transferServer.value.id}/transfer`, {
            destination_node_id: Number(transferDestinationNodeId.value),
            destination_allocation_id: Number(transferDestinationAllocationId.value),
        });

        if (data && data.success) {
            toast.success('Server transfer initiated successfully!');
            transferDialogOpen.value = false;
            await fetchServers();
        } else {
            toast.error(data?.message || 'Failed to initiate server transfer');
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to initiate server transfer';
        toast.error(errorMessage);
        console.error('Failed to initiate transfer:', error);
    } finally {
        initiatingTransfer.value = false;
    }
}

async function onCancelTransfer(server: ApiServer) {
    if (cancellingTransfer.value !== null) return;

    cancellingTransfer.value = server.id;
    try {
        const { data } = await axios.delete(`/api/admin/servers/${server.id}/transfer`);

        if (data && data.success) {
            toast.success('Server transfer cancelled successfully!');
            await fetchServers();
        } else {
            toast.error(data?.message || 'Failed to cancel server transfer');
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to cancel server transfer';
        toast.error(errorMessage);
        console.error('Failed to cancel transfer:', error);
    } finally {
        cancellingTransfer.value = null;
    }
}

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-servers');
const widgetsTopOfPage = computed(() => getWidgets('admin-servers', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-servers', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-servers', 'after-table'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-servers', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-servers', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true, headerClass: 'max-w-[200px]' },
    { key: 'status', label: 'Status', searchable: true },
    { key: 'owner', label: 'Owner', searchable: true },
    { key: 'node', label: 'Node', searchable: true },
    { key: 'realm', label: 'Realm', searchable: true },
    { key: 'spell', label: 'Spell', searchable: true },
    { key: 'resources', label: 'Resources', headerClass: 'w-[220px]' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchServers() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/servers', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        servers.value = data.data.servers || [];

        // Map the API response pagination to our expected format
        const apiPagination = data.data.pagination;
        pagination.value = {
            page: apiPagination.current_page,
            pageSize: apiPagination.per_page,
            total: apiPagination.total_records,
            hasNext: apiPagination.has_next,
            hasPrev: apiPagination.has_prev,
            from: apiPagination.from,
            to: apiPagination.to,
        };
    } catch (error: unknown) {
        message.value = {
            type: 'error',
            text: (error as AxiosError)?.response?.data?.message || 'Failed to fetch servers',
        };
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchServers();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchServers);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchServers();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchServers();
}

async function onView(server: ApiServer) {
    try {
        const { data } = await axios.get(`/api/admin/servers/${server.id}`);
        if (data && data.success && data.data) {
            selectedServer.value = data.data;
            viewing.value = true;
        } else {
            toast.error('Failed to fetch server details');
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to fetch server details';
        toast.error(errorMessage);
        console.error('Error fetching server details:', error);
    }
}

function onEdit(server: ApiServer) {
    router.push(`/admin/servers/${server.id}/edit`);
}

async function confirmDelete(server: ApiServer, hardDelete: boolean = false) {
    deleting.value = true;
    let success = false;
    try {
        const endpoint = hardDelete ? `/api/admin/servers/${server.id}/hard` : `/api/admin/servers/${server.id}`;
        const response = await axios.delete(endpoint);
        if (response.data && response.data.success) {
            message.value = {
                type: 'success',
                text: hardDelete ? 'Server hard deleted successfully' : 'Server deleted successfully',
            };
            await fetchServers();
            success = true;
            toast.success(hardDelete ? 'Server hard deleted successfully' : 'Server deleted successfully');
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete server' };
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to delete server';
        message.value = {
            type: 'error',
            text: errorMessage,
        };
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}
function onDelete(server: ApiServer) {
    confirmDeleteRow.value = String(server.id);
}

function onHardDelete(server: ApiServer) {
    serverToHardDelete.value = server;
    showHardDeleteWarning.value = true;
}

async function confirmHardDelete() {
    if (serverToHardDelete.value) {
        showHardDeleteWarning.value = false;
        await confirmDelete(serverToHardDelete.value, true);
        serverToHardDelete.value = null;
    }
}

function cancelHardDelete() {
    showHardDeleteWarning.value = false;
    serverToHardDelete.value = null;
    confirmDeleteRow.value = null;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedServer.value = null;
}

// Utility functions
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
    switch (status) {
        case 'running':
            return 'default';
        case 'installed':
        case 'installing':
        case 'transferring':
            return 'secondary';
        case 'stopped':
        case 'suspended':
            return 'destructive';
        case 'unknown':
        default:
            return 'secondary';
    }
}

function displayStatus(server: ApiServer): string {
    return server.suspended ? 'suspended' : server.status || 'Unknown';
}

function formatMemory(mb: number): string {
    if (mb === 0) {
        return '∞';
    }
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
}

function formatDisk(mb: number): string {
    if (mb === 0) {
        return '∞';
    }
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
}

function formatCpu(cpu: number): string {
    if (cpu === 0) {
        return '∞';
    }
    return `${cpu}%`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
}

async function quickScanServer(server: ApiServer): Promise<void> {
    scanningServers.value.add(server.uuid);

    // Show initial toast with fake progress
    const progressToast = toast.info(`Starting scan for ${server.name}...`, {
        timeout: false,
        closeOnClick: false,
        pauseOnFocusLoss: false,
        pauseOnHover: false,
    });

    // Fake progress updates
    const progressMessages = [
        'Scanning directory structure...',
        'Analyzing files...',
        'Checking for threats...',
        'Finalizing scan...',
    ];
    let messageIndex = 0;
    const progressInterval = setInterval(() => {
        if (messageIndex < progressMessages.length) {
            toast.update(progressToast, {
                content: `${progressMessages[messageIndex]} (${server.name})`,
            });
            messageIndex++;
        }
    }, 2000);

    try {
        const { data } = await axios.post('/api/admin/featherzerotrust/scan', {
            server_uuid: server.uuid,
            directory: '/',
            max_depth: 10,
        });
        clearInterval(progressInterval);
        toast.dismiss(progressToast);
        if (data.success) {
            toast.success(`Scan completed for ${server.name}. Found ${data.data.detections_count || 0} detections.`);
        }
    } catch (error: unknown) {
        clearInterval(progressInterval);
        toast.dismiss(progressToast);
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to scan server';
        toast.error(errorMessage);
    } finally {
        scanningServers.value.delete(server.uuid);
    }
}
</script>
