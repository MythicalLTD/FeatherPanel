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
                    <DrawerTitle>{{ drawerMode === 'create' ? 'Create Node' : 'Edit Node' }}</DrawerTitle>
                    <DrawerDescription>
                        {{
                            drawerMode === 'create' ? 'Create a new node for this location.' : 'Edit the selected node.'
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
                <form class="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]" @submit.prevent="submitForm">
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
                            v-if="drawerMode === 'create' && currentStep === steps.length - 1"
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

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { useToast } from 'vue-toastification';

// Extend Node type and form default

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
const loading = ref(true);
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
const drawerMode = ref<'create' | 'edit'>('create');
const editingNodeId = ref<number | null>(null);

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
    router.push(`/admin/nodes/${node.id}/view`);
}
function closeDrawer() {
    showDrawer.value = false;
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

function getNodeHealthStatus(nodeId: number): 'healthy' | 'unhealthy' | 'unknown' {
    return nodeHealthStatus.value[nodeId] || 'unknown';
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
