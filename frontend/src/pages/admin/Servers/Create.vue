<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading form data...</span>
                </div>
            </div>

            <!-- Create Server Form -->
            <div v-else class="p-6">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold">Create Server</h1>
                        <p class="text-muted-foreground mt-2">Add a new server to the panel.</p>
                    </div>

                    <form class="space-y-6" @submit.prevent="submitCreate">
                        <!-- Core Details -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Core Details</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="name" class="block mb-2 font-medium">Server Name</label>
                                    <Input
                                        id="name"
                                        v-model="form.name"
                                        placeholder="Server Name"
                                        :class="{ 'border-red-500': validationErrors.name }"
                                        required
                                    />
                                    <p v-if="validationErrors.name" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.name }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        Character limits: a-z A-Z 0-9 _ - . and [Space].
                                    </p>
                                </div>
                                <div>
                                    <label for="description" class="block mb-2 font-medium">Server Description</label>
                                    <Input
                                        id="description"
                                        v-model="form.description"
                                        placeholder="A brief description of this server."
                                        :class="{ 'border-red-500': validationErrors.description }"
                                        required
                                    />
                                    <p v-if="validationErrors.description" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.description }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        A brief description of this server.
                                    </p>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="owner" class="block mb-2 font-medium">Server Owner</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    class="w-full justify-between"
                                    :class="validationErrors.owner_id ? 'border-red-500' : ''"
                                    @click="userModal.openModal()"
                                >
                                    {{ getSelectedOwnerName() || 'Select owner...' }}
                                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                <p v-if="validationErrors.owner_id" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.owner_id }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">
                                    Email address of the Server Owner.
                                </p>
                            </div>
                            <div class="mt-6">
                                <label for="skip-scripts" class="block mb-2 font-medium">Skip Scripts</label>
                                <Select
                                    :model-value="String(form.skip_scripts)"
                                    @update:model-value="(value: any) => (form.skip_scripts = String(value) === 'true')"
                                >
                                    <SelectTrigger :class="{ 'border-red-500': validationErrors.skip_scripts }">
                                        <SelectValue placeholder="Select script behavior..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="option in SKIP_SCRIPTS_OPTIONS"
                                            :key="String(option.value)"
                                            :value="String(option.value)"
                                        >
                                            {{ option.label }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p v-if="validationErrors.skip_scripts" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.skip_scripts }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">
                                    Whether to skip startup scripts during server initialization.
                                </p>
                            </div>
                        </div>

                        <!-- Allocation Management -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Allocation Management</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="location" class="block mb-2 font-medium">Location</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="w-full justify-between"
                                        :class="validationErrors.location_id ? 'border-red-500' : ''"
                                        @click="locationModal.openModal()"
                                    >
                                        {{ getSelectedLocationName() || 'Select location...' }}
                                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    <p v-if="validationErrors.location_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.location_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The location where this server will be deployed.
                                    </p>
                                </div>
                                <div>
                                    <label for="node" class="block mb-2 font-medium">Node</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="w-full justify-between"
                                        :class="validationErrors.node_id ? 'border-red-500' : ''"
                                        :disabled="!form.location_id"
                                        @click="nodeModal.openModal()"
                                    >
                                        {{ getSelectedNodeName() || 'Select node...' }}
                                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    <p v-if="validationErrors.node_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.node_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The node which this server will be deployed to.
                                    </p>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="allocation" class="block mb-2 font-medium">Default Allocation</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    class="w-full justify-between"
                                    :class="validationErrors.allocation_id ? 'border-red-500' : ''"
                                    :disabled="!form.node_id"
                                    @click="allocationModal.openModal()"
                                >
                                    {{ getSelectedAllocationName() || 'Select allocation...' }}
                                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                <p v-if="validationErrors.allocation_id" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.allocation_id }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">
                                    The main allocation that will be assigned to this server.
                                </p>
                            </div>
                        </div>

                        <!-- Application Configuration -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Application Configuration</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="realm" class="block mb-2 font-medium">Realm</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="w-full justify-between"
                                        :class="validationErrors.realms_id ? 'border-red-500' : ''"
                                        @click="realmModal.openModal()"
                                    >
                                        {{ getSelectedRealmName() || 'Select a realm...' }}
                                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    <p v-if="validationErrors.realms_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.realms_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The realm that this server will be grouped under.
                                    </p>
                                </div>
                                <div>
                                    <label for="spell" class="block mb-2 font-medium">Spell</label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        class="w-full justify-between"
                                        :class="validationErrors.spell_id ? 'border-red-500' : ''"
                                        :disabled="!form.realms_id"
                                        @click="spellModal.openModal()"
                                    >
                                        {{ getSelectedSpellName() || 'Select a spell...' }}
                                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    <p v-if="validationErrors.spell_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.spell_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The spell that will define how this server should operate.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Spell Configuration -->
                        <div v-if="selectedSpell" class="bg-card border rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-xl font-semibold">Spell Configuration</h2>
                                <div
                                    v-if="spellVariables.some((v) => v.rules.includes('required'))"
                                    class="flex items-center gap-2"
                                >
                                    <span class="text-xs text-muted-foreground">Required variables marked with</span>
                                    <span class="text-red-500 text-sm font-medium">*</span>
                                </div>
                            </div>

                            <!-- Docker Image Selection -->
                            <div v-if="availableDockerImages.length > 0" class="mb-6">
                                <label for="docker-image" class="block mb-2 font-medium">Docker Image</label>
                                <Popover v-model:open="dockerImagePopoverOpen">
                                    <PopoverTrigger as-child>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            :aria-expanded="dockerImagePopoverOpen"
                                            :class="
                                                cn(
                                                    'w-full justify-between',
                                                    validationErrors.image ? 'border-red-500' : '',
                                                )
                                            "
                                        >
                                            {{ selectedDockerImage || 'Select Docker image...' }}
                                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent class="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search Docker images..." />
                                            <CommandEmpty>No Docker image found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    v-for="image in availableDockerImages"
                                                    :key="image"
                                                    :value="image"
                                                    @select="selectDockerImage(image)"
                                                >
                                                    <Check
                                                        :class="
                                                            cn(
                                                                'mr-2 h-4 w-4',
                                                                selectedDockerImage === image
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )
                                                        "
                                                    />
                                                    <div>
                                                        <div class="font-medium">{{ image }}</div>
                                                        <div class="text-xs text-muted-foreground">
                                                            Docker image for this spell
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <p v-if="validationErrors.image" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.image }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">
                                    Select the Docker image for this spell. This will be used to deploy the server.
                                </p>
                            </div>

                            <!-- Spell Variables -->
                            <div v-if="spellVariables.length > 0" class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-medium">Service Variables</h3>
                                    <div
                                        v-if="spellVariables.filter((v) => v.rules.includes('required')).length > 0"
                                        class="text-sm text-muted-foreground"
                                    >
                                        {{ spellVariables.filter((v) => v.rules.includes('required')).length }} required
                                    </div>
                                </div>
                                <div class="space-y-6">
                                    <div
                                        v-for="variable in spellVariables"
                                        :key="variable.id"
                                        class="border rounded-lg p-4"
                                    >
                                        <div class="space-y-3">
                                            <div>
                                                <label :for="variable.env_variable" class="block mb-2 font-medium">
                                                    {{ variable.name }}
                                                    <span
                                                        v-if="variable.rules.includes('required')"
                                                        class="text-red-500 ml-1"
                                                        >*</span
                                                    >
                                                </label>
                                                <Input
                                                    :id="variable.env_variable"
                                                    v-model="spellVariableValues[variable.env_variable]"
                                                    :placeholder="variable.default_value"
                                                    :class="{
                                                        'border-red-500': validationErrors[variable.env_variable],
                                                    }"
                                                    :required="variable.rules.includes('required')"
                                                />
                                                <p
                                                    v-if="validationErrors[variable.env_variable]"
                                                    class="text-xs text-red-500 mt-1"
                                                >
                                                    {{ validationErrors[variable.env_variable] }}
                                                </p>
                                                <p
                                                    v-else-if="variable.rules.includes('required')"
                                                    class="text-xs text-muted-foreground mt-1"
                                                >
                                                    This variable is required
                                                </p>
                                            </div>

                                            <div class="space-y-2">
                                                <p class="text-sm text-muted-foreground">
                                                    {{ variable.description }}
                                                </p>
                                                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span class="font-medium">Access in Startup:</span>
                                                    <code class="bg-muted px-2 py-1 rounded"
                                                        >&#123;&#123;{{ variable.env_variable }}&#125;&#125;</code
                                                    >
                                                </div>

                                                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span class="font-medium">Validation Rules:</span>
                                                    <code class="bg-muted px-2 py-1 rounded">{{ variable.rules }}</code>
                                                </div>

                                                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span class="font-medium">Field Type:</span>
                                                    <span class="capitalize">{{ variable.field_type }}</span>
                                                </div>

                                                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span class="font-medium">User Editable:</span>
                                                    <span>{{ variable.user_editable ? 'Yes' : 'No' }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Spell Description -->
                            <div v-if="selectedSpell.description" class="mt-6">
                                <h3 class="text-lg font-medium mb-2">Description</h3>
                                <p class="text-sm text-muted-foreground">{{ selectedSpell.description }}</p>
                            </div>
                        </div>

                        <!-- Resource Management -->
                        <div class="bg-card border rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-xl font-semibold">Resource Management</h2>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-muted-foreground">Preferences saved</span>
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="memory" class="block mb-2 font-medium">Memory (MiB)</label>
                                    <Input
                                        id="memory"
                                        v-model.number="form.memory"
                                        type="number"
                                        placeholder="1024"
                                        min="128"
                                        :class="{ 'border-red-500': validationErrors.memory }"
                                        required
                                    />
                                    <p v-if="validationErrors.memory" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.memory }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of memory allowed for this container. Setting this to 0 will
                                        allow unlimited memory usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="swap" class="block mb-2 font-medium">Swap (MiB)</label>
                                    <Input
                                        id="swap"
                                        v-model.number="form.swap"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        :class="{ 'border-red-500': validationErrors.swap }"
                                        required
                                    />
                                    <p v-if="validationErrors.swap" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.swap }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of swap allowed for this container. Setting this to 0 will
                                        disable swap space.
                                    </p>
                                </div>
                                <div>
                                    <label for="disk" class="block mb-2 font-medium">Disk Space (MiB)</label>
                                    <Input
                                        id="disk"
                                        v-model.number="form.disk"
                                        type="number"
                                        placeholder="1024"
                                        min="1024"
                                        :class="{ 'border-red-500': validationErrors.disk }"
                                        required
                                    />
                                    <p v-if="validationErrors.disk" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.disk }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of disk space allowed for this container. Setting this to 0
                                        will allow unlimited disk usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="cpu" class="block mb-2 font-medium">CPU Limit (%)</label>
                                    <Input
                                        id="cpu"
                                        v-model.number="form.cpu"
                                        type="number"
                                        placeholder="100"
                                        :class="{ 'border-red-500': validationErrors.cpu }"
                                        required
                                    />
                                    <p v-if="validationErrors.cpu" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.cpu }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of CPU allowed for this container. Setting this to 0 will
                                        allow unlimited CPU usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="io" class="block mb-2 font-medium">Block IO Weight</label>
                                    <Input
                                        id="io"
                                        v-model.number="form.io"
                                        type="number"
                                        placeholder="500"
                                        min="10"
                                        max="1000"
                                        :class="{ 'border-red-500': validationErrors.io }"
                                        required
                                    />
                                    <p v-if="validationErrors.io" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.io }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        Advanced: The IO performance of this server relative to other running
                                        containers. A value between 10 and 1000.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Application Feature Limits -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Application Feature Limits</h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label for="database_limit" class="block mb-2 font-medium">Database Limit</label>
                                    <Input
                                        id="database_limit"
                                        v-model.number="form.database_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of databases a user is allowed to create for this server.
                                    </p>
                                </div>
                                <div>
                                    <label for="allocation_limit" class="block mb-2 font-medium"
                                        >Allocation Limit</label
                                    >
                                    <Input
                                        id="allocation_limit"
                                        v-model.number="form.allocation_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of allocations a user is allowed to create for this server.
                                    </p>
                                </div>
                                <div>
                                    <label for="backup_limit" class="block mb-2 font-medium">Backup Limit</label>
                                    <Input
                                        id="backup_limit"
                                        v-model.number="form.backup_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of backups that can be created for this server.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Startup Configuration -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Startup Configuration</h2>
                            <div class="grid grid-cols-1 gap-6">
                                <div>
                                    <label for="startup-command" class="block mb-2 font-medium">Startup Command</label>
                                    <Input
                                        id="startup-command"
                                        v-model="form.startup"
                                        placeholder="java -jar server.jar"
                                        :class="{ 'border-red-500': validationErrors.startup }"
                                        required
                                    />
                                    <p v-if="validationErrors.startup" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.startup }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The command that will be used to start the server.
                                        {{ selectedSpell ? 'Populated from selected spell.' : '' }} The following data
                                        substitutes are available: <code>&#123;&#123;SERVER_MEMORY&#125;&#125;</code>,
                                        <code>&#123;&#123;SERVER_IP&#125;&#125;</code>,
                                        <code>&#123;&#123;SERVER_PORT&#125;&#125;</code>, and spell variables.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Form Actions -->
                        <div class="flex justify-end gap-4">
                            <Button type="button" variant="outline" @click="$router.push('/admin/servers')">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                :loading="submitting"
                                class="bg-green-600 hover:bg-green-700"
                            >
                                Create Server
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Selection Modals -->
        <SelectionModal
            :is-open="locationModal.state.value.isOpen"
            title="Select Location"
            description="Choose a location for your server deployment"
            item-type="location"
            search-placeholder="Search locations..."
            :items="locationModal.state.value.items"
            :loading="locationModal.state.value.loading"
            :current-page="locationModal.state.value.currentPage"
            :total-pages="locationModal.state.value.totalPages"
            :total-items="locationModal.state.value.totalItems"
            :page-size="20"
            :selected-item="locationModal.state.value.selectedItem"
            :search-query="locationModal.state.value.searchQuery"
            @update:open="locationModal.closeModal"
            @search="locationModal.handleSearch"
            @search-query-update="locationModal.handleSearchQueryUpdate"
            @page-change="locationModal.handlePageChange"
            @select="locationModal.selectItem"
            @confirm="selectLocation(locationModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.name }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">
                            {{ item.description || 'No description available' }}
                        </p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>

        <SelectionModal
            :is-open="userModal.state.value.isOpen"
            title="Select Server Owner"
            description="Choose a user to own this server"
            item-type="user"
            search-placeholder="Search users by username or email..."
            :items="userModal.state.value.items"
            :loading="userModal.state.value.loading"
            :current-page="userModal.state.value.currentPage"
            :total-pages="userModal.state.value.totalPages"
            :total-items="userModal.state.value.totalItems"
            :page-size="20"
            :selected-item="userModal.state.value.selectedItem"
            :search-query="userModal.state.value.searchQuery"
            @update:open="userModal.closeModal"
            @search="userModal.handleSearch"
            @search-query-update="userModal.handleSearchQueryUpdate"
            @page-change="userModal.handlePageChange"
            @select="userModal.selectItem"
            @confirm="selectOwner(userModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.username }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">{{ item.email }}</p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>

        <SelectionModal
            :is-open="nodeModal.state.value.isOpen"
            title="Select Node"
            description="Choose a node for your server deployment"
            item-type="node"
            search-placeholder="Search nodes by name or FQDN..."
            :items="nodeModal.state.value.items"
            :loading="nodeModal.state.value.loading"
            :current-page="nodeModal.state.value.currentPage"
            :total-pages="nodeModal.state.value.totalPages"
            :total-items="nodeModal.state.value.totalItems"
            :page-size="20"
            :selected-item="nodeModal.state.value.selectedItem"
            :search-query="nodeModal.state.value.searchQuery"
            @update:open="nodeModal.closeModal"
            @search="nodeModal.handleSearch"
            @search-query-update="nodeModal.handleSearchQueryUpdate"
            @page-change="nodeModal.handlePageChange"
            @select="nodeModal.selectItem"
            @confirm="selectNode(nodeModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate">{{ item.name }}</h4>
                        <p class="text-sm text-muted-foreground truncate">{{ item.fqdn || 'No FQDN' }}</p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-4">
                        <Check class="h-5 w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>

        <SelectionModal
            :is-open="realmModal.state.value.isOpen"
            title="Select Realm"
            description="Choose a realm for your server deployment"
            item-type="realm"
            search-placeholder="Search realms by name..."
            :items="realmModal.state.value.items"
            :loading="realmModal.state.value.loading"
            :current-page="realmModal.state.value.currentPage"
            :total-pages="realmModal.state.value.totalPages"
            :total-items="realmModal.state.value.totalItems"
            :page-size="20"
            :selected-item="realmModal.state.value.selectedItem"
            :search-query="realmModal.state.value.searchQuery"
            @update:open="realmModal.closeModal"
            @search="realmModal.handleSearch"
            @search-query-update="realmModal.handleSearchQueryUpdate"
            @page-change="realmModal.handlePageChange"
            @select="realmModal.selectItem"
            @confirm="selectRealm(realmModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.name }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">
                            {{ item.description || 'No description available' }}
                        </p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>

        <SelectionModal
            :is-open="spellModal.state.value.isOpen"
            title="Select Spell"
            description="Choose a spell for your server configuration"
            item-type="spell"
            search-placeholder="Search spells by name..."
            :items="spellModal.state.value.items"
            :loading="spellModal.state.value.loading"
            :current-page="spellModal.state.value.currentPage"
            :total-pages="spellModal.state.value.totalPages"
            :total-items="spellModal.state.value.totalItems"
            :page-size="20"
            :selected-item="spellModal.state.value.selectedItem"
            :search-query="spellModal.state.value.searchQuery"
            @update:open="spellModal.closeModal"
            @search="spellModal.handleSearch"
            @search-query-update="spellModal.handleSearchQueryUpdate"
            @page-change="spellModal.handlePageChange"
            @select="spellModal.selectItem"
            @confirm="selectSpell(spellModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.name }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">
                            {{ item.description || 'No description available' }}
                        </p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                </div>
            </template>
        </SelectionModal>

        <SelectionModal
            :is-open="allocationModal.state.value.isOpen"
            title="Select Allocation"
            description="Choose an allocation for your server"
            item-type="allocation"
            search-placeholder="Search allocations by IP or port..."
            :items="allocationModal.state.value.items"
            :loading="allocationModal.state.value.loading"
            :current-page="allocationModal.state.value.currentPage"
            :total-pages="allocationModal.state.value.totalPages"
            :total-items="allocationModal.state.value.totalItems"
            :page-size="20"
            :selected-item="allocationModal.state.value.selectedItem"
            :search-query="allocationModal.state.value.searchQuery"
            @update:open="allocationModal.closeModal"
            @search="allocationModal.handleSearch"
            @search-query-update="allocationModal.handleSearchQueryUpdate"
            @page-change="allocationModal.handlePageChange"
            @select="allocationModal.selectItem"
            @confirm="selectAllocation(allocationModal.confirmSelection())"
        >
            <template #default="{ item, isSelected }">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium truncate text-sm sm:text-base">{{ item.ip }}:{{ item.port }}</h4>
                        <p class="text-xs sm:text-sm text-muted-foreground truncate">Node ID: {{ item.node_id }}</p>
                    </div>
                    <div v-if="isSelected" class="flex-shrink-0 ml-2 sm:ml-4">
                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
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

import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { SelectionModal } from '@/components/ui/selection-modal';
import { useSelectionModal } from '@/composables/useSelectionModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from 'vue-toastification';
import { cn } from '@/lib/utils';
import type {
    ApiLocation,
    ApiNode,
    ApiUser,
    ApiRealm,
    ApiSpell,
    ApiAllocation,
    ApiSpellVariable,
    CreateForm,
    AxiosError,
} from '@/types/admin/server';

const router = useRouter();
const toast = useToast();

// Skip scripts options
const SKIP_SCRIPTS_OPTIONS = [
    { value: false, label: 'No - Run scripts normally' },
    { value: true, label: 'Yes - Skip startup scripts' },
];

// Breadcrumbs
const breadcrumbs = [
    { text: 'Admin', to: '/admin' },
    { text: 'Servers', to: '/admin/servers' },
    { text: 'Create', to: '/admin/servers/create' },
];

// Loading states
const loading = ref(false);
const submitting = ref(false);

// Popover open states
const dockerImagePopoverOpen = ref(false);

// Form data
const form = ref<CreateForm>({
    node_id: '',
    name: '',
    description: '',
    owner_id: '',
    memory: 1024,
    swap: 0,
    disk: 1024,
    io: 500,
    cpu: 100,
    allocation_id: '',
    realms_id: '',
    spell_id: '',
    startup: 'java -jar server.jar',
    image: 'quay.io/pterodactyl/core:java',
    database_limit: 0,
    allocation_limit: 0,
    backup_limit: 0,
    skip_scripts: false,
    location_id: '',
});

function convertToMiB(value: number): number {
    // Always return the value as-is since we only use MiB
    return value;
}

function convertToPercentage(value: number): number {
    // Always return the value as-is since we only use percentage
    return value;
}

// Dropdown data
const locations = ref<ApiLocation[]>([]);
const nodes = ref<ApiNode[]>([]);
const realms = ref<ApiRealm[]>([]);
const spells = ref<ApiSpell[]>([]);
const allocations = ref<ApiAllocation[]>([]);

// Selection modals
const locationModal = useSelectionModal('/api/admin/locations', 20, 'search', 'page');
const userModal = useSelectionModal('/api/admin/users', 20, 'search', 'page');
const nodeModal = useSelectionModal('/api/admin/nodes', 20, 'search', 'page');
const realmModal = useSelectionModal('/api/admin/realms', 20, 'search', 'page');
const spellModal = useSelectionModal('/api/admin/spells', 20, 'search', 'page');
const allocationModal = useSelectionModal('/api/admin/allocations?not_used=true', 20, 'search', 'page');

// Spell configuration data
const selectedSpell = ref<ApiSpell | null>(null);
const spellVariables = ref<ApiSpellVariable[]>([]);
const spellVariableValues = ref<Record<string, string>>({});
const availableDockerImages = ref<string[]>([]);
const selectedDockerImage = ref<string>('');

// Computed filtered lists with hierarchical filtering
const filteredNodes = computed(() => {
    if (!form.value.location_id) return [];
    return nodes.value.filter((node) => node.location_id === Number(form.value.location_id));
});

const filteredRealms = computed(() => {
    // Since realms don't have location_id in the API response, show all realms
    return realms.value;
});

const filteredSpells = computed(() => {
    if (!form.value.realms_id) return [];
    return spells.value.filter((spell) => spell.realm_id === Number(form.value.realms_id));
});

const filteredAllocations = computed(() => {
    if (!form.value.node_id) return [];
    return allocations.value.filter((allocation) => allocation.node_id === Number(form.value.node_id));
});

// Get selected names for display
function getSelectedOwnerName() {
    // First check if we have the user in the modal's current results
    const modalSelected = userModal.state.value.items.find((user) => String(user.id) === form.value.owner_id);
    if (modalSelected) return `${modalSelected.username} (${modalSelected.email})`;

    // Fallback to the original userSearchResults array
    const selected = userSearchResults.value.find((user) => String(user.id) === form.value.owner_id);
    return selected ? `${selected.username} (${selected.email})` : '';
}

function getSelectedLocationName() {
    // First check if we have the location in the modal's current results
    const modalSelected = locationModal.state.value.items.find(
        (location) => String(location.id) === form.value.location_id,
    );
    if (modalSelected) return modalSelected.name;

    // Fallback to the original locations array
    const selected = locations.value.find((location) => String(location.id) === form.value.location_id);
    return selected ? selected.name : '';
}

function getSelectedNodeName() {
    // First check if we have the node in the modal's current results
    const modalSelected = nodeModal.state.value.items.find((node) => String(node.id) === form.value.node_id);
    if (modalSelected) return `${modalSelected.name} (${modalSelected.fqdn})`;

    // Fallback to the original filteredNodes array
    const selected = filteredNodes.value.find((node) => String(node.id) === form.value.node_id);
    return selected ? `${selected.name} (${selected.fqdn})` : '';
}

function getSelectedAllocationName() {
    // First check if we have the allocation in the modal's current results
    const modalSelected = allocationModal.state.value.items.find(
        (allocation) => String(allocation.id) === form.value.allocation_id,
    );
    if (modalSelected) return `${modalSelected.ip}:${modalSelected.port}`;

    // Fallback to the original filteredAllocations array
    const selected = filteredAllocations.value.find((allocation) => String(allocation.id) === form.value.allocation_id);
    return selected ? `${selected.ip}:${selected.port}` : '';
}

function getSelectedRealmName() {
    // First check if we have the realm in the modal's current results
    const modalSelected = realmModal.state.value.items.find((realm) => String(realm.id) === form.value.realms_id);
    if (modalSelected) return modalSelected.name;

    // Fallback to the original filteredRealms array
    const selected = filteredRealms.value.find((realm) => String(realm.id) === form.value.realms_id);
    return selected ? selected.name : '';
}

function getSelectedSpellName() {
    // First check if we have the spell in the modal's current results
    const modalSelected = spellModal.state.value.items.find((spell) => String(spell.id) === form.value.spell_id);
    if (modalSelected) return modalSelected.name;

    // Fallback to the original filteredSpells array
    const selected = filteredSpells.value.find((spell) => String(spell.id) === form.value.spell_id);
    return selected ? selected.name : '';
}

// Selection functions
function selectLocation(location: ApiLocation) {
    form.value.location_id = String(location.id);
    // Reset dependent selections
    form.value.node_id = '';
    form.value.allocation_id = '';
    locationModal.closeModal();
}

function selectNode(node: ApiNode) {
    form.value.node_id = String(node.id);
    // Reset allocation selection
    form.value.allocation_id = '';
    nodeModal.closeModal();
}

function selectOwner(user: ApiUser) {
    if (user && user.id > 0) {
        form.value.owner_id = String(user.id);
    }
    userModal.closeModal();
}

function selectRealm(realm: ApiRealm) {
    form.value.realms_id = String(realm.id);
    // Reset spell selection
    form.value.spell_id = '';
    realmModal.closeModal();
}

function selectSpell(spell: ApiSpell) {
    form.value.spell_id = String(spell.id);
    spellModal.closeModal();

    // Fetch spell details and variables
    fetchSpellDetails(spell.id);
}

// Fetch spell details and variables
async function fetchSpellDetails(spellId: number) {
    try {
        const [spellRes, variablesRes] = await Promise.all([
            axios.get(`/api/admin/spells/${spellId}`),
            axios.get(`/api/admin/spells/${spellId}/variables`),
        ]);

        if (spellRes.data?.success) {
            selectedSpell.value = spellRes.data.data.spell;

            // Parse docker images
            if (selectedSpell.value?.docker_images) {
                try {
                    const dockerImagesObj = JSON.parse(selectedSpell.value.docker_images);
                    availableDockerImages.value = Object.values(dockerImagesObj);
                    selectedDockerImage.value = availableDockerImages.value[0] || '';
                } catch (e) {
                    console.error('Failed to parse docker images:', e);
                    availableDockerImages.value = [];
                    selectedDockerImage.value = '';
                }
            }

            // Update startup command if available
            if (selectedSpell.value?.startup) {
                form.value.startup = selectedSpell.value.startup;
            }

            // Update docker image if available
            if (selectedDockerImage.value) {
                form.value.image = selectedDockerImage.value;
            }
        }

        if (variablesRes.data?.success) {
            spellVariables.value = variablesRes.data.data.variables || [];

            // Initialize variable values with defaults
            spellVariableValues.value = {};
            spellVariables.value.forEach((variable) => {
                spellVariableValues.value[variable.env_variable] = variable.default_value;
            });
        }
    } catch (error: unknown) {
        console.error('Failed to fetch spell details:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to fetch spell details.');
    }
}

function selectAllocation(allocation: ApiAllocation) {
    form.value.allocation_id = String(allocation.id);
    allocationModal.closeModal();
}

function selectDockerImage(image: string) {
    selectedDockerImage.value = image;
    form.value.image = image;
    dockerImagePopoverOpen.value = false;
}

// Search users with debouncing
const userSearchResults = ref<ApiUser[]>([]);

// Load form data
async function loadFormData() {
    loading.value = true;
    try {
        const [locationsRes, nodesRes, realmsRes, spellsRes, allocationsRes] = await Promise.all([
            axios.get('/api/admin/locations'),
            axios.get('/api/admin/nodes'),
            axios.get('/api/admin/realms'),
            axios.get('/api/admin/spells'),
            axios.get('/api/admin/allocations?not_used=true'),
        ]);

        locations.value = locationsRes.data?.data?.locations || [];
        nodes.value = nodesRes.data?.data?.nodes || [];
        realms.value = realmsRes.data?.data?.realms || [];
        spells.value = spellsRes.data?.data?.spells || [];
        allocations.value = allocationsRes.data?.data?.allocations || [];

        if (
            locations.value.length === 0 ||
            nodes.value.length === 0 ||
            realms.value.length === 0 ||
            spells.value.length === 0 ||
            allocations.value.length === 0
        ) {
            toast.warning(
                'Some data (locations, nodes, realms, spells, or allocations) could not be loaded or are empty. Please ensure they are configured.',
            );
        }
    } catch (error: unknown) {
        console.error('Failed to load form data:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to load form data.');
    } finally {
        loading.value = false;
    }
}

// Validation state
const validationErrors = ref<Record<string, string>>({});

// Validation function
function validateForm(): boolean {
    validationErrors.value = {};

    // Required fields validation with regex patterns
    if (!form.value.name?.trim()) {
        validationErrors.value.name = 'Server name is required';
    } else if (form.value.name.length < 1 || form.value.name.length > 191) {
        validationErrors.value.name = 'Server name must be between 1 and 191 characters';
    } else {
        // Server name regex: a-z A-Z 0-9 _ - . and spaces
        const nameRegex = /^[a-zA-Z0-9_.\-\s]+$/;
        if (!nameRegex.test(form.value.name)) {
            validationErrors.value.name =
                'Server name can only contain letters, numbers, spaces, hyphens, underscores, and dots';
        }
    }

    if (!form.value.description?.trim()) {
        validationErrors.value.description = 'Server description is required';
    } else if (form.value.description.length < 1 || form.value.description.length > 65535) {
        validationErrors.value.description = 'Server description must be between 1 and 65535 characters';
    } else {
        // Description regex: Allow letters, numbers, spaces, punctuation, but no special characters that could cause issues
        const descriptionRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>]+$/;
        if (!descriptionRegex.test(form.value.description)) {
            validationErrors.value.description = 'Description contains invalid characters';
        }
    }

    if (!form.value.owner_id) {
        validationErrors.value.owner_id = 'Server owner is required';
    }

    if (!form.value.location_id) {
        validationErrors.value.location_id = 'Location is required';
    }

    if (!form.value.node_id) {
        validationErrors.value.node_id = 'Node is required';
    }

    if (!form.value.allocation_id) {
        validationErrors.value.allocation_id = 'Allocation is required';
    }

    if (!form.value.realms_id) {
        validationErrors.value.realms_id = 'Realm is required';
    }

    if (!form.value.spell_id) {
        validationErrors.value.spell_id = 'Spell is required';
    }

    if (!form.value.startup?.trim()) {
        validationErrors.value.startup = 'Startup command is required';
    } else if (form.value.startup.length < 1 || form.value.startup.length > 65535) {
        validationErrors.value.startup = 'Startup command must be between 1 and 65535 characters';
    } else {
        // Startup command regex: Allow letters, numbers, spaces, common command characters, and variable placeholders
        const startupRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>{}]+$/;
        if (!startupRegex.test(form.value.startup)) {
            validationErrors.value.startup = 'Startup command contains invalid characters';
        }
    }

    if (!form.value.image?.trim()) {
        validationErrors.value.image = 'Docker image is required';
    } else if (form.value.image.length < 1 || form.value.image.length > 191) {
        validationErrors.value.image = 'Docker image must be between 1 and 191 characters';
    }

    // Resource validation
    if (form.value.memory !== 0 && form.value.memory < 256) {
        validationErrors.value.memory = 'Memory must be 0 (unlimited) or at least 256 MB';
    } else if (form.value.memory > 1048576) {
        // 1TB in MB
        validationErrors.value.memory = 'Memory cannot exceed 1TB (1048576 MB)';
    }

    if (form.value.swap < 0) {
        validationErrors.value.swap = 'Swap cannot be negative';
    } else if (form.value.swap > 1048576) {
        // 1TB in MB
        validationErrors.value.swap = 'Swap cannot exceed 1TB (1048576 MB)';
    }
    if (form.value.disk !== 0 && form.value.disk < 1024) {
        validationErrors.value.disk = 'Disk must be 0 (unlimited) or at least 1024 MB';
    } else if (form.value.disk > 10485760) {
        // 10TB in MB
        validationErrors.value.disk = 'Disk cannot exceed 10TB (10485760 MB)';
    }

    if (form.value.io < 10 || form.value.io > 1000) {
        validationErrors.value.io = 'IO must be between 10 and 1000';
    }

    if (form.value.cpu < 0 || form.value.cpu > 1000000) {
        validationErrors.value.cpu = 'CPU must be between 0 and 1,000,000';
    }

    // Feature limits validation
    if (form.value.database_limit < 0) {
        validationErrors.value.database_limit = 'Database limit cannot be negative';
    } else if (form.value.database_limit > 1000) {
        validationErrors.value.database_limit = 'Database limit cannot exceed 1000';
    }

    if (form.value.allocation_limit < 0) {
        validationErrors.value.allocation_limit = 'Allocation limit cannot be negative';
    } else if (form.value.allocation_limit > 1000) {
        validationErrors.value.allocation_limit = 'Allocation limit cannot exceed 1000';
    }

    if (form.value.backup_limit < 0) {
        validationErrors.value.backup_limit = 'Backup limit cannot be negative';
    } else if (form.value.backup_limit > 1000) {
        validationErrors.value.backup_limit = 'Backup limit cannot exceed 1000';
    }

    // Spell variables validation
    if (spellVariables.value.length > 0) {
        spellVariables.value.forEach((variable) => {
            const value = spellVariableValues.value[variable.env_variable];

            // Check if required
            if (variable.rules.includes('required')) {
                if (!value || value.trim() === '') {
                    validationErrors.value[variable.env_variable] = `${variable.name} is required and cannot be empty`;
                    return;
                }
            }

            // Skip validation if no value provided for optional fields
            if (!value || value.trim() === '') {
                return;
            }

            // Validate based on field type
            switch (variable.field_type) {
                case 'text': {
                    // Text fields: Allow letters, numbers, spaces, common punctuation
                    const textRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>]+$/;
                    if (!textRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} contains invalid characters`;
                    }
                    break;
                }

                case 'numeric': {
                    // Numeric fields: Only numbers
                    const numericRegex = /^[0-9]+$/;
                    if (!numericRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must contain only numbers`;
                    }
                    break;
                }

                case 'url': {
                    // URL fields: Basic URL validation
                    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
                    if (!urlRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must be a valid URL`;
                    }
                    break;
                }

                case 'email': {
                    // Email fields: Basic email validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        validationErrors.value[variable.env_variable] =
                            `${variable.name} must be a valid email address`;
                    }
                    break;
                }

                case 'ip': {
                    // IP address fields: IPv4 validation
                    const ipRegex =
                        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (!ipRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must be a valid IPv4 address`;
                    }
                    break;
                }

                case 'port': {
                    // Port fields: Numbers between 1-65535
                    const portRegex =
                        /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;
                    if (!portRegex.test(value)) {
                        validationErrors.value[variable.env_variable] =
                            `${variable.name} must be a valid port number (1-65535)`;
                    }
                    break;
                }

                default: {
                    // Default: Allow letters, numbers, spaces, common punctuation
                    const defaultRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>]+$/;
                    if (!defaultRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} contains invalid characters`;
                    }
                    break;
                }
            }
        });
    }

    return Object.keys(validationErrors.value).length === 0;
}

// Submit form
async function submitCreate() {
    // Clear previous validation errors
    validationErrors.value = {};

    // Validate form
    if (!validateForm()) {
        // Show validation errors in the form instead of replacing the page
        return;
    }

    submitting.value = true;
    try {
        // Convert string IDs back to numbers for API
        const submitData = {
            node_id: Number(form.value.node_id),
            name: form.value.name,
            description: form.value.description,
            owner_id: Number(form.value.owner_id),
            memory: convertToMiB(form.value.memory),
            swap: convertToMiB(form.value.swap),
            disk: convertToMiB(form.value.disk),
            io: form.value.io,
            cpu: convertToPercentage(form.value.cpu),
            allocation_id: Number(form.value.allocation_id),
            realms_id: Number(form.value.realms_id),
            spell_id: Number(form.value.spell_id),
            startup: form.value.startup,
            image: form.value.image,
            database_limit: form.value.database_limit,
            allocation_limit: form.value.allocation_limit,
            backup_limit: form.value.backup_limit,
            skip_scripts: form.value.skip_scripts,
            variables: spellVariableValues.value,
        };

        const { data } = await axios.put('/api/admin/servers', submitData);
        if (data && data.success) {
            toast.success('Server created successfully!');
            setTimeout(() => {
                router.push('/admin/servers');
            }, 1500);
        } else {
            toast.error(data?.message || 'Failed to create server.');
        }
    } catch (error: unknown) {
        console.error('Failed to create server:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to create server.');
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadFormData();
});
</script>
