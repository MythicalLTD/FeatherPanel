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
                                <Popover v-model:open="ownerPopoverOpen">
                                    <PopoverTrigger as-child>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            :aria-expanded="ownerPopoverOpen"
                                            :class="
                                                cn(
                                                    'w-full justify-between',
                                                    validationErrors.owner_id ? 'border-red-500' : '',
                                                )
                                            "
                                        >
                                            {{ getSelectedOwnerName() || 'Select owner...' }}
                                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent class="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search users..." />
                                            <CommandEmpty>No user found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    v-for="user in users"
                                                    :key="user.id"
                                                    :value="user.username"
                                                    @select="selectOwner(user.id)"
                                                >
                                                    <Check
                                                        :class="
                                                            cn(
                                                                'mr-2 h-4 w-4',
                                                                form.owner_id === String(user.id)
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )
                                                        "
                                                    />
                                                    <div class="flex items-center gap-2">
                                                        <Avatar class="h-6 w-6">
                                                            <AvatarImage
                                                                :src="user.avatar || ''"
                                                                :alt="user.username"
                                                            />
                                                            <AvatarFallback>{{ user.username[0] }}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div class="font-medium">{{ user.username }}</div>
                                                            <div class="text-xs text-muted-foreground">
                                                                {{ user.email }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <p v-if="validationErrors.owner_id" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.owner_id }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">
                                    Email address of the Server Owner.
                                </p>
                            </div>
                            <div class="mt-6">
                                <div class="flex items-center space-x-2">
                                    <Checkbox id="startup" v-model:checked="form.skip_scripts" />
                                    <label
                                        for="startup"
                                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Skip Scripts
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Allocation Management -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Allocation Management</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="location" class="block mb-2 font-medium">Location</label>
                                    <Popover v-model:open="locationPopoverOpen">
                                        <PopoverTrigger as-child>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                :aria-expanded="locationPopoverOpen"
                                                :class="
                                                    cn(
                                                        'w-full justify-between',
                                                        validationErrors.location_id ? 'border-red-500' : '',
                                                    )
                                                "
                                            >
                                                {{ getSelectedLocationName() || 'Select location...' }}
                                                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent class="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search locations..." />
                                                <CommandEmpty>No location found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        v-for="location in locations"
                                                        :key="location.id"
                                                        :value="location.name"
                                                        @select="selectLocation(location.id)"
                                                    >
                                                        <Check
                                                            :class="
                                                                cn(
                                                                    'mr-2 h-4 w-4',
                                                                    form.location_id === String(location.id)
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )
                                                            "
                                                        />
                                                        <div>
                                                            <div class="font-medium">{{ location.name }}</div>
                                                            <div class="text-xs text-muted-foreground">
                                                                {{ location.description }}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <p v-if="validationErrors.location_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.location_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The location where this server will be deployed.
                                    </p>
                                </div>
                                <div>
                                    <label for="node" class="block mb-2 font-medium">Node</label>
                                    <Popover v-model:open="nodePopoverOpen">
                                        <PopoverTrigger as-child>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                :aria-expanded="nodePopoverOpen"
                                                :class="
                                                    cn(
                                                        'w-full justify-between',
                                                        validationErrors.node_id ? 'border-red-500' : '',
                                                    )
                                                "
                                                :disabled="!form.location_id"
                                            >
                                                {{ getSelectedNodeName() || 'Select node...' }}
                                                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent class="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search nodes..." />
                                                <CommandEmpty>No node found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        v-for="node in filteredNodes"
                                                        :key="node.id"
                                                        :value="node.name"
                                                        @select="selectNode(node.id)"
                                                    >
                                                        <Check
                                                            :class="
                                                                cn(
                                                                    'mr-2 h-4 w-4',
                                                                    form.node_id === String(node.id)
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )
                                                            "
                                                        />
                                                        <div>
                                                            <div class="font-medium">{{ node.name }}</div>
                                                            <div class="text-xs text-muted-foreground">
                                                                {{ node.fqdn }}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                <Popover v-model:open="allocationPopoverOpen">
                                    <PopoverTrigger as-child>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            :aria-expanded="allocationPopoverOpen"
                                            :class="
                                                cn(
                                                    'w-full justify-between',
                                                    validationErrors.allocation_id ? 'border-red-500' : '',
                                                )
                                            "
                                            :disabled="!form.node_id"
                                        >
                                            {{ getSelectedAllocationName() || 'Select allocation...' }}
                                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent class="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search allocations..." />
                                            <CommandEmpty>No allocation found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    v-for="allocation in filteredAllocations"
                                                    :key="allocation.id"
                                                    :value="`${allocation.ip}:${allocation.port}`"
                                                    @select="selectAllocation(allocation.id)"
                                                >
                                                    <Check
                                                        :class="
                                                            cn(
                                                                'mr-2 h-4 w-4',
                                                                form.allocation_id === String(allocation.id)
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )
                                                        "
                                                    />
                                                    <div>
                                                        <div class="font-medium">
                                                            {{ allocation.ip }}:{{ allocation.port }}
                                                        </div>
                                                        <div class="text-xs text-muted-foreground">
                                                            Node ID: {{ allocation.node_id }}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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
                                    <Popover v-model:open="realmPopoverOpen">
                                        <PopoverTrigger as-child>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                :aria-expanded="realmPopoverOpen"
                                                :class="
                                                    cn(
                                                        'w-full justify-between',
                                                        validationErrors.realms_id ? 'border-red-500' : '',
                                                    )
                                                "
                                            >
                                                {{ getSelectedRealmName() || 'Select a realm...' }}
                                                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent class="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search realms..." />
                                                <CommandEmpty>No realm found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        v-for="realm in filteredRealms"
                                                        :key="realm.id"
                                                        :value="realm.name"
                                                        @select="selectRealm(realm.id)"
                                                    >
                                                        <Check
                                                            :class="
                                                                cn(
                                                                    'mr-2 h-4 w-4',
                                                                    form.realms_id === String(realm.id)
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )
                                                            "
                                                        />
                                                        <div>
                                                            <div class="font-medium">{{ realm.name }}</div>
                                                            <div class="text-xs text-muted-foreground">
                                                                {{ realm.description }}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <p v-if="validationErrors.realms_id" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.realms_id }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The realm that this server will be grouped under.
                                    </p>
                                </div>
                                <div>
                                    <label for="spell" class="block mb-2 font-medium">Spell</label>
                                    <Popover v-model:open="spellPopoverOpen">
                                        <PopoverTrigger as-child>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                :aria-expanded="spellPopoverOpen"
                                                :class="
                                                    cn(
                                                        'w-full justify-between',
                                                        validationErrors.spell_id ? 'border-red-500' : '',
                                                    )
                                                "
                                                :disabled="!form.realms_id"
                                            >
                                                {{ getSelectedSpellName() || 'Select a spell...' }}
                                                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent class="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search spells..." />
                                                <CommandEmpty>No spell found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        v-for="spell in filteredSpells"
                                                        :key="spell.id"
                                                        :value="spell.name"
                                                        @select="selectSpell(spell.id)"
                                                    >
                                                        <Check
                                                            :class="
                                                                cn(
                                                                    'mr-2 h-4 w-4',
                                                                    form.spell_id === String(spell.id)
                                                                        ? 'opacity-100'
                                                                        : 'opacity-0',
                                                                )
                                                            "
                                                        />
                                                        <div>
                                                            <div class="font-medium">{{ spell.name }}</div>
                                                            <div class="text-xs text-muted-foreground">
                                                                {{ spell.description }}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                <Button type="submit" :loading="submitting" class="bg-blue-600 hover:bg-blue-700">
                                    Update Server
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Types
type ApiLocation = { id: number; name: string; description?: string };
type ApiNode = { id: number; name: string; fqdn?: string; location_id: number };
type ApiUser = { id: number; username: string; email: string; avatar?: string };
type ApiRealm = { id: number; name: string; description?: string; location_id: number };
type ApiSpell = {
    id: number;
    name: string;
    description?: string;
    realm_id: number;
    startup?: string;
    docker_images?: string;
    features?: string;
};

type ApiServer = {
    id: number;
    node_id: number;
    name: string;
    description: string;
    suspended?: number;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    database_limit?: number;
    allocation_limit?: number;
    backup_limit?: number;
    skip_scripts: number;
    node?: { location_id: number };
    variables?: Array<{
        id: number;
        server_id: number;
        variable_id: number;
        variable_value: string;
        name: string;
        description: string;
        env_variable: string;
        default_value: string;
        user_viewable: number;
        user_editable: number;
        rules: string;
        field_type: string;
        created_at: string;
        updated_at: string;
    }>;
};
type ApiAllocation = { id: number; ip: string; port: number; node_id: number };
type ApiSpellVariable = {
    id: number;
    spell_id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
};

type EditForm = {
    node_id: string;
    name: string;
    description: string;
    suspended?: number;
    owner_id: string;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: string;
    realms_id: string;
    spell_id: string;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
    location_id: string; // For UI filtering only, not sent to API
};

type SubmitData = {
    node_id: number;
    name: string;
    description: string;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
    variables: Array<{ variable_id: number; variable_value: string }>;
};

type AxiosError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const router = useRouter();
const route = useRoute();

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

// Popover open states
const ownerPopoverOpen = ref(false);
const locationPopoverOpen = ref(false);
const nodePopoverOpen = ref(false);
const allocationPopoverOpen = ref(false);
const realmPopoverOpen = ref(false);
const spellPopoverOpen = ref(false);
const dockerImagePopoverOpen = ref(false);

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
const users = ref<ApiUser[]>([]);
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
    const selected = users.value.find((user) => String(user.id) === form.value.owner_id);
    return selected ? `${selected.username} (${selected.email})` : '';
}

function getSelectedLocationName() {
    const selected = locations.value.find((location) => String(location.id) === form.value.location_id);
    return selected ? selected.name : '';
}

function getSelectedNodeName() {
    const selected = filteredNodes.value.find((node) => String(node.id) === form.value.node_id);
    return selected ? `${selected.name} (${selected.fqdn})` : '';
}

function getSelectedAllocationName() {
    const selected = filteredAllocations.value.find((allocation) => String(allocation.id) === form.value.allocation_id);
    return selected ? `${selected.ip}:${selected.port}` : '';
}

function getSelectedRealmName() {
    const selected = filteredRealms.value.find((realm) => String(realm.id) === form.value.realms_id);
    return selected ? selected.name : '';
}

function getSelectedSpellName() {
    const selected = filteredSpells.value.find((spell) => String(spell.id) === form.value.spell_id);
    return selected ? selected.name : '';
}

// Selection functions
function selectLocation(locationId: number) {
    form.value.location_id = String(locationId);
    form.value.node_id = '';
    form.value.allocation_id = '';
    locationPopoverOpen.value = false;
}

function selectNode(nodeId: number) {
    form.value.node_id = String(nodeId);
    form.value.allocation_id = '';
    nodePopoverOpen.value = false;
}

function selectOwner(ownerId: number) {
    if (ownerId && ownerId > 0) {
        form.value.owner_id = String(ownerId);
    }
    ownerPopoverOpen.value = false;
}

function selectRealm(realmId: number) {
    form.value.realms_id = String(realmId);
    form.value.spell_id = '';
    realmPopoverOpen.value = false;
}

function selectSpell(spellId: number) {
    form.value.spell_id = String(spellId);
    spellPopoverOpen.value = false;
    fetchSpellDetails(spellId);
}

function selectAllocation(allocationId: number) {
    form.value.allocation_id = String(allocationId);
    allocationPopoverOpen.value = false;
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
        }
    } catch (e) {
        console.error('Failed to suspend server', e);
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
        }
    } catch (e) {
        console.error('Failed to unsuspend server', e);
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
                    selectedDockerImage.value = availableDockerImages.value[0] || '';
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
            console.log('Spell variables loaded, but using server variables from API response');
        }
    } catch (error: unknown) {
        console.error('Failed to fetch spell details:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        errorMessage.textContent = (error as AxiosError)?.response?.data?.message || 'Failed to fetch spell details.';
        document.body.appendChild(errorMessage);

        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    }
}

// Load server data for editing
async function loadServerData() {
    const serverId = route.params.id;
    if (!serverId) {
        router.push('/admin/servers');
        return;
    }

    loading.value = true;
    try {
        const [serverRes, locationsRes, nodesRes, usersRes, realmsRes, spellsRes, allocationsRes] = await Promise.all([
            axios.get(`/api/admin/servers/${serverId}`),
            axios.get('/api/admin/locations'),
            axios.get('/api/admin/nodes'),
            axios.get('/api/admin/users'),
            axios.get('/api/admin/realms'),
            axios.get('/api/admin/spells'),
            axios.get('/api/admin/allocations'),
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
        users.value = usersRes.data?.data?.users || [];
        realms.value = realmsRes.data?.data?.realms || [];
        spells.value = spellsRes.data?.data?.spells || [];
        allocations.value = allocationsRes.data?.data?.allocations || [];
    } catch (error: unknown) {
        console.error('Failed to load server data:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        errorMessage.textContent = (error as AxiosError)?.response?.data?.message || 'Failed to load server data.';
        document.body.appendChild(errorMessage);

        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
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

            if (variable.rules.includes('required')) {
                if (!value || value.trim() === '') {
                    validationErrors.value[variable.env_variable] = `${variable.name} is required and cannot be empty`;
                    return;
                }
            }

            if (!value || value.trim() === '') {
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
        console.log('Validation errors:', validationErrors.value);
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
            const successMessage = document.createElement('div');
            successMessage.className =
                'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            successMessage.textContent = 'Server updated successfully!';
            document.body.appendChild(successMessage);

            setTimeout(() => {
                document.body.removeChild(successMessage);
                router.push('/admin/servers');
            }, 2000);
        } else {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            errorMessage.textContent = data?.message || 'Failed to update server.';
            document.body.appendChild(errorMessage);

            setTimeout(() => {
                document.body.removeChild(errorMessage);
            }, 5000);
        }
    } catch (error: unknown) {
        console.error('Failed to update server:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        errorMessage.textContent = (error as AxiosError)?.response?.data?.message || 'Failed to update server.';
        document.body.appendChild(errorMessage);

        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadServerData();
});
</script>
