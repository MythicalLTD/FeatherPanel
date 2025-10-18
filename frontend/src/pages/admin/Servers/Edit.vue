<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading server data...</span>
                </div>
            </div>

            <!-- Edit Server Form -->
            <div v-else class="p-6">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold">Edit Server</h1>
                        <p class="text-muted-foreground mt-2">Modify server configuration and settings.</p>
                    </div>

                    <form class="space-y-6" @submit.prevent="submitUpdate">
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
                                    :class="
                                        cn('w-full justify-between', validationErrors.owner_id ? 'border-red-500' : '')
                                    "
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
                                    <label class="block mb-2 font-medium">Location</label>
                                    <div class="p-3 bg-muted rounded-lg">
                                        <p class="font-medium">{{ getSelectedLocationName() || 'Unknown Location' }}</p>
                                        <p class="text-xs text-muted-foreground mt-1">
                                            Location cannot be changed directly. Use the "Server Transfer" feature below
                                            to move this server.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label class="block mb-2 font-medium">Node</label>
                                    <div class="p-3 bg-muted rounded-lg">
                                        <p class="font-medium">{{ getSelectedNodeName() || 'Unknown Node' }}</p>
                                        <p class="text-xs text-muted-foreground mt-1">
                                            Node cannot be changed directly. Use the "Server Transfer" feature below to
                                            move this server.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="allocation" class="block mb-2 font-medium">Default Allocation</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    :disabled="!form.node_id"
                                    :class="
                                        cn(
                                            'w-full justify-between',
                                            validationErrors.allocation_id ? 'border-red-500' : '',
                                        )
                                    "
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
                                        :class="
                                            cn(
                                                'w-full justify-between',
                                                validationErrors.realms_id ? 'border-red-500' : '',
                                            )
                                        "
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
                                        :disabled="!form.realms_id"
                                        :class="
                                            cn(
                                                'w-full justify-between',
                                                validationErrors.spell_id ? 'border-red-500' : '',
                                            )
                                        "
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
                                        min="0"
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
                                        min="0"
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
                                        min="0"
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

                        <!-- Allocation Management -->
                        <div class="bg-card border rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h2 class="text-xl font-semibold">Allocation Management</h2>
                                    <p class="text-sm text-muted-foreground mt-1">
                                        Manage additional network allocations for this server
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    :disabled="loadingAllocations"
                                    @click="fetchAllocations"
                                >
                                    <svg
                                        v-if="loadingAllocations"
                                        class="animate-spin h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            class="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            stroke-width="4"
                                        ></circle>
                                        <path
                                            class="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <span v-else>Refresh</span>
                                </Button>
                            </div>

                            <!-- Allocation Status -->
                            <div
                                v-if="serverAllocations.server"
                                class="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between"
                            >
                                <div class="text-sm">
                                    Using
                                    <span class="font-bold">{{ serverAllocations.server.current_allocations }}</span>
                                    of
                                    <span class="font-bold">{{ serverAllocations.server.allocation_limit }}</span>
                                    allowed allocations
                                </div>
                                <Badge :variant="serverAllocations.server.can_add_more ? 'default' : 'destructive'">
                                    {{ serverAllocations.server.can_add_more ? 'Can add more' : 'Limit reached' }}
                                </Badge>
                            </div>

                            <!-- Allocations List -->
                            <div v-if="serverAllocations.allocations.length > 0" class="space-y-2">
                                <div
                                    v-for="allocation in serverAllocations.allocations"
                                    :key="allocation.id"
                                    class="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div class="flex items-center gap-3">
                                        <div>
                                            <div class="font-medium font-mono">
                                                {{ allocation.ip }}:{{ allocation.port }}
                                            </div>
                                            <div class="text-xs text-muted-foreground">
                                                {{ allocation.ip_alias || 'No alias' }}
                                            </div>
                                        </div>
                                        <Badge v-if="allocation.is_primary" variant="default">Primary</Badge>
                                    </div>
                                    <div class="flex gap-2">
                                        <Button
                                            v-if="!allocation.is_primary"
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            :disabled="settingPrimary === allocation.id"
                                            @click="setPrimaryAllocation(allocation.id)"
                                        >
                                            {{ settingPrimary === allocation.id ? 'Setting...' : 'Set Primary' }}
                                        </Button>
                                        <Button
                                            v-if="!allocation.is_primary"
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            :disabled="deletingAllocation === allocation.id"
                                            @click="deleteAllocation(allocation.id)"
                                        >
                                            {{ deletingAllocation === allocation.id ? 'Deleting...' : 'Delete' }}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <!-- Add Allocation Button -->
                            <div v-if="serverAllocations.server?.can_add_more" class="mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    class="w-full"
                                    @click="allocationModal.openModal()"
                                >
                                    <Plus class="h-4 w-4 mr-2" />
                                    Add Allocation
                                </Button>
                            </div>
                        </div>

                        <!-- Server Transfer Section -->
                        <div class="bg-card border rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <h2 class="text-xl font-semibold">Server Transfer</h2>
                                    <p class="text-sm text-muted-foreground mt-1">
                                        Transfer this server to a different node
                                    </p>
                                </div>
                            </div>

                            <div v-if="isTransferring" class="space-y-4">
                                <div
                                    class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                                >
                                    <div class="flex items-center gap-3 mb-2">
                                        <div
                                            class="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent"
                                        ></div>
                                        <span class="font-medium text-yellow-900 dark:text-yellow-100"
                                            >Transfer in Progress</span
                                        >
                                    </div>
                                    <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                                        This server is currently being transferred. This may take several minutes
                                        depending on server size.
                                    </p>
                                    <div v-if="transferStatus" class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Progress:</span>
                                            <span class="font-medium"
                                                >{{ transferStatus.progress?.toFixed(1) || 0 }}%</span
                                            >
                                        </div>
                                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                class="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                                :style="{ width: `${transferStatus.progress || 0}%` }"
                                            ></div>
                                        </div>
                                        <p v-if="transferStatus.started_at" class="text-xs text-muted-foreground">
                                            Started: {{ new Date(transferStatus.started_at).toLocaleString() }}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        class="mt-3"
                                        :loading="cancellingTransfer"
                                        @click="cancelServerTransfer"
                                    >
                                        Cancel Transfer
                                    </Button>
                                </div>
                            </div>

                            <div v-else class="space-y-4">
                                <p class="text-sm text-muted-foreground">
                                    Transferring a server will move it to a different node. The server will be stopped
                                    during the transfer and automatically started on the destination node once complete.
                                </p>
                                <Button type="button" variant="outline" @click="openTransferDialog">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                        />
                                    </svg>
                                    Transfer Server
                                </Button>
                            </div>
                        </div>

                        <!-- Form Actions -->
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <span class="text-sm text-muted-foreground">Suspended:</span>
                                <span
                                    class="text-sm font-medium"
                                    :class="isSuspended ? 'text-red-500' : 'text-green-500'"
                                >
                                    {{ isSuspended ? 'Yes' : 'No' }}
                                </span>
                            </div>
                            <div class="flex gap-2 md:gap-4">
                                <Button
                                    v-if="!isSuspended"
                                    type="button"
                                    variant="destructive"
                                    :loading="suspending"
                                    @click="suspendServer"
                                >
                                    Suspend
                                </Button>
                                <Button
                                    v-else
                                    type="button"
                                    variant="outline"
                                    :loading="suspending"
                                    @click="unsuspendServer"
                                >
                                    Unsuspend
                                </Button>
                                <Button type="button" variant="outline" @click="$router.push('/admin/servers')">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="default"
                                    :loading="submitting"
                                    class="bg-blue-600 hover:bg-blue-700"
                                >
                                    Update Server
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Selection Modals -->
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
            :is-open="realmModal.state.value.isOpen"
            title="Select Realm"
            description="Choose a realm for this server"
            item-type="realm"
            search-placeholder="Search realms by name or description..."
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
            description="Choose a spell for this server"
            item-type="spell"
            search-placeholder="Search spells by name or description..."
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
            description="Choose an allocation for this server"
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

        <!-- Transfer Dialog -->
        <Dialog v-model:open="transferDialogOpen">
            <DialogContent class="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Transfer Server</DialogTitle>
                    <DialogDescription>
                        Select the destination node for this server transfer. The server will be stopped, transferred,
                        and restarted on the new node.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-4 py-4">
                    <div>
                        <label class="block mb-2 font-medium">Current Node</label>
                        <div class="p-3 bg-muted rounded-lg">
                            <p class="font-medium">{{ getSelectedNodeName() }}</p>
                        </div>
                    </div>

                    <div>
                        <label class="block mb-2 font-medium">Destination Node</label>
                        <Button
                            type="button"
                            variant="outline"
                            class="w-full justify-between"
                            @click="transferNodeModal.openModal()"
                        >
                            {{ getTransferDestinationNodeName() || 'Select destination node...' }}
                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        <p class="text-xs text-muted-foreground mt-1">
                            Choose a different node to transfer this server to.
                        </p>
                    </div>

                    <div
                        class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                    >
                        <p class="text-sm text-yellow-900 dark:text-yellow-100">
                            <strong>Warning:</strong> The server will be stopped during transfer and may be unavailable
                            for several minutes.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="transferDialogOpen = false">Cancel</Button>
                    <Button
                        :disabled="!transferDestinationNodeId"
                        :loading="initiatingTransfer"
                        @click="initiateServerTransfer"
                    >
                        Start Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Plus } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { SelectionModal } from '@/components/ui/selection-modal';
import { useSelectionModal } from '@/composables/useSelectionModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    ApiServer,
    EditForm,
    SubmitData,
    AxiosError,
    TransferStatus,
} from '@/types/admin/server';

const router = useRouter();
const route = useRoute();
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
    { text: 'Edit', to: `/admin/servers/${route.params.id}/edit` },
];

// Loading states
const loading = ref(false);
const submitting = ref(false);
const suspending = ref(false);

// Popover open states (keeping docker image popover for now)
const dockerImagePopoverOpen = ref(false);

// Selection modals
const userModal = useSelectionModal('/api/admin/users', 20, 'search', 'page');

// Allocation modal with reactive node_id filter
const allocationAdditionalParams = computed(() => ({
    node_id: form.value.node_id || null,
}));
const allocationModal = useSelectionModal(
    '/api/admin/allocations?not_used=true',
    20,
    'search',
    'page',
    allocationAdditionalParams,
);

const realmModal = useSelectionModal('/api/admin/realms', 20, 'search', 'page');

// Spell modal with reactive realm_id filter
const spellAdditionalParams = computed(() => ({
    realm_id: form.value.realms_id || null,
}));
const spellModal = useSelectionModal('/api/admin/spells', 20, 'search', 'page', spellAdditionalParams);

// Form data
const form = ref<EditForm>({
    node_id: '',
    name: '',
    description: '',
    suspended: 0,
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

// Units are always fixed: MiB for memory/swap/disk, % for CPU

// Dropdown data
const locations = ref<ApiLocation[]>([]);
const nodes = ref<ApiNode[]>([]);
const realms = ref<ApiRealm[]>([]);
const spells = ref<ApiSpell[]>([]);
const allocations = ref<ApiAllocation[]>([]);

// Spell configuration data
const selectedSpell = ref<ApiSpell | null>(null);
const spellVariables = ref<ApiSpellVariable[]>([]);
const spellVariableValues = ref<Record<string, string>>({});
const availableDockerImages = ref<string[]>([]);
const selectedDockerImage = ref<string>('');
const isSuspended = computed(() => Number(form.value?.suspended ?? 0) === 1);

// Computed filtered lists with hierarchical filtering
const filteredNodes = computed(() => {
    if (!form.value.location_id) return [];
    return nodes.value.filter((node) => node.location_id === Number(form.value.location_id));
});

const filteredRealms = computed(() => {
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
    // First check if there's a selected item in the modal
    if (userModal.state.value.selectedItem) {
        const selected = userModal.state.value.selectedItem;
        return `${selected.username} (${selected.email})`;
    }
    // Fallback to search results
    const selected = userSearchResults.value.find((user) => String(user.id) === form.value.owner_id);
    return selected ? `${selected.username} (${selected.email})` : '';
}

function getSelectedLocationName() {
    // Location is read-only, just display from current data
    const selected = locations.value.find((location) => String(location.id) === form.value.location_id);
    return selected ? selected.name : '';
}

function getSelectedNodeName() {
    // Node is read-only, just display from current data
    const selected = filteredNodes.value.find((node) => String(node.id) === form.value.node_id);
    return selected ? `${selected.name} (${selected.fqdn})` : '';
}

function getSelectedAllocationName() {
    // First check if there's a selected item in the modal
    if (allocationModal.state.value.selectedItem) {
        const selected = allocationModal.state.value.selectedItem;
        return `${selected.ip}:${selected.port}`;
    }

    // Check in server allocations (already assigned to this server)
    if (serverAllocations.value.allocations.length > 0) {
        const selected = serverAllocations.value.allocations.find(
            (allocation) => String(allocation.id) === form.value.allocation_id,
        );
        if (selected) {
            return `${selected.ip}:${selected.port}`;
        }
    }

    // Fallback to filtered allocations (free allocations from the node)
    const selected = filteredAllocations.value.find((allocation) => String(allocation.id) === form.value.allocation_id);
    return selected ? `${selected.ip}:${selected.port}` : '';
}

function getSelectedRealmName() {
    // First check if there's a selected item in the modal
    if (realmModal.state.value.selectedItem) {
        return realmModal.state.value.selectedItem.name;
    }
    // Fallback to filtered realms
    const selected = filteredRealms.value.find((realm) => String(realm.id) === form.value.realms_id);
    return selected ? selected.name : '';
}

function getSelectedSpellName() {
    // First check if there's a selected item in the modal
    if (spellModal.state.value.selectedItem) {
        return spellModal.state.value.selectedItem.name;
    }
    // Fallback to filtered spells
    const selected = filteredSpells.value.find((spell) => String(spell.id) === form.value.spell_id);
    return selected ? selected.name : '';
}

// Selection functions
function selectOwner(item: ApiUser) {
    if (item && item.id && item.id > 0) {
        form.value.owner_id = String(item.id);
        userModal.closeModal();
    }
}

function selectRealm(item: ApiRealm) {
    if (item && item.id) {
        form.value.realms_id = String(item.id);
        form.value.spell_id = '';
        realmModal.closeModal();
    }
}

function selectSpell(item: ApiSpell) {
    if (item && item.id) {
        form.value.spell_id = String(item.id);
        spellModal.closeModal();
        fetchSpellDetails(item.id);
    }
}

function selectAllocation(item: ApiAllocation) {
    if (item && item.id) {
        // If we're in allocation management mode (allocations already loaded), assign it
        if (serverAllocations.value.server) {
            assignAllocationToServer(item.id);
        } else {
            // Otherwise, this is for the primary allocation during server edit
            form.value.allocation_id = String(item.id);
        }
        allocationModal.closeModal();
    }
}

function selectDockerImage(image: string) {
    selectedDockerImage.value = image;
    form.value.image = image;
    dockerImagePopoverOpen.value = false;
}

// Suspend/Unsuspend actions
async function suspendServer() {
    const serverId = route.params.id;
    if (!serverId) return;
    suspending.value = true;
    try {
        const { data } = await axios.post(`/api/admin/servers/${serverId}/suspend`);
        if (data?.success) {
            form.value.suspended = 1;
            toast.success('Server suspended successfully!');
        } else {
            toast.error(data?.message || 'Failed to suspend server.');
        }
    } catch (e) {
        console.error('Failed to suspend server', e);
        toast.error('Failed to suspend server.');
    } finally {
        suspending.value = false;
    }
}

async function unsuspendServer() {
    const serverId = route.params.id;
    if (!serverId) return;
    suspending.value = true;
    try {
        const { data } = await axios.post(`/api/admin/servers/${serverId}/unsuspend`);
        if (data?.success) {
            form.value.suspended = 0;
            toast.success('Server unsuspended successfully!');
        } else {
            toast.error(data?.message || 'Failed to unsuspend server.');
        }
    } catch (e) {
        console.error('Failed to unsuspend server', e);
        toast.error('Failed to unsuspend server.');
    } finally {
        suspending.value = false;
    }
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

            if (selectedSpell.value?.docker_images) {
                try {
                    const dockerImagesObj = JSON.parse(selectedSpell.value.docker_images);
                    availableDockerImages.value = Object.values(dockerImagesObj);

                    // Set selectedDockerImage to current server image if it exists in available images
                    // Otherwise use the first available image
                    if (form.value.image && availableDockerImages.value.includes(form.value.image)) {
                        selectedDockerImage.value = form.value.image;
                    } else {
                        selectedDockerImage.value = availableDockerImages.value[0] || '';
                    }
                } catch (e) {
                    console.error('Failed to parse docker images:', e);
                    availableDockerImages.value = [];
                    selectedDockerImage.value = '';
                }
            }

            if (selectedSpell.value?.startup) {
                form.value.startup = selectedSpell.value.startup;
            }

            if (selectedDockerImage.value) {
                form.value.image = selectedDockerImage.value;
            }
        }

        if (variablesRes.data?.success) {
            // Don't override server variables - we're using the ones from the server response
            // Only use spell details for docker images, startup command, etc.
        }
    } catch (error: unknown) {
        console.error('Failed to fetch spell details:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to fetch spell details.');
    }
}

// User search results for fallback display (keeping for current owner display)
const userSearchResults = ref<ApiUser[]>([]);

// Allocation management
const serverAllocations = ref<{
    server: {
        id: number;
        name: string;
        uuid: string;
        allocation_limit: number;
        current_allocations: number;
        can_add_more: boolean;
        primary_allocation_id: number;
    } | null;
    allocations: Array<{
        id: number;
        ip: string;
        port: number;
        ip_alias: string | null;
        is_primary: boolean;
        server_id: number;
        node_id: number;
    }>;
}>({
    server: null,
    allocations: [],
});
const loadingAllocations = ref(false);
const settingPrimary = ref<number | null>(null);
const deletingAllocation = ref<number | null>(null);

// Server transfer state
const transferDialogOpen = ref(false);
const transferDestinationNodeId = ref<string>('');
const transferDestinationNode = ref<ApiNode | null>(null);
const initiatingTransfer = ref(false);
const cancellingTransfer = ref(false);
const transferStatus = ref<TransferStatus | null>(null);
const isTransferring = computed(() => form.value.status === 'transferring');
const transferStatusInterval = ref<number | null>(null);

// Transfer node modal - exclude current node
const transferNodeAdditionalParams = computed(() => ({
    exclude_node_id: form.value.node_id || null,
}));
const transferNodeModal = useSelectionModal('/api/admin/nodes', 20, 'search', 'page', transferNodeAdditionalParams);

// Load server data for editing
async function loadServerData() {
    const serverId = route.params.id;
    if (!serverId) {
        router.push('/admin/servers');
        return;
    }

    loading.value = true;
    try {
        const [serverRes, locationsRes, nodesRes, realmsRes, spellsRes, allocationsRes] = await Promise.all([
            axios.get(`/api/admin/servers/${serverId}`),
            axios.get('/api/admin/locations'),
            axios.get('/api/admin/nodes'),
            axios.get('/api/admin/realms'),
            axios.get('/api/admin/spells'),
            axios.get('/api/admin/allocations?not_used=true'),
        ]);

        if (serverRes.data?.success) {
            const server = serverRes.data.data as ApiServer;

            // Populate form with server data
            form.value = {
                node_id: String(server.node_id),
                name: server.name,
                description: server.description,

                owner_id: String(server.owner_id),
                memory: server.memory,
                swap: server.swap,
                disk: server.disk,
                io: server.io,
                cpu: server.cpu,
                allocation_id: String(server.allocation_id),
                realms_id: String(server.realms_id),
                spell_id: String(server.spell_id),
                startup: server.startup,
                image: server.image,
                database_limit: server.database_limit || 0,
                allocation_limit: server.allocation_limit || 0,
                backup_limit: server.backup_limit || 0,
                skip_scripts: Boolean(server.skip_scripts),
                location_id: String(server.node?.location_id || ''),
            };

            // Values are already in MiB, no conversion needed
            form.value.memory = server.memory;
            form.value.swap = server.swap;
            form.value.disk = server.disk;
            form.value.cpu = server.cpu;

            // Track suspended flag for suspend/unsuspend UI
            const suspendedValue: number = (server as Partial<ApiServer> & { suspended?: number }).suspended ?? 0;
            form.value.suspended = Number(suspendedValue);

            // Load server variables directly from the API response
            if (server.variables && Array.isArray(server.variables)) {
                // Use the server variables that are already provided in the API response
                spellVariables.value = server.variables.map((variable) => ({
                    id: variable.variable_id,
                    spell_id: server.spell_id,
                    name: variable.name,
                    description: variable.description,
                    env_variable: variable.env_variable,
                    default_value: variable.default_value,
                    user_viewable: variable.user_viewable,
                    user_editable: variable.user_editable,
                    rules: variable.rules,
                    field_type: variable.field_type,
                }));

                // Set the current variable values from the server
                server.variables.forEach((variable) => {
                    if (variable.env_variable && variable.variable_value !== undefined) {
                        spellVariableValues.value[variable.env_variable] = variable.variable_value;
                    }
                });
            }

            // Load spell details for additional information (docker images, startup command, etc.)
            // Note: We don't use spell variables since the server already has its own configured variables
            if (server.spell_id) {
                await fetchSpellDetails(server.spell_id);
            }
        }

        locations.value = locationsRes.data?.data?.locations || [];
        nodes.value = nodesRes.data?.data?.nodes || [];
        realms.value = realmsRes.data?.data?.realms || [];
        spells.value = spellsRes.data?.data?.spells || [];
        allocations.value = allocationsRes.data?.data?.allocations || [];

        // Fetch the current server owner for display
        if (form.value.owner_id) {
            try {
                const ownerResponse = await axios.get(`/api/admin/users/serverRequest/${form.value.owner_id}`);
                if (ownerResponse.data?.success && ownerResponse.data.data?.user) {
                    const currentOwner = ownerResponse.data.data.user;
                    userSearchResults.value = [currentOwner]; // Add current owner to results for display
                }
            } catch (error) {
                console.error('Failed to fetch current owner:', error);
            }
        }
    } catch (error: unknown) {
        console.error('Failed to load server data:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to load server data.');
    } finally {
        loading.value = false;
    }
}

// Validation state
const validationErrors = ref<Record<string, string>>({});

// Validation function
function validateForm(): boolean {
    validationErrors.value = {};

    // Required fields validation
    if (!form.value.name?.trim()) {
        validationErrors.value.name = 'Server name is required';
    } else if (form.value.name.length < 1 || form.value.name.length > 191) {
        validationErrors.value.name = 'Server name must be between 1 and 191 characters';
    } else {
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

    if (form.value.disk !== 0 && form.value.disk < 128) {
        validationErrors.value.disk = 'Disk must be at least 128 MB or 0 (unlimited)';
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
    }

    if (form.value.allocation_limit < 0) {
        validationErrors.value.allocation_limit = 'Allocation limit cannot be negative';
    }

    if (form.value.backup_limit < 0) {
        validationErrors.value.backup_limit = 'Backup limit cannot be negative';
    }

    // Spell variables validation
    if (spellVariables.value.length > 0) {
        spellVariables.value.forEach((variable) => {
            const value = spellVariableValues.value[variable.env_variable];

            // Check if required - allow default values
            if (variable.rules.includes('required')) {
                // If value is empty/null/undefined, check if there's a default value
                const effectiveValue = value ?? variable.default_value ?? '';
                if (!effectiveValue || (typeof effectiveValue === 'string' && effectiveValue.trim() === '')) {
                    validationErrors.value[variable.env_variable] = `${variable.name} is required and cannot be empty`;
                    return;
                }
            }

            // Skip validation if no value provided for optional fields
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return;
            }

            // Validate based on field type
            switch (variable.field_type) {
                case 'text': {
                    const textRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>]+$/;
                    if (!textRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} contains invalid characters`;
                    }
                    break;
                }
                case 'numeric': {
                    const numericRegex = /^[0-9]+$/;
                    if (!numericRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must contain only numbers`;
                    }
                    break;
                }
                case 'url': {
                    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
                    if (!urlRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must be a valid URL`;
                    }
                    break;
                }
                case 'email': {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        validationErrors.value[variable.env_variable] =
                            `${variable.name} must be a valid email address`;
                    }
                    break;
                }
                case 'ip': {
                    const ipRegex =
                        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                    if (!ipRegex.test(value)) {
                        validationErrors.value[variable.env_variable] = `${variable.name} must be a valid IPv4 address`;
                    }
                    break;
                }
                case 'port': {
                    const portRegex =
                        /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;
                    if (!portRegex.test(value)) {
                        validationErrors.value[variable.env_variable] =
                            `${variable.name} must be a valid port number (1-65535)`;
                    }
                    break;
                }
                default: {
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

// Conversion functions - simplified since we always use MiB
function convertToMiB(value: number): number {
    // Always return the value as-is since we only use MiB
    return value;
}

function convertToPercentage(value: number): number {
    // Always return the value as-is since we only use percentage
    return value;
}

// Submit form
async function submitUpdate() {
    validationErrors.value = {};

    if (!validateForm()) {
        return;
    }

    submitting.value = true;
    try {
        const serverId = route.params.id;
        const submitData: SubmitData = {
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
            // Always include variables as an array of { variable_id, variable_value }
            variables: [],
        };

        // Build variables array from current form values, matching spell variable ids
        submitData.variables = Object.entries(spellVariableValues.value)
            .map(([envVariable, value]) => {
                const sv = spellVariables.value.find((v) => v.env_variable === envVariable);
                if (!sv) return null;
                return { variable_id: sv.id, variable_value: String(value ?? '') };
            })
            .filter((item): item is { variable_id: number; variable_value: string } => item !== null);

        const { data } = await axios.patch(`/api/admin/servers/${serverId}`, submitData);
        if (data && data.success) {
            toast.success('Server updated successfully!');
            setTimeout(() => {
                router.push('/admin/servers');
            }, 1500);
        } else {
            toast.error(data?.message || 'Failed to update server.');
        }
    } catch (error: unknown) {
        console.error('Failed to update server:', error);
        toast.error((error as AxiosError)?.response?.data?.message || 'Failed to update server.');
    } finally {
        submitting.value = false;
    }
}

// Fetch server allocations
async function fetchAllocations() {
    const serverId = route.params.id;
    if (!serverId) return;

    loadingAllocations.value = true;
    try {
        const { data } = await axios.get(`/api/admin/servers/${serverId}/allocations`);
        if (data && data.success) {
            serverAllocations.value = data.data;
        }
    } catch (error) {
        console.error('Failed to fetch allocations:', error);
        toast.error('Failed to fetch server allocations');
    } finally {
        loadingAllocations.value = false;
    }
}

// Assign allocation to server
async function assignAllocationToServer(allocationId: number) {
    const serverId = route.params.id;
    if (!serverId) return;

    try {
        const { data } = await axios.post(`/api/admin/servers/${serverId}/allocations`, {
            allocation_id: allocationId,
        });

        if (data && data.success) {
            toast.success('Allocation assigned successfully!');
            await fetchAllocations();
        } else {
            toast.error(data?.message || 'Failed to assign allocation');
        }
    } catch (error) {
        console.error('Failed to assign allocation:', error);
        toast.error('Failed to assign allocation');
    }
}

// Delete allocation from server
async function deleteAllocation(allocationId: number) {
    const serverId = route.params.id;
    if (!serverId) return;

    deletingAllocation.value = allocationId;
    try {
        const { data } = await axios.delete(`/api/admin/servers/${serverId}/allocations/${allocationId}`);

        if (data && data.success) {
            toast.success('Allocation deleted successfully!');
            await fetchAllocations();
        } else {
            toast.error(data?.message || 'Failed to delete allocation');
        }
    } catch (error) {
        console.error('Failed to delete allocation:', error);
        toast.error('Failed to delete allocation');
    } finally {
        deletingAllocation.value = null;
    }
}

// Set primary allocation
async function setPrimaryAllocation(allocationId: number) {
    const serverId = route.params.id;
    if (!serverId) return;

    settingPrimary.value = allocationId;
    try {
        const { data } = await axios.post(`/api/admin/servers/${serverId}/allocations/${allocationId}/primary`);

        if (data && data.success) {
            toast.success('Primary allocation updated successfully!');
            await fetchAllocations();
        } else {
            toast.error(data?.message || 'Failed to set primary allocation');
        }
    } catch (error) {
        console.error('Failed to set primary allocation:', error);
        toast.error('Failed to set primary allocation');
    } finally {
        settingPrimary.value = null;
    }
}

// Transfer functions
function openTransferDialog() {
    transferDestinationNodeId.value = '';
    transferDestinationNode.value = null;
    transferDialogOpen.value = true;
}

function selectTransferDestinationNode(node: ApiNode) {
    if (node && node.id) {
        transferDestinationNodeId.value = String(node.id);
        transferDestinationNode.value = node;
        transferNodeModal.closeModal();
    }
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

async function initiateServerTransfer() {
    const serverId = route.params.id;
    if (!serverId || !transferDestinationNodeId.value) return;

    initiatingTransfer.value = true;
    try {
        const { data } = await axios.post(`/api/admin/servers/${serverId}/transfer`, {
            destination_node_id: Number(transferDestinationNodeId.value),
        });

        if (data && data.success) {
            toast.success('Server transfer initiated successfully!');
            transferDialogOpen.value = false;

            // Update server status to transferring
            form.value.status = 'transferring';

            // Start polling for transfer status
            startTransferStatusPolling();
        } else {
            toast.error(data?.message || 'Failed to initiate server transfer');
        }
    } catch (error) {
        console.error('Failed to initiate transfer:', error);
        toast.error('Failed to initiate server transfer');
    } finally {
        initiatingTransfer.value = false;
    }
}

async function cancelServerTransfer() {
    const serverId = route.params.id;
    if (!serverId) return;

    cancellingTransfer.value = true;
    try {
        const { data } = await axios.delete(`/api/admin/servers/${serverId}/transfer`);

        if (data && data.success) {
            toast.success('Server transfer cancelled successfully!');

            // Update server status
            form.value.status = 'offline';

            // Stop polling
            stopTransferStatusPolling();

            // Clear transfer status
            transferStatus.value = null;
        } else {
            toast.error(data?.message || 'Failed to cancel server transfer');
        }
    } catch (error) {
        console.error('Failed to cancel transfer:', error);
        toast.error('Failed to cancel server transfer');
    } finally {
        cancellingTransfer.value = false;
    }
}

async function fetchTransferStatus() {
    const serverId = route.params.id;
    if (!serverId) return;

    try {
        const { data } = await axios.get(`/api/admin/servers/${serverId}/transfer`);

        if (data && data.success) {
            transferStatus.value = data.data;

            // If transfer is complete, stop polling and reload server data
            if (data.data.status === 'completed') {
                stopTransferStatusPolling();
                toast.success('Server transfer completed successfully!');
                await loadServerData();
            } else if (data.data.status === 'failed') {
                stopTransferStatusPolling();
                toast.error('Server transfer failed: ' + (data.data.error || 'Unknown error'));
                form.value.status = 'offline';
            }
        }
    } catch (error) {
        // Silently fail - transfer might not be in progress
        console.debug('Transfer status fetch error:', error);
    }
}

function startTransferStatusPolling() {
    // Clear any existing interval
    stopTransferStatusPolling();

    // Fetch immediately
    fetchTransferStatus();

    // Poll every 5 seconds
    transferStatusInterval.value = window.setInterval(() => {
        fetchTransferStatus();
    }, 5000);
}

function stopTransferStatusPolling() {
    if (transferStatusInterval.value !== null) {
        clearInterval(transferStatusInterval.value);
        transferStatusInterval.value = null;
    }
}

onMounted(async () => {
    await loadServerData();
    await fetchAllocations();

    // If server is transferring, start polling for status
    if (isTransferring.value) {
        startTransferStatusPolling();
    }
});

// Cleanup interval on unmount
onUnmounted(() => {
    stopTransferStatusPolling();
});
</script>
