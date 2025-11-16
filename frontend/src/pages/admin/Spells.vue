<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Realms', href: '/admin/realms' },
            { text: 'Spells', isCurrent: true, href: '/admin/spells' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading spells...</span>
                </div>
            </div>

            <!-- Spells Tabs -->
            <div v-else class="p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Spells</h1>
                        <p class="text-muted-foreground">
                            {{
                                currentRealm
                                    ? `Managing spells for realm: ${currentRealm.name}`
                                    : 'Manage all spells in your system.'
                            }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Tabs v-model="activeTab">
                            <TabsList>
                                <TabsTrigger value="installed">Installed</TabsTrigger>
                                <TabsTrigger value="online">Online</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                <!-- Plugin Widgets: After Header -->
                <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

                <Tabs v-model="activeTab">
                    <TabsContent value="installed">
                        <!-- Plugin Widgets: Before Installed Table -->
                        <WidgetRenderer
                            v-if="activeTab === 'installed' && widgetsBeforeInstalledTable.length > 0"
                            :widgets="widgetsBeforeInstalledTable"
                        />

                        <TableComponent
                            :title="'Installed Spells'"
                            :description="'Manage your locally installed spells'"
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
                            local-storage-key="featherpanel-spells-table-columns"
                            @search="handleSearch"
                            @page-change="changePage"
                        >
                            <template #header-actions>
                                <div class="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        data-umami-event="Create spell"
                                        @click="openCreateDrawer"
                                    >
                                        <Plus class="h-4 w-4 mr-2" />
                                        Create Spell
                                    </Button>
                                    <label class="inline-block">
                                        <Button variant="outline" size="sm" as="span" data-umami-event="Import spell">
                                            <Upload class="h-4 w-4 mr-2" />
                                            Import Spell
                                        </Button>
                                        <input
                                            type="file"
                                            accept="application/json"
                                            class="hidden"
                                            @change="onImportSpell"
                                        />
                                    </label>
                                </div>
                            </template>

                            <!-- Custom cell templates -->
                            <template #cell-realm="{ item }">
                                {{ (item as Spell).realm_name || '-' }}
                            </template>

                            <!-- Description cell: limit to 100 chars and add ... if more -->
                            <template #cell-description="{ item }">
                                <span>
                                    {{
                                        (item as Spell).description && typeof (item as Spell).description === 'string'
                                            ? (item as Spell).description!.length > 60
                                                ? (item as Spell).description!.slice(0, 60) + '...'
                                                : (item as Spell).description
                                            : '-'
                                    }}
                                </span>
                            </template>
                            <template #cell-actions="{ item }">
                                <div class="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                        title="View spell details"
                                        data-umami-event="View spell"
                                        :data-umami-event-spell="(item as Spell).name"
                                        @click="onView(item as Spell)"
                                    >
                                        <Eye :size="16" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                        title="Edit spell"
                                        data-umami-event="Edit spell"
                                        :data-umami-event-spell="(item as Spell).name"
                                        @click="onEdit(item as Spell)"
                                    >
                                        <Pencil :size="16" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                        title="Export spell"
                                        data-umami-event="Export spell"
                                        :data-umami-event-spell="(item as Spell).name"
                                        @click="onExport(item as Spell)"
                                    >
                                        <Download :size="16" />
                                    </Button>
                                    <template v-if="confirmDeleteRow === (item as Spell).id">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                            :loading="deleting"
                                            title="Confirm deletion"
                                            data-umami-event="Confirm delete spell"
                                            :data-umami-event-spell="(item as Spell).name"
                                            @click="confirmDelete(item as Spell)"
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
                                            title="Delete spell"
                                            data-umami-event="Delete spell"
                                            :data-umami-event-spell="(item as Spell).name"
                                            @click="onDelete(item as Spell)"
                                        >
                                            <Trash2 :size="16" />
                                        </Button>
                                    </template>
                                </div>
                            </template>
                        </TableComponent>

                        <!-- Plugin Widgets: After Installed Table -->
                        <WidgetRenderer
                            v-if="activeTab === 'installed' && widgetsAfterInstalledTable.length > 0"
                            :widgets="widgetsAfterInstalledTable"
                        />
                    </TabsContent>

                    <TabsContent value="online">
                        <!-- Plugin Widgets: Before Online Content -->
                        <WidgetRenderer
                            v-if="activeTab === 'online' && widgetsBeforeOnlineContent.length > 0"
                            :widgets="widgetsBeforeOnlineContent"
                        />

                        <!-- Publish Banner -->
                        <div v-if="showOnlinePublishBanner" class="mb-4">
                            <div
                                class="rounded-xl p-5 bg-linear-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow relative"
                            >
                                <button
                                    class="absolute top-3 right-3 text-white/80 hover:text-white text-xs underline"
                                    @click="dismissSpellsOnlineBanner"
                                >
                                    Dismiss
                                </button>
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-start gap-3">
                                        <div class="mt-0.5">
                                            <Sparkles class="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div class="text-lg font-semibold leading-snug">
                                                Have some spells to share?
                                            </div>
                                            <p class="text-white/90 text-sm mt-1">
                                                Publish your creations to the community. Download your spell and head
                                                over to our cloud platform. Our team aims to review and publish within
                                                48 hours.
                                            </p>
                                            <div class="flex flex-wrap items-center gap-2 mt-3">
                                                <span
                                                    class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                                    >48h review</span
                                                >
                                                <span
                                                    class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                                    >Community powered</span
                                                >
                                                <span
                                                    class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                                    >Safety checks</span
                                                >
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                                        <div class="text-xs text-white/80">
                                            Tip: Include description, tags, and a banner for better visibility.
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <Button
                                                as="a"
                                                href="https://cloud.mythical.systems"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="sm"
                                                class="bg-white text-indigo-700 hover:bg-white/90"
                                            >
                                                Publish New Spell
                                                <ArrowRight class="h-4 w-4 ml-2" />
                                            </Button>
                                            <Button
                                                as="a"
                                                href="https://cloud.mythical.systems"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="sm"
                                                variant="secondary"
                                                class="bg-white/15 hover:bg-white/20 text-white"
                                            >
                                                Learn more
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center justify-between mb-3 gap-2">
                            <div class="flex items-center gap-2">
                                <div class="relative">
                                    <Input
                                        v-model="onlineSearch"
                                        placeholder="Search online spells..."
                                        class="pr-10 w-64"
                                        @keyup.enter="submitOnlineSearch"
                                    />
                                    <button
                                        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        @click="submitOnlineSearch"
                                    >
                                        <CloudDownload class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div v-if="onlinePagination" class="text-xs text-muted-foreground">
                                Page {{ currentOnlinePage }} / {{ onlinePagination.total_pages }} •
                                {{ onlinePagination.total_records }} results
                            </div>
                        </div>

                        <div v-if="onlineLoading" class="flex items-center justify-center py-8">
                            <div class="flex items-center gap-3">
                                <div
                                    class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                                ></div>
                                <span class="text-muted-foreground">Loading online spells...</span>
                            </div>
                        </div>
                        <div v-else-if="onlineError" class="text-center py-8">
                            <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                            <p class="text-destructive">{{ onlineError }}</p>
                            <Button size="sm" variant="outline" class="mt-2" @click="fetchOnlineSpells()"
                                >Try Again</Button
                            >
                        </div>
                        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card v-for="spell in onlineSpells" :key="spell.identifier">
                                <CardContent>
                                    <div class="p-4">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="flex items-center gap-3">
                                                <div
                                                    class="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden"
                                                >
                                                    <img
                                                        v-if="spell.icon"
                                                        :src="spell.icon"
                                                        :alt="spell.name"
                                                        class="h-8 w-8 object-contain"
                                                    />
                                                    <Settings v-else class="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <div class="font-semibold">
                                                        {{ spell.name }}
                                                        <span class="text-xs text-muted-foreground"
                                                            >({{ spell.identifier }})</span
                                                        >
                                                    </div>
                                                    <div class="text-xs text-muted-foreground">
                                                        <template v-if="spell.latest_version?.version"
                                                            >v{{ spell.latest_version.version }} •
                                                        </template>
                                                        <template v-if="spell.author">by {{ spell.author }}</template>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge v-if="spell.verified" variant="secondary">Verified</Badge>
                                            <Badge v-else variant="outline">Unverified</Badge>
                                        </div>
                                        <p class="text-sm text-muted-foreground mt-2 line-clamp-3">
                                            {{ spell.description }}
                                        </p>
                                        <p v-if="!spell.verified" class="mt-1 text-xs text-yellow-700">
                                            This spell is not verified. Review the source before installing.
                                        </p>
                                        <div class="mt-2 text-xs text-muted-foreground flex flex-wrap gap-1">
                                            <span
                                                v-for="tag in spell.tags"
                                                :key="tag"
                                                class="px-2 py-0.5 rounded bg-muted"
                                                >#{{ tag }}</span
                                            >
                                        </div>
                                        <div
                                            class="mt-2 text-xs text-muted-foreground flex items-center justify-between"
                                        >
                                            <span v-if="spell.downloads">{{ spell.downloads }} downloads</span>
                                            <a
                                                v-if="spell.website"
                                                :href="spell.website"
                                                target="_blank"
                                                class="hover:underline"
                                                >Website</a
                                            >
                                        </div>
                                        <div class="mt-3 flex justify-end">
                                            <template v-if="installedSpellIds.has(spell.identifier)">
                                                <Button size="sm" variant="outline" disabled>Installed</Button>
                                            </template>
                                            <template v-else>
                                                <Button
                                                    size="sm"
                                                    :disabled="installingOnlineId === spell.identifier"
                                                    data-umami-event="Install online spell"
                                                    :data-umami-event-spell="spell.name"
                                                    @click="openOnlineInstallDialog(spell)"
                                                >
                                                    <div
                                                        v-if="installingOnlineId === spell.identifier"
                                                        class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                                    ></div>
                                                    Install
                                                </Button>
                                            </template>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div
                            v-if="onlinePagination && onlinePagination.total_pages > 1 && onlineSpells.length > 0"
                            class="mt-6 flex justify-center"
                        >
                            <div class="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="currentOnlinePage === 1 || onlineLoading"
                                    @click="changeOnlinePage(currentOnlinePage - 1)"
                                >
                                    <ChevronLeft class="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <template
                                    v-for="(page, index) in getVisibleOnlinePages()"
                                    :key="`online-page-${page}-${index}`"
                                >
                                    <span
                                        v-if="typeof page === 'string'"
                                        class="px-2 text-sm text-muted-foreground select-none"
                                    >
                                        &hellip;
                                    </span>
                                    <Button
                                        v-else
                                        size="sm"
                                        :variant="page === currentOnlinePage ? 'default' : 'outline'"
                                        :disabled="page === currentOnlinePage"
                                        @click="changeOnlinePage(page)"
                                    >
                                        {{ page }}
                                    </Button>
                                </template>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="
                                        !onlinePagination ||
                                        currentOnlinePage === onlinePagination.total_pages ||
                                        onlineLoading
                                    "
                                    @click="changeOnlinePage(currentOnlinePage + 1)"
                                >
                                    Next
                                    <ChevronRight class="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>

                        <!-- Plugin Widgets: After Online Content -->
                        <WidgetRenderer
                            v-if="activeTab === 'online' && widgetsAfterOnlineContent.length > 0"
                            :widgets="widgetsAfterOnlineContent"
                        />
                    </TabsContent>
                </Tabs>
                <br />

                <!-- Plugin Widgets: Before Compatibility Card -->
                <WidgetRenderer
                    v-if="widgetsBeforeCompatibilityCard.length > 0"
                    :widgets="widgetsBeforeCompatibilityCard"
                />

                <!-- Cross-compatibility note -->
                <Card class="mb-4">
                    <CardContent>
                        <div class="p-4 text-sm text-muted-foreground flex items-start gap-3">
                            <Sparkles class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Cross-compatible spells</div>
                                <p>
                                    Realms and spells are fully cross-compatible. We maintain a spells repository that
                                    works with both FeatherPanel and Pterodactyl, so you can fetch and use the same
                                    spells in either panel. You can also bring your own spells – import them here or
                                    host them in your own repo.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Compatibility Card -->
                <WidgetRenderer
                    v-if="widgetsAfterCompatibilityCard.length > 0"
                    :widgets="widgetsAfterCompatibilityCard"
                />

                <!-- Plugin Widgets: Before Documentation Cards -->
                <WidgetRenderer
                    v-if="widgetsBeforeDocumentationCards.length > 0"
                    :widgets="widgetsBeforeDocumentationCards"
                />

                <!-- Spells documentation cards -->
                <div class="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <BookOpen class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">What are Spells (eggs)?</div>
                                    <p>
                                        Spells are server templates that define runtime, Docker image, startup,
                                        features, configs, and scripts. They live inside realms (categories) and power
                                        server creation.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Boxes class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">How you use them</div>
                                    <p>
                                        Install/import a spell, pick a realm, then create servers from it. Spells can
                                        include update URLs, tags, banners, and author info for easy discovery and
                                        updates.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Wrench class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Under the hood</div>
                                    <p>
                                        Configs (files/startup/logs/stop), file denylist, variables, Docker images,
                                        script container/entry, and optional privileged install scripts define behavior.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <GitBranch class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Sources & compatibility</div>
                                    <p>
                                        Use our cross-compatible spells repo (FeatherPanel ↔ Pterodactyl) or bring your
                                        own JSON-defined spells. Import locally or host them in your own repository.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Plugin Widgets: After Documentation Cards -->
                <WidgetRenderer
                    v-if="widgetsAfterDocumentationCards.length > 0"
                    :widgets="widgetsAfterDocumentationCards"
                />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
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
                            <div class="mt-4">
                                <label for="edit-privileged" class="block mb-2 text-sm font-medium"
                                    >Script Privilege</label
                                >
                                <Select
                                    :model-value="editForm.script_is_privileged ? 'true' : 'false'"
                                    @update:model-value="
                                        (value: any) => (editForm.script_is_privileged = value === 'true')
                                    "
                                >
                                    <SelectTrigger id="edit-privileged">
                                        <SelectValue placeholder="Select privilege level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Privileged</SelectItem>
                                        <SelectItem value="false">Non-privileged</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p class="text-xs text-muted-foreground mt-1">
                                    Privileged scripts have elevated permissions
                                </p>
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
                            <Button type="submit" variant="default">Save</Button>
                        </div>
                    </form>
                    <TabsContent value="variables">
                        <div class="flex justify-between items-center mb-3">
                            <div class="font-semibold text-lg">Variables</div>
                            <Button
                                size="sm"
                                variant="secondary"
                                :disabled="addingVariable || editingVariable !== null"
                                @click="startAddVariable"
                                >Add Variable</Button
                            >
                        </div>
                        <div
                            class="mb-3 p-3 bg-muted/50 rounded-lg border border-border/50 text-xs text-muted-foreground"
                        >
                            <div class="font-semibold text-foreground mb-1">Variable Field Types & Rules:</div>
                            <ul class="space-y-0.5 list-disc list-inside">
                                <li><b>Field Type:</b> text, number, boolean, select, textarea</li>
                                <li>
                                    <b>Rules:</b> Validation like
                                    <code class="text-xs bg-background px-1 py-0.5 rounded"
                                        >required|string|max:255</code
                                    >
                                </li>
                            </ul>
                        </div>

                        <!-- Add Variable Card -->
                        <Card v-if="addingVariable" class="mb-4 border-2 border-primary">
                            <CardContent class="pt-4">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <h4 class="font-semibold">New Variable</h4>
                                        <Badge variant="secondary">Adding</Badge>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Name *</label>
                                            <Input v-model="variableForm.name" placeholder="Server Port" />
                                        </div>
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Env Variable *</label>
                                            <Input v-model="variableForm.env_variable" placeholder="SERVER_PORT" />
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block mb-1 text-sm font-medium">Description *</label>
                                        <Textarea
                                            v-model="variableForm.description"
                                            placeholder="The port that the server will run on"
                                            rows="2"
                                        />
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Default Value *</label>
                                            <Input v-model="variableForm.default_value" placeholder="25565" />
                                        </div>
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Field Type</label>
                                            <Select v-model="variableForm.field_type">
                                                <SelectTrigger>
                                                    <SelectValue :placeholder="variableForm.field_type || 'text'" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="boolean">Boolean</SelectItem>
                                                    <SelectItem value="select">Select</SelectItem>
                                                    <SelectItem value="textarea">Textarea</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block mb-1 text-sm font-medium">Validation Rules</label>
                                        <Input
                                            v-model="variableForm.rules"
                                            placeholder="required|numeric|min:1|max:65535"
                                        />
                                    </div>
                                    <div class="flex items-center gap-6">
                                        <div class="flex items-center space-x-2">
                                            <Checkbox
                                                id="add-viewable"
                                                :checked="variableForm.user_viewable === 'true'"
                                                @update:checked="
                                                    (val: boolean) =>
                                                        (variableForm.user_viewable = val ? 'true' : 'false')
                                                "
                                            />
                                            <label for="add-viewable" class="text-sm font-medium cursor-pointer"
                                                >User Viewable</label
                                            >
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <Checkbox
                                                id="add-editable"
                                                :checked="variableForm.user_editable === 'true'"
                                                @update:checked="
                                                    (val: boolean) =>
                                                        (variableForm.user_editable = val ? 'true' : 'false')
                                                "
                                            />
                                            <label for="add-editable" class="text-sm font-medium cursor-pointer"
                                                >User Editable</label
                                            >
                                        </div>
                                    </div>
                                    <div class="flex justify-end gap-2 pt-2 border-t border-border/50">
                                        <Button size="sm" variant="outline" @click="cancelVariableEdit">Cancel</Button>
                                        <Button size="sm" variant="default" @click="submitVariable">
                                            <Plus class="h-4 w-4 mr-2" />
                                            Create Variable
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Variables List -->
                        <div class="space-y-3">
                            <Card v-for="variable in spellVariables" :key="variable.id">
                                <CardContent class="pt-4">
                                    <!-- Edit Mode -->
                                    <div v-if="editingVariable && editingVariable.id === variable.id" class="space-y-4">
                                        <div class="flex items-center justify-between mb-2">
                                            <h4 class="font-semibold">Editing Variable</h4>
                                            <Badge variant="secondary">Editing</Badge>
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block mb-1 text-sm font-medium">Name *</label>
                                                <Input v-model="variableForm.name" />
                                            </div>
                                            <div>
                                                <label class="block mb-1 text-sm font-medium">Env Variable *</label>
                                                <Input v-model="variableForm.env_variable" />
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Description *</label>
                                            <Textarea v-model="variableForm.description" rows="2" />
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block mb-1 text-sm font-medium">Default Value *</label>
                                                <Input v-model="variableForm.default_value" />
                                            </div>
                                            <div>
                                                <label class="block mb-1 text-sm font-medium">Field Type</label>
                                                <Select v-model="variableForm.field_type">
                                                    <SelectTrigger>
                                                        <SelectValue :placeholder="variableForm.field_type || 'text'" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="text">Text</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                        <SelectItem value="boolean">Boolean</SelectItem>
                                                        <SelectItem value="select">Select</SelectItem>
                                                        <SelectItem value="textarea">Textarea</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block mb-1 text-sm font-medium">Validation Rules</label>
                                            <Input
                                                v-model="variableForm.rules"
                                                placeholder="required|numeric|min:1|max:65535"
                                            />
                                        </div>
                                        <div class="flex items-center gap-6">
                                            <div class="flex items-center space-x-2">
                                                <Checkbox
                                                    :id="`edit-viewable-${variable.id}`"
                                                    :checked="variableForm.user_viewable === 'true'"
                                                    @update:checked="
                                                        (val: boolean) =>
                                                            (variableForm.user_viewable = val ? 'true' : 'false')
                                                    "
                                                />
                                                <label
                                                    :for="`edit-viewable-${variable.id}`"
                                                    class="text-sm font-medium cursor-pointer"
                                                    >User Viewable</label
                                                >
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <Checkbox
                                                    :id="`edit-editable-${variable.id}`"
                                                    :checked="variableForm.user_editable === 'true'"
                                                    @update:checked="
                                                        (val: boolean) =>
                                                            (variableForm.user_editable = val ? 'true' : 'false')
                                                    "
                                                />
                                                <label
                                                    :for="`edit-editable-${variable.id}`"
                                                    class="text-sm font-medium cursor-pointer"
                                                    >User Editable</label
                                                >
                                            </div>
                                        </div>
                                        <div class="flex justify-end gap-2 pt-2 border-t border-border/50">
                                            <Button size="sm" variant="outline" @click="cancelVariableEdit"
                                                >Cancel</Button
                                            >
                                            <Button size="sm" variant="default" @click="submitVariable">
                                                <Pencil class="h-4 w-4 mr-2" />
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- View Mode -->
                                    <div v-else class="space-y-3">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <h4 class="font-semibold text-base">{{ variable.name }}</h4>
                                                    <Badge variant="outline" class="text-xs font-mono">{{
                                                        variable.env_variable
                                                    }}</Badge>
                                                </div>
                                                <p class="text-sm text-muted-foreground">{{ variable.description }}</p>
                                            </div>
                                            <div class="flex gap-2 ml-4 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    :disabled="addingVariable || editingVariable !== null"
                                                    @click="startEditVariable(variable)"
                                                >
                                                    <Pencil :size="16" />
                                                </Button>
                                                <template v-if="confirmDeleteVariableRow === variable.id">
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        :loading="deleting"
                                                        @click="confirmDeleteVariable(variable)"
                                                    >
                                                        Confirm
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        :disabled="deleting"
                                                        @click="onCancelDeleteVariable"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </template>
                                                <template v-else>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        :disabled="addingVariable || editingVariable !== null"
                                                        @click="onDeleteVariable(variable)"
                                                    >
                                                        <Trash2 :size="16" />
                                                    </Button>
                                                </template>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-2 gap-4 text-sm">
                                            <div class="space-y-2">
                                                <div class="flex justify-between">
                                                    <span class="text-muted-foreground">Default Value:</span>
                                                    <span class="font-mono text-xs">{{
                                                        variable.default_value || '-'
                                                    }}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-muted-foreground">Field Type:</span>
                                                    <Badge variant="outline" class="text-xs">{{
                                                        variable.field_type || 'text'
                                                    }}</Badge>
                                                </div>
                                            </div>
                                            <div class="space-y-2">
                                                <div class="flex justify-between">
                                                    <span class="text-muted-foreground">User Viewable:</span>
                                                    <Badge
                                                        :variant="
                                                            variable.user_viewable === 'true' ? 'default' : 'secondary'
                                                        "
                                                        class="text-xs"
                                                    >
                                                        {{ variable.user_viewable === 'true' ? 'Yes' : 'No' }}
                                                    </Badge>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-muted-foreground">User Editable:</span>
                                                    <Badge
                                                        :variant="
                                                            variable.user_editable === 'true' ? 'default' : 'secondary'
                                                        "
                                                        class="text-xs"
                                                    >
                                                        {{ variable.user_editable === 'true' ? 'Yes' : 'No' }}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-if="variable.rules" class="text-sm pt-2 border-t border-border/50">
                                            <span class="text-muted-foreground">Validation Rules:</span>
                                            <code
                                                class="ml-2 text-xs bg-muted px-2 py-1 rounded font-mono text-foreground"
                                                >{{ variable.rules }}</code
                                            >
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <!-- Empty State -->
                        <div v-if="!addingVariable && spellVariables.length === 0" class="text-center py-8">
                            <Settings class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p class="text-sm text-muted-foreground">No variables defined yet.</p>
                            <p class="text-xs text-muted-foreground mt-1">Click "Add Variable" to create one.</p>
                        </div>
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
                            <div class="mt-4">
                                <label for="create-privileged" class="block mb-2 text-sm font-medium"
                                    >Script Privilege</label
                                >
                                <Select
                                    :model-value="createForm.script_is_privileged ? 'true' : 'false'"
                                    @update:model-value="
                                        (value: any) => (createForm.script_is_privileged = value === 'true')
                                    "
                                >
                                    <SelectTrigger id="create-privileged">
                                        <SelectValue placeholder="Select privilege level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Privileged</SelectItem>
                                        <SelectItem value="false">Non-privileged</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p class="text-xs text-muted-foreground mt-1">
                                    Privileged scripts have elevated permissions
                                </p>
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
                            <Button type="submit" variant="default">Create</Button>
                        </div>
                    </form>
                </Tabs>
            </DrawerContent>
        </Drawer>

        <!-- Confirm Online Install Dialog -->
        <Dialog v-model:open="confirmOnlineOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Install Spell</DialogTitle>
                    <DialogDescription>
                        {{ selectedSpellForInstall?.name }} ({{ selectedSpellForInstall?.identifier }})
                    </DialogDescription>
                </DialogHeader>
                <div v-if="selectedSpellForInstall && !selectedSpellForInstall.verified" class="text-sm">
                    <div class="text-yellow-700">
                        Warning: This spell is not verified. Installing unverified spells can be unsafe.
                    </div>
                </div>
                <div v-if="!currentRealm" class="text-sm">
                    <div class="text-red-700">Error: You must select a realm before installing spells.</div>
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        :disabled="installingOnlineId === selectedSpellForInstall?.identifier || !currentRealm"
                        @click="proceedOnlineInstall"
                    >
                        <div
                            v-if="installingOnlineId === selectedSpellForInstall?.identifier"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        Install
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
import { useRoute } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Eye,
    Pencil,
    Trash2,
    Download,
    Plus,
    Upload,
    CloudDownload,
    Settings,
    AlertCircle,
    Sparkles,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Boxes,
    Wrench,
    GitBranch,
} from 'lucide-vue-next';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { useToast } from 'vue-toastification';

const toast = useToast();
const showOnlinePublishBanner = ref(true);

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
    field_type?: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
    created_at?: string;
    updated_at?: string;
};

type OnlineSpell = {
    id: number;
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    author_email?: string | null;
    maintainers: string[];
    tags: string[];
    verified: boolean;
    downloads: number;
    created_at?: string | null;
    updated_at?: string | null;
    latest_version: {
        version?: string | null;
        download_url?: string | null;
        file_size?: number | null;
        created_at?: string | null;
    };
};

type OnlinePagination = {
    current_page: number;
    total_pages: number;
    total_records: number;
};

type OnlinePaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

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
    field_type: 'text',
});
const activeEditTab = ref('general');
const addingVariable = ref(false);
const confirmDeleteVariableRow = ref<number | null>(null);

// Online spells functionality
const activeTab = ref<'installed' | 'online'>('installed');
const onlineSpells = ref<OnlineSpell[]>([]);
const onlineLoading = ref(false);
const onlineError = ref<string | null>(null);
const installingOnlineId = ref<string | null>(null);
const onlinePagination = ref<OnlinePagination | null>(null);
const currentOnlinePage = ref(1);
const ONLINE_SPELLS_PER_PAGE = 20;
const onlineSearch = ref('');
const confirmOnlineOpen = ref(false);
const selectedSpellForInstall = ref<OnlineSpell | null>(null);
const installedSpellIds = computed<Set<string>>(() => new Set(spells.value.map((s) => s.name)));

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-spells');
const widgetsTopOfPage = computed(() => getWidgets('admin-spells', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('admin-spells', 'after-header'));
const widgetsBeforeInstalledTable = computed(() => getWidgets('admin-spells', 'before-installed-table'));
const widgetsAfterInstalledTable = computed(() => getWidgets('admin-spells', 'after-installed-table'));
const widgetsBeforeOnlineContent = computed(() => getWidgets('admin-spells', 'before-online-content'));
const widgetsAfterOnlineContent = computed(() => getWidgets('admin-spells', 'after-online-content'));
const widgetsBeforeCompatibilityCard = computed(() => getWidgets('admin-spells', 'before-compatibility-card'));
const widgetsAfterCompatibilityCard = computed(() => getWidgets('admin-spells', 'after-compatibility-card'));
const widgetsBeforeDocumentationCards = computed(() => getWidgets('admin-spells', 'before-documentation-cards'));
const widgetsAfterDocumentationCards = computed(() => getWidgets('admin-spells', 'after-documentation-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-spells', 'bottom-of-page'));

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
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch spells';
        toast.error(errorMessage);
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
    // Fetch plugin widgets
    await fetchPluginWidgets();

    const dismissed = localStorage.getItem('featherpanel_spells_online_banner_dismissed');
    showOnlinePublishBanner.value = dismissed !== 'true';
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

function dismissSpellsOnlineBanner() {
    showOnlinePublishBanner.value = false;
    localStorage.setItem('featherpanel_spells_online_banner_dismissed', 'true');
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchSpells();
}

async function onView(spell: Spell) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/spells/${spell.id}`);
        selectedSpell.value = data.data.spell;
    } catch {
        selectedSpell.value = null;
        toast.error('Failed to fetch spell details');
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
            toast.success('Spell deleted successfully');
            await fetchSpells();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete spell');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete spell';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
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

        toast.success('Spell exported successfully');
    } catch {
        toast.error('Failed to export spell');
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
        toast.error('Failed to fetch spell details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingSpell.value = null;
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
            toast.success('Spell updated successfully');
            await fetchSpells();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update spell');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update spell';
        toast.error(errorMessage);
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
        toast.error('Please select a realm before creating a spell.');
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
            toast.success('Spell created successfully');
            await fetchSpells();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create spell');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create spell';
        toast.error(errorMessage);
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
        toast.error('Please select a realm before importing a spell.');
        input.value = '';
        return;
    }

    axios
        .post('/api/admin/spells/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(() => {
            toast.success('Spell imported successfully');
            fetchSpells();
        })
        .catch((err) => {
            toast.error(err?.response?.data?.message || 'Failed to import spell');
        })
        .finally(() => {
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
            field_type: v.field_type || 'text',
            rules: v.rules || '',
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
        field_type: 'text',
    };
    addingVariable.value = true;
}

function startEditVariable(variable: SpellVariable) {
    editingVariable.value = variable;
    variableForm.value = {
        ...variable,
        user_viewable: variable.user_viewable,
        user_editable: variable.user_editable,
        field_type: variable.field_type || 'text',
        rules: variable.rules || '',
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
        toast.error('Failed to save variable. Please try again.');
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
        toast.error('Failed to delete variable');
    }
}

watch(editingSpell, fetchSpellVariables);

// Online spells functions
function isOnlinePagination(value: unknown): value is OnlinePagination {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    return (
        typeof record.current_page === 'number' &&
        typeof record.total_pages === 'number' &&
        typeof record.total_records === 'number'
    );
}

const fetchOnlineSpells = async (page = currentOnlinePage.value) => {
    onlineLoading.value = true;
    onlineError.value = null;

    const params = new URLSearchParams({
        page: String(page),
        per_page: String(ONLINE_SPELLS_PER_PAGE),
    });

    if (onlineSearch.value) {
        params.set('q', onlineSearch.value);
    }

    try {
        const { data } = await axios.get(`/api/admin/spells/online/list?${params.toString()}`);
        onlineSpells.value = Array.isArray(data.data?.spells) ? (data.data.spells as OnlineSpell[]) : [];
        const paginationData = data.data?.pagination;

        if (isOnlinePagination(paginationData)) {
            onlinePagination.value = paginationData;
            currentOnlinePage.value = paginationData.current_page;
        } else {
            onlinePagination.value = null;
            currentOnlinePage.value = page;
        }
    } catch (e) {
        onlineError.value = e instanceof Error ? e.message : 'Failed to load online spells';
    } finally {
        onlineLoading.value = false;
    }
};

function getVisibleOnlinePages(): OnlinePaginationItem[] {
    const paginationState = onlinePagination.value;

    if (!paginationState) {
        return [];
    }

    const totalPages = paginationState.total_pages;
    const currentPage = currentOnlinePage.value;

    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => (index + 1) as OnlinePaginationItem);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);

    if (currentPage > 1) {
        pages.add(currentPage - 1);
    }

    if (currentPage < totalPages) {
        pages.add(currentPage + 1);
    }

    if (currentPage <= 3) {
        for (let pageNumber = 2; pageNumber <= Math.min(4, totalPages - 1); pageNumber += 1) {
            pages.add(pageNumber);
        }
    } else if (currentPage >= totalPages - 2) {
        for (let pageNumber = Math.max(totalPages - 3, 2); pageNumber <= totalPages - 1; pageNumber += 1) {
            pages.add(pageNumber);
        }
    }

    const sortedPages = Array.from(pages)
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
        .sort((a, b) => a - b);

    const visible: OnlinePaginationItem[] = [];
    let hasLeftEllipsis = false;
    let hasRightEllipsis = false;
    let previousNumber: number | null = null;

    for (const pageNumber of sortedPages) {
        if (previousNumber !== null && pageNumber - previousNumber > 1) {
            if (pageNumber > currentPage) {
                if (!hasRightEllipsis) {
                    visible.push('ellipsis-right');
                    hasRightEllipsis = true;
                }
            } else if (!hasLeftEllipsis) {
                visible.push('ellipsis-left');
                hasLeftEllipsis = true;
            }
        }

        visible.push(pageNumber as OnlinePaginationItem);
        previousNumber = pageNumber;
    }

    return visible;
}

function changeOnlinePage(page: number) {
    if (onlineLoading.value) {
        return;
    }

    const paginationState = onlinePagination.value;
    const totalPages = paginationState?.total_pages ?? page;

    if (page < 1 || page > totalPages || page === currentOnlinePage.value) {
        return;
    }

    fetchOnlineSpells(page);
}

const submitOnlineSearch = () => {
    currentOnlinePage.value = 1;
    fetchOnlineSpells(1);
};

const openOnlineInstallDialog = (spell: OnlineSpell) => {
    selectedSpellForInstall.value = spell;
    confirmOnlineOpen.value = true;
};

const proceedOnlineInstall = async () => {
    if (!selectedSpellForInstall.value || !currentRealm.value) return;
    await onlineInstall(selectedSpellForInstall.value.identifier);
    confirmOnlineOpen.value = false;
    selectedSpellForInstall.value = null;
};

const onlineInstall = async (identifier: string) => {
    installingOnlineId.value = identifier;
    try {
        await axios.post('/api/admin/spells/online/install', {
            identifier,
            realm_id: currentRealm.value?.id,
        });
        await fetchSpells();
        toast.success(`Installed ${identifier}`);
    } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Install failed');
    } finally {
        installingOnlineId.value = null;
    }
};

// Watch for tab changes to load online spells
watch(activeTab, (value) => {
    if (value === 'online') {
        submitOnlineSearch();
    }
});
</script>

<style scoped>
.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
