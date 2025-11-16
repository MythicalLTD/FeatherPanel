<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Users', isCurrent: true, href: '/admin/users' }]">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading users...</span>
                </div>
            </div>

            <!-- Users Table -->
            <div v-else class="p-6">
                <!-- Plugin Widgets: Before Table -->
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <TableComponent
                    title="Users"
                    description="Manage all users in your system."
                    :columns="tableColumns"
                    :data="users"
                    :search-placeholder="'Search by username, email, or role...'"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-users-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" data-umami-event="Create user" @click="openCreateDrawer">
                            <Plus class="h-4 w-4 mr-2" />
                            Create User
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-avatar="{ item }">
                        <Avatar>
                            <AvatarImage :src="(item as ApiUser).avatar" :alt="(item as ApiUser).username" />
                            <AvatarFallback>{{ (item as ApiUser).username[0] }}</AvatarFallback>
                        </Avatar>
                    </template>

                    <template #cell-role="{ item }">
                        <Badge
                            :style="
                                (item as ApiUser).role?.color
                                    ? { backgroundColor: (item as ApiUser).role?.color || '', color: '#fff' }
                                    : {}
                            "
                            variant="secondary"
                        >
                            {{ (item as ApiUser).role?.display_name || (item as ApiUser).role?.name || '-' }}
                        </Badge>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View user details"
                                data-umami-event="View user"
                                :data-umami-event-user="(item as ApiUser).username"
                                @click="onView(item as ApiUser)"
                            >
                                <Eye :size="16" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit user"
                                data-umami-event="Edit user"
                                :data-umami-event-user="(item as ApiUser).username"
                                @click="onEdit(item as ApiUser)"
                            >
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === (item as ApiUser).uuid">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                    :loading="deleting"
                                    title="Confirm deletion"
                                    data-umami-event="Confirm delete user"
                                    :data-umami-event-user="(item as ApiUser).username"
                                    @click="confirmDelete(item as ApiUser)"
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
                                    title="Delete user"
                                    data-umami-event="Delete user"
                                    :data-umami-event-user="(item as ApiUser).username"
                                    @click="onDelete(item as ApiUser)"
                                >
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>

                <!-- Plugin Widgets: After Table -->
                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <!-- Plugin Widgets: Before Help Cards -->
                <WidgetRenderer v-if="widgetsBeforeHelpCards.length > 0" :widgets="widgetsBeforeHelpCards" />

                <!-- Users page help cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <UsersIcon class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Managing Users</div>
                                    <p>
                                        View, create, and edit accounts. Use the search to quickly find users by
                                        username, email, or role. Pagination and column visibility are customizable.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Shield class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Roles & Permissions</div>
                                    <p>
                                        Assign roles to control access and capabilities. Role badges reflect the
                                        assigned role, and colors help you spot important roles at a glance.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <KeyRound class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Security Actions</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Ban or unban accounts when needed</li>
                                        <li>Remove 2FA for locked-out users</li>
                                        <li>Audit activities, servers, and mails per user</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Search class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-semibold text-foreground mb-1">Tips</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Use filters and search to quickly target accounts.</li>
                                        <li>Keep roles minimal (least privilege) and review periodically.</li>
                                        <li>Encourage users to enable 2FA; remove 2FA only for support scenarios.</li>
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
            <DrawerContent v-if="selectedUser">
                <DrawerHeader>
                    <DrawerTitle>User Info</DrawerTitle>
                    <DrawerDescription>Viewing details for user: {{ selectedUser.username }}</DrawerDescription>
                </DrawerHeader>
                <div class="flex items-center gap-4 mb-6 px-6 pt-6">
                    <Avatar>
                        <AvatarImage :src="selectedUser.avatar" :alt="selectedUser.username" />
                        <AvatarFallback>{{ selectedUser.username[0] }}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div class="font-bold text-xl">{{ selectedUser.username }}</div>
                        <div class="text-muted-foreground text-sm">{{ selectedUser.email }}</div>
                    </div>
                </div>
                <section class="px-6 pb-6 min-h-[500px]">
                    <Tabs default-value="account">
                        <TabsList class="mb-4">
                            <TabsTrigger value="account">Account Info</TabsTrigger>
                            <TabsTrigger value="servers">Servers</TabsTrigger>
                            <TabsTrigger value="activities">Activities</TabsTrigger>
                            <TabsTrigger value="mails">Mails</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account">
                            <h3 class="font-semibold text-base mb-4">Account Information</h3>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <div class="text-sm text-muted-foreground mb-1">User ID</div>
                                    <div class="font-medium">{{ selectedUser.id }}</div>
                                </div>
                                <div>
                                    <div class="text-sm text-muted-foreground mb-1">UUID</div>
                                    <div class="font-mono text-xs">{{ selectedUser.uuid }}</div>
                                </div>
                                <div v-if="selectedUser.external_id">
                                    <div class="text-sm text-muted-foreground mb-1">External ID</div>
                                    <div class="font-medium">{{ selectedUser.external_id }}</div>
                                </div>
                                <div>
                                    <div class="text-sm text-muted-foreground mb-1">Role</div>
                                    <Badge
                                        :style="
                                            selectedUser.role?.color
                                                ? { backgroundColor: selectedUser.role?.color || '', color: '#fff' }
                                                : {}
                                        "
                                        variant="secondary"
                                    >
                                        {{ selectedUser.role?.display_name || selectedUser.role?.name || '-' }}
                                    </Badge>
                                </div>
                                <div v-if="selectedUser.first_name || selectedUser.last_name">
                                    <div class="text-sm text-muted-foreground mb-1">Full Name</div>
                                    <div class="font-medium">
                                        {{ selectedUser.first_name }} {{ selectedUser.last_name }}
                                    </div>
                                </div>
                                <div v-if="selectedUser.first_seen">
                                    <div class="text-sm text-muted-foreground mb-1">First Seen</div>
                                    <div class="font-medium">{{ selectedUser.first_seen }}</div>
                                </div>
                                <div v-if="selectedUser.last_seen">
                                    <div class="text-sm text-muted-foreground mb-1">Last Seen</div>
                                    <div class="font-medium">{{ selectedUser.last_seen }}</div>
                                </div>
                                <div v-if="selectedUser.created_at">
                                    <div class="text-sm text-muted-foreground mb-1">Account Created</div>
                                    <div class="font-medium">{{ selectedUser.created_at }}</div>
                                </div>
                            </div>
                            <h3 class="font-semibold text-base mb-4 mt-6">Security & Status</h3>
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <div class="text-sm text-muted-foreground mb-2">Account Status</div>
                                    <div class="flex gap-2">
                                        <Badge :variant="selectedUser.banned === 'true' ? 'destructive' : 'secondary'">
                                            {{ selectedUser.banned === 'true' ? 'Banned' : 'Active' }}
                                        </Badge>
                                        <Badge :variant="selectedUser.locked === 'true' ? 'destructive' : 'secondary'">
                                            {{ selectedUser.locked === 'true' ? 'Locked' : 'Unlocked' }}
                                        </Badge>
                                        <Badge
                                            :variant="
                                                selectedUser.deleted === 'true' || selectedUser.deleted === true
                                                    ? 'destructive'
                                                    : 'secondary'
                                            "
                                        >
                                            {{
                                                selectedUser.deleted === 'true' || selectedUser.deleted === true
                                                    ? 'Deleted'
                                                    : 'Active'
                                            }}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm text-muted-foreground mb-2">Two-Factor Authentication</div>
                                    <Badge :variant="selectedUser.two_fa_enabled === 'true' ? 'secondary' : 'outline'">
                                        {{ selectedUser.two_fa_enabled === 'true' ? 'Enabled' : 'Disabled' }}
                                    </Badge>
                                    <Badge
                                        v-if="selectedUser.two_fa_blocked === 'true'"
                                        variant="destructive"
                                        class="ml-2"
                                    >
                                        Blocked
                                    </Badge>
                                </div>
                                <div v-if="selectedUser.first_ip">
                                    <div class="text-sm text-muted-foreground mb-1">First IP</div>
                                    <div class="font-mono text-sm">{{ selectedUser.first_ip }}</div>
                                </div>
                                <div v-if="selectedUser.last_ip">
                                    <div class="text-sm text-muted-foreground mb-1">Last IP</div>
                                    <div class="font-mono text-sm">{{ selectedUser.last_ip }}</div>
                                </div>
                            </div>
                            <div v-if="selectedUser.discord_oauth2_linked === 'true'" class="mt-6">
                                <h3 class="font-semibold text-base mb-4">Discord Integration</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Discord ID</div>
                                        <div class="font-mono text-sm">
                                            {{ selectedUser.discord_oauth2_id || 'N/A' }}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Discord Username</div>
                                        <div class="font-medium">
                                            {{ selectedUser.discord_oauth2_username || 'N/A' }}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Discord Name</div>
                                        <div class="font-medium">{{ selectedUser.discord_oauth2_name || 'N/A' }}</div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Status</div>
                                        <Badge
                                            :variant="
                                                selectedUser.discord_oauth2_linked === 'true' ? 'secondary' : 'outline'
                                            "
                                        >
                                            {{
                                                selectedUser.discord_oauth2_linked === 'true' ? 'Linked' : 'Not Linked'
                                            }}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="servers">
                            <h3 class="font-semibold text-base mb-4">Servers</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead class="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="server in ownedServers" :key="server.id">
                                        <TableCell>{{ server.name }}</TableCell>
                                        <TableCell>
                                            <Badge :variant="server.status === 'Online' ? 'secondary' : 'destructive'">
                                                {{ server.status || 'Offline' }}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{{ server.created_at }}</TableCell>
                                        <TableCell class="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                @click="goToServerManage(server.uuidShort)"
                                                >View Server (Client)</Button
                                            >
                                            <Button size="sm" variant="outline" @click="goToServerEdit(server.id)"
                                                >Edit Server (Admin)</Button
                                            >
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="activities">
                            <h3 class="font-semibold text-base mb-4">Activities</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Context</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow
                                        v-for="activity in selectedUser.activities"
                                        :key="activity.created_at + activity.name"
                                    >
                                        <TableCell>{{ activity.name }}</TableCell>
                                        <TableCell>{{ activity.context }}</TableCell>
                                        <TableCell>{{ activity.ip_address }}</TableCell>
                                        <TableCell>{{ activity.created_at }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="mails">
                            <h3 class="font-semibold text-base mb-4">Mails</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead>Preview</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow v-for="mail in selectedUser.mails" :key="mail.created_at + mail.subject">
                                        <TableCell>{{ mail.subject }}</TableCell>
                                        <TableCell>
                                            <Badge :variant="mail.status === 'sent' ? 'secondary' : 'destructive'">
                                                {{ mail.status }}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{{ mail.created_at }}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline" @click="() => showMailPreview(mail)">
                                                Preview
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </section>
                <!-- Mail Preview Dialog -->
                <Dialog v-model:open="mailPreviewOpen">
                    <DialogContent class="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{{ mailPreview?.subject }}</DialogTitle>
                            <DialogDescription>
                                {{ mailPreview?.created_at }} | {{ mailPreview?.status }}
                            </DialogDescription>
                        </DialogHeader>
                        <div class="overflow-auto max-h-[60vh] border rounded bg-background p-4">
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <div v-if="mailPreview?.body" v-html="mailPreview.body"></div>
                            <div v-else class="text-muted-foreground">No content</div>
                        </div>
                    </DialogContent>
                </Dialog>
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
            <DrawerContent v-if="editingUser">
                <DrawerHeader>
                    <DrawerTitle>Edit User</DrawerTitle>
                    <DrawerDescription>Edit details for user: {{ editingUser.username }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <label for="edit-username" class="block mb-1 font-medium">Username</label>
                    <Input
                        id="edit-username"
                        v-model="editForm.username"
                        label="Username"
                        placeholder="Username"
                        required
                    />
                    <label for="edit-firstname" class="block mb-1 font-medium">First Name</label>
                    <Input
                        id="edit-firstname"
                        v-model="editForm.first_name"
                        label="First Name"
                        placeholder="First Name"
                    />
                    <label for="edit-lastname" class="block mb-1 font-medium">Last Name</label>
                    <Input id="edit-lastname" v-model="editForm.last_name" label="Last Name" placeholder="Last Name" />
                    <label for="edit-email" class="block mb-1 font-medium">Email</label>
                    <Input id="edit-email" v-model="editForm.email" label="Email" placeholder="Email" type="email" />
                    <div class="flex flex-col gap-2 mt-4">
                        <!-- Removed Account Flags checkboxes for banned and 2FA Enabled -->
                    </div>
                    <label class="block mb-2 font-medium">Role</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="outline" class="w-full text-left">
                                {{
                                    availableRoles.find((r) => r.id == editForm.role_id)?.display_name || 'Select Role'
                                }}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-56">
                            <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup v-model="editForm.role_id">
                                <DropdownMenuRadioItem
                                    v-for="role in availableRoles"
                                    :key="role.id"
                                    :value="String(role.id)"
                                >
                                    <span :style="{ color: role.color }">{{ role.display_name }}</span>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <label for="edit-externalid" class="block mb-1 font-medium">External ID (NULL to clear)</label>
                    <Input
                        id="edit-externalid"
                        :model-value="editForm.external_id ?? ''"
                        label="External ID"
                        placeholder="External ID"
                        type="number"
                        @update:model-value="(val) => (editForm.external_id = val === '' ? undefined : Number(val))"
                    />
                    <p class="text-xs text-muted-foreground">
                        External ID for integration. Leave empty or set to 0 to clear.
                    </p>
                    <label for="edit-password" class="block mb-1 font-medium">Password</label>
                    <Input
                        id="edit-password"
                        v-model="editForm.password"
                        label="Password"
                        placeholder="Password"
                        type="password"
                    />
                    <div class="flex flex-wrap justify-end gap-2 mt-4">
                        <Button
                            type="button"
                            :variant="editingUser && editingUser.banned === 'true' ? 'secondary' : 'destructive'"
                            data-umami-event="Toggle ban user"
                            :data-umami-event-user="editingUser?.username"
                            @click="toggleBanUser"
                        >
                            {{ editingUser && editingUser.banned === 'true' ? 'Unban User' : 'Ban User' }}
                        </Button>
                        <Button
                            v-if="editingUser && editingUser.two_fa_enabled === 'true'"
                            type="button"
                            variant="secondary"
                            data-umami-event="Remove 2FA"
                            :data-umami-event-user="editingUser?.username"
                            @click="disable2FA"
                        >
                            Disable 2FA
                        </Button>
                        <Button
                            v-if="editingUser && editingUser.discord_oauth2_linked === 'true'"
                            type="button"
                            variant="secondary"
                            data-umami-event="Unlink Discord"
                            :data-umami-event-user="editingUser?.username"
                            @click="unlinkDiscord"
                        >
                            Unlink Discord
                        </Button>
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                        <Button
                            type="submit"
                            variant="default"
                            data-umami-event="Save user"
                            :data-umami-event-user="editingUser?.username"
                            >Save</Button
                        >
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
                    <DrawerTitle>Create User</DrawerTitle>
                    <DrawerDescription>Fill in the details to create a new user.</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                    <label for="create-username" class="block mb-1 font-medium">Username</label>
                    <Input
                        id="create-username"
                        v-model="createForm.username"
                        label="Username"
                        placeholder="Username"
                        required
                    />
                    <label for="create-firstname" class="block mb-1 font-medium">First Name</label>
                    <Input
                        id="create-firstname"
                        v-model="createForm.first_name"
                        label="First Name"
                        placeholder="First Name"
                        required
                    />
                    <label for="create-lastname" class="block mb-1 font-medium">Last Name</label>
                    <Input
                        id="create-lastname"
                        v-model="createForm.last_name"
                        label="Last Name"
                        placeholder="Last Name"
                        required
                    />
                    <label for="create-email" class="block mb-1 font-medium">Email</label>
                    <Input
                        id="create-email"
                        v-model="createForm.email"
                        label="Email"
                        placeholder="Email"
                        type="email"
                        required
                    />
                    <label for="create-password" class="block mb-1 font-medium">Password</label>
                    <Input
                        id="create-password"
                        v-model="createForm.password"
                        label="Password"
                        placeholder="Password"
                        type="password"
                        required
                    />
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                        <Button type="submit" variant="default">Create</Button>
                    </div>
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

import { computed, onMounted, ref, watch } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, Plus, Users as UsersIcon, Shield, KeyRound, Search } from 'lucide-vue-next';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from 'vue-toastification';

type UserRole = {
    name: string;
    display_name: string;
    color: string;
};

type ApiUser = {
    id?: number;
    uuid: string;
    avatar: string;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    external_id?: number | null;
    password?: string;
    remember_token?: string;
    mail_verify?: string | null;
    first_ip?: string;
    last_ip?: string;
    banned?: string;
    two_fa_enabled?: string;
    two_fa_key?: string;
    two_fa_blocked?: string;
    deleted?: boolean | string;
    locked?: boolean | string;
    first_seen?: string;
    last_seen?: string;
    created_at?: string;
    updated_at?: string;
    role_id?: number;
    role?: UserRole;
    status?: string;
    discord_oauth2_id?: string | null;
    discord_oauth2_access_token?: string | null;
    discord_oauth2_linked?: string;
    discord_oauth2_username?: string | null;
    discord_oauth2_name?: string | null;
    activities?: { name: string; context: string; ip_address: string; created_at: string }[];
    mails?: { subject: string; status: string; created_at: string }[];
};

type EditForm = {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
    external_id?: number | null;
    password?: string;
};

const toast = useToast();

const users = ref<ApiUser[]>([]);
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
const confirmDeleteRow = ref<string | null>(null);
const selectedUser = ref<ApiUser | null>(null);
const viewing = ref(false);
const editingUser = ref<ApiUser | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref<EditForm>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: '',
    external_id: undefined,
    password: '',
});

// Store roles for dropdown
const availableRoles = ref<{ id: string; name: string; display_name: string; color: string }[]>([]);

// Owned servers list
const ownedServers = ref<
    { id: number; name: string; description?: string; status?: string; uuidShort: string; created_at: string }[]
>([]);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-users');
const widgetsTopOfPage = computed(() => getWidgets('admin-users', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-users', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-users', 'after-table'));
const widgetsBeforeHelpCards = computed(() => getWidgets('admin-users', 'before-help-cards'));
const widgetsAfterHelpCards = computed(() => getWidgets('admin-users', 'after-help-cards'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-users', 'bottom-of-page'));

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'avatar', label: 'Avatar', headerClass: 'w-[50px]', hideLabelOnLayout: true },
    { key: 'username', label: 'Username', searchable: true },
    { key: 'email', label: 'Email', searchable: true },
    { key: 'role', label: 'Role', searchable: true },
    { key: 'last_seen', label: 'Last Seen' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchUsers() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/users', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        users.value = data.data.users || [];

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
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await fetchUsers();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchUsers);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchUsers();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchUsers();
}

async function onView(user: ApiUser) {
    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/users/${user.uuid}`);
        selectedUser.value = data.data.user;
        // Load owned servers for this user
        const serversRes = await axios.get(`/api/admin/users/${user.uuid}/servers`);
        ownedServers.value = serversRes.data?.data?.servers || [];
    } catch {
        selectedUser.value = null;
        toast.error('Failed to fetch user details');
    }
}

function onEdit(user: ApiUser) {
    openEditDrawer(user);
}

async function confirmDelete(user: ApiUser) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/users/${user.uuid}`);
        if (response.data && response.data.success) {
            toast.success('User deleted successfully');
            await fetchUsers();
            success = true;
        } else {
            toast.error(response.data?.message || 'Failed to delete user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete user';
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
    }
}

function onDelete(user: ApiUser) {
    confirmDeleteRow.value = user.uuid;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedUser.value = null;
    ownedServers.value = [];
}

async function disable2FA() {
    if (!editingUser.value) return;
    try {
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, {
            two_fa_enabled: 'false',
            two_fa_key: null,
        });
        if (data && data.success) {
            toast.success('Two-factor authentication disabled successfully');
            // Refresh user data
            await openEditDrawer(editingUser.value);
        } else {
            toast.error(data?.message || 'Failed to disable 2FA');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to disable 2FA';
        toast.error(errorMessage);
    }
}

async function unlinkDiscord() {
    if (!editingUser.value) return;
    if (!confirm('Are you sure you want to unlink Discord from this user?')) {
        return;
    }
    try {
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, {
            discord_oauth2_linked: 'false',
            discord_oauth2_id: null,
            discord_oauth2_access_token: null,
            discord_oauth2_username: null,
            discord_oauth2_name: null,
        });
        if (data && data.success) {
            toast.success('Discord unlinked successfully');
            // Refresh user data
            await openEditDrawer(editingUser.value);
        } else {
            toast.error(data?.message || 'Failed to unlink Discord');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to unlink Discord';
        toast.error(errorMessage);
    }
}

async function openEditDrawer(user: ApiUser) {
    try {
        const { data } = await axios.get(`/api/admin/users/${user.uuid}`);
        const u: ApiUser = data.data.user;
        // Parse roles from API response
        const rolesObj = data.data.roles || {};
        availableRoles.value = Object.entries(rolesObj).map(([id, role]) => {
            const r = role as { name: string; display_name: string; color: string };
            return {
                id: String(id),
                name: r.name,
                display_name: r.display_name,
                color: r.color,
            };
        });
        editingUser.value = u;
        editForm.value = {
            username: u.username || '',
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            email: u.email || '',
            role_id: u.role_id != null ? String(u.role_id) : '',
            external_id: u.external_id !== null && u.external_id !== undefined ? Number(u.external_id) : undefined,
            password: u.password || '',
        };
        editDrawerOpen.value = true;
    } catch {
        toast.error('Failed to fetch user details for editing');
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingUser.value = null;
}

async function submitEdit() {
    if (!editingUser.value) return;
    try {
        // Create patch data and remove password if it's empty
        const patchData = { ...editForm.value };
        if (!patchData.password || patchData.password.trim() === '') {
            delete patchData.password;
        }

        // Handle external_id - convert empty or 0 to null
        if (patchData.external_id === undefined || patchData.external_id === null || patchData.external_id === 0) {
            delete patchData.external_id;
        }

        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, patchData);
        if (data && data.success) {
            toast.success('User updated successfully');
            await fetchUsers();
            closeEditDrawer();
        } else {
            toast.error(data?.message || 'Failed to update user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user';
        toast.error(errorMessage);
    }
}

async function toggleBanUser() {
    if (!editingUser.value) return;
    const currentlyBanned = editingUser.value.banned === 'true';
    try {
        const { data } = await axios.patch(`/api/admin/users/${editingUser.value.uuid}`, {
            banned: currentlyBanned ? 'false' : 'true',
        });
        if (data && data.success) {
            toast.success(currentlyBanned ? 'User unbanned successfully' : 'User banned successfully');
            await openEditDrawer(editingUser.value); // refresh user data
        } else {
            toast.error(data?.message || 'Failed to update ban status');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update ban status';
        toast.error(errorMessage);
    }
}

const createDrawerOpen = ref(false);
const createForm = ref({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
});

function openCreateDrawer() {
    createDrawerOpen.value = true;
    createForm.value = { username: '', first_name: '', last_name: '', email: '', password: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

function goToServerEdit(id: number) {
    window.location.assign(`/admin/servers/${id}/edit`);
}

function goToServerManage(uuidShort: string) {
    window.location.assign(`/server/${uuidShort}`);
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/users', createForm.value);
        if (data && data.success) {
            toast.success('User created successfully');
            await fetchUsers();
            closeCreateDrawer();
        } else {
            toast.error(data?.message || 'Failed to create user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user';
        toast.error(errorMessage);
    }
}

const mailPreview = ref<{ subject: string; body?: string; status: string; created_at: string } | null>(null);
const mailPreviewOpen = ref(false);

function showMailPreview(mail: { subject: string; body?: string; status: string; created_at: string }) {
    mailPreview.value = mail;
    mailPreviewOpen.value = true;
}
</script>
