<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading nodes...</span>
                </div>
            </div>

            <!-- Nodes Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Nodes"
                    :description="`Managing nodes for location: ${currentLocation?.name}`"
                    :columns="tableColumns"
                    :data="nodes"
                    :search-placeholder="'Search by name, fqdn, or description...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-nodes-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex gap-2 items-center">
                            <div
                                v-if="isCheckingHealth"
                                class="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                            >
                                <div class="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Checking health...
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                :loading="isCheckingHealth"
                                title="Refresh node health status"
                                data-umami-event="Refresh node health"
                                @click="checkAllNodesHealth"
                            >
                                <RefreshCw :size="16" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                data-umami-event="Create node"
                                @click="openCreateDrawer"
                            >
                                <Plus class="h-4 w-4 mr-2" />
                                Create Node
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-status="{ item }">
                        <div class="flex items-center gap-2">
                            <div
                                :class="[
                                    'h-2 w-2 rounded-full',
                                    getNodeHealthStatus((item as Node).id) === 'healthy'
                                        ? 'bg-green-500'
                                        : getNodeHealthStatus((item as Node).id) === 'unhealthy'
                                          ? 'bg-red-500'
                                          : 'bg-gray-400',
                                ]"
                            ></div>
                            <span class="text-xs">
                                {{
                                    getNodeHealthStatus((item as Node).id) === 'healthy'
                                        ? 'Online'
                                        : getNodeHealthStatus((item as Node).id) === 'unhealthy'
                                          ? 'Offline'
                                          : 'Unknown'
                                }}
                            </span>
                        </div>
                    </template>

                    <template #cell-location="{ item }">
                        {{ getLocationName((item as Node).location_id) }}
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View node details"
                                data-umami-event="View node"
                                :data-umami-event-node="(item as Node).name"
                                @click="onView(item as Node)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit node"
                                data-umami-event="Edit node"
                                :data-umami-event-node="(item as Node).name"
                                @click="onEdit(item as Node)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Manage node databases"
                                data-umami-event="Manage node databases"
                                :data-umami-event-node="(item as Node).name"
                                @click="onDatabases(item as Node)"
                            >
                                <Database :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Manage node allocations"
                                data-umami-event="Manage node allocations"
                                :data-umami-event-node="(item as Node).name"
                                @click="onAllocations(item as Node)"
                            >
                                <Network :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Node).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete node"
                                    :data-umami-event-node="(item as Node).name"
                                    @click="confirmDelete(item as Node)"
                                >
                                    Confirm Delete
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
                                    title="Delete node"
                                    data-umami-event="Delete node"
                                    :data-umami-event-node="(item as Node).name"
                                    @click="onDelete(item as Node)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Nodes info cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Server class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What are Nodes?</div>
                                    <p>
                                        Nodes are machines that run <b>Wings</b>, hosting and managing your containers
                                        for deployments.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Network class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What can Nodes do?</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Deploy/manage containers via Wings</li>
                                        <li>Report health for monitoring</li>
                                        <li>Enforce memory/disk limits</li>
                                        <li>Organize storage and networking</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <MapPin class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">Nodes and Locations</div>
                                    <p>
                                        Each node belongs to a <b>location</b> so you can separate infrastructure by
                                        region or purpose and deploy predictably.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Info Cards -->
                <WidgetRenderer v-if="widgetsAfterInfoCards.length > 0" :widgets="widgetsAfterInfoCards" />

                <!-- Wings information card under the table -->
                <Card class="mt-6">
                    <CardContent>
                        <div class="p-4 text-sm text-muted-foreground">
                            <div class="font-semibold text-foreground mb-1">About Wings (the daemon)</div>
                            <p>
                                Wings is the daemon FeatherPanel uses to communicate with your Docker host. It knows how
                                to schedule, deploy, and manage containers securely and reliably, so your servers start,
                                stop, and scale where and how you expect.
                            </p>
                            <p class="mt-2">
                                By pairing locations and nodes with Wings, you get a clean separation of regions and
                                infrastructure, plus predictable deployments with health checks, resource limits, and
                                streamlined container management.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Wings Card -->
                <WidgetRenderer v-if="widgetsAfterWingsCard.length > 0" :widgets="widgetsAfterWingsCard" />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>

        <!-- Drawers -->
        <Drawer v-model:open="showDrawer" class="w-full">
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{
                        drawerMode === 'create' ? 'Create Node' : drawerMode === 'edit' ? 'Edit Node' : 'View Node'
                    }}</DrawerTitle>
                    <DrawerDescription>
                        {{
                            drawerMode === 'create'
                                ? 'Create a new node for this location.'
                                : drawerMode === 'edit'
                                  ? 'Edit the selected node.'
                                  : 'View node details.'
                        }}
                    </DrawerDescription>
                    <!-- Navigation buttons only for create mode -->
                    <div v-if="drawerMode === 'create'" class="flex items-center justify-between mt-4">
                        <div class="flex-1 font-semibold">
                            Step {{ currentStep + 1 }} of {{ steps.length }}:
                            {{ steps[currentStep]?.label || 'Unknown' }}
                        </div>
                        <div class="flex gap-2">
                            <Button v-if="currentStep > 0" type="button" size="sm" variant="outline" @click="prevStep">
                                <ArrowLeft class="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <Button v-if="currentStep < steps.length - 1" type="button" size="sm" @click="nextStep">
                                Next
                                <ArrowRight class="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                    <!-- Progress indicator only for create mode -->
                    <div v-if="drawerMode === 'create'" class="flex gap-2 mt-2">
                        <template v-for="(step, idx) in steps" :key="step.key">
                            <div
                                :class="['w-3 h-3 rounded-full', idx === currentStep ? 'bg-primary' : 'bg-muted']"
                            ></div>
                        </template>
                    </div>
                </DrawerHeader>
                <form
                    v-if="drawerMode !== 'view'"
                    class="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]"
                    @submit.prevent="submitForm"
                >
                    <!-- Wizard steps for create mode -->
                    <div v-if="drawerMode === 'create'">
                        <div v-show="currentStep === 0">
                            <!-- Basic Details -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Name</label>
                                    <Input v-model="form.name" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Character limits: <code>a-zA-Z0-9_-</code> and [space] (min 1, max 100
                                        characters).
                                    </div>
                                    <div v-if="formErrors.name" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.name }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Description</label>
                                    <Textarea v-model="form.description" :disabled="formLoading" />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Node Visibility</label>
                                    <Select v-model="form.public" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select visibility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Public</SelectItem>
                                            <SelectItem value="false">Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        By setting a node to <b>private</b> you will be denying the ability to
                                        auto-deploy to this node.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">FQDN</label>
                                    <Input v-model="form.fqdn" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Please enter domain name (e.g. <code>node.example.com</code>) to be used for
                                        connecting to the daemon. An IP address may be used <b>only</b> if you are not
                                        using SSL for this node.
                                    </div>
                                    <div v-if="formErrors.fqdn" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.fqdn }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Communicate Over SSL</label>
                                    <Select v-model="form.scheme" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select SSL option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="https">Use SSL Connection</SelectItem>
                                            <SelectItem value="http">Use HTTP Connection</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="form.scheme === 'https'" class="text-xs text-red-500">
                                        Your Panel is currently configured to use a secure connection. In order for
                                        browsers to connect to your node it must use a SSL connection.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Behind Proxy</label>
                                    <Select v-model="form.behind_proxy" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select proxy option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Not Behind Proxy</SelectItem>
                                            <SelectItem value="true">Behind Proxy</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        If you are running the daemon behind a proxy such as Cloudflare, select this to
                                        have the daemon skip looking for certificates on boot.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 1">
                            <!-- Configuration -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Server File Directory</label>
                                    <Input v-model="form.daemonBase" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Enter the directory where server files should be stored. If you use OVH you
                                        should check your partition scheme.
                                        <b>You may need to use <code>/home/daemon-data</code> to have enough space.</b>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Memory</label>
                                        <Input
                                            v-model.number="form.memory"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Memory Over-Allocation</label>
                                        <Input
                                            v-model.number="form.memory_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Disk Space</label>
                                        <Input
                                            v-model.number="form.disk"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Disk Over-Allocation</label>
                                        <Input
                                            v-model.number="form.disk_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 2">
                            <!-- Network -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Port</label>
                                    <Input
                                        v-model.number="form.daemonListen"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Daemon SFTP Port</label>
                                    <Input
                                        v-model.number="form.daemonSFTP"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div class="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label class="block font-medium mb-1">Public IPv4</label>
                                        <Input
                                            v-model="form.public_ip_v4"
                                            :disabled="formLoading"
                                            placeholder="203.0.113.42"
                                        />
                                        <div class="text-xs text-muted-foreground">
                                            This address is used for client connectivity. Provide it if you plan to use
                                            the subdomain manager.
                                        </div>
                                        <div v-if="formErrors.public_ip_v4" class="text-red-500 text-xs mt-1">
                                            {{ formErrors.public_ip_v4 }}
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block font-medium mb-1">Public IPv6</label>
                                        <Input
                                            v-model="form.public_ip_v6"
                                            :disabled="formLoading"
                                            placeholder="2001:db8::10"
                                        />
                                        <div class="text-xs text-muted-foreground">
                                            Optional IPv6 address that clients can use to reach this node.
                                        </div>
                                        <div v-if="formErrors.public_ip_v6" class="text-red-500 text-xs mt-1">
                                            {{ formErrors.public_ip_v6 }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 3">
                            <!-- Advanced -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Maintenance Mode</label>
                                    <Select v-model="form.maintenance_mode" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select maintenance mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Disabled</SelectItem>
                                            <SelectItem value="true">Enabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        When enabled, this node will not accept new server deployments.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Upload Size Limit</label>
                                    <Input
                                        v-model.number="form.upload_size"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                    <span class="text-xs">MiB</span>
                                    <div class="text-xs text-muted-foreground">
                                        Maximum file upload size for this node.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs for edit mode -->
                    <div v-if="drawerMode === 'edit'" class="space-y-4">
                        <Tabs v-model="activeTab" class="w-full">
                            <TabsList class="grid w-full grid-cols-5">
                                <TabsTrigger value="basic">Basic</TabsTrigger>
                                <TabsTrigger value="config">Config</TabsTrigger>
                                <TabsTrigger value="network">Network</TabsTrigger>
                                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                                <TabsTrigger value="wings">Wings Config</TabsTrigger>
                            </TabsList>
                            <TabsContent value="basic" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Name</label>
                                    <Input v-model="form.name" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Character limits: <code>a-zA-Z0-9_-</code> and [space] (min 1, max 100
                                        characters).
                                    </div>
                                    <div v-if="formErrors.name" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.name }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Description</label>
                                    <Textarea v-model="form.description" :disabled="formLoading" />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Node Visibility</label>
                                    <Select v-model="form.public" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select visibility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Public</SelectItem>
                                            <SelectItem value="false">Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        By setting a node to <b>private</b> you will be denying the ability to
                                        auto-deploy to this node.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">FQDN</label>
                                    <Input v-model="form.fqdn" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Please enter domain name (e.g. <code>node.example.com</code>) to be used for
                                        connecting to the daemon. An IP address may be used <b>only</b> if you are not
                                        using SSL for this node.
                                    </div>
                                    <div v-if="formErrors.fqdn" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.fqdn }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Communicate Over SSL</label>
                                    <Select v-model="form.scheme" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select SSL option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="https">Use SSL Connection</SelectItem>
                                            <SelectItem value="http">Use HTTP Connection</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="form.scheme === 'https'" class="text-xs text-red-500">
                                        Your Panel is currently configured to use a secure connection. In order for
                                        browsers to connect to your node it must use a SSL connection.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Behind Proxy</label>
                                    <Select v-model="form.behind_proxy" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select proxy option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Not Behind Proxy</SelectItem>
                                            <SelectItem value="true">Behind Proxy</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        If you are running the daemon behind a proxy such as Cloudflare, select this to
                                        have the daemon skip looking for certificates on boot.
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="config" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Server File Directory</label>
                                    <Input v-model="form.daemonBase" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Enter the directory where server files should be stored. If you use OVH you
                                        should check your partition scheme.
                                        <b>You may need to use <code>/home/daemon-data</code> to have enough space.</b>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Memory</label>
                                        <Input
                                            v-model.number="form.memory"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Memory Over-Allocation</label>
                                        <Input
                                            v-model.number="form.memory_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Disk Space</label>
                                        <Input
                                            v-model.number="form.disk"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Disk Over-Allocation</label>
                                        <Input
                                            v-model.number="form.disk_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="network" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Port</label>
                                    <Input
                                        v-model.number="form.daemonListen"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Daemon SFTP Port</label>
                                    <Input
                                        v-model.number="form.daemonSFTP"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div class="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label class="block font-medium mb-1">Public IPv4</label>
                                        <Input
                                            v-model="form.public_ip_v4"
                                            :disabled="formLoading"
                                            placeholder="203.0.113.42"
                                        />
                                        <div class="text-xs text-muted-foreground">
                                            Provide this if the subdomain manager should route traffic through this
                                            node.
                                        </div>
                                        <div v-if="formErrors.public_ip_v4" class="text-red-500 text-xs mt-1">
                                            {{ formErrors.public_ip_v4 }}
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block font-medium mb-1">Public IPv6</label>
                                        <Input
                                            v-model="form.public_ip_v6"
                                            :disabled="formLoading"
                                            placeholder="2001:db8::10"
                                        />
                                        <div class="text-xs text-muted-foreground">
                                            Optional IPv6 address reachable by clients.
                                        </div>
                                        <div v-if="formErrors.public_ip_v6" class="text-red-500 text-xs mt-1">
                                            {{ formErrors.public_ip_v6 }}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="advanced" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Maintenance Mode</label>
                                    <Select v-model="form.maintenance_mode" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select maintenance mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Disabled</SelectItem>
                                            <SelectItem value="true">Enabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        When enabled, this node will not accept new server deployments.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Upload Size Limit</label>
                                    <Input
                                        v-model.number="form.upload_size"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                    <span class="text-xs">MiB</span>
                                    <div class="text-xs text-muted-foreground">
                                        Maximum file upload size for this node.
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="wings" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Wings Configuration</label>
                                    <textarea
                                        :value="wingsConfigYaml"
                                        readonly
                                        class="w-full h-64 p-3 text-xs font-mono bg-muted border rounded-md resize-none"
                                        :disabled="formLoading"
                                    ></textarea>
                                    <div class="text-xs text-muted-foreground mt-2">
                                        This configuration file should be saved as
                                        <code>/etc/featherpanel/config.yml</code> on your Wings daemon.
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        :disabled="formLoading"
                                        size="sm"
                                        @click="copyWingsConfig"
                                    >
                                        Copy Config
                                    </Button>
                                    <template v-if="confirmResetKeyRow === editingNodeId">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            :loading="formLoading"
                                            @click="requestResetKey"
                                        >
                                            Confirm Reset Key
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            :disabled="formLoading"
                                            @click="onCancelResetKey"
                                        >
                                            Cancel
                                        </Button>
                                    </template>
                                    <template v-else>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            :disabled="formLoading"
                                            @click="confirmResetKey"
                                        >
                                            Request Master Daemon Reset Key
                                        </Button>
                                    </template>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DrawerFooter class="mt-4">
                        <Button
                            v-if="currentStep === steps.length - 1 && drawerMode === 'create'"
                            type="submit"
                            class="w-full"
                            :loading="formLoading"
                        >
                            Create
                        </Button>
                        <Button v-if="drawerMode === 'edit'" type="submit" class="w-full" :loading="formLoading">
                            Save Changes
                        </Button>
                        <Button type="button" class="w-full" variant="outline" @click="closeDrawer"> Cancel </Button>
                    </DrawerFooter>
                </form>
                <div v-else class="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <Tabs v-model="viewActiveTab" class="w-full">
                        <TabsList class="grid w-full grid-cols-8">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="system">System Info</TabsTrigger>
                            <TabsTrigger value="utilization">Utilization</TabsTrigger>
                            <TabsTrigger value="docker">Docker</TabsTrigger>
                            <TabsTrigger value="network">Network</TabsTrigger>
                            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                            <TabsTrigger value="self-update">Self-Update</TabsTrigger>
                            <TabsTrigger value="terminal">Terminal</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" class="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle class="text-lg">Node Overview</CardTitle>
                                </CardHeader>
                                <CardContent class="space-y-3">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Name</div>
                                            <div class="text-sm">{{ drawerNode?.name }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">FQDN</div>
                                            <div class="text-sm">{{ drawerNode?.fqdn }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Location</div>
                                            <div class="text-sm">{{ getLocationName(drawerNode?.location_id) }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Memory</div>
                                            <div class="text-sm">{{ drawerNode?.memory }} MiB</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Disk</div>
                                            <div class="text-sm">{{ drawerNode?.disk }} MiB</div>
                                        </div>
                                        <div v-if="drawerNode?.public_ip_v4">
                                            <div class="text-sm font-medium text-muted-foreground">Public IPv4</div>
                                            <div class="text-sm font-mono">{{ drawerNode?.public_ip_v4 }}</div>
                                        </div>
                                        <div v-if="drawerNode?.public_ip_v6">
                                            <div class="text-sm font-medium text-muted-foreground">Public IPv6</div>
                                            <div class="text-sm font-mono">{{ drawerNode?.public_ip_v6 }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Created</div>
                                            <div class="text-sm">{{ drawerNode?.created_at }}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="system" class="space-y-4 mt-4">
                            <div v-if="systemInfoLoading" class="flex items-center justify-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>

                            <div v-else-if="systemInfoData" class="space-y-4">
                                <!-- Wings Information -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Wings Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Version</div>
                                            <div class="text-sm font-mono">{{ systemInfoData.wings.version }}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Docker Information -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Docker Information</CardTitle>
                                    </CardHeader>
                                    <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Version</div>
                                            <div class="text-sm">{{ systemInfoData.wings.docker.version }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">CGroups Driver</div>
                                            <div class="text-sm">{{ systemInfoData.wings.docker.cgroups.driver }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">CGroups Version</div>
                                            <div class="text-sm">{{ systemInfoData.wings.docker.cgroups.version }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Storage Driver</div>
                                            <div class="text-sm">{{ systemInfoData.wings.docker.storage.driver }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">
                                                Storage Filesystem
                                            </div>
                                            <div class="text-sm">
                                                {{ systemInfoData.wings.docker.storage.filesystem }}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">RunC Version</div>
                                            <div class="text-sm">{{ systemInfoData.wings.docker.runc.version }}</div>
                                        </div>
                                        <div class="md:col-span-2">
                                            <div class="text-sm font-medium text-muted-foreground">Containers</div>
                                            <div class="text-sm">
                                                Total: {{ systemInfoData.wings.docker.containers.total }}, Running:
                                                {{ systemInfoData.wings.docker.containers.running }}, Paused:
                                                {{ systemInfoData.wings.docker.containers.paused }}, Stopped:
                                                {{ systemInfoData.wings.docker.containers.stopped }}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- System Information -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">System Information</CardTitle>
                                    </CardHeader>
                                    <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Architecture</div>
                                            <div class="text-sm">{{ systemInfoData.wings.system.architecture }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">CPU Threads</div>
                                            <div class="text-sm">{{ systemInfoData.wings.system.cpu_threads }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Memory</div>
                                            <div class="text-sm">
                                                {{ formatBytes(systemInfoData.wings.system.memory_bytes) }}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Kernel Version</div>
                                            <div class="text-sm">{{ systemInfoData.wings.system.kernel_version }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">OS</div>
                                            <div class="text-sm">{{ systemInfoData.wings.system.os }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">OS Type</div>
                                            <div class="text-sm">{{ systemInfoData.wings.system.os_type }}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Diagnostics -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Diagnostics</CardTitle>
                                        <CardDescription>
                                            Generate a diagnostics bundle for this node&apos;s Wings daemon.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <div class="grid gap-4 md:grid-cols-2">
                                            <div class="space-y-3">
                                                <div>
                                                    <Label class="text-sm font-medium">Format</Label>
                                                    <Select v-model="diagnosticsOptions.format">
                                                        <SelectTrigger class="w-full">
                                                            <SelectValue placeholder="Select format" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">Plain text</SelectItem>
                                                            <SelectItem value="url">Upload &amp; URL</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div v-if="diagnosticsOptions.includeLogs" class="space-y-2">
                                                    <Label class="text-sm font-medium" for="diagnostics-log-lines"
                                                        >Log Lines</Label
                                                    >
                                                    <Input
                                                        id="diagnostics-log-lines"
                                                        v-model.number="diagnosticsOptions.logLines"
                                                        type="number"
                                                        min="1"
                                                        max="500"
                                                    />
                                                    <p class="text-xs text-muted-foreground">
                                                        Between 1 and 500 lines of daemon logs.
                                                    </p>
                                                </div>
                                                <div v-if="showUploadApiField" class="space-y-2">
                                                    <Label class="text-sm font-medium" for="diagnostics-upload-url"
                                                        >Upload API URL</Label
                                                    >
                                                    <Input
                                                        id="diagnostics-upload-url"
                                                        v-model="diagnosticsOptions.uploadApiUrl"
                                                        type="url"
                                                        placeholder="https://debug.mythical.systems/upload"
                                                    />
                                                    <p class="text-xs text-muted-foreground">
                                                        Optional override when sending diagnostics to a custom endpoint.
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="space-y-4">
                                                <div class="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Label
                                                            class="text-sm font-medium"
                                                            for="diagnostics-include-endpoints"
                                                            >Include Endpoints</Label
                                                        >
                                                        <p class="text-xs text-muted-foreground">
                                                            Append HTTP endpoint metadata to the report.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id="diagnostics-include-endpoints"
                                                        v-model:checked="diagnosticsOptions.includeEndpoints"
                                                    />
                                                </div>
                                                <div class="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Label
                                                            class="text-sm font-medium"
                                                            for="diagnostics-include-logs"
                                                            >Include Logs</Label
                                                        >
                                                        <p class="text-xs text-muted-foreground">
                                                            Attach recent Wings daemon logs.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id="diagnostics-include-logs"
                                                        v-model:checked="diagnosticsOptions.includeLogs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Alert v-if="diagnosticsError" variant="destructive">
                                            <div class="text-sm">{{ diagnosticsError }}</div>
                                        </Alert>
                                        <div
                                            v-if="diagnosticsResult"
                                            class="space-y-3 rounded-lg border bg-muted/50 p-4"
                                        >
                                            <div
                                                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div class="text-sm text-muted-foreground">
                                                    {{
                                                        diagnosticsResult.format === 'url'
                                                            ? 'Diagnostics uploaded successfully.'
                                                            : 'Diagnostics generated successfully.'
                                                    }}
                                                </div>
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        :disabled="!diagnosticsCopyValue"
                                                        @click="copyDiagnostics(diagnosticsCopyValue)"
                                                    >
                                                        Copy
                                                    </Button>
                                                    <Button
                                                        v-if="
                                                            diagnosticsResult.format === 'url' && diagnosticsResult.url
                                                        "
                                                        size="sm"
                                                        variant="secondary"
                                                        as="a"
                                                        :href="diagnosticsResult.url"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Open URL
                                                    </Button>
                                                </div>
                                            </div>
                                            <textarea
                                                v-if="diagnosticsResult.format === 'text'"
                                                readonly
                                                rows="10"
                                                class="w-full rounded border bg-background p-3 text-xs font-mono"
                                                :value="diagnosticsResult.content ?? ''"
                                            ></textarea>
                                            <div v-else class="text-sm">
                                                <span class="font-medium text-muted-foreground">URL:</span>
                                                <a
                                                    v-if="diagnosticsResult.url"
                                                    :href="diagnosticsResult.url"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    class="ml-2 break-all text-primary underline"
                                                >
                                                    {{ diagnosticsResult.url }}
                                                </a>
                                                <span v-else class="ml-2 text-muted-foreground">No URL returned</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter
                                        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div class="text-xs text-muted-foreground">
                                            Diagnostics requests may take a few seconds while Wings prepares the report.
                                        </div>
                                        <div class="flex flex-col-reverse gap-2 sm:flex-row">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                :disabled="diagnosticsLoading"
                                                @click="resetDiagnosticsState"
                                            >
                                                Reset Options
                                            </Button>
                                            <Button size="sm" :loading="diagnosticsLoading" @click="fetchDiagnostics">
                                                Generate Diagnostics
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>

                            <div v-else-if="systemInfoError" class="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg flex items-center gap-2">
                                            <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                            Node Unhealthy
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <Alert variant="destructive">
                                            <div class="space-y-3">
                                                <div class="font-medium">Failed to connect to Wings daemon</div>
                                                <div class="text-sm">{{ systemInfoError }}</div>
                                                <div class="text-xs text-muted-foreground">
                                                    This node is currently marked as unhealthy due to connection issues.
                                                    Please check that the Wings daemon is running and accessible.
                                                </div>
                                            </div>
                                        </Alert>
                                        <div class="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                :loading="systemInfoLoading"
                                                @click="retryConnection"
                                            >
                                                Retry Connection
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Diagnostics -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Diagnostics</CardTitle>
                                        <CardDescription>
                                            Generate a diagnostics bundle for this node&apos;s Wings daemon.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent class="space-y-4">
                                        <div class="grid gap-4 md:grid-cols-2">
                                            <div class="space-y-3">
                                                <div>
                                                    <Label class="text-sm font-medium">Format</Label>
                                                    <Select v-model="diagnosticsOptions.format">
                                                        <SelectTrigger class="w-full">
                                                            <SelectValue placeholder="Select format" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">Plain text</SelectItem>
                                                            <SelectItem value="url">Upload &amp; URL</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div v-if="diagnosticsOptions.includeLogs" class="space-y-2">
                                                    <Label class="text-sm font-medium" for="diagnostics-log-lines-error"
                                                        >Log Lines</Label
                                                    >
                                                    <Input
                                                        id="diagnostics-log-lines-error"
                                                        v-model.number="diagnosticsOptions.logLines"
                                                        type="number"
                                                        min="1"
                                                        max="500"
                                                    />
                                                    <p class="text-xs text-muted-foreground">
                                                        Between 1 and 500 lines of daemon logs.
                                                    </p>
                                                </div>
                                                <div v-if="showUploadApiField" class="space-y-2">
                                                    <Label
                                                        class="text-sm font-medium"
                                                        for="diagnostics-upload-url-error"
                                                        >Upload API URL</Label
                                                    >
                                                    <Input
                                                        id="diagnostics-upload-url-error"
                                                        v-model="diagnosticsOptions.uploadApiUrl"
                                                        type="url"
                                                        placeholder="https://debug.mythical.systems/upload"
                                                    />
                                                    <p class="text-xs text-muted-foreground">
                                                        Optional override when sending diagnostics to a custom endpoint.
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="space-y-4">
                                                <div class="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Label
                                                            class="text-sm font-medium"
                                                            for="diagnostics-include-endpoints-error"
                                                            >Include Endpoints</Label
                                                        >
                                                        <p class="text-xs text-muted-foreground">
                                                            Append HTTP endpoint metadata to the report.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id="diagnostics-include-endpoints-error"
                                                        v-model:checked="diagnosticsOptions.includeEndpoints"
                                                    />
                                                </div>
                                                <div class="flex items-start justify-between gap-4">
                                                    <div>
                                                        <Label
                                                            class="text-sm font-medium"
                                                            for="diagnostics-include-logs-error"
                                                            >Include Logs</Label
                                                        >
                                                        <p class="text-xs text-muted-foreground">
                                                            Attach recent Wings daemon logs.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id="diagnostics-include-logs-error"
                                                        v-model:checked="diagnosticsOptions.includeLogs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Alert v-if="diagnosticsError" variant="destructive">
                                            <div class="text-sm">{{ diagnosticsError }}</div>
                                        </Alert>
                                        <div
                                            v-if="diagnosticsResult"
                                            class="space-y-3 rounded-lg border bg-muted/50 p-4"
                                        >
                                            <div
                                                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div class="text-sm text-muted-foreground">
                                                    {{
                                                        diagnosticsResult.format === 'url'
                                                            ? 'Diagnostics uploaded successfully.'
                                                            : 'Diagnostics generated successfully.'
                                                    }}
                                                </div>
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        :disabled="!diagnosticsCopyValue"
                                                        @click="copyDiagnostics(diagnosticsCopyValue)"
                                                    >
                                                        Copy
                                                    </Button>
                                                    <Button
                                                        v-if="
                                                            diagnosticsResult.format === 'url' && diagnosticsResult.url
                                                        "
                                                        size="sm"
                                                        variant="secondary"
                                                        as="a"
                                                        :href="diagnosticsResult.url"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Open URL
                                                    </Button>
                                                </div>
                                            </div>
                                            <textarea
                                                v-if="diagnosticsResult.format === 'text'"
                                                readonly
                                                rows="10"
                                                class="w-full rounded border bg-background p-3 text-xs font-mono"
                                                :value="diagnosticsResult.content ?? ''"
                                            ></textarea>
                                            <div v-else class="text-sm">
                                                <span class="font-medium text-muted-foreground">URL:</span>
                                                <a
                                                    v-if="diagnosticsResult.url"
                                                    :href="diagnosticsResult.url"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    class="ml-2 break-all text-primary underline"
                                                >
                                                    {{ diagnosticsResult.url }}
                                                </a>
                                                <span v-else class="ml-2 text-muted-foreground">No URL returned</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter
                                        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div class="text-xs text-muted-foreground">
                                            Diagnostics requests may take a few seconds while Wings prepares the report.
                                        </div>
                                        <div class="flex flex-col-reverse gap-2 sm:flex-row">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                :disabled="diagnosticsLoading"
                                                @click="resetDiagnosticsState"
                                            >
                                                Reset Options
                                            </Button>
                                            <Button size="sm" :loading="diagnosticsLoading" @click="fetchDiagnostics">
                                                Generate Diagnostics
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="utilization" class="space-y-4 mt-4">
                            <div v-if="utilizationLoading" class="flex items-center justify-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>

                            <div v-else-if="utilizationData" class="space-y-4">
                                <!-- CPU Usage -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">CPU Usage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-muted-foreground">Current Usage</span>
                                                <span class="text-sm font-medium"
                                                    >{{ utilizationData.utilization.cpu_percent.toFixed(2) }}%</span
                                                >
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-2">
                                                <div
                                                    class="bg-primary h-2 rounded-full transition-all duration-300"
                                                    :style="{
                                                        width:
                                                            Math.min(100, utilizationData.utilization.cpu_percent) +
                                                            '%',
                                                    }"
                                                ></div>
                                            </div>
                                            <div class="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <div class="text-muted-foreground">1m Load</div>
                                                    <div class="font-medium">
                                                        {{ utilizationData.utilization.load_average1 }}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="text-muted-foreground">5m Load</div>
                                                    <div class="font-medium">
                                                        {{ utilizationData.utilization.load_average5 }}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div class="text-muted-foreground">15m Load</div>
                                                    <div class="font-medium">
                                                        {{ utilizationData.utilization.load_average15 }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Memory Usage -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Memory Usage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-muted-foreground">Used / Total</span>
                                                <span class="text-sm font-medium">
                                                    {{ formatBytes(utilizationData.utilization.memory_used) }} /
                                                    {{ formatBytes(utilizationData.utilization.memory_total) }}
                                                </span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-2">
                                                <div
                                                    class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                    :style="{
                                                        width:
                                                            (utilizationData.utilization.memory_used /
                                                                utilizationData.utilization.memory_total) *
                                                                100 +
                                                            '%',
                                                    }"
                                                ></div>
                                            </div>
                                            <div class="text-sm text-center text-muted-foreground">
                                                {{
                                                    (
                                                        (utilizationData.utilization.memory_used /
                                                            utilizationData.utilization.memory_total) *
                                                        100
                                                    ).toFixed(1)
                                                }}% used
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Disk Usage -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Disk Usage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-muted-foreground">Used / Total</span>
                                                <span class="text-sm font-medium">
                                                    {{ formatBytes(utilizationData.utilization.disk_used) }} /
                                                    {{ formatBytes(utilizationData.utilization.disk_total) }}
                                                </span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-2">
                                                <div
                                                    class="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    :style="{
                                                        width:
                                                            (utilizationData.utilization.disk_used /
                                                                utilizationData.utilization.disk_total) *
                                                                100 +
                                                            '%',
                                                    }"
                                                ></div>
                                            </div>
                                            <div class="text-sm text-center text-muted-foreground">
                                                {{
                                                    (
                                                        (utilizationData.utilization.disk_used /
                                                            utilizationData.utilization.disk_total) *
                                                        100
                                                    ).toFixed(1)
                                                }}% used
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Swap Usage -->
                                <Card v-if="utilizationData.utilization.swap_total > 0">
                                    <CardHeader>
                                        <CardTitle class="text-lg">Swap Usage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm text-muted-foreground">Used / Total</span>
                                                <span class="text-sm font-medium">
                                                    {{ formatBytes(utilizationData.utilization.swap_used) }} /
                                                    {{ formatBytes(utilizationData.utilization.swap_total) }}
                                                </span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-2">
                                                <div
                                                    class="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                                    :style="{
                                                        width:
                                                            (utilizationData.utilization.swap_used /
                                                                utilizationData.utilization.swap_total) *
                                                                100 +
                                                            '%',
                                                    }"
                                                ></div>
                                            </div>
                                            <div class="text-sm text-center text-muted-foreground">
                                                {{
                                                    (
                                                        (utilizationData.utilization.swap_used /
                                                            utilizationData.utilization.swap_total) *
                                                        100
                                                    ).toFixed(1)
                                                }}% used
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div v-else-if="utilizationError" class="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg flex items-center gap-2">
                                            <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                            Utilization Data Unavailable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Alert variant="destructive">
                                            <div class="space-y-3">
                                                <div class="font-medium">Failed to fetch utilization data</div>
                                                <div class="text-sm">{{ utilizationError }}</div>
                                            </div>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="docker" class="space-y-4 mt-4">
                            <div v-if="dockerLoading" class="flex items-center justify-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>

                            <div v-else-if="dockerData" class="space-y-4">
                                <!-- Docker Images -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Docker Images</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div class="text-center">
                                                <div class="text-2xl font-bold">
                                                    {{ dockerData.dockerDiskUsage.images_total }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Total Images</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-2xl font-bold text-green-600">
                                                    {{ dockerData.dockerDiskUsage.images_active }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Active Images</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-2xl font-bold text-orange-600">
                                                    {{
                                                        dockerData.dockerDiskUsage.images_total -
                                                        dockerData.dockerDiskUsage.images_active
                                                    }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Inactive Images</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-2xl font-bold">
                                                    {{ formatBytes(dockerData.dockerDiskUsage.images_size) }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Images Size</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Docker Disk Usage -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Docker Disk Usage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-4">
                                            <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                                                <span class="text-sm font-medium">Containers</span>
                                                <span class="text-sm">{{
                                                    formatBytes(dockerData.dockerDiskUsage.containers_size)
                                                }}</span>
                                            </div>
                                            <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                                                <span class="text-sm font-medium">Images</span>
                                                <span class="text-sm">{{
                                                    formatBytes(dockerData.dockerDiskUsage.images_size)
                                                }}</span>
                                            </div>
                                            <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                                                <span class="text-sm font-medium">Build Cache</span>
                                                <span class="text-sm">{{
                                                    formatBytes(dockerData.dockerDiskUsage.build_cache_size)
                                                }}</span>
                                            </div>
                                            <div
                                                class="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20"
                                            >
                                                <span class="text-sm font-bold">Total Docker Usage</span>
                                                <span class="text-sm font-bold">{{
                                                    formatBytes(
                                                        dockerData.dockerDiskUsage.containers_size +
                                                            dockerData.dockerDiskUsage.images_size +
                                                            dockerData.dockerDiskUsage.build_cache_size,
                                                    )
                                                }}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Docker Management -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Docker Management</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-4">
                                            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div class="flex items-start gap-3">
                                                    <div class="flex-1">
                                                        <div class="font-medium text-yellow-800">
                                                            Cleanup Recommendation
                                                        </div>
                                                        <div class="text-sm text-yellow-700 mt-1">
                                                            You have
                                                            {{
                                                                dockerData.dockerDiskUsage.images_total -
                                                                dockerData.dockerDiskUsage.images_active
                                                            }}
                                                            inactive Docker images. Pruning them could free up space.
                                                        </div>
                                                        <div class="text-xs text-yellow-600 mt-2">
                                                            Build cache:
                                                            {{
                                                                formatBytes(dockerData.dockerDiskUsage.build_cache_size)
                                                            }}
                                                            could also be reclaimed.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                class="w-full"
                                                :loading="dockerPruning"
                                                :disabled="
                                                    dockerData.dockerDiskUsage.images_total -
                                                        dockerData.dockerDiskUsage.images_active ===
                                                    0
                                                "
                                                @click="pruneDockerImages"
                                            >
                                                <Trash2 :size="16" class="mr-2" />
                                                Prune Unused Images
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div v-else-if="dockerError" class="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg flex items-center gap-2">
                                            <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                            Docker Data Unavailable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Alert variant="destructive">
                                            <div class="space-y-3">
                                                <div class="font-medium">Failed to fetch Docker information</div>
                                                <div class="text-sm">{{ dockerError }}</div>
                                            </div>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="network" class="space-y-4 mt-4">
                            <div v-if="networkLoading" class="flex items-center justify-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>

                            <div v-else-if="networkData" class="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Configured Public Addresses</CardTitle>
                                        <CardDescription>
                                            These addresses are stored in FeatherPanel. Set the IPv4 when using the
                                            subdomain manager.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent class="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Public IPv4</div>
                                            <div class="text-sm font-mono">
                                                {{ drawerNode?.public_ip_v4 ?? 'Not set' }}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-sm font-medium text-muted-foreground">Public IPv6</div>
                                            <div class="text-sm font-mono">
                                                {{ drawerNode?.public_ip_v6 ?? 'Not set' }}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <!-- IP Addresses -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Network Interfaces</CardTitle>
                                        <CardDescription> Available IP addresses on this node </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="space-y-3">
                                            <div
                                                v-for="(ip, index) in networkData.ips.ip_addresses"
                                                :key="index"
                                                class="flex items-center justify-between p-3 bg-muted rounded-lg"
                                            >
                                                <div class="flex items-center gap-3">
                                                    <div class="h-2 w-2 bg-green-500 rounded-full"></div>
                                                    <span class="font-mono text-sm">{{ ip }}</span>
                                                    <span
                                                        v-if="isIPv6(ip)"
                                                        class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                                    >
                                                        IPv6
                                                    </span>
                                                    <span
                                                        v-else-if="isPrivateIP(ip)"
                                                        class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                                    >
                                                        Private
                                                    </span>
                                                    <span
                                                        v-else
                                                        class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                                                    >
                                                        Public
                                                    </span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    class="h-8 w-8 p-0"
                                                    @click="copyToClipboard(ip)"
                                                >
                                                    <svg
                                                        class="h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                        ></path>
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Network Statistics -->
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg">Network Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div class="text-2xl font-bold">
                                                    {{ networkData.ips.ip_addresses.length }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Total IPs</div>
                                            </div>
                                            <div>
                                                <div class="text-2xl font-bold text-green-600">
                                                    {{ getPublicIPs(networkData.ips.ip_addresses).length }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">Public IPs</div>
                                            </div>
                                            <div>
                                                <div class="text-2xl font-bold text-blue-600">
                                                    {{ getIPv6IPs(networkData.ips.ip_addresses).length }}
                                                </div>
                                                <div class="text-sm text-muted-foreground">IPv6 IPs</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div v-else-if="networkError" class="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle class="text-lg flex items-center gap-2">
                                            <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                            Network Data Unavailable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Alert variant="destructive">
                                            <div class="space-y-3">
                                                <div class="font-medium">Failed to fetch network information</div>
                                                <div class="text-sm">{{ networkError }}</div>
                                            </div>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="diagnostics" class="space-y-4 mt-4">
                            <!-- Diagnostics Configuration -->
                            <Card>
                                <CardHeader>
                                    <CardTitle class="text-lg">Generate Diagnostics Report</CardTitle>
                                    <CardDescription>
                                        Create a comprehensive diagnostics bundle for troubleshooting node issues
                                    </CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-6">
                                    <!-- Format Selection -->
                                    <div class="space-y-3">
                                        <label class="text-sm font-medium">Output Format</label>
                                        <div class="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                :class="[
                                                    'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                                    diagnosticsOptions.format === 'text'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50',
                                                ]"
                                                @click="diagnosticsOptions.format = 'text'"
                                            >
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                                        diagnosticsOptions.format === 'text'
                                                            ? 'border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <div
                                                        v-if="diagnosticsOptions.format === 'text'"
                                                        class="h-2.5 w-2.5 rounded-full bg-primary"
                                                    ></div>
                                                </div>
                                                <div class="text-left">
                                                    <div class="text-sm font-medium">Raw Text</div>
                                                    <div class="text-xs text-muted-foreground">
                                                        View report directly
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                :class="[
                                                    'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                                    diagnosticsOptions.format === 'url'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50',
                                                ]"
                                                @click="diagnosticsOptions.format = 'url'"
                                            >
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                                        diagnosticsOptions.format === 'url'
                                                            ? 'border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <div
                                                        v-if="diagnosticsOptions.format === 'url'"
                                                        class="h-2.5 w-2.5 rounded-full bg-primary"
                                                    ></div>
                                                </div>
                                                <div class="text-left">
                                                    <div class="text-sm font-medium">Upload URL</div>
                                                    <div class="text-xs text-muted-foreground">Get shareable link</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Options -->
                                    <div class="space-y-4">
                                        <label class="text-sm font-medium">Report Options</label>

                                        <!-- Include Endpoints -->
                                        <div
                                            class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                            @click="
                                                diagnosticsOptions.includeEndpoints =
                                                    !diagnosticsOptions.includeEndpoints
                                            "
                                        >
                                            <div class="flex items-center h-5">
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                                        diagnosticsOptions.includeEndpoints
                                                            ? 'bg-primary border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <svg
                                                        v-if="diagnosticsOptions.includeEndpoints"
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
                                                <div class="text-sm font-medium">Include HTTP Endpoints</div>
                                                <div class="text-xs text-muted-foreground mt-0.5">
                                                    Add API endpoint metadata to the diagnostics report
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Include Logs -->
                                        <div
                                            class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                            @click="diagnosticsOptions.includeLogs = !diagnosticsOptions.includeLogs"
                                        >
                                            <div class="flex items-center h-5">
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                                        diagnosticsOptions.includeLogs
                                                            ? 'bg-primary border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <svg
                                                        v-if="diagnosticsOptions.includeLogs"
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
                                                <div class="text-sm font-medium">Include Daemon Logs</div>
                                                <div class="text-xs text-muted-foreground mt-0.5">
                                                    Attach recent Wings daemon logs for debugging
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Log Lines (conditional) -->
                                        <div v-if="diagnosticsOptions.includeLogs" class="ml-8 space-y-2">
                                            <label class="text-sm font-medium">Number of Log Lines</label>
                                            <Input
                                                v-model.number="diagnosticsOptions.logLines"
                                                type="number"
                                                min="1"
                                                max="500"
                                                placeholder="200"
                                                class="max-w-xs"
                                            />
                                            <p class="text-xs text-muted-foreground">Between 1 and 500 lines</p>
                                        </div>

                                        <!-- Upload API URL (conditional) -->
                                        <div v-if="diagnosticsOptions.format === 'url'" class="space-y-2">
                                            <label class="text-sm font-medium">Custom Upload API URL (Optional)</label>
                                            <Input
                                                v-model="diagnosticsOptions.uploadApiUrl"
                                                type="url"
                                                placeholder="https://api.example.com/upload"
                                                class="font-mono text-sm"
                                            />
                                            <p class="text-xs text-muted-foreground">
                                                Override the default upload endpoint for the diagnostics report
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Generate Button -->
                                    <div class="pt-4 border-t">
                                        <Button
                                            type="button"
                                            class="w-full"
                                            :loading="diagnosticsLoading"
                                            @click="fetchDiagnostics"
                                        >
                                            <svg
                                                v-if="!diagnosticsLoading"
                                                class="h-4 w-4 mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            Generate Diagnostics Report
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <!-- Diagnostics Result -->
                            <Card v-if="diagnosticsResult">
                                <CardHeader>
                                    <CardTitle class="text-lg">Diagnostics Report</CardTitle>
                                    <CardDescription>
                                        {{
                                            diagnosticsResult.format === 'url'
                                                ? 'Your report has been uploaded'
                                                : 'Raw diagnostics output'
                                        }}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-4">
                                    <!-- URL Result -->
                                    <div
                                        v-if="diagnosticsResult.format === 'url' && diagnosticsResult.url"
                                        class="space-y-3"
                                    >
                                        <div
                                            class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                                        >
                                            <svg
                                                class="h-5 w-5 text-green-600 dark:text-green-400 shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span class="text-sm font-medium text-green-900 dark:text-green-100">
                                                Report uploaded successfully
                                            </span>
                                        </div>

                                        <div class="space-y-2">
                                            <label class="text-sm font-medium">Report URL</label>
                                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <div
                                                    class="w-full rounded-lg border bg-muted px-3 py-2 font-mono text-xs sm:text-sm sm:leading-6"
                                                >
                                                    <span class="break-all">{{ diagnosticsResult.url }}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    @click="copyDiagnostics(diagnosticsResult.url)"
                                                >
                                                    <svg
                                                        class="h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    as="a"
                                                    :href="diagnosticsResult.url"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <svg
                                                        class="h-4 w-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                        />
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Text Result -->
                                    <div
                                        v-if="diagnosticsResult.format === 'text' && diagnosticsResult.content"
                                        class="space-y-3"
                                    >
                                        <div class="flex items-center justify-between">
                                            <label class="text-sm font-medium">Diagnostics Output</label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                @click="copyDiagnostics(diagnosticsResult.content)"
                                            >
                                                <svg
                                                    class="h-4 w-4 mr-1"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                Copy
                                            </Button>
                                        </div>
                                        <pre
                                            class="p-4 bg-muted rounded-lg border text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto"
                                            >{{ diagnosticsResult.content }}</pre
                                        >
                                    </div>
                                </CardContent>
                            </Card>

                            <!-- Error State -->
                            <Card v-if="diagnosticsError">
                                <CardHeader>
                                    <CardTitle class="text-lg flex items-center gap-2">
                                        <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                        Diagnostics Failed
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Alert variant="destructive">
                                        <div class="space-y-3">
                                            <div class="font-medium">Failed to generate diagnostics report</div>
                                            <div class="text-sm">{{ diagnosticsError }}</div>
                                        </div>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="self-update" class="space-y-4 mt-4">
                            <!-- Self-update configuration -->
                            <Card>
                                <CardHeader>
                                    <CardTitle class="text-lg">Self-Update Options</CardTitle>
                                    <CardDescription>
                                        Configure how Wings should update itself on this node.
                                    </CardDescription>
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
                                                    selfUpdateOptions.source === 'github'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50',
                                                ]"
                                                @click="selfUpdateOptions.source = 'github'"
                                            >
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                                        selfUpdateOptions.source === 'github'
                                                            ? 'border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <div
                                                        v-if="selfUpdateOptions.source === 'github'"
                                                        class="h-2.5 w-2.5 rounded-full bg-primary"
                                                    ></div>
                                                </div>
                                                <div class="text-left">
                                                    <div class="text-sm font-medium">GitHub Release</div>
                                                    <div class="text-xs text-muted-foreground">
                                                        Pull from GitHub repo (default).
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                :class="[
                                                    'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                                    selfUpdateOptions.source === 'url'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50',
                                                ]"
                                                @click="selfUpdateOptions.source = 'url'"
                                            >
                                                <div
                                                    :class="[
                                                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                                        selfUpdateOptions.source === 'url'
                                                            ? 'border-primary'
                                                            : 'border-muted-foreground',
                                                    ]"
                                                >
                                                    <div
                                                        v-if="selfUpdateOptions.source === 'url'"
                                                        class="h-2.5 w-2.5 rounded-full bg-primary"
                                                    ></div>
                                                </div>
                                                <div class="text-left">
                                                    <div class="text-sm font-medium">Direct URL</div>
                                                    <div class="text-xs text-muted-foreground">
                                                        Download from a custom URL.
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- GitHub fields -->
                                    <div
                                        v-if="selfUpdateOptions.source === 'github'"
                                        class="space-y-4 rounded-lg border bg-card/40 p-4"
                                    >
                                        <div class="grid gap-4 sm:grid-cols-2">
                                            <div class="space-y-2">
                                                <Label class="text-sm font-medium" for="self-update-repo-owner"
                                                    >Repository Owner</Label
                                                >
                                                <Input
                                                    id="self-update-repo-owner"
                                                    v-model="selfUpdateOptions.repoOwner"
                                                    placeholder="e.g. pterodactyl"
                                                />
                                            </div>
                                            <div class="space-y-2">
                                                <Label class="text-sm font-medium" for="self-update-repo-name"
                                                    >Repository Name</Label
                                                >
                                                <Input
                                                    id="self-update-repo-name"
                                                    v-model="selfUpdateOptions.repoName"
                                                    placeholder="e.g. wings"
                                                />
                                            </div>
                                        </div>
                                        <div class="space-y-2">
                                            <Label class="text-sm font-medium" for="self-update-version"
                                                >Version (optional)</Label
                                            >
                                            <Input
                                                id="self-update-version"
                                                v-model="selfUpdateOptions.version"
                                                placeholder="e.g. v1.11.0"
                                            />
                                            <p class="text-xs text-muted-foreground">
                                                Leave empty to fetch the latest release from the selected repository.
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Direct URL fields -->
                                    <div
                                        v-if="selfUpdateOptions.source === 'url'"
                                        class="space-y-4 rounded-lg border bg-card/40 p-4"
                                    >
                                        <div class="space-y-2">
                                            <Label class="text-sm font-medium" for="self-update-url"
                                                >Download URL</Label
                                            >
                                            <Input
                                                id="self-update-url"
                                                v-model="selfUpdateOptions.url"
                                                placeholder="https://example.com/wings.tar.gz"
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label class="text-sm font-medium" for="self-update-sha"
                                                >SHA256 checksum (optional)</Label
                                            >
                                            <Input
                                                id="self-update-sha"
                                                v-model="selfUpdateOptions.sha256"
                                                placeholder="Provide checksum to verify download integrity"
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <Label class="text-sm font-medium" for="self-update-version-direct"
                                                >Version (optional)</Label
                                            >
                                            <Input
                                                id="self-update-version-direct"
                                                v-model="selfUpdateOptions.version"
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
                                                @click="selfUpdateOptions.force = !selfUpdateOptions.force"
                                            >
                                                <div class="flex items-center h-5">
                                                    <div
                                                        :class="[
                                                            'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                                            selfUpdateOptions.force
                                                                ? 'bg-primary border-primary'
                                                                : 'border-muted-foreground',
                                                        ]"
                                                    >
                                                        <svg
                                                            v-if="selfUpdateOptions.force"
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
                                                v-if="selfUpdateOptions.source === 'url'"
                                                class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                                @click="
                                                    selfUpdateOptions.disableChecksum =
                                                        !selfUpdateOptions.disableChecksum
                                                "
                                            >
                                                <div class="flex items-center h-5">
                                                    <div
                                                        :class="[
                                                            'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                                            selfUpdateOptions.disableChecksum
                                                                ? 'bg-primary border-primary'
                                                                : 'border-muted-foreground',
                                                        ]"
                                                    >
                                                        <svg
                                                            v-if="selfUpdateOptions.disableChecksum"
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
                                        <Button
                                            type="button"
                                            class="w-full"
                                            :loading="selfUpdateLoading"
                                            @click="submitSelfUpdate"
                                        >
                                            <svg
                                                v-if="!selfUpdateLoading"
                                                class="h-4 w-4 mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
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
                            <Card v-if="selfUpdateError || selfUpdateMessage || selfUpdateResult">
                                <CardHeader>
                                    <CardTitle class="text-lg flex items-center gap-2">
                                        <div
                                            :class="[
                                                'h-3 w-3 rounded-full',
                                                selfUpdateError ? 'bg-red-500 animate-pulse' : 'bg-emerald-500',
                                            ]"
                                        ></div>
                                        {{ selfUpdateError ? 'Self-Update Failed' : 'Self-Update Status' }}
                                    </CardTitle>
                                    <CardDescription>
                                        {{
                                            selfUpdateError
                                                ? 'Review the details below and adjust the options before trying again.'
                                                : selfUpdateMessage ||
                                                  'Self-update request accepted. Wings will handle the update in the background.'
                                        }}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-4">
                                    <template v-if="selfUpdateError">
                                        <div
                                            class="rounded-lg border border-red-300/70 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-inner"
                                        >
                                            <div class="font-semibold text-red-200">Unable to trigger self-update</div>
                                            <p class="mt-2 whitespace-pre-line text-red-100/90">
                                                {{ selfUpdateError }}
                                            </p>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div
                                            class="rounded-lg border border-emerald-300/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner"
                                        >
                                            <div class="font-semibold text-emerald-200">
                                                Self-update queued successfully
                                            </div>
                                            <p class="mt-2 text-emerald-100/90">
                                                Wings received the request and will install the update shortly. You can
                                                monitor progress from the node logs if needed.
                                            </p>
                                        </div>
                                        <div class="space-y-2">
                                            <div
                                                class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                            >
                                                Response details
                                            </div>
                                            <pre
                                                class="max-h-80 overflow-y-auto overflow-x-auto rounded-lg border bg-muted/60 p-4 text-xs font-mono text-muted-foreground"
                                                >{{ formatSelfUpdateResult(selfUpdateResult) }}</pre
                                            >
                                        </div>
                                    </template>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="terminal" class="space-y-4 mt-4">
                            <!-- System Terminal -->
                            <Card>
                                <CardHeader>
                                    <CardTitle class="text-lg flex items-center gap-2">
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        Host Terminal
                                    </CardTitle>
                                    <CardDescription>
                                        Execute commands on the node's host system. Commands run with system privileges
                                        via the Wings daemon.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-4">
                                    <!-- Terminal Output Container -->
                                    <div class="rounded-lg border bg-black overflow-hidden">
                                        <div ref="systemTerminalContainer" class="w-full h-[400px] bg-black"></div>
                                    </div>

                                    <!-- Command Input -->
                                    <form class="flex gap-2" @submit.prevent="executeTerminalCommand">
                                        <Input
                                            v-model="terminalCommandInput"
                                            placeholder="Enter command (e.g., ls -la, whoami, df -h)"
                                            class="flex-1 font-mono text-sm"
                                            :disabled="systemTerminalComposable.isExecuting.value"
                                        />
                                        <Button
                                            type="submit"
                                            :loading="systemTerminalComposable.isExecuting.value"
                                            :disabled="!terminalCommandInput.trim()"
                                        >
                                            <svg
                                                v-if="!systemTerminalComposable.isExecuting.value"
                                                class="h-4 w-4 mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                                />
                                            </svg>
                                            Execute
                                        </Button>
                                        <Button type="button" variant="outline" @click="clearTerminal">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </Button>
                                    </form>

                                    <!-- Warning -->
                                    <div class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                                        <div class="flex items-start gap-3">
                                            <svg
                                                class="h-5 w-5 text-yellow-500 shrink-0 mt-0.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                            <div class="flex-1">
                                                <div class="text-sm font-semibold text-yellow-200">
                                                    Administrative Access Warning
                                                </div>
                                                <p class="mt-1 text-xs text-yellow-100/90">
                                                    Commands execute with system privileges on the host. Use caution as
                                                    operations can affect server stability. Long-running commands may
                                                    time out after 60 seconds.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <DrawerFooter>
                        <Button type="button" variant="outline" class="w-full" @click="closeDrawer">Close</Button>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
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

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Eye,
    Pencil,
    Trash2,
    ArrowLeft,
    ArrowRight,
    RefreshCw,
    Database,
    Network,
    Plus,
    Server,
    MapPin,
} from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import TableComponent from '@/kit/TableComponent.vue';
import type { ApiResponse, TableColumn } from '@/kit/types';
import { useToast } from 'vue-toastification';
import { useSystemTerminal } from '@/composables/useSystemTerminal';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

// Extend Node type and form default

type UtilizationResponse = {
    utilization: {
        memory_total: number;
        memory_used: number;
        swap_total: number;
        swap_used: number;
        load_average1: number;
        load_average5: number;
        load_average15: number;
        cpu_percent: number;
        disk_total: number;
        disk_used: number;
        disk_details: Array<{
            device: string;
            mountpoint: string;
            total_space: number;
            used_space: number;
            tags: string[];
        }>;
    };
};

type DockerResponse = {
    dockerDiskUsage: {
        containers_size: number;
        images_total: number;
        images_active: number;
        images_size: number;
        build_cache_size: number;
    };
};

type NetworkResponse = {
    ips: {
        ip_addresses: string[];
    };
};

type DiagnosticsResult = {
    format: 'text' | 'url';
    content: string | null;
    url: string | null;
    include_endpoints: boolean;
    include_logs: boolean;
    log_lines: number | null;
};

type SystemInfoResponse = {
    wings: {
        version: string;
        docker: {
            version: string;
            cgroups: {
                driver: string;
                version: string;
            };
            containers: {
                total: number;
                running: number;
                paused: number;
                stopped: number;
            };
            storage: {
                driver: string;
                filesystem: string;
            };
            runc: {
                version: string;
            };
        };
        system: {
            architecture: string;
            cpu_threads: number;
            memory_bytes: number;
            kernel_version: string;
            os: string;
            os_type: string;
        };
    };
};

type Node = {
    id: number;
    uuid: string;
    name: string;
    description?: string;
    fqdn: string;
    location_id?: number;
    public: number | string | boolean;
    scheme: string;
    behind_proxy: number | string | boolean;
    maintenance_mode: number | string | boolean;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemon_token_id: string;
    daemon_token: string;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    public_ip_v4?: string | null;
    public_ip_v6?: string | null;
    created_at: string;
    updated_at: string;
    // ...add other fields as needed
};

type FormData = {
    name: string;
    description: string;
    fqdn: string;
    location_id?: number;
    public: string;
    scheme: string;
    behind_proxy: string;
    maintenance_mode: string;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    public_ip_v4: string;
    public_ip_v6: string;
};

const toast = useToast();

const nodes = ref<Node[]>([]);
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
const loading = ref(false);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);
const confirmResetKeyRow = ref<number | null>(null);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'status', label: 'Status', headerClass: 'w-[100px]' },
    { key: 'name', label: 'Name', searchable: true },
    { key: 'fqdn', label: 'FQDN', searchable: true },
    { key: 'location', label: 'Location' },
    { key: 'memory', label: 'Memory' },
    { key: 'disk', label: 'Disk' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

// System info state for view mode
const systemInfoLoading = ref(false);
const systemInfoData = ref<SystemInfoResponse | null>(null);
const systemInfoError = ref<string | null>(null);
const viewActiveTab = ref('overview'); // For view mode tabs

// Utilization state
const utilizationLoading = ref(false);
const utilizationData = ref<UtilizationResponse | null>(null);
const utilizationError = ref<string | null>(null);

// Docker state
const dockerLoading = ref(false);
const dockerData = ref<DockerResponse | null>(null);
const dockerError = ref<string | null>(null);
const dockerPruning = ref(false);

// Network state
const networkLoading = ref(false);
const networkData = ref<NetworkResponse | null>(null);
const networkError = ref<string | null>(null);

// Diagnostics state
const diagnosticsOptions = reactive({
    format: 'text' as 'text' | 'url',
    includeEndpoints: false,
    includeLogs: false,
    logLines: 200,
    uploadApiUrl: '',
});
const diagnosticsLoading = ref(false);
const diagnosticsResult = ref<DiagnosticsResult | null>(null);
const diagnosticsError = ref<string | null>(null);
const showUploadApiField = computed(() => diagnosticsOptions.format === 'url');
const diagnosticsCopyValue = computed(() => {
    if (!diagnosticsResult.value) {
        return null;
    }

    return diagnosticsResult.value.format === 'url' ? diagnosticsResult.value.url : diagnosticsResult.value.content;
});

const DEFAULT_SELF_UPDATE = {
    repoOwner: 'mythicalltd',
    repoName: 'featherwings',
    downloadUrl: 'https://github.com/mythicalltd/featherwings/releases/latest/download/featherwings',
};

const selfUpdateOptions = reactive({
    source: 'github' as 'github' | 'url',
    repoOwner: DEFAULT_SELF_UPDATE.repoOwner,
    repoName: DEFAULT_SELF_UPDATE.repoName,
    version: '',
    url: DEFAULT_SELF_UPDATE.downloadUrl,
    sha256: '',
    force: false,
    disableChecksum: false,
});
const selfUpdateLoading = ref(false);
const selfUpdateResult = ref<Record<string, unknown> | null>(null);
const selfUpdateMessage = ref<string | null>(null);
const selfUpdateError = ref<string | null>(null);

// Watch for terminal tab to initialize terminal
watch(
    () => viewActiveTab.value,
    (newTab) => {
        if (newTab === 'terminal' && systemTerminalContainer.value && !systemTerminal) {
            setTimeout(() => {
                initializeSystemTerminal();
            }, 100);
        }
    },
);

watch(
    () => diagnosticsOptions.logLines,
    (value) => {
        if (value === null || Number.isNaN(value)) {
            diagnosticsOptions.logLines = 200;

            return;
        }

        if (value < 1) {
            diagnosticsOptions.logLines = 1;
        } else if (value > 500) {
            diagnosticsOptions.logLines = 500;
        }
    },
);

watch(
    () => diagnosticsOptions.format,
    (value) => {
        if (value === 'text') {
            diagnosticsOptions.uploadApiUrl = '';
        }
    },
);

watch(
    () => selfUpdateOptions.source,
    (value) => {
        if (value === 'github') {
            selfUpdateOptions.repoOwner = DEFAULT_SELF_UPDATE.repoOwner;
            selfUpdateOptions.repoName = DEFAULT_SELF_UPDATE.repoName;
            selfUpdateOptions.url = DEFAULT_SELF_UPDATE.downloadUrl;
            selfUpdateOptions.sha256 = '';
            selfUpdateOptions.disableChecksum = false;
        } else {
            selfUpdateOptions.url = DEFAULT_SELF_UPDATE.downloadUrl;
            selfUpdateOptions.repoOwner = DEFAULT_SELF_UPDATE.repoOwner;
            selfUpdateOptions.repoName = DEFAULT_SELF_UPDATE.repoName;
        }

        selfUpdateError.value = null;
        selfUpdateResult.value = null;
        selfUpdateMessage.value = null;
    },
);

// Node health tracking
const nodeHealthStatus = ref<Record<number, 'healthy' | 'unhealthy' | 'unknown'>>({});
const healthCheckInterval = ref<number | null>(null);
const isCheckingHealth = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-nodes');
const widgetsTopOfPage = computed(() => getWidgets('admin-nodes', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-nodes', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-nodes', 'after-table'));
const widgetsAfterInfoCards = computed(() => getWidgets('admin-nodes', 'after-info-cards'));
const widgetsAfterWingsCard = computed(() => getWidgets('admin-nodes', 'after-wings-card'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-nodes', 'bottom-of-page'));

// Wings configuration computed property
const wingsConfigYaml = computed(() => {
    if (!editingNodeId.value) return 'No node selected';

    const node = nodes.value.find((n) => n.id === editingNodeId.value);

    if (!node) return 'Node not found';

    // Check if required fields exist
    if (!node.uuid || !node.daemon_token_id || !node.daemon_token) {
        return 'Node data incomplete - missing UUID or tokens';
    }

    const yaml = `debug: false
uuid: ${node.uuid}
token_id: ${node.daemon_token_id}
token: ${node.daemon_token}
api:
  host: 0.0.0.0
  port: ${node.daemonListen || 8080}
  ssl:
    enabled: ${node.scheme === 'https'}
    cert: /etc/letsencrypt/live/${node.fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/${node.fqdn}/privkey.pem
  upload_limit: ${node.upload_size || 512}
system:
  data: ${node.daemonBase || '/var/lib/featherpanel/volumes'}
  sftp:
    bind_port: ${node.daemonSFTP || 2022}
allowed_mounts: []
remote: 'https://${window.location.hostname}'`;

    return yaml;
});

const route = useRoute();
const router = useRouter();
const locationIdParam = computed(() => (route.query.location_id ? Number(route.query.location_id) : null));
const currentLocation = ref<{ id: number; name: string } | null>(null);
const breadcrumbs = computed(() => [
    { text: 'Locations', isCurrent: false, href: '/admin/locations' },
    ...(currentLocation.value
        ? [
              {
                  text: currentLocation.value.name,
                  isCurrent: true,
                  href: `/admin/nodes?location_id=${currentLocation.value.id}`,
              },
          ]
        : []),
]);

async function fetchCurrentLocation() {
    if (!locationIdParam.value) {
        // Redirect to locations if no location_id
        router.replace('/admin/locations');
        return;
    }
    try {
        const { data } = await axios.get(`/api/admin/locations/${locationIdParam.value}`);
        currentLocation.value = data.data.location;
    } catch {
        currentLocation.value = null;
        router.replace('/admin/locations');
    }
}

async function fetchNodes() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
            search: searchQuery.value || undefined,
            location_id: locationIdParam.value ?? undefined,
        };
        const { data } = await axios.get('/api/admin/nodes', { params });
        nodes.value = data.data.nodes || [];

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

        // Auto-check health status for all nodes
        await checkAllNodesHealth();
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch nodes';
        toast.error(errorMessage);
        nodes.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

// --- Location lookup ---
const locations = ref<{ id: number; name: string }[]>([]);
async function fetchLocations() {
    try {
        const { data } = await axios.get('/api/admin/locations', { params: { limit: 1000 } });
        locations.value = data.data.locations || [];
    } catch {
        locations.value = [];
    }
}

// --- Drawer state ---
const showDrawer = ref(false);
const drawerMode = ref<'create' | 'edit' | 'view'>('create');
const drawerNode = ref<Node | null>(null);
const editingNodeId = ref<number | null>(null);

// Terminal state
const systemTerminalContainer = ref<HTMLElement | null>(null);
let systemTerminal: XTerm | null = null;
let systemTerminalFitAddon: FitAddon | null = null;
const terminalCommandInput = ref('');
const systemTerminalComposable = useSystemTerminal(drawerNode);

// Watch for terminal execution results
watch(
    () => systemTerminalComposable.lastResult.value,
    (result) => {
        if (result && systemTerminal) {
            // Write stdout (already includes newlines from command output)
            if (result.stdout) {
                systemTerminal.write(result.stdout);
            }

            // Write stderr in red if present
            if (result.stderr) {
                systemTerminal.write('\x1b[31m' + result.stderr + '\x1b[0m');
            }

            // Only add a newline if there's no output (empty command)
            if (!result.stdout && !result.stderr) {
                systemTerminal.write('\r\n');
            }

            // Write status line with exit code and duration
            const statusColor = result.exit_code === 0 ? '\x1b[32m' : '\x1b[31m';
            const statusSymbol = result.exit_code === 0 ? '✓' : '✗';
            const statusText = result.exit_code === 0 ? 'Success' : 'Failed (exit code: ' + result.exit_code + ')';

            systemTerminal.write(
                '\x1b[90m[' +
                    statusColor +
                    statusSymbol +
                    ' ' +
                    statusText +
                    '\x1b[90m | ' +
                    result.duration_ms +
                    'ms' +
                    (result.timed_out ? ' | ⚠ Timed out' : '') +
                    ']\x1b[0m\r\n',
            );
        }
    },
);

// Watch for terminal errors
watch(
    () => systemTerminalComposable.error.value,
    (err) => {
        if (err && systemTerminal) {
            systemTerminal.write('\x1b[31m✗ Error: ' + err + '\x1b[0m\r\n');
        }
    },
);

const form = ref<FormData>({
    name: '',
    description: '',
    fqdn: '',
    location_id: undefined,
    public: 'true',
    scheme: 'https',
    behind_proxy: 'false',
    maintenance_mode: 'false',
    memory: 0,
    memory_overallocate: 0,
    disk: 0,
    disk_overallocate: 0,
    upload_size: 512,
    daemonListen: 8080,
    daemonSFTP: 2022,
    daemonBase: '/var/lib/featherpanel/volumes',
    public_ip_v4: '',
    public_ip_v6: '',
});
const formErrors = ref<Record<string, string>>({});
const formLoading = ref(false);

const steps = [
    { key: 'basic', label: 'Basic Details' },
    { key: 'config', label: 'Configuration' },
    { key: 'network', label: 'Network' },
    { key: 'advanced', label: 'Advanced' },
];
const currentStep = ref(0);
const activeTab = ref('basic'); // For edit mode tabs

function nextStep() {
    if (validateStep(currentStep.value)) {
        if (currentStep.value < steps.length - 1) currentStep.value++;
    }
}
function prevStep() {
    if (currentStep.value > 0) currentStep.value--;
}
function validateStep(stepIdx: number): boolean {
    // Clear previous errors for this step
    const errors: Record<string, string> = {};
    const step = steps[stepIdx];
    if (!step) return false;

    if (step.key === 'basic') {
        if (!form.value.name || form.value.name.trim() === '') errors.name = 'Name is required';
        if (!form.value.fqdn || form.value.fqdn.trim() === '') {
            errors.fqdn = 'FQDN is required';
        } else {
            // Validate FQDN format
            const fqdnRegex =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!fqdnRegex.test(form.value.fqdn)) {
                errors.fqdn = 'FQDN must be a valid domain name (e.g., node.example.com)';
            }
        }
    }
    if (step.key === 'config') {
        if (!form.value.daemonBase || form.value.daemonBase.trim() === '')
            errors.daemonBase = 'Daemon file directory is required';
        if (form.value.memory === undefined || form.value.memory < 0) errors.memory = 'Total memory is required';
        if (form.value.disk === undefined || form.value.disk < 0) errors.disk = 'Total disk space is required';
    }
    if (step.key === 'network') {
        if (!form.value.daemonListen) errors.daemonListen = 'Daemon port is required';
        if (!form.value.daemonSFTP) errors.daemonSFTP = 'Daemon SFTP port is required';
        if (form.value.public_ip_v4 && !isValidIPv4Address(form.value.public_ip_v4)) {
            errors.public_ip_v4 = 'Public IPv4 must be a valid IPv4 address';
        }
        if (form.value.public_ip_v6 && !isValidIPv6Address(form.value.public_ip_v6)) {
            errors.public_ip_v6 = 'Public IPv6 must be a valid IPv6 address';
        }
    }
    if (step.key === 'advanced') {
        if (form.value.upload_size === undefined || form.value.upload_size < 1)
            errors.upload_size = 'Upload size limit is required and must be at least 1';
    }
    formErrors.value = errors;
    return Object.keys(errors).length === 0;
}

function resetWizard() {
    currentStep.value = 0;
    formErrors.value = {};
}

function resetDiagnosticsState() {
    diagnosticsOptions.format = 'text';
    diagnosticsOptions.includeEndpoints = false;
    diagnosticsOptions.includeLogs = false;
    diagnosticsOptions.logLines = 200;
    diagnosticsOptions.uploadApiUrl = '';
    diagnosticsLoading.value = false;
    diagnosticsResult.value = null;
    diagnosticsError.value = null;
}

function resetSelfUpdateState() {
    selfUpdateOptions.source = 'github';
    selfUpdateOptions.repoOwner = DEFAULT_SELF_UPDATE.repoOwner;
    selfUpdateOptions.repoName = DEFAULT_SELF_UPDATE.repoName;
    selfUpdateOptions.version = '';
    selfUpdateOptions.url = DEFAULT_SELF_UPDATE.downloadUrl;
    selfUpdateOptions.sha256 = '';
    selfUpdateOptions.force = false;
    selfUpdateOptions.disableChecksum = false;
    selfUpdateLoading.value = false;
    selfUpdateResult.value = null;
    selfUpdateMessage.value = null;
    selfUpdateError.value = null;
}

function openCreateDrawer() {
    drawerMode.value = 'create';
    editingNodeId.value = null;
    form.value = {
        name: '',
        description: '',
        fqdn: '',
        location_id: currentLocation.value?.id ?? undefined,
        public: 'true',
        scheme: 'https',
        behind_proxy: 'false',
        maintenance_mode: 'false',
        memory: 0,
        memory_overallocate: 0,
        disk: 0,
        disk_overallocate: 0,
        upload_size: 512,
        daemonListen: 8080,
        daemonSFTP: 2022,
        daemonBase: '/var/lib/featherpanel/volumes',
        public_ip_v4: '',
        public_ip_v6: '',
    };
    resetWizard();
    showDrawer.value = true;
}
function onEdit(node: Node) {
    drawerMode.value = 'edit';
    editingNodeId.value = node.id;
    activeTab.value = 'basic'; // Reset to first tab
    form.value = {
        name: node.name,
        description: node.description || '',
        fqdn: node.fqdn,
        location_id: node.location_id,
        public: node.public === 1 || node.public === '1' || node.public === true ? 'true' : 'false',
        scheme: node.scheme || 'https',
        behind_proxy:
            node.behind_proxy === 1 || node.behind_proxy === '1' || node.behind_proxy === true ? 'true' : 'false',
        maintenance_mode:
            node.maintenance_mode === 1 || node.maintenance_mode === '1' || node.maintenance_mode === true
                ? 'true'
                : 'false',
        memory: node.memory || 0,
        memory_overallocate: node.memory_overallocate || 0,
        disk: node.disk || 0,
        disk_overallocate: node.disk_overallocate || 0,
        upload_size: node.upload_size || 512,
        daemonListen: node.daemonListen || 8080,
        daemonSFTP: node.daemonSFTP || 2022,
        daemonBase: node.daemonBase || '/var/lib/featherpanel/volumes',
        public_ip_v4: node.public_ip_v4 ?? '',
        public_ip_v6: node.public_ip_v6 ?? '',
    };
    resetWizard(); // Reset wizard for edit mode
    showDrawer.value = true;
}

function onDatabases(node: Node) {
    router.push(`/admin/nodes/${node.id}/databases`);
}

function onAllocations(node: Node) {
    router.push(`/admin/nodes/${node.id}/allocations`);
}
async function onView(node: Node) {
    drawerMode.value = 'view';
    drawerNode.value = node;
    viewActiveTab.value = 'overview';
    showDrawer.value = true;
    resetDiagnosticsState();
    resetSelfUpdateState();

    // Fetch all node information when opening view mode
    await Promise.all([
        fetchSystemInfo(node),
        fetchUtilizationInfo(node),
        fetchDockerInfo(node),
        fetchNetworkInfo(node),
    ]);
}
function closeDrawer() {
    showDrawer.value = false;
    drawerNode.value = null;
    resetDiagnosticsState();
    resetSelfUpdateState();
    cleanupSystemTerminal();

    // Reset all data states
    systemInfoData.value = null;
    systemInfoError.value = null;
    utilizationData.value = null;
    utilizationError.value = null;
    dockerData.value = null;
    dockerError.value = null;
    networkData.value = null;
    networkError.value = null;
}

function getLocationName(id: number | undefined) {
    if (typeof id !== 'number') return '';
    return locations.value.find((l) => l.id === id)?.name || id;
}

function validateForm() {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!form.value.name || form.value.name.trim() === '') errors.name = 'Name is required';
    if (!form.value.fqdn || form.value.fqdn.trim() === '') {
        errors.fqdn = 'FQDN is required';
    } else {
        // Validate FQDN format
        const fqdnRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!fqdnRegex.test(form.value.fqdn)) {
            errors.fqdn = 'FQDN must be a valid domain name (e.g., node.example.com)';
        }
    }
    if (!form.value.location_id) errors.location_id = 'Location is required';

    // Configuration validation
    if (!form.value.daemonBase || form.value.daemonBase.trim() === '')
        errors.daemonBase = 'Daemon file directory is required';
    if (form.value.memory === undefined || form.value.memory < 0) errors.memory = 'Total memory is required';
    if (form.value.disk === undefined || form.value.disk < 0) errors.disk = 'Total disk space is required';

    // Network validation
    if (!form.value.daemonListen) errors.daemonListen = 'Daemon port is required';
    if (!form.value.daemonSFTP) errors.daemonSFTP = 'Daemon SFTP port is required';

    // Advanced validation
    if (form.value.upload_size === undefined || form.value.upload_size < 1)
        errors.upload_size = 'Upload size limit is required and must be at least 1';

    if (form.value.public_ip_v4 && !isValidIPv4Address(form.value.public_ip_v4)) {
        errors.public_ip_v4 = 'Public IPv4 must be a valid IPv4 address';
    }

    if (form.value.public_ip_v6 && !isValidIPv6Address(form.value.public_ip_v6)) {
        errors.public_ip_v6 = 'Public IPv6 must be a valid IPv6 address';
    }

    return errors;
}

async function submitForm() {
    formErrors.value = validateForm();
    if (Object.keys(formErrors.value).length > 0) return;
    formLoading.value = true;
    try {
        // Convert string boolean values to actual booleans/integers for API
        const trimmedIPv4 = form.value.public_ip_v4.trim();
        const trimmedIPv6 = form.value.public_ip_v6.trim();

        const submitData = {
            ...form.value,
            location_id: form.value.location_id ? Number(form.value.location_id) : undefined,
            public: form.value.public === 'true' ? 1 : 0,
            behind_proxy: form.value.behind_proxy === 'true' ? 1 : 0,
            maintenance_mode: form.value.maintenance_mode === 'true' ? 1 : 0,
            public_ip_v4: trimmedIPv4 === '' ? null : trimmedIPv4,
            public_ip_v6: trimmedIPv6 === '' ? null : trimmedIPv6,
        };

        if (drawerMode.value === 'create') {
            await axios.put('/api/admin/nodes', submitData);
            toast.success('Node created successfully');
        } else if (drawerMode.value === 'edit' && editingNodeId.value) {
            await axios.patch(`/api/admin/nodes/${editingNodeId.value}`, submitData);
            toast.success('Node updated successfully');
        }
        await fetchNodes();
        showDrawer.value = false;
        editingNodeId.value = null;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message || 'Failed to save node');
    } finally {
        formLoading.value = false;
    }
}

function copyWingsConfig() {
    const textarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement;
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
        toast.success('Wings configuration copied to clipboard');
    } else {
        toast.error('Failed to copy configuration');
    }
}

function confirmResetKey() {
    confirmResetKeyRow.value = editingNodeId.value;
}

async function requestResetKey() {
    if (!editingNodeId.value) return;

    try {
        const node = nodes.value.find((n) => n.id === editingNodeId.value);
        if (!node) {
            toast.error('Node not found');
            return;
        }

        const response = await axios.post(`/api/admin/nodes/${node.id}/reset-key`);
        if (response.data.success) {
            toast.success('Master daemon reset key requested successfully');
            // Refresh the node data to get updated tokens
            await fetchNodes();
            confirmResetKeyRow.value = null; // Clear confirmation state
        } else {
            toast.error(response.data.message || 'Failed to request reset key');
        }
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message || 'Failed to request reset key');
    }
}

function onCancelResetKey() {
    confirmResetKeyRow.value = null;
}

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchNodes();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchNodes();
}
onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchLocations();
    await fetchCurrentLocation();
    await fetchNodes();

    // Set up periodic health checks every 30 seconds
    healthCheckInterval.value = setInterval(async () => {
        if (nodes.value.length > 0) {
            await checkAllNodesHealth();
        }
    }, 30000);
});

// Cleanup interval on unmount
onUnmounted(() => {
    if (healthCheckInterval.value) {
        clearInterval(healthCheckInterval.value);
    }
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery, locationIdParam], async () => {
    await fetchCurrentLocation();
    await fetchNodes();
});

async function confirmDelete(node: Node) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/nodes/${node.id}`);
        if (response.data && response.data.success) {
            toast.success('Node deleted successfully');
            await fetchNodes();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete node');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete node';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}
function onDelete(node: Node) {
    confirmDeleteRow.value = node.id;
}
function onCancelDelete() {
    confirmDeleteRow.value = null;
}

// System info functions
async function fetchSystemInfo(node: Node) {
    systemInfoLoading.value = true;
    systemInfoError.value = null;
    systemInfoData.value = null;

    try {
        const response = await axios.get(`/api/wings/admin/node/${node.id}/system`);
        if (response.data.success) {
            systemInfoData.value = response.data.data;
            nodeHealthStatus.value[node.id] = 'healthy';
        } else {
            systemInfoError.value = response.data.message || 'Failed to fetch system information';
            nodeHealthStatus.value[node.id] = 'unhealthy';
            // Auto-switch to system tab when there's an error to show the improved error message
            viewActiveTab.value = 'system';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        systemInfoError.value = error?.response?.data?.message || 'Failed to fetch system information';
        nodeHealthStatus.value[node.id] = 'unhealthy';
        // Auto-switch to system tab when there's an error to show the improved error message
        viewActiveTab.value = 'system';
    } finally {
        systemInfoLoading.value = false;
    }
}

// Utilization functions
async function fetchUtilizationInfo(node: Node) {
    utilizationLoading.value = true;
    utilizationError.value = null;
    utilizationData.value = null;

    try {
        const response = await axios.get(`/api/wings/admin/node/${node.id}/utilization`);
        if (response.data.success) {
            utilizationData.value = response.data.data;
        } else {
            utilizationError.value = response.data.message || 'Failed to fetch utilization information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        utilizationError.value = error?.response?.data?.message || 'Failed to fetch utilization information';
    } finally {
        utilizationLoading.value = false;
    }
}

// Docker functions
async function fetchDockerInfo(node: Node) {
    dockerLoading.value = true;
    dockerError.value = null;
    dockerData.value = null;

    try {
        const response = await axios.get(`/api/wings/admin/node/${node.id}/docker/disk`);
        if (response.data.success) {
            dockerData.value = response.data.data;
        } else {
            dockerError.value = response.data.message || 'Failed to fetch Docker information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        dockerError.value = error?.response?.data?.message || 'Failed to fetch Docker information';
    } finally {
        dockerLoading.value = false;
    }
}

async function pruneDockerImages() {
    if (!drawerNode.value) return;

    dockerPruning.value = true;

    try {
        const response = await axios.delete(`/api/wings/admin/node/${drawerNode.value.id}/docker/prune`);
        if (response.data.success) {
            const spaceReclaimed = response.data.data.dockerPrune.SpaceReclaimed || 0;
            const imagesDeleted = response.data.data.dockerPrune.ImagesDeleted || [];

            toast.success(
                `Docker prune completed. Space reclaimed: ${formatBytes(spaceReclaimed)}. Images deleted: ${imagesDeleted ? imagesDeleted.length : 0}`,
            );

            // Refresh Docker data
            await fetchDockerInfo(drawerNode.value);
        } else {
            toast.error(response.data.message || 'Failed to prune Docker images');
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || 'Failed to prune Docker images');
    } finally {
        dockerPruning.value = false;
    }
}

// Network functions
async function fetchNetworkInfo(node: Node) {
    networkLoading.value = true;
    networkError.value = null;
    networkData.value = null;

    try {
        const response = await axios.get(`/api/wings/admin/node/${node.id}/ips`);
        if (response.data.success) {
            networkData.value = response.data.data;
        } else {
            networkError.value = response.data.message || 'Failed to fetch network information';
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        networkError.value = error?.response?.data?.message || 'Failed to fetch network information';
    } finally {
        networkLoading.value = false;
    }
}

async function fetchDiagnostics() {
    if (!drawerNode.value) {
        return;
    }

    diagnosticsLoading.value = true;
    diagnosticsError.value = null;
    diagnosticsResult.value = null;

    const params: Record<string, string | number> = {
        format: diagnosticsOptions.format,
    };

    if (diagnosticsOptions.includeEndpoints) {
        params.include_endpoints = 'true';
    }

    if (diagnosticsOptions.includeLogs) {
        params.include_logs = 'true';
    }

    if (diagnosticsOptions.includeLogs && diagnosticsOptions.logLines) {
        params.log_lines = diagnosticsOptions.logLines;
    }

    if (showUploadApiField.value && diagnosticsOptions.uploadApiUrl.trim() !== '') {
        params.upload_api_url = diagnosticsOptions.uploadApiUrl.trim();
    }

    try {
        const response = await axios.get<ApiResponse<{ diagnostics: DiagnosticsResult }>>(
            `/api/admin/nodes/${drawerNode.value.id}/diagnostics`,
            { params },
        );

        if (!response.data.success || !response.data.data) {
            const message = response.data.message || 'Failed to generate diagnostics';
            diagnosticsError.value = message;
            toast.error(message);

            return;
        }

        diagnosticsResult.value = response.data.data.diagnostics;
        toast.success(
            diagnosticsResult.value.format === 'url'
                ? 'Diagnostics link generated successfully'
                : 'Diagnostics generated successfully',
        );
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        const message = err?.response?.data?.message || 'Failed to generate diagnostics';
        diagnosticsError.value = message;
        toast.error(message);
    } finally {
        diagnosticsLoading.value = false;
    }
}

function copyDiagnostics(value: string | null) {
    if (!value) {
        toast.error('Nothing to copy');

        return;
    }

    navigator.clipboard
        .writeText(value)
        .then(() => {
            toast.success('Copied to clipboard');
        })
        .catch(() => {
            toast.error('Failed to copy to clipboard');
        });
}

function validateSelfUpdate(): string | null {
    if (selfUpdateOptions.source === 'github') {
        if (!selfUpdateOptions.repoOwner.trim()) {
            return 'Repository owner is required when using GitHub.';
        }
        if (!selfUpdateOptions.repoName.trim()) {
            return 'Repository name is required when using GitHub.';
        }
    }

    if (selfUpdateOptions.source === 'url') {
        if (!selfUpdateOptions.url.trim()) {
            return 'A download URL is required when using the direct URL source.';
        }

        const urlPattern = /^(https?:\/\/).+/i;
        if (!urlPattern.test(selfUpdateOptions.url.trim())) {
            return 'Download URL must start with http:// or https://';
        }

        if (!selfUpdateOptions.disableChecksum && !selfUpdateOptions.sha256.trim()) {
            return 'Provide a SHA256 checksum or disable checksum validation for direct URL updates.';
        }
    }

    return null;
}

async function submitSelfUpdate() {
    if (!drawerNode.value) {
        return;
    }

    if (selfUpdateLoading.value) {
        return;
    }

    const validationError = validateSelfUpdate();
    if (validationError) {
        selfUpdateError.value = validationError;
        toast.error(validationError);

        return;
    }

    selfUpdateLoading.value = true;
    selfUpdateError.value = null;
    selfUpdateResult.value = null;
    selfUpdateMessage.value = null;

    const payload: Record<string, unknown> = {
        source: selfUpdateOptions.source,
        force: selfUpdateOptions.force,
    };

    const trimmedVersion = selfUpdateOptions.version.trim();
    if (trimmedVersion !== '') {
        payload.version = trimmedVersion;
    }

    if (selfUpdateOptions.source === 'github') {
        payload.repo_owner = selfUpdateOptions.repoOwner.trim();
        payload.repo_name = selfUpdateOptions.repoName.trim();
    } else if (selfUpdateOptions.source === 'url') {
        payload.url = selfUpdateOptions.url.trim();
        payload.disable_checksum = selfUpdateOptions.disableChecksum;

        const trimmedSha = selfUpdateOptions.sha256.trim();
        if (trimmedSha !== '') {
            payload.sha256 = trimmedSha;
        }
    }

    try {
        const response = await axios.post<ApiResponse<{ result: Record<string, unknown> }>>(
            `/api/admin/nodes/${drawerNode.value.id}/self-update`,
            payload,
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Self-update request failed');
        }

        selfUpdateResult.value = response.data.data?.result ?? null;
        selfUpdateMessage.value =
            response.data.message || 'Self-update requested successfully. Wings will apply the update shortly.';
        toast.success(selfUpdateMessage.value);
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        const message = err.response?.data?.message || err.message || 'Failed to trigger self-update';
        selfUpdateError.value = message;
        toast.error(message);
    } finally {
        selfUpdateLoading.value = false;
    }
}

// Terminal functions
function initializeSystemTerminal(): void {
    if (!systemTerminalContainer.value || systemTerminal) return;

    // Create terminal with custom theme
    systemTerminal = new XTerm({
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
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
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 10000,
        convertEol: true,
        allowTransparency: false,
        cols: 80,
        rows: 24,
        lineHeight: 1.2,
        letterSpacing: 0,
        allowProposedApi: false,
        disableStdin: true, // Disable direct input - we'll use a form
    });

    // Load addons
    systemTerminalFitAddon = new FitAddon();
    systemTerminal.loadAddon(systemTerminalFitAddon);
    systemTerminal.loadAddon(new WebLinksAddon());

    // Open terminal in container
    systemTerminal.open(systemTerminalContainer.value);

    // Fit terminal to container
    systemTerminalFitAddon.fit();

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => {
        if (systemTerminalFitAddon && systemTerminal) {
            systemTerminalFitAddon.fit();
        }
    });

    if (systemTerminalContainer.value) {
        resizeObserver.observe(systemTerminalContainer.value);
    }

    // Write welcome message only once
    systemTerminal.writeln('\x1b[1;36m╔' + '═'.repeat(58) + '╗\x1b[0m');
    systemTerminal.writeln('\x1b[1;36m║       Welcome to FeatherPanel Host Terminal            ║\x1b[0m');
    systemTerminal.writeln('\x1b[1;36m╚' + '═'.repeat(58) + '╝\x1b[0m');
    systemTerminal.writeln('');
    systemTerminal.writeln('\x1b[90mHost: ' + (drawerNode.value?.fqdn || 'Unknown') + '\x1b[0m');
    systemTerminal.writeln('\x1b[90mCommands execute with system privileges - use with caution.\x1b[0m');
    systemTerminal.writeln('');
}

async function executeTerminalCommand(): Promise<void> {
    if (!drawerNode.value) {
        toast.error('No node selected');
        return;
    }

    const command = terminalCommandInput.value.trim();
    if (!command) {
        toast.error('Please enter a command');
        return;
    }

    if (!systemTerminal) {
        initializeSystemTerminal();
    }

    if (systemTerminal) {
        // Show command being executed with prompt
        systemTerminal.write('\r\n\x1b[1;36m❯\x1b[0m \x1b[37m' + command + '\x1b[0m\r\n');
    }

    // Execute command via backend API
    await systemTerminalComposable.executeCommand({
        command: command,
        timeout_seconds: 60,
    });

    // Clear input after execution
    terminalCommandInput.value = '';
}

function clearTerminal(): void {
    if (systemTerminal) {
        systemTerminal.clear();
        systemTerminal.writeln('\x1b[32mTerminal cleared\x1b[0m');
        systemTerminal.writeln('');
    }
}

function cleanupSystemTerminal(): void {
    systemTerminalComposable.reset();
    if (systemTerminal) {
        systemTerminal.dispose();
        systemTerminal = null;
    }
    systemTerminalFitAddon = null;
    terminalCommandInput.value = '';
}

// Utility functions for network info
function isIPv6(ip: string): boolean {
    return ip.includes(':');
}

function isPrivateIP(ip: string): boolean {
    // Check for private IP ranges
    if (isIPv6(ip)) {
        return ip.startsWith('fd') || ip.startsWith('fe80');
    }

    const octets = ip.split('.').map(Number);
    if (octets.length !== 4) return false;

    // 10.0.0.0/8
    if (octets[0] === 10) return true;

    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] && octets[1] >= 16 && octets[1] <= 31) return true;

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true;

    // 127.0.0.0/8 (localhost)
    if (octets[0] === 127) return true;

    return false;
}

function getPublicIPs(ips: string[]): string[] {
    return ips.filter((ip) => !isPrivateIP(ip) && !isIPv6(ip));
}

function getIPv6IPs(ips: string[]): string[] {
    return ips.filter((ip) => isIPv6(ip));
}

function copyToClipboard(text: string) {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(`IP address ${text} copied to clipboard`);
        })
        .catch(() => {
            toast.error('Failed to copy to clipboard');
        });
}

function getNodeHealthStatus(nodeId: number): 'healthy' | 'unhealthy' | 'unknown' {
    return nodeHealthStatus.value[nodeId] || 'unknown';
}

async function retryConnection() {
    if (drawerNode.value) {
        await fetchSystemInfo(drawerNode.value);
    }
}

// Auto-fetch health status for all nodes
async function checkAllNodesHealth() {
    if (nodes.value.length === 0) return;

    isCheckingHealth.value = true;

    try {
        // Create promises for all health checks
        const healthCheckPromises = nodes.value.map(async (node) => {
            try {
                const response = await axios.get(`/api/wings/admin/node/${node.id}/system`);
                nodeHealthStatus.value[node.id] = response.data.success ? 'healthy' : 'unhealthy';
            } catch {
                nodeHealthStatus.value[node.id] = 'unhealthy';
            }
        });

        // Execute all health checks in parallel
        await Promise.allSettled(healthCheckPromises);
    } finally {
        isCheckingHealth.value = false;
    }
}

function formatSelfUpdateResult(result: Record<string, unknown> | null): string {
    if (!result) {
        return 'No additional response data returned.';
    }

    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidIPv4Address(value: string): boolean {
    if (!value) {
        return false;
    }

    return (
        /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(value) &&
        value.split('.').every((segment) => {
            const parsed = Number(segment);
            return parsed >= 0 && parsed <= 255;
        })
    );
}

function isValidIPv6Address(value: string): boolean {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(`http://[${value}]/`);
        return url.hostname.length > 0;
    } catch {
        return false;
    }
}
</script>
