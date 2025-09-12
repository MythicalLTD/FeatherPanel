<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading nodes...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load nodes</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchNodes">Try Again</Button>
            </div>

            <!-- Nodes Table -->
            <div v-else class="p-6">
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
                    @column-toggle="handleColumnToggle"
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
                                @click="checkAllNodesHealth"
                            >
                                <RefreshCw :size="16" />
                            </Button>
                            <Button variant="outline" size="sm" @click="openCreateDrawer">
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
                            <Button size="sm" variant="outline" @click="onView(item as Node)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as Node)">
                                <Pencil :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Manage Databases"
                                @click="onDatabases(item as Node)"
                            >
                                <Database :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Manage Allocations"
                                @click="onAllocations(item as Node)"
                            >
                                <Network :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Node).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as Node)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as Node)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
            </div>
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
                                        <code>/etc/pterodactyl/config.yml</code> on your Wings daemon.
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
                        <TabsList class="grid w-full grid-cols-5">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="system">System Info</TabsTrigger>
                            <TabsTrigger value="utilization">Utilization</TabsTrigger>
                            <TabsTrigger value="docker">Docker</TabsTrigger>
                            <TabsTrigger value="network">Network</TabsTrigger>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, ArrowLeft, ArrowRight, RefreshCw, Database, Network, Plus } from 'lucide-vue-next';
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
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';

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
};

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
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
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

// Node health tracking
const nodeHealthStatus = ref<Record<number, 'healthy' | 'unhealthy' | 'unknown'>>({});
const healthCheckInterval = ref<number | null>(null);
const isCheckingHealth = ref(false);

// Wings configuration computed property
const wingsConfigYaml = computed(() => {
    console.log('wingsConfigYaml computed - editingNodeId:', editingNodeId.value);
    console.log('wingsConfigYaml computed - nodes:', nodes.value);

    if (!editingNodeId.value) return 'No node selected';

    const node = nodes.value.find((n) => n.id === editingNodeId.value);
    console.log('wingsConfigYaml computed - found node:', node);

    if (!node) return 'Node not found';

    // Check if required fields exist
    if (!node.uuid || !node.daemon_token_id || !node.daemon_token) {
        console.log('wingsConfigYaml computed - missing fields:', {
            uuid: node.uuid,
            daemon_token_id: node.daemon_token_id,
            daemon_token: node.daemon_token,
        });
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
  data: ${node.daemonBase || '/var/lib/pterodactyl/volumes'}
  sftp:
    bind_port: ${node.daemonSFTP || 2022}
allowed_mounts: []
remote: 'https://${window.location.hostname}'`;

    console.log('wingsConfigYaml computed - generated YAML:', yaml);
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
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to fetch nodes',
        };
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
    daemonBase: '/var/lib/pterodactyl/volumes',
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
        daemonBase: '/var/lib/pterodactyl/volumes',
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
        daemonBase: node.daemonBase || '/var/lib/pterodactyl/volumes',
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

    return errors;
}

async function submitForm() {
    formErrors.value = validateForm();
    if (Object.keys(formErrors.value).length > 0) return;
    formLoading.value = true;
    try {
        // Convert string boolean values to actual booleans/integers for API
        const submitData = {
            ...form.value,
            location_id: form.value.location_id ? Number(form.value.location_id) : undefined,
            public: form.value.public === 'true' ? 1 : 0,
            behind_proxy: form.value.behind_proxy === 'true' ? 1 : 0,
            maintenance_mode: form.value.maintenance_mode === 'true' ? 1 : 0,
        };

        if (drawerMode.value === 'create') {
            await axios.put('/api/admin/nodes', submitData);
            message.value = { type: 'success', text: 'Node created successfully' };
        } else if (drawerMode.value === 'edit' && editingNodeId.value) {
            await axios.patch(`/api/admin/nodes/${editingNodeId.value}`, submitData);
            message.value = { type: 'success', text: 'Node updated successfully' };
        }
        await fetchNodes();
        showDrawer.value = false;
        editingNodeId.value = null;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to save node' };
    } finally {
        formLoading.value = false;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function copyWingsConfig() {
    const textarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement;
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
        message.value = { type: 'success', text: 'Wings configuration copied to clipboard' };
        setTimeout(() => {
            message.value = null;
        }, 3000);
    } else {
        message.value = { type: 'error', text: 'Failed to copy configuration' };
        setTimeout(() => {
            message.value = null;
        }, 3000);
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
            message.value = { type: 'error', text: 'Node not found' };
            return;
        }

        const response = await axios.post(`/api/admin/nodes/${node.id}/reset-key`);
        if (response.data.success) {
            message.value = { type: 'success', text: 'Master daemon reset key requested successfully' };
            // Refresh the node data to get updated tokens
            await fetchNodes();
            confirmResetKeyRow.value = null; // Clear confirmation state
        } else {
            message.value = { type: 'error', text: response.data.message || 'Failed to request reset key' };
        }
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to request reset key' };
    }

    setTimeout(() => {
        message.value = null;
    }, 4000);
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

function handleColumnToggle(columns: string[]) {
    // Column preferences are automatically saved by the TableComponent
    console.log('Columns changed:', columns);
}

onMounted(async () => {
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
            message.value = { type: 'success', text: 'Node deleted successfully' };
            await fetchNodes();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete node' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete node',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
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

            message.value = {
                type: 'success',
                text: `Docker prune completed. Space reclaimed: ${formatBytes(spaceReclaimed)}. Images deleted: ${imagesDeleted ? imagesDeleted.length : 0}`,
            };

            // Refresh Docker data
            await fetchDockerInfo(drawerNode.value);
        } else {
            message.value = { type: 'error', text: response.data.message || 'Failed to prune Docker images' };
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: error?.response?.data?.message || 'Failed to prune Docker images' };
    } finally {
        dockerPruning.value = false;

        setTimeout(() => {
            message.value = null;
        }, 5000);
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
            message.value = { type: 'success', text: `IP address ${text} copied to clipboard` };
            setTimeout(() => {
                message.value = null;
            }, 3000);
        })
        .catch(() => {
            message.value = { type: 'error', text: 'Failed to copy to clipboard' };
            setTimeout(() => {
                message.value = null;
            }, 3000);
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

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>
