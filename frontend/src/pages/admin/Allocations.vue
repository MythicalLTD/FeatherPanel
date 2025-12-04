<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading allocations...</span>
                </div>
            </div>

            <!-- Allocations Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />
                <TableComponent
                    title="Allocations"
                    :description="`Managing allocations for node: ${currentNode?.name}`"
                    :columns="tableColumns"
                    :data="allocations"
                    :search-placeholder="'Search allocations...'"
                    :search-query="searchQuery"
                    :server-side-pagination="true"
                    :total-records="totalRecords"
                    :total-pages="totalPages"
                    :current-page="currentPage"
                    :has-next="hasNext"
                    :has-prev="hasPrev"
                    :from="from"
                    :to="to"
                    local-storage-key="featherpanel-allocations-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex items-center gap-3">
                            <div
                                v-if="isCheckingHealth"
                                class="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                            >
                                <div class="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Checking health...
                            </div>
                            <div v-if="selectedIds.length > 0" class="flex items-center gap-2">
                                <span class="text-sm text-muted-foreground">{{ selectedIds.length }} selected</span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    :disabled="isBulkDeleting || nodeHealthStatus !== 'healthy'"
                                    data-umami-event="Bulk delete allocations"
                                    :data-umami-event-count="selectedIds.length"
                                    @click="handleBulkDelete"
                                >
                                    <Trash2 class="h-4 w-4 mr-2" />
                                    Delete Selected
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="isDeleteUnusedInProgress || nodeHealthStatus !== 'healthy'"
                                :title="
                                    nodeHealthStatus !== 'healthy'
                                        ? 'Node is unhealthy'
                                        : 'Delete unused allocations for this node (optionally filter by IP/subnet)'
                                "
                                data-umami-event="Delete unused allocations"
                                @click="handleDeleteUnused"
                            >
                                <Trash2 class="h-4 w-4 mr-2" />
                                Delete Unused
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="
                                    nodeHealthStatus !== 'healthy'
                                        ? 'Node is unhealthy - cannot create allocations'
                                        : 'Create new allocation'
                                "
                                data-umami-event="Create allocation"
                                @click="openCreateDrawer"
                            >
                                <Plus class="h-4 w-4 mr-2" />
                                Create Allocation
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-select="{ item }">
                        <input
                            type="checkbox"
                            :checked="selectedIds.includes((item as unknown as Allocation).id)"
                            class="w-4 h-4 rounded border-gray-300 dark:border-gray-700"
                            @change="toggleSelection((item as unknown as Allocation).id)"
                        />
                    </template>

                    <template #cell-id="{ item }">
                        <span
                            class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold"
                        >
                            {{ (item as unknown as Allocation).id }}
                        </span>
                    </template>

                    <template #cell-ip="{ item }">
                        <div class="flex items-center gap-2">
                            <span class="font-mono">{{ (item as unknown as Allocation).ip }}</span>
                            <span
                                v-if="(item as unknown as Allocation).server_id"
                                class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                                Assigned
                            </span>
                            <span v-else class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                Available
                            </span>
                        </div>
                    </template>

                    <template #cell-port="{ item }">
                        <span class="font-mono">{{ (item as unknown as Allocation).port }}</span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="
                                    nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'View allocation details'
                                "
                                data-umami-event="View allocation"
                                :data-umami-event-allocation="`${(item as unknown as Allocation).ip}:${(item as unknown as Allocation).port}`"
                                @click="onView(item as unknown as Allocation)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'Edit allocation'"
                                data-umami-event="Edit allocation"
                                :data-umami-event-allocation="`${(item as unknown as Allocation).ip}:${(item as unknown as Allocation).port}`"
                                @click="onEdit(item as unknown as Allocation)"
                            >
                                <Edit :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as unknown as Allocation).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    :disabled="nodeHealthStatus !== 'healthy'"
                                    :title="nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'Confirm deletion'"
                                    @click="confirmDelete(item as unknown as Allocation)"
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
                                    variant="destructive"
                                    size="sm"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :disabled="nodeHealthStatus !== 'healthy'"
                                    :title="nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'Delete allocation'"
                                    @click="onDelete(item as unknown as Allocation)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Allocations help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Network class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What are Allocations?</div>
                                    <p>
                                        Allocations are IP:Port pairs a node uses to host servers. Each server needs an
                                        allocation to run and accept traffic.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <MapPin class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What you’ll need</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>IP address (from your node)</li>
                                        <li>Port or port range (e.g., 25565 or 25565-25600)</li>
                                        <li>IP alias (optional) for friendly hostname</li>
                                        <li>Notes (optional) for admin context</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Gamepad2 class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-medium text-foreground mb-1">Popular game ranges (examples)</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Minecraft: 25565-25600</li>
                                        <li>Rust: 28015-28115</li>
                                        <li>CS:GO/Source: 27015-27050</li>
                                        <li>ARK: 7777-7800, 27015-27030</li>
                                    </ul>
                                    <p class="mt-2">
                                        Recommendation: pre-create generous ranges (e.g., 25565-25900) to avoid running
                                        out during peak times.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Shield class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">Protocols & Firewall</div>
                                    <p>
                                        Allocations are TCP/UDP by default. If you’re using a firewall other than
                                        iptables, ensure these ports are allowed on both protocols. For reverse proxies
                                        or DDoS protection layers, open/forward the same ranges there too.
                                    </p>
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
    </DashboardLayout>

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
        <DrawerContent v-if="selectedAllocation">
            <DrawerHeader>
                <DrawerTitle>Allocation Info</DrawerTitle>
                <DrawerDescription
                    >Viewing details for allocation: {{ selectedAllocation.ip }}:{{
                        selectedAllocation.port
                    }}</DrawerDescription
                >
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div><b>IP Address:</b> {{ selectedAllocation.ip }}</div>
                <div><b>Port:</b> {{ selectedAllocation.port }}</div>
                <div><b>IP Alias:</b> {{ selectedAllocation.ip_alias || '-' }}</div>
                <div><b>Server:</b> {{ selectedAllocation.server_name || 'Not assigned' }}</div>
                <div><b>Notes:</b> {{ selectedAllocation.notes || '-' }}</div>
                <div><b>Created At:</b> {{ selectedAllocation.created_at }}</div>
                <div><b>Updated At:</b> {{ selectedAllocation.updated_at }}</div>
            </div>
            <div class="p-4 flex justify-end">
                <DrawerClose as-child>
                    <Button variant="outline" @click="closeView">Close</Button>
                </DrawerClose>
            </div>
        </DrawerContent>
    </Drawer>

    <!-- Edit Drawer -->
    <Drawer
        :open="editDrawerOpen"
        @update:open="
            (val: boolean) => {
                if (!val) closeEditDrawer();
            }
        "
    >
        <DrawerContent v-if="editingAllocation">
            <DrawerHeader>
                <DrawerTitle>Edit Allocation</DrawerTitle>
                <DrawerDescription
                    >Edit details for allocation: {{ editingAllocation.ip }}:{{
                        editingAllocation.port
                    }}</DrawerDescription
                >
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                <div>
                    <label for="edit-ip" class="block mb-1 font-medium">IP Address</label>
                    <Select
                        v-if="!editUsingCustomIP"
                        v-model="editForm.ip"
                        @update:model-value="
                            (value) => {
                                if (value === 'custom') {
                                    editUsingCustomIP = true;
                                    editForm.ip = '';
                                } else if (typeof value === 'string' && value) {
                                    editForm.ip = value;
                                }
                            }
                        "
                    >
                        <SelectTrigger id="edit-ip">
                            <SelectValue placeholder="Select an IP address or enter custom" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="ip in availableIPs" :key="ip" :value="ip">
                                <div class="flex items-center gap-2">
                                    <span class="font-mono">{{ ip }}</span>
                                    <span
                                        v-if="ip === '0.0.0.0'"
                                        class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                    >
                                        All interfaces
                                    </span>
                                </div>
                            </SelectItem>
                            <SelectItem value="custom" class="font-medium text-primary">
                                <div class="flex items-center gap-2">
                                    <span>+ Custom IP...</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        v-else
                        id="edit-ip"
                        v-model="editForm.ip"
                        type="text"
                        placeholder="Enter IP address (e.g., 192.168.1.1)"
                        required
                    />
                    <div class="flex items-center gap-2 mt-1">
                        <div class="text-xs text-muted-foreground flex-1">
                            <span v-if="!editUsingCustomIP">
                                Select an IP from the node or choose "Custom IP..." to enter a different address.
                            </span>
                            <span v-else>
                                Enter a custom IP address. Use <code class="text-xs">0.0.0.0</code> to bind to all
                                interfaces.
                            </span>
                        </div>
                        <Button
                            v-if="editUsingCustomIP"
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="text-xs h-auto py-0"
                            @click="
                                editUsingCustomIP = false;
                                editForm.ip = '';
                            "
                        >
                            Use dropdown
                        </Button>
                    </div>
                </div>
                <label for="edit-port" class="block mb-1 font-medium">Port</label>
                <Input
                    id="edit-port"
                    v-model="editForm.port"
                    type="number"
                    min="1"
                    max="65535"
                    placeholder="25565"
                    required
                />
                <label for="edit-ip-alias" class="block mb-1 font-medium">IP Alias (Optional)</label>
                <Input id="edit-ip-alias" v-model="editForm.ip_alias" placeholder="game.example.com" />
                <label for="edit-notes" class="block mb-1 font-medium">Notes (Optional)</label>
                <Textarea id="edit-notes" v-model="editForm.notes" placeholder="Additional notes..." />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                    <Button type="submit" variant="default">Save</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>

    <!-- Create Drawer -->
    <Drawer
        :open="createDrawerOpen"
        @update:open="
            (val) => {
                if (!val) closeCreateDrawer();
            }
        "
    >
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create Allocation</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new allocation.</DrawerDescription>
            </DrawerHeader>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                <!-- Mode Toggle -->
                <div class="space-y-2">
                    <Label class="text-sm font-medium">Creation Mode</Label>
                    <div class="flex gap-2">
                        <Button
                            type="button"
                            :variant="createMode === 'manual' ? 'default' : 'outline'"
                            class="flex-1"
                            @click="createMode = 'manual'"
                        >
                            Manual
                        </Button>
                        <Button
                            type="button"
                            :variant="createMode === 'preset' ? 'default' : 'outline'"
                            class="flex-1"
                            @click="createMode = 'preset'"
                        >
                            Preset
                        </Button>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        {{
                            createMode === 'preset' ? 'Use game presets for quick setup' : 'Manually specify port range'
                        }}
                    </p>
                </div>
                <div>
                    <label for="create-ip" class="block mb-1 font-medium">IP Address</label>
                    <Select
                        v-if="!createUsingCustomIP"
                        v-model="createForm.ip"
                        @update:model-value="
                            (value) => {
                                if (value === 'custom') {
                                    createUsingCustomIP = true;
                                    createForm.ip = '';
                                } else if (typeof value === 'string' && value) {
                                    createForm.ip = value;
                                }
                            }
                        "
                    >
                        <SelectTrigger id="create-ip">
                            <SelectValue placeholder="Select an IP address or enter custom" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="ip in availableIPs" :key="ip" :value="ip">
                                <div class="flex items-center gap-2">
                                    <span class="font-mono">{{ ip }}</span>
                                    <span
                                        v-if="ip === '0.0.0.0'"
                                        class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                    >
                                        All interfaces
                                    </span>
                                </div>
                            </SelectItem>
                            <SelectItem value="custom" class="font-medium text-primary">
                                <div class="flex items-center gap-2">
                                    <span>+ Custom IP...</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        v-else
                        id="create-ip"
                        v-model="createForm.ip"
                        type="text"
                        placeholder="Enter IP address (e.g., 192.168.1.1)"
                        required
                    />
                    <div class="flex items-center gap-2 mt-1">
                        <div class="text-xs text-muted-foreground flex-1">
                            <span v-if="!createUsingCustomIP">
                                Select an IP from the node or choose "Custom IP..." to enter a different address.
                            </span>
                            <span v-else>
                                Enter a custom IP address. Use <code class="text-xs">0.0.0.0</code> to bind to all
                                interfaces.
                            </span>
                        </div>
                        <Button
                            v-if="createUsingCustomIP"
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="text-xs h-auto py-0"
                            @click="
                                createUsingCustomIP = false;
                                createForm.ip = '';
                            "
                        >
                            Use dropdown
                        </Button>
                    </div>
                </div>

                <!-- Preset Mode -->
                <template v-if="createMode === 'preset'">
                    <div>
                        <Label for="create-game-preset" class="block mb-1 font-medium">Game Preset</Label>
                        <Select v-model="selectedGamePreset" required>
                            <SelectTrigger id="create-game-preset">
                                <SelectValue placeholder="Select a game preset" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="preset in gamePresets" :key="preset.id" :value="preset.id">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium">{{ preset.name }}</span>
                                        <span class="text-muted-foreground">Default Port {{ preset.defaultPort }}</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div v-if="selectedPreset">
                        <Label for="create-preset-count" class="block mb-1 font-medium"> Number of Ports </Label>
                        <Input
                            id="create-preset-count"
                            v-model.number="presetPortCount"
                            type="number"
                            min="1"
                            max="1000"
                            placeholder="100"
                            required
                        />
                        <div class="text-xs text-muted-foreground mt-1">
                            <template v-if="includeDefaultPort">
                                Will create ports from
                                <span class="font-mono font-medium">{{ selectedPreset.defaultPort }}</span> to
                                <span class="font-mono font-medium">{{
                                    selectedPreset.defaultPort + presetPortCount - 1
                                }}</span>
                                ({{ presetPortCount }} ports total, includes default port
                                {{ selectedPreset.defaultPort }})
                            </template>
                            <template v-else>
                                Will create ports from
                                <span class="font-mono font-medium">{{ selectedPreset.defaultPort + 1 }}</span> to
                                <span class="font-mono font-medium">{{
                                    selectedPreset.defaultPort + presetPortCount
                                }}</span>
                                ({{ presetPortCount }} ports total, excludes default port
                                {{ selectedPreset.defaultPort }})
                            </template>
                        </div>
                    </div>

                    <div
                        v-if="selectedPreset"
                        class="flex items-start gap-3 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        @click="includeDefaultPort = !includeDefaultPort"
                    >
                        <div class="flex items-center h-5 mt-0.5">
                            <input
                                id="include-default-port"
                                v-model="includeDefaultPort"
                                type="checkbox"
                                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-colors"
                            />
                        </div>
                        <div class="flex flex-col flex-1">
                            <Label for="include-default-port" class="text-sm font-medium cursor-pointer">
                                Include Default Port?
                            </Label>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{
                                    includeDefaultPort
                                        ? `Include port ${selectedPreset.defaultPort} in the range`
                                        : `Start from port ${selectedPreset.defaultPort + 1} (exclude ${selectedPreset.defaultPort})`
                                }}
                            </p>
                        </div>
                    </div>
                </template>

                <!-- Manual Mode -->
                <div v-else>
                    <Label for="create-port" class="block mb-1 font-medium">Port</Label>
                    <Input
                        id="create-port"
                        v-model="createForm.port"
                        placeholder="25565 or 25565-25700 for range"
                        required
                    />
                    <div class="text-xs text-muted-foreground mt-1">
                        Enter a single port (e.g., 25565) or a range (e.g., 25565-25700) to create multiple allocations
                        at once.
                    </div>
                </div>

                <label for="create-ip-alias" class="block mb-1 font-medium">IP Alias (Optional)</label>
                <Input id="create-ip-alias" v-model="createForm.ip_alias" placeholder="game.example.com" />
                <label for="create-notes" class="block mb-1 font-medium">Notes (Optional)</label>
                <Textarea id="create-notes" v-model="createForm.notes" placeholder="Additional notes..." />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    <Button type="submit" variant="default">Create</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>

    <!-- Bulk Delete Alert Dialog -->
    <AlertDialog :open="showBulkDeleteAlert" @update:open="showBulkDeleteAlert = $event">
        <AlertDialogContent class="bg-background text-foreground">
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Selected Allocations?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete {{ selectedIds.length }} allocation(s)? Allocations that are
                    assigned to servers will be skipped. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel as-child>
                    <Button variant="outline">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction as-child>
                    <Button variant="destructive" @click="confirmBulkDelete">Delete</Button>
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Unused Alert Dialog -->
    <AlertDialog :open="showDeleteUnusedAlert" @update:open="showDeleteUnusedAlert = $event">
        <AlertDialogContent class="bg-background text-foreground">
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Unused Allocations?</AlertDialogTitle>
                <AlertDialogDescription>
                    Delete unused allocations that are not assigned to any server. Optionally filter by IP address
                    (subnet) to delete only allocations from a specific IP. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div class="space-y-4 py-4">
                <div>
                    <label for="delete-unused-ip" class="block mb-1 text-sm font-medium">IP Address (Optional)</label>
                    <Input
                        id="delete-unused-ip"
                        v-model="deleteUnusedIpFilter"
                        type="text"
                        placeholder="e.g., 192.168.1.100 (leave empty for all IPs)"
                        class="font-mono"
                    />
                    <p class="text-xs text-muted-foreground mt-1">
                        Leave empty to delete all unused allocations, or enter a specific IP to delete only allocations
                        from that subnet/IP.
                    </p>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel as-child>
                    <Button variant="outline" @click="deleteUnusedIpFilter = ''">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction as-child>
                    <Button variant="destructive" @click="confirmDeleteUnused">Delete Unused</Button>
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
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

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Eye, Edit, Trash2, Network, MapPin, Gamepad2, Shield } from 'lucide-vue-next';
import axios from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { Allocation, Node, TableColumn } from '@/components/ui/feather-table/types';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-allocations');
const widgetsTopOfPage = computed(() => getWidgets('admin-allocations', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-allocations', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-allocations', 'after-table'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-allocations', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-allocations', 'bottom-of-page'));

const nodeIdParam = computed(() => (route.params.nodeId ? Number(route.params.nodeId) : null));
const currentNode = ref<Node | null>(null);
const nodeHealthStatus = ref<'healthy' | 'unhealthy' | 'unknown'>('unknown');
const isCheckingHealth = ref(false);
const nodeIPs = ref<string[]>([]);

const allocations = ref<Allocation[]>([]);
const searchQuery = ref('');
const loading = ref(false);
const deleting = ref(false);
const confirmDeleteRow = ref<number | null>(null);
const selectedIds = ref<number[]>([]);
const isBulkDeleting = ref(false);
const isDeleteUnusedInProgress = ref(false);

// Alert dialog state
const showBulkDeleteAlert = ref(false);
const showDeleteUnusedAlert = ref(false);
const deleteUnusedIpFilter = ref('');

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const totalRecords = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrev = ref(false);
const from = ref(0);
const to = ref(0);

// Drawer state
const viewing = ref(false);
const selectedAllocation = ref<Allocation | null>(null);
const editingAllocation = ref<Allocation | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    ip: '',
    port: '',
    ip_alias: '',
    notes: '',
});
const editUsingCustomIP = ref(false);
const createDrawerOpen = ref(false);
const createForm = ref({
    ip: '',
    port: '',
    ip_alias: '',
    notes: '',
});
const createUsingCustomIP = ref(false);
const createMode = ref<'manual' | 'preset'>('manual');
const selectedGamePreset = ref<string>('');
const presetPortCount = ref<number>(100);
const includeDefaultPort = ref(true);

// Game presets
interface GamePreset {
    id: string;
    name: string;
    defaultPort: number;
}

const gamePresets: GamePreset[] = [
    { id: 'minecraft_java', name: 'Minecraft Java Edition', defaultPort: 25565 },
    { id: 'minecraft_bedrock', name: 'Minecraft Bedrock Edition', defaultPort: 19132 },
    { id: 'rust', name: 'Rust', defaultPort: 28015 },
    { id: 'csgo', name: 'CS:GO / Source', defaultPort: 27015 },
    { id: 'ark', name: 'ARK: Survival Evolved', defaultPort: 7777 },
    { id: 'ark_query', name: 'ARK: Survival Evolved (Query)', defaultPort: 27015 },
    { id: 'valheim', name: 'Valheim', defaultPort: 2456 },
    { id: 'terraria', name: 'Terraria', defaultPort: 7777 },
    { id: 'starbound', name: 'Starbound', defaultPort: 21025 },
    { id: '7dtd', name: '7 Days to Die', defaultPort: 26900 },
    { id: 'unturned', name: 'Unturned', defaultPort: 27015 },
    { id: 'gmod', name: "Garry's Mod", defaultPort: 27015 },
    { id: 'tf2', name: 'Team Fortress 2', defaultPort: 27015 },
    { id: 'satisfactory', name: 'Satisfactory', defaultPort: 15777 },
    { id: 'palworld', name: 'Palworld', defaultPort: 8211 },
];

const selectedPreset = computed(() => {
    return gamePresets.find((p) => p.id === selectedGamePreset.value);
});

// Computed property for available IPs (node IPs + 0.0.0.0)
const availableIPs = computed(() => {
    const ips = [...nodeIPs.value];
    if (!ips.includes('0.0.0.0')) {
        ips.unshift('0.0.0.0');
    }
    return ips;
});

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'select', label: 'Select Action', headerClass: 'w-[50px]', searchable: false, hideLabelOnLayout: true },
    { key: 'id', label: 'ID', headerClass: 'w-[80px] font-semibold' },
    { key: 'ip', label: 'IP Address', searchable: true },
    { key: 'port', label: 'Port', searchable: true },
    { key: 'ip_alias', label: 'IP Alias', searchable: true },
    { key: 'server_name', label: 'Server', searchable: true },
    { key: 'notes', label: 'Notes', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const breadcrumbs = computed(() => [
    { text: 'Locations', isCurrent: false, href: '/admin/locations' },
    { text: 'Nodes', isCurrent: false, href: `/admin/nodes?location_id=${currentNode.value?.id}` },
    ...(currentNode.value
        ? [
              {
                  text: currentNode.value.name,
                  isCurrent: false,
                  href: `/admin/nodes?location_id=${currentNode.value.id}`,
              },
              {
                  text: 'Allocations',
                  isCurrent: true,
                  href: `/admin/nodes/${currentNode.value.id}/allocations`,
              },
          ]
        : []),
]);

async function checkNodeHealth(): Promise<boolean> {
    if (!nodeIdParam.value) return false;

    isCheckingHealth.value = true;
    try {
        const response = await axios.get(`/api/wings/admin/node/${nodeIdParam.value}/system`);
        const isHealthy = response.data.success;
        nodeHealthStatus.value = isHealthy ? 'healthy' : 'unhealthy';
        return isHealthy;
    } catch {
        nodeHealthStatus.value = 'unhealthy';
        return false;
    } finally {
        isCheckingHealth.value = false;
    }
}

async function fetchNodeIPs() {
    if (!nodeIdParam.value) return;

    try {
        const response = await axios.get(`/api/wings/admin/node/${nodeIdParam.value}/ips`);
        if (response.data.success) {
            nodeIPs.value = response.data.data.ips.ip_addresses || [];
        } else {
            nodeIPs.value = [];
        }
    } catch {
        nodeIPs.value = [];
    }
}

async function fetchCurrentNode() {
    if (!nodeIdParam.value) {
        router.replace('/admin/nodes');
        return;
    }
    try {
        const { data } = await axios.get(`/api/admin/nodes/${nodeIdParam.value}`);
        currentNode.value = data.data.node;
    } catch {
        currentNode.value = null;
        router.replace('/admin/nodes');
    }
}

async function fetchAllocations() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            search: searchQuery.value || undefined,
            node_id: nodeIdParam.value ?? undefined,
            page: currentPage.value,
            limit: pageSize.value,
        };

        // Remove undefined values to avoid sending them in the request
        Object.keys(params).forEach((key) => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });

        const { data } = await axios.get('/api/admin/allocations', { params });
        allocations.value = data.data.allocations || [];

        // Update pagination from server response
        const pagination = data.data.pagination;
        if (pagination) {
            currentPage.value = pagination.current_page;
            pageSize.value = pagination.per_page;
            totalRecords.value = pagination.total_records;
            totalPages.value = pagination.total_pages;
            hasNext.value = pagination.has_next;
            hasPrev.value = pagination.has_prev;
            from.value = pagination.from;
            to.value = pagination.to;
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch allocations';
        toast.error(errorMessage);
        allocations.value = [];
    } finally {
        loading.value = false;
    }
}

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    currentPage.value = 1; // Reset to first page when searching
    fetchAllocations();
}

function changePage(page: number) {
    currentPage.value = page;
    fetchAllocations();
}

async function onView(allocation: Allocation) {
    // Check health before allowing view
    if (nodeHealthStatus.value !== 'healthy') {
        toast.error('Cannot view allocation details while node is unhealthy. Please check the node status first.');
        return;
    }

    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/allocations/${allocation.id}`);
        selectedAllocation.value = data.data.allocation;
    } catch {
        selectedAllocation.value = null;
        toast.error('Failed to fetch allocation details');
    }
}

async function onEdit(allocation: Allocation) {
    // Check health before allowing edit
    if (nodeHealthStatus.value !== 'healthy') {
        toast.error('Cannot edit allocations while node is unhealthy. Please check the node status first.');
        return;
    }

    openEditDrawer(allocation);
}

async function onDelete(allocation: Allocation) {
    // Check health before allowing delete
    if (nodeHealthStatus.value !== 'healthy') {
        toast.error('Cannot delete allocations while node is unhealthy. Please check the node status first.');
        return;
    }

    confirmDeleteRow.value = allocation.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(allocation: Allocation) {
    deleting.value = true;
    try {
        const response = await axios.delete(`/api/admin/allocations/${allocation.id}`);
        if (response.data && response.data.success) {
            toast.success('Allocation deleted successfully');
            await fetchAllocations();
        } else {
            toast.error(response.data?.message || 'Failed to delete allocation');
        }
    } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string; error_code?: string } } };
        const errorMessage = error?.response?.data?.message || 'Failed to delete allocation';
        const errorCode = error?.response?.data?.error_code;

        if (errorCode === 'ALLOCATION_IN_USE') {
            toast.error('Cannot delete allocation that is assigned to a server. Please unassign it first.');
        } else {
            toast.error(errorMessage);
        }
    } finally {
        deleting.value = false;
        confirmDeleteRow.value = null;
    }
}

function closeView() {
    viewing.value = false;
    selectedAllocation.value = null;
}

async function openEditDrawer(allocation: Allocation) {
    try {
        const { data } = await axios.get(`/api/admin/allocations/${allocation.id}`);
        const a: Allocation = data.data.allocation;
        editingAllocation.value = a;
        const ip = a.ip || '';
        editForm.value = {
            ip: ip,
            port: a.port.toString() || '',
            ip_alias: a.ip_alias || '',
            notes: a.notes || '',
        };
        // Check if IP is in available IPs, if not use custom input
        editUsingCustomIP.value = !availableIPs.value.includes(ip);
        editDrawerOpen.value = true;
    } catch {
        toast.error('Failed to fetch allocation details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingAllocation.value = null;
    editUsingCustomIP.value = false;
}

async function submitEdit() {
    if (!editingAllocation.value) return;
    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/allocations/${editingAllocation.value.id}`, patchData);
        if (data && data.success) {
            toast.success('Allocation updated successfully');
            await fetchAllocations();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update allocation');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update allocation';
        toast.error(errorMessage);
    }
}

async function openCreateDrawer() {
    // Check health before allowing creation
    if (nodeHealthStatus.value !== 'healthy') {
        toast.error('Cannot create allocations while node is unhealthy. Please check the node status first.');
        return;
    }

    createDrawerOpen.value = true;
    createForm.value = { ip: '', port: '', ip_alias: '', notes: '' };
    createUsingCustomIP.value = false;
    createMode.value = 'manual';
    selectedGamePreset.value = '';
    presetPortCount.value = 100;
    includeDefaultPort.value = true;
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    createUsingCustomIP.value = false;
    createMode.value = 'manual';
    selectedGamePreset.value = '';
    presetPortCount.value = 100;
    includeDefaultPort.value = true;
}

async function submitCreate() {
    try {
        // Validate preset mode requirements
        if (createMode.value === 'preset') {
            if (!selectedGamePreset.value) {
                toast.error('Please select a game preset');
                return;
            }
            if (!selectedPreset.value) {
                toast.error('Invalid game preset selected');
                return;
            }
            if (presetPortCount.value < 1 || presetPortCount.value > 1000) {
                toast.error('Port count must be between 1 and 1000');
                return;
            }
        }

        // Determine port range
        let portRange: string;
        if (createMode.value === 'preset' && selectedPreset.value) {
            const defaultPort = selectedPreset.value.defaultPort;
            const start = includeDefaultPort.value ? defaultPort : defaultPort + 1;
            const end = start + presetPortCount.value - 1;
            portRange = `${start}-${end}`;
        } else {
            portRange = createForm.value.port;
        }

        // Create allocations
        const { data } = await axios.put('/api/admin/allocations', {
            ...createForm.value,
            node_id: nodeIdParam.value,
            port: portRange,
        });

        if (data && data.success) {
            const createdCount = data.data.created_count || 1;
            const skippedCount = data.data.skipped_count || 0;

            let message = `Created ${createdCount} allocation(s)`;
            if (skippedCount > 0) {
                message += ` (skipped ${skippedCount} existing)`;
            }

            toast.success(message);
            await fetchAllocations();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create allocation');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create allocation';
        toast.error(errorMessage);
    }
}

// Selection functions
function toggleSelection(id: number) {
    const index = selectedIds.value.indexOf(id);
    if (index === -1) {
        selectedIds.value.push(id);
    } else {
        selectedIds.value.splice(index, 1);
    }
}

// Bulk delete selected allocations
function handleBulkDelete() {
    if (selectedIds.value.length === 0) {
        toast.warning('No allocations selected');
        return;
    }

    showBulkDeleteAlert.value = true;
}

async function confirmBulkDelete() {
    showBulkDeleteAlert.value = false;
    isBulkDeleting.value = true;

    try {
        const { data } = await axios.delete('/api/admin/allocations/bulk-delete', {
            data: { ids: selectedIds.value },
        });

        if (data && data.success) {
            const deletedCount = data.data.deleted_count || 0;
            const skippedCount = data.data.skipped_count || 0;

            if (skippedCount > 0) {
                toast.warning(
                    `Deleted ${deletedCount} allocation(s). Skipped ${skippedCount} allocation(s) that are assigned to servers.`,
                );
            } else {
                toast.success(`Successfully deleted ${deletedCount} allocation(s)`);
            }

            selectedIds.value = [];
            await fetchAllocations();
        } else {
            toast.error(data?.message || 'Failed to delete allocations');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete allocations';
        toast.error(errorMessage);
    } finally {
        isBulkDeleting.value = false;
    }
}

// Delete all unused allocations for this node
function handleDeleteUnused() {
    deleteUnusedIpFilter.value = '';
    showDeleteUnusedAlert.value = true;
}

async function confirmDeleteUnused() {
    showDeleteUnusedAlert.value = false;
    isDeleteUnusedInProgress.value = true;

    try {
        const requestData: { node_id?: number; ip?: string } = {
            node_id: nodeIdParam.value ?? undefined,
        };

        // Add IP filter if provided
        if (deleteUnusedIpFilter.value && deleteUnusedIpFilter.value.trim() !== '') {
            const ip = deleteUnusedIpFilter.value.trim();
            // Basic IP validation
            const ipRegex =
                /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (!ipRegex.test(ip)) {
                toast.error('Invalid IP address format');
                isDeleteUnusedInProgress.value = false;
                showDeleteUnusedAlert.value = true;
                return;
            }
            requestData.ip = ip;
        }

        const { data } = await axios.delete('/api/admin/allocations/delete-unused', {
            data: requestData,
        });

        if (data && data.success) {
            const deletedCount = data.data.deleted_count || 0;
            let message = `Successfully deleted ${deletedCount} unused allocation(s)`;
            if (deleteUnusedIpFilter.value && deleteUnusedIpFilter.value.trim() !== '') {
                message += ` from IP ${deleteUnusedIpFilter.value.trim()}`;
            }
            toast.success(message);
            selectedIds.value = [];
            deleteUnusedIpFilter.value = '';
            await fetchAllocations();
        } else {
            toast.error(data?.message || 'Failed to delete unused allocations');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to delete unused allocations';
        toast.error(errorMessage);
    } finally {
        isDeleteUnusedInProgress.value = false;
    }
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchCurrentNode();

    // Check node health before allowing any operations
    const isHealthy = await checkNodeHealth();
    if (!isHealthy) {
        toast.error(
            'Node is currently unhealthy. Wings daemon is not responding. Please check the node status before managing allocations.',
        );
        return;
    }

    // Fetch node IPs for the dropdown
    await fetchNodeIPs();
    await fetchAllocations();
});

watch([nodeIdParam], async () => {
    if (nodeIdParam.value) {
        await fetchAllocations();
    }
});
</script>
