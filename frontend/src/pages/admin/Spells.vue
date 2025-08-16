<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Realms', href: '/admin/realms' },
            { text: 'Spells', isCurrent: true, href: '/admin/spells' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading spells...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load spells</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchSpells">Try Again</Button>
            </div>

            <!-- Spells Table -->
            <div v-else class="p-6">
                <TableComponent
                    :title="'Spells'"
                    :description="
                        currentRealm
                            ? `Managing spells for realm: ${currentRealm.name}`
                            : 'Manage all spells in your system.'
                    "
                    :columns="tableColumns"
                    :data="spells"
                    :search-placeholder="'Search by name, description, or author...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="mythicalpanel-spells-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                    @column-toggle="handleColumnToggle"
                >
                    <template #header-actions>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" @click="openCreateDrawer">
                                <Plus class="h-4 w-4 mr-2" />
                                Create Spell
                            </Button>
                            <label class="inline-block">
                                <Button variant="outline" size="sm" as="span">
                                    <Upload class="h-4 w-4 mr-2" />
                                    Import Spell
                                </Button>
                                <input type="file" accept="application/json" class="hidden" @change="onImportSpell" />
                            </label>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-realm="{ item }">
                        {{ (item as Spell).realm_name || '-' }}
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as Spell)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as Spell)">
                                <Pencil :size="16" />
                            </Button>
                            <Button size="sm" variant="outline" @click="onExport(item as Spell)">
                                <Download :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as Spell).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as Spell)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as Spell)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
            </div>
        </div>

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
            <DrawerContent v-if="selectedSpell">
                <DrawerHeader>
                    <DrawerTitle>Spell Info</DrawerTitle>
                    <DrawerDescription>Viewing details for spell: {{ selectedSpell.name }}</DrawerDescription>
                </DrawerHeader>
                <div class="px-6 pt-6 space-y-2">
                    <div><b>Name:</b> {{ selectedSpell.name }}</div>
                    <div><b>Description:</b> {{ selectedSpell.description || '-' }}</div>
                    <div v-if="selectedSpell.banner" class="space-y-2">
                        <div><b>Banner:</b></div>
                        <div
                            class="w-full h-32 rounded-lg border border-border bg-cover bg-center bg-no-repeat"
                            :style="{ backgroundImage: `url(${selectedSpell.banner})` }"
                        />
                    </div>
                    <div><b>Author:</b> {{ selectedSpell.author || '-' }}</div>
                    <div><b>UUID:</b> {{ selectedSpell.uuid }}</div>
                    <div><b>Realm:</b> {{ selectedSpell.realm_name || '-' }}</div>
                    <div><b>Script Container:</b> {{ selectedSpell.script_container || '-' }}</div>
                    <div><b>Script Entry:</b> {{ selectedSpell.script_entry || '-' }}</div>
                    <div><b>Privileged:</b> {{ selectedSpell.script_is_privileged ? 'Yes' : 'No' }}</div>
                    <div><b>Force Outgoing IP:</b> {{ selectedSpell.force_outgoing_ip ? 'Yes' : 'No' }}</div>
                    <div><b>Created At:</b> {{ selectedSpell.created_at }}</div>
                    <div><b>Updated At:</b> {{ selectedSpell.updated_at }}</div>
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
            <DrawerContent v-if="editingSpell">
                <DrawerHeader>
                    <DrawerTitle>Edit Spell</DrawerTitle>
                    <DrawerDescription>Edit details for spell: {{ editingSpell.name }}</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <Tabs v-model="activeEditTab" default-value="general" class="px-6 pt-2">
                    <TabsList class="mb-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="docker">Docker</TabsTrigger>
                        <TabsTrigger value="features">Features</TabsTrigger>
                        <TabsTrigger value="config">Config</TabsTrigger>
                        <TabsTrigger value="script">Script</TabsTrigger>
                        <TabsTrigger value="variables">Variables</TabsTrigger>
                    </TabsList>
                    <form class="space-y-4 pb-6 max-h-96 overflow-y-auto" @submit.prevent="submitEdit">
                        <TabsContent value="general">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="edit-name" class="block mb-1 font-medium">Name *</label>
                                    <Input id="edit-name" v-model="editForm.name" placeholder="Name" required />
                                </div>
                                <div>
                                    <label for="edit-author" class="block mb-1 font-medium">Author</label>
                                    <Input id="edit-author" v-model="editForm.author" placeholder="Author" />
                                </div>
                            </div>
                            <div>
                                <label for="edit-description" class="block mb-1 font-medium">Description</label>
                                <Input id="edit-description" v-model="editForm.description" placeholder="Description" />
                            </div>
                            <div>
                                <label for="edit-update-url" class="block mb-1 font-medium">Update URL</label>
                                <Input
                                    id="edit-update-url"
                                    v-model="editForm.update_url"
                                    placeholder="https://example.com/update"
                                />
                            </div>
                            <div>
                                <label for="edit-banner" class="block mb-1 font-medium">Banner URL</label>
                                <Input
                                    id="edit-banner"
                                    v-model="editForm.banner"
                                    placeholder="https://example.com/banner.jpg"
                                />
                                <div v-if="editForm.banner" class="mt-2">
                                    <div class="text-sm text-muted-foreground mb-1">Preview:</div>
                                    <div
                                        class="w-full h-24 rounded-lg border border-border bg-cover bg-center bg-no-repeat"
                                        :style="{ backgroundImage: `url(${editForm.banner})` }"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="docker">
                            <div>
                                <label class="block mb-1 font-medium">Docker Images</label>
                                <div class="space-y-2">
                                    <div v-for="(image, index) in editDockerImages" :key="index" class="flex gap-2">
                                        <Input v-model="image.name" placeholder="Java 8" class="flex-1" />
                                        <Input
                                            v-model="image.value"
                                            placeholder="ghcr.io/parkervcp/yolks:java_8"
                                            class="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            @click="removeEditDockerImage(index)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" @click="addEditDockerImage"
                                        >Add Docker Image</Button
                                    >
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label for="edit-script-container" class="block mb-1 font-medium"
                                        >Script Container</label
                                    >
                                    <Input
                                        id="edit-script-container"
                                        v-model="editForm.script_container"
                                        placeholder="alpine:3.4"
                                    />
                                </div>
                                <div>
                                    <label for="edit-script-entry" class="block mb-1 font-medium">Script Entry</label>
                                    <Input id="edit-script-entry" v-model="editForm.script_entry" placeholder="ash" />
                                </div>
                            </div>
                            <div class="flex items-center space-x-4 mt-4">
                                <div class="flex items-center space-x-2">
                                    <Checkbox id="edit-force-ip" v-model:checked="editForm.force_outgoing_ip" />
                                    <label for="edit-force-ip" class="text-sm font-medium">Force outgoing IP</label>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="features">
                            <div>
                                <label class="block mb-1 font-medium">Features</label>
                                <div class="space-y-2">
                                    <div v-for="(feature, index) in editFeatures" :key="index" class="flex gap-2">
                                        <Input v-model="feature.value" placeholder="eula" class="flex-1" />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            @click="removeEditFeature(index)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" @click="addEditFeature"
                                        >Add Feature</Button
                                    >
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="config">
                            <div>
                                <label for="edit-file-denylist" class="block mb-1 font-medium"
                                    >File Denylist (JSON)</label
                                >
                                <Textarea
                                    id="edit-file-denylist"
                                    v-model="editForm.file_denylist"
                                    placeholder='["file1", "file2"]'
                                />
                            </div>
                            <div>
                                <label for="edit-config-files" class="block mb-1 font-medium"
                                    >Config Files (JSON)</label
                                >
                                <Textarea
                                    id="edit-config-files"
                                    v-model="editForm.config_files"
                                    placeholder='{"file.properties": {...}}'
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="edit-config-startup" class="block mb-1 font-medium"
                                        >Config Startup (JSON)</label
                                    >
                                    <Textarea
                                        id="edit-config-startup"
                                        v-model="editForm.config_startup"
                                        placeholder='{"done": "text"}'
                                    />
                                </div>
                                <div>
                                    <label for="edit-config-logs" class="block mb-1 font-medium"
                                        >Config Logs (JSON)</label
                                    >
                                    <Textarea id="edit-config-logs" v-model="editForm.config_logs" placeholder="{}" />
                                </div>
                            </div>
                            <div>
                                <label for="edit-config-stop" class="block mb-1 font-medium">Config Stop</label>
                                <Input id="edit-config-stop" v-model="editForm.config_stop" placeholder="stop" />
                            </div>
                        </TabsContent>
                        <TabsContent value="script">
                            <div>
                                <label for="edit-script-install" class="block mb-1 font-medium">Script Install</label>
                                <Textarea
                                    id="edit-script-install"
                                    v-model="editForm.script_install"
                                    placeholder="#!/bin/bash..."
                                    class="min-h-24"
                                />
                            </div>
                            <div class="flex items-center space-x-4 mt-4">
                                <div class="flex items-center space-x-2">
                                    <Checkbox id="edit-privileged" v-model:checked="editForm.script_is_privileged" />
                                    <label for="edit-privileged" class="text-sm font-medium"
                                        >Script is privileged</label
                                    >
                                </div>
                            </div>
                            <div>
                                <label for="edit-startup" class="block mb-1 font-medium">Startup Command</label>
                                <Textarea
                                    id="edit-startup"
                                    v-model="editForm.startup"
                                    placeholder="java -jar server.jar"
                                />
                            </div>
                        </TabsContent>
                        <div v-if="activeEditTab !== 'variables'" class="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                            <Button type="submit" variant="secondary">Save</Button>
                        </div>
                    </form>
                    <TabsContent value="variables">
                        <div class="flex justify-between items-center mb-1">
                            <div class="font-semibold text-lg">Variables</div>
                            <Button
                                size="sm"
                                variant="secondary"
                                :disabled="addingVariable || editingVariable !== null"
                                @click="startAddVariable"
                                >Add Variable</Button
                            >
                        </div>
                        <Table class="mt-0 mb-0">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Env Variable</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead>User Viewable</TableHead>
                                    <TableHead>User Editable</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <!-- Inline Add Row -->
                                <TableRow v-if="addingVariable">
                                    <TableCell
                                        ><Input v-model="variableForm.name" placeholder="Name" class="w-full"
                                    /></TableCell>
                                    <TableCell
                                        ><Input
                                            v-model="variableForm.env_variable"
                                            placeholder="ENV_VARIABLE"
                                            class="w-full"
                                    /></TableCell>
                                    <TableCell
                                        ><Textarea
                                            v-model="variableForm.description"
                                            placeholder="Description"
                                            class="w-full"
                                    /></TableCell>
                                    <TableCell
                                        ><Input
                                            v-model="variableForm.default_value"
                                            placeholder="Default Value"
                                            class="w-full"
                                    /></TableCell>
                                    <TableCell class="text-center"
                                        ><Select v-model="variableForm.user_viewable">
                                            <SelectTrigger>
                                                <span>{{
                                                    variableForm.user_viewable === 'true'
                                                        ? 'Visible to users'
                                                        : 'Hidden from users'
                                                }}</span>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Visible to users</SelectItem>
                                                <SelectItem value="false">Hidden from users</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell class="text-center"
                                        ><Select v-model="variableForm.user_editable">
                                            <SelectTrigger>
                                                <span>{{
                                                    variableForm.user_editable === 'true'
                                                        ? 'Allow users to edit'
                                                        : "Don't allow users to edit"
                                                }}</span>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Allow users to edit</SelectItem>
                                                <SelectItem value="false">Don't allow users to edit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div class="flex gap-2">
                                            <Button size="sm" variant="secondary" @click="submitVariable">Save</Button>
                                            <Button size="sm" variant="outline" @click="cancelVariableEdit"
                                                >Cancel</Button
                                            >
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <!-- Inline Edit Row -->
                                <TableRow v-for="variable in spellVariables" :key="variable.id">
                                    <template v-if="editingVariable && editingVariable.id === variable.id">
                                        <TableCell><Input v-model="variableForm.name" class="w-full" /></TableCell>
                                        <TableCell
                                            ><Input v-model="variableForm.env_variable" class="w-full"
                                        /></TableCell>
                                        <TableCell
                                            ><Textarea v-model="variableForm.description" class="w-full"
                                        /></TableCell>
                                        <TableCell
                                            ><Input v-model="variableForm.default_value" class="w-full"
                                        /></TableCell>
                                        <TableCell class="text-center"
                                            ><Select v-model="variableForm.user_viewable">
                                                <SelectTrigger>
                                                    <span>{{
                                                        variableForm.user_viewable === 'true'
                                                            ? 'Visible to users'
                                                            : 'Hidden from users'
                                                    }}</span>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Visible to users</SelectItem>
                                                    <SelectItem value="false">Hidden from users</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell class="text-center"
                                            ><Select v-model="variableForm.user_editable">
                                                <SelectTrigger>
                                                    <span>{{
                                                        variableForm.user_editable === 'true'
                                                            ? 'Allow users to edit'
                                                            : "Don't allow users to edit"
                                                    }}</span>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Allow users to edit</SelectItem>
                                                    <SelectItem value="false">Don't allow users to edit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <div class="flex gap-2">
                                                <Button size="sm" variant="secondary" @click="submitVariable"
                                                    >Save</Button
                                                >
                                                <Button size="sm" variant="outline" @click="cancelVariableEdit"
                                                    >Cancel</Button
                                                >
                                            </div>
                                        </TableCell>
                                    </template>
                                    <template v-else>
                                        <TableCell>{{ variable.name }}</TableCell>
                                        <TableCell>{{ variable.env_variable }}</TableCell>
                                        <TableCell>{{ variable.description }}</TableCell>
                                        <TableCell>{{ variable.default_value }}</TableCell>
                                        <TableCell class="text-center">
                                            {{ variable.user_viewable === 'true' ? 'Visible' : 'Hidden' }}
                                        </TableCell>
                                        <TableCell class="text-center">
                                            {{ variable.user_editable === 'true' ? 'Allowed' : 'Not allowed' }}
                                        </TableCell>
                                        <TableCell>
                                            <div class="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    :disabled="
                                                        addingVariable ||
                                                        (editingVariable && editingVariable.id !== variable.id)
                                                    "
                                                    @click="startEditVariable(variable)"
                                                    ><Pencil :size="16"
                                                /></Button>
                                                <template v-if="confirmDeleteVariableRow === variable.id">
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        :loading="deleting"
                                                        @click="confirmDeleteVariable(variable)"
                                                        >Confirm Delete</Button
                                                    >
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        :disabled="deleting"
                                                        @click="onCancelDeleteVariable"
                                                        >Cancel</Button
                                                    >
                                                </template>
                                                <template v-else>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        :disabled="addingVariable || editingVariable !== null"
                                                        @click="onDeleteVariable(variable)"
                                                        ><Trash2 :size="16"
                                                    /></Button>
                                                </template>
                                            </div>
                                        </TableCell>
                                    </template>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
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
                    <DrawerTitle>Create Spell</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new spell.</DrawerDescription>
                </DrawerHeader>
                <Alert
                    v-if="drawerMessage"
                    :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                    class="mb-4 whitespace-nowrap overflow-x-auto"
                >
                    <span>{{ drawerMessage.text }}</span>
                </Alert>
                <Tabs default-value="general" class="px-6 pt-2">
                    <TabsList class="mb-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="docker">Docker</TabsTrigger>
                        <TabsTrigger value="features">Features</TabsTrigger>
                        <TabsTrigger value="config">Config</TabsTrigger>
                        <TabsTrigger value="script">Script</TabsTrigger>
                    </TabsList>
                    <form class="space-y-4 pb-6 max-h-96 overflow-y-auto" @submit.prevent="submitCreate">
                        <TabsContent value="general">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="create-name" class="block mb-1 font-medium">Name *</label>
                                    <Input id="create-name" v-model="createForm.name" placeholder="Name" required />
                                </div>
                                <div>
                                    <label for="create-author" class="block mb-1 font-medium">Author</label>
                                    <Input id="create-author" v-model="createForm.author" placeholder="Author" />
                                </div>
                            </div>
                            <div v-if="!currentRealm">
                                <label for="create-realm" class="block mb-1 font-medium">Realm *</label>
                                <Select v-model="createForm.realm_id">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a realm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="realm in realms" :key="realm.id" :value="realm.id">
                                            {{ realm.name }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label for="create-description" class="block mb-1 font-medium">Description</label>
                                <Textarea
                                    id="create-description"
                                    v-model="createForm.description"
                                    placeholder="Description"
                                />
                            </div>
                            <div>
                                <label for="create-update-url" class="block mb-1 font-medium">Update URL</label>
                                <Input
                                    id="create-update-url"
                                    v-model="createForm.update_url"
                                    placeholder="https://example.com/update"
                                />
                            </div>
                            <div>
                                <label for="create-banner" class="block mb-1 font-medium">Banner URL</label>
                                <Input
                                    id="create-banner"
                                    v-model="createForm.banner"
                                    placeholder="https://example.com/banner.jpg"
                                />
                                <div v-if="createForm.banner" class="mt-2">
                                    <div class="text-sm text-muted-foreground mb-1">Preview:</div>
                                    <div
                                        class="w-full h-24 rounded-lg border border-border bg-cover bg-center bg-no-repeat"
                                        :style="{ backgroundImage: `url(${createForm.banner})` }"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="docker">
                            <div>
                                <label class="block mb-1 font-medium">Docker Images</label>
                                <div class="space-y-2">
                                    <div v-for="(image, index) in createDockerImages" :key="index" class="flex gap-2">
                                        <Input v-model="image.name" placeholder="Java 8" class="flex-1" />
                                        <Input
                                            v-model="image.value"
                                            placeholder="ghcr.io/parkervcp/yolks:java_8"
                                            class="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            @click="removeCreateDockerImage(index)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" @click="addCreateDockerImage"
                                        >Add Docker Image</Button
                                    >
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label for="create-script-container" class="block mb-1 font-medium"
                                        >Script Container</label
                                    >
                                    <Input
                                        id="create-script-container"
                                        v-model="createForm.script_container"
                                        placeholder="alpine:3.4"
                                    />
                                </div>
                                <div>
                                    <label for="create-script-entry" class="block mb-1 font-medium">Script Entry</label>
                                    <Input
                                        id="create-script-entry"
                                        v-model="createForm.script_entry"
                                        placeholder="ash"
                                    />
                                </div>
                            </div>
                            <div class="flex items-center space-x-4 mt-4">
                                <div class="flex items-center space-x-2">
                                    <Checkbox id="create-force-ip" v-model:checked="createForm.force_outgoing_ip" />
                                    <label for="create-force-ip" class="text-sm font-medium">Force outgoing IP</label>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="features">
                            <div>
                                <label class="block mb-1 font-medium">Features</label>
                                <div class="space-y-2">
                                    <div v-for="(feature, index) in createFeatures" :key="index" class="flex gap-2">
                                        <Input v-model="feature.value" placeholder="eula" class="flex-1" />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            @click="removeCreateFeature(index)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </div>
                                    <Button type="button" size="sm" variant="outline" @click="addCreateFeature"
                                        >Add Feature</Button
                                    >
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="config">
                            <div>
                                <label for="create-file-denylist" class="block mb-1 font-medium"
                                    >File Denylist (JSON)</label
                                >
                                <Textarea
                                    id="create-file-denylist"
                                    v-model="createForm.file_denylist"
                                    placeholder='["file1", "file2"]'
                                />
                            </div>
                            <div>
                                <label for="create-config-files" class="block mb-1 font-medium"
                                    >Config Files (JSON)</label
                                >
                                <Textarea
                                    id="create-config-files"
                                    v-model="createForm.config_files"
                                    placeholder='{"file.properties": {...}}'
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label for="create-config-startup" class="block mb-1 font-medium"
                                        >Config Startup (JSON)</label
                                    >
                                    <Textarea
                                        id="create-config-startup"
                                        v-model="createForm.config_startup"
                                        placeholder='{"done": "text"}'
                                    />
                                </div>
                                <div>
                                    <label for="create-config-logs" class="block mb-1 font-medium"
                                        >Config Logs (JSON)</label
                                    >
                                    <Textarea
                                        id="create-config-logs"
                                        v-model="createForm.config_logs"
                                        placeholder="{}"
                                    />
                                </div>
                            </div>
                            <div>
                                <label for="create-config-stop" class="block mb-1 font-medium">Config Stop</label>
                                <Input id="create-config-stop" v-model="createForm.config_stop" placeholder="stop" />
                            </div>
                        </TabsContent>
                        <TabsContent value="script">
                            <div>
                                <label for="create-script-install" class="block mb-1 font-medium">Script Install</label>
                                <Textarea
                                    id="create-script-install"
                                    v-model="createForm.script_install"
                                    placeholder="#!/bin/bash..."
                                    class="min-h-24"
                                />
                            </div>
                            <div class="flex items-center space-x-4 mt-4">
                                <div class="flex items-center space-x-2">
                                    <Checkbox
                                        id="create-privileged"
                                        v-model:checked="createForm.script_is_privileged"
                                    />
                                    <label for="create-privileged" class="text-sm font-medium"
                                        >Script is privileged</label
                                    >
                                </div>
                            </div>
                            <div>
                                <label for="create-startup" class="block mb-1 font-medium">Startup Command</label>
                                <Textarea
                                    id="create-startup"
                                    v-model="createForm.startup"
                                    placeholder="java -jar server.jar"
                                />
                            </div>
                        </TabsContent>
                        <div class="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                            <Button type="submit" variant="secondary">Create</Button>
                        </div>
                    </form>
                </Tabs>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Download, Plus, Upload } from 'lucide-vue-next';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';

type Spell = {
    id: number;
    uuid: string;
    realm_id: number;
    author: string;
    name: string;
    description?: string;
    features?: string;
    docker_images?: string;
    file_denylist?: string;
    update_url?: string;
    config_files?: string;
    config_startup?: string;
    config_logs?: string;
    config_stop?: string;
    config_from?: number;
    startup?: string;
    script_container: string;
    copy_script_from?: number;
    script_entry: string;
    script_is_privileged: boolean;
    script_install?: string;
    created_at: string;
    updated_at: string;
    force_outgoing_ip: boolean;
    banner?: string;
    realm_name?: string;
};

type Realm = {
    id: number;
    name: string;
    description?: string;
    logo?: string;
    author?: string;
    created_at: string;
    updated_at: string;
};

type SpellVariable = {
    id?: number;
    spell_id?: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: 'true' | 'false';
    user_editable: 'true' | 'false';
    rules?: string;
    created_at?: string;
    updated_at?: string;
};

const route = useRoute();
const spells = ref<Spell[]>([]);
const realms = ref<Realm[]>([]);
const currentRealm = ref<Realm | null>(null);
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
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const selectedSpell = ref<Spell | null>(null);
const viewing = ref(false);
const editingSpell = ref<Spell | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    name: '',
    description: '',
    author: '',
    features: '',
    docker_images: '',
    file_denylist: '',
    update_url: '',
    banner: '',
    config_files: '',
    config_startup: '',
    config_logs: '',
    config_stop: '',
    startup: '',
    script_container: 'alpine:3.4',
    script_entry: 'ash',
    script_is_privileged: true,
    script_install: '',
    force_outgoing_ip: false,
});
const createDrawerOpen = ref(false);
const createForm = ref({
    name: '',
    description: '',
    author: '',
    realm_id: 0,
    features: '',
    docker_images: '',
    file_denylist: '',
    update_url: '',
    banner: '',
    config_files: '',
    config_startup: '',
    config_logs: '',
    config_stop: '',
    startup: '',
    script_container: 'alpine:3.4',
    script_entry: 'ash',
    script_is_privileged: true,
    script_install: '',
    force_outgoing_ip: false,
});

// Docker images management
const editDockerImages = ref<Array<{ name: string; value: string }>>([]);
const createDockerImages = ref<Array<{ name: string; value: string }>>([]);

// Features management
const editFeatures = ref<Array<{ value: string }>>([]);
const createFeatures = ref<Array<{ value: string }>>([]);

const spellVariables = ref<SpellVariable[]>([]);
const editingVariable = ref<SpellVariable | null>(null);
const variableForm = ref<SpellVariable>({
    id: undefined,
    name: '',
    env_variable: '',
    description: '',
    default_value: '',
    user_viewable: 'true',
    user_editable: 'true',
    rules: '',
});
const activeEditTab = ref('general');
const addingVariable = ref(false);
const confirmDeleteVariableRow = ref<number | null>(null);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'description', label: 'Description', searchable: true },
    { key: 'author', label: 'Author', searchable: true },
    { key: 'realm', label: 'Realm', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchSpells() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
            search: searchQuery.value || undefined,
        };

        if (currentRealm.value) {
            params.realm_id = currentRealm.value.id;
        }

        const { data } = await axios.get('/api/admin/spells', { params });
        spells.value = data.data.spells || [];

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
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to fetch spells',
        };
        spells.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

async function fetchRealms() {
    try {
        const { data } = await axios.get('/api/admin/realms');
        realms.value = data.data.realms || [];
    } catch (e: unknown) {
        console.error('Failed to fetch realms:', e);
    }
}

async function fetchCurrentRealm() {
    const realmId = route.query.realm_id;
    if (realmId) {
        try {
            const { data } = await axios.get(`/api/admin/realms/${realmId}`);
            currentRealm.value = data.data.realm;
        } catch (e: unknown) {
            console.error('Failed to fetch current realm:', e);
        }
    }
}

onMounted(async () => {
    await fetchRealms();
    await fetchCurrentRealm();
    await fetchSpells();
});

watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchSpells);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchSpells();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchSpells();
}

function handleColumnToggle(columns: string[]) {
    // Column preferences are automatically saved by the TableComponent
    console.log('Columns changed:', columns);
}

async function onView(spell: Spell) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/spells/${spell.id}`);
        selectedSpell.value = data.data.spell;
    } catch {
        selectedSpell.value = null;
        message.value = { type: 'error', text: 'Failed to fetch spell details' };
    }
}

function onEdit(spell: Spell) {
    openEditDrawer(spell);
}

async function confirmDelete(spell: Spell) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/spells/${spell.id}`);
        if (response.data && response.data.success) {
            message.value = { type: 'success', text: 'Spell deleted successfully' };
            await fetchSpells();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete spell' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete spell',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function onDelete(spell: Spell) {
    confirmDeleteRow.value = spell.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function onExport(spell: Spell) {
    try {
        const response = await axios.get(`/api/admin/spells/${spell.id}/export`, {
            responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${spell.name.toLowerCase().replace(/\s+/g, '-')}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        message.value = { type: 'success', text: 'Spell exported successfully' };
        setTimeout(() => {
            message.value = null;
        }, 4000);
    } catch {
        message.value = {
            type: 'error',
            text: 'Failed to export spell',
        };
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function closeView() {
    viewing.value = false;
    selectedSpell.value = null;
}

async function openEditDrawer(spell: Spell) {
    try {
        const { data } = await axios.get(`/api/admin/spells/${spell.id}`);
        const s: Spell = data.data.spell;
        editingSpell.value = s;

        // Parse docker images JSON to array
        editDockerImages.value = [];
        if (s.docker_images) {
            try {
                const dockerObj = JSON.parse(s.docker_images);
                editDockerImages.value = Object.entries(dockerObj).map(([name, value]) => ({
                    name,
                    value: value as string,
                }));
            } catch (e) {
                console.error('Failed to parse docker images:', e);
            }
        }

        // Parse features JSON to array
        editFeatures.value = [];
        if (s.features) {
            try {
                const featuresArray = JSON.parse(s.features);
                editFeatures.value = featuresArray.map((feature: string) => ({
                    value: feature,
                }));
            } catch (e) {
                console.error('Failed to parse features:', e);
            }
        }

        editForm.value = {
            name: s.name || '',
            description: s.description || '',
            author: s.author || '',
            features: s.features || '',
            docker_images: s.docker_images || '',
            file_denylist: s.file_denylist || '',
            update_url: s.update_url || '',
            banner: s.banner || '',
            config_files: s.config_files || '',
            config_startup: s.config_startup || '',
            config_logs: s.config_logs || '',
            config_stop: s.config_stop || '',
            startup: s.startup || '',
            script_container: s.script_container || 'alpine:3.4',
            script_entry: s.script_entry || 'ash',
            script_is_privileged: s.script_is_privileged || true,
            script_install: s.script_install || '',
            force_outgoing_ip: s.force_outgoing_ip || false,
        };
        editDrawerOpen.value = true;
    } catch {
        message.value = { type: 'error', text: 'Failed to fetch spell details for editing' };
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingSpell.value = null;
    drawerMessage.value = null;
}

async function submitEdit() {
    if (!editingSpell.value) return;
    try {
        // Convert docker images array to JSON
        const dockerImagesObj: Record<string, string> = {};
        editDockerImages.value.forEach((img) => {
            if (img.name && img.value) {
                dockerImagesObj[img.name] = img.value;
            }
        });

        // Convert features array to JSON
        const featuresArray = editFeatures.value.map((f) => f.value).filter((value) => value.trim() !== '');

        const patchData = {
            ...editForm.value,
            docker_images: Object.keys(dockerImagesObj).length > 0 ? JSON.stringify(dockerImagesObj) : '',
            features: featuresArray.length > 0 ? JSON.stringify(featuresArray) : '',
        };
        const { data } = await axios.patch(`/api/admin/spells/${editingSpell.value.id}`, patchData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Spell updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchSpells();
            closeEditDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to update spell' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update spell',
        };
    }
}

function openCreateDrawer() {
    createForm.value = {
        name: '',
        description: '',
        author: '',
        realm_id: currentRealm.value?.id || 0,
        features: '',
        docker_images: '',
        file_denylist: '',
        update_url: '',
        banner: '',
        config_files: '',
        config_startup: '',
        config_logs: '',
        config_stop: '',
        startup: '',
        script_container: 'alpine:3.4',
        script_entry: 'ash',
        script_is_privileged: true,
        script_install: '',
        force_outgoing_ip: false,
    };
    // Reset docker images array
    createDockerImages.value = [];
    // Reset features array
    createFeatures.value = [];
    createDrawerOpen.value = true;
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    drawerMessage.value = null;
    // Reset form fields
    createForm.value = {
        name: '',
        description: '',
        author: '',
        realm_id: 0,
        features: '',
        docker_images: '',
        file_denylist: '',
        update_url: '',
        banner: '',
        config_files: '',
        config_startup: '',
        config_logs: '',
        config_stop: '',
        startup: '',
        script_container: 'alpine:3.4',
        script_entry: 'ash',
        script_is_privileged: true,
        script_install: '',
        force_outgoing_ip: false,
    };
}

async function submitCreate() {
    // Validate realm_id is set (only if not in realm context)
    if (!currentRealm.value && (!createForm.value.realm_id || createForm.value.realm_id === 0)) {
        drawerMessage.value = { type: 'error', text: 'Please select a realm before creating a spell.' };
        return;
    }

    try {
        // Convert docker images array to JSON
        const dockerImagesObj: Record<string, string> = {};
        createDockerImages.value.forEach((img) => {
            if (img.name && img.value) {
                dockerImagesObj[img.name] = img.value;
            }
        });

        // Convert features array to JSON
        const featuresArray = createFeatures.value.map((f) => f.value).filter((value) => value.trim() !== '');

        const formData = {
            ...createForm.value,
            realm_id: currentRealm.value?.id || createForm.value.realm_id,
            docker_images: Object.keys(dockerImagesObj).length > 0 ? JSON.stringify(dockerImagesObj) : '',
            features: featuresArray.length > 0 ? JSON.stringify(featuresArray) : '',
        };
        const { data } = await axios.put('/api/admin/spells', formData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Spell created successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchSpells();
            closeCreateDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create spell' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create spell',
        };
    }
}

function onImportSpell(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Always require a realm_id for import
    if (currentRealm.value && currentRealm.value.id) {
        formData.append('realm_id', String(currentRealm.value.id));
    } else {
        message.value = { type: 'error', text: 'Please select a realm before importing a spell.' };
        input.value = '';
        setTimeout(() => {
            message.value = null;
        }, 4000);
        return;
    }

    axios
        .post('/api/admin/spells/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(() => {
            message.value = { type: 'success', text: 'Spell imported successfully' };
            fetchSpells();
        })
        .catch((err) => {
            message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to import spell' };
        })
        .finally(() => {
            setTimeout(() => {
                message.value = null;
            }, 4000);
            input.value = '';
        });
}

// Docker images management functions
function addEditDockerImage() {
    editDockerImages.value.push({ name: '', value: '' });
}

function removeEditDockerImage(index: number) {
    editDockerImages.value.splice(index, 1);
}

function addCreateDockerImage() {
    createDockerImages.value.push({ name: '', value: '' });
}

function removeCreateDockerImage(index: number) {
    createDockerImages.value.splice(index, 1);
}

// Features management functions
function addEditFeature() {
    editFeatures.value.push({ value: '' });
}

function removeEditFeature(index: number) {
    editFeatures.value.splice(index, 1);
}

function addCreateFeature() {
    createFeatures.value.push({ value: '' });
}

function removeCreateFeature(index: number) {
    createFeatures.value.splice(index, 1);
}

async function fetchSpellVariables() {
    if (!editingSpell.value) return;
    try {
        const { data } = await axios.get(`/api/admin/spells/${editingSpell.value.id}/variables`);
        spellVariables.value = (data.data.variables || []).map((v: SpellVariable) => ({
            ...v,
            user_viewable: v.user_viewable ? 'true' : 'false',
            user_editable: v.user_editable ? 'true' : 'false',
        }));
    } catch {
        spellVariables.value = [];
    }
}

function startAddVariable() {
    editingVariable.value = null;
    variableForm.value = {
        id: undefined,
        name: '',
        env_variable: '',
        description: '',
        default_value: '',
        user_viewable: 'true',
        user_editable: 'true',
        rules: '',
    };
    addingVariable.value = true;
}

function startEditVariable(variable: SpellVariable) {
    editingVariable.value = variable;
    variableForm.value = {
        ...variable,
        user_viewable: variable.user_viewable,
        user_editable: variable.user_editable,
    };
    addingVariable.value = false;
}

function cancelVariableEdit() {
    editingVariable.value = null;
    addingVariable.value = false;
}

async function submitVariable() {
    if (!editingSpell.value) return;
    const payload = {
        ...variableForm.value,
        user_viewable: variableForm.value.user_viewable,
        user_editable: variableForm.value.user_editable,
    };
    try {
        if (addingVariable.value) {
            await axios.post(`/api/admin/spells/${editingSpell.value.id}/variables`, payload);
        } else if (editingVariable.value) {
            await axios.patch(`/api/admin/spell-variables/${editingVariable.value.id}`, payload);
        }
        await fetchSpellVariables();
        addingVariable.value = false;
        editingVariable.value = null;
    } catch (e: unknown) {
        console.error('Failed to save variable:', e);
        message.value = { type: 'error', text: 'Failed to save variable. Please try again.' };
    }
}

function onCancelDeleteVariable() {
    confirmDeleteVariableRow.value = null;
}

function onDeleteVariable(variable: SpellVariable) {
    confirmDeleteVariableRow.value = variable.id || null;
}

async function confirmDeleteVariable(variable: SpellVariable) {
    if (!editingSpell.value) return;
    try {
        await axios.delete(`/api/admin/spell-variables/${variable.id}`);
        await fetchSpellVariables();
        confirmDeleteVariableRow.value = null;
    } catch {
        message.value = { type: 'error', text: 'Failed to delete variable' };
    }
}

watch(editingSpell, fetchSpellVariables);
</script>
