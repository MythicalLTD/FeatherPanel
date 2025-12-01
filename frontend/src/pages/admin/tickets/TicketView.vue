<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Tickets', href: '/admin/tickets' },
            { text: ticket?.title || 'Loading...', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading ticket...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500 mb-4">{{ error }}</p>
                <Button @click="fetchTicketDetails">Try Again</Button>
            </div>

            <!-- Ticket Content -->
            <div v-else-if="ticket" class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">{{ ticket.title }}</h1>
                        <p class="text-muted-foreground">
                            Ticket #{{ ticket.id }} • Created {{ formatDate(ticket.created_at) }}
                            <span v-if="ticket.closed_at"> • Closed {{ formatDate(ticket.closed_at) }}</span>
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" @click="router.push('/admin/tickets')">
                            <ArrowLeft class="h-4 w-4 mr-2" />
                            Back to Tickets
                        </Button>
                        <Button variant="secondary" @click="openEditDrawer">
                            <Pencil class="h-4 w-4 mr-2" />
                            Edit Ticket
                        </Button>
                        <Button v-if="ticket.closed_at" variant="outline" :loading="reopening" @click="reopenTicket">
                            <RotateCcw class="h-4 w-4 mr-2" />
                            Reopen Ticket
                        </Button>
                        <Button v-else variant="destructive" :loading="closing" @click="closeTicket">
                            <Lock class="h-4 w-4 mr-2" />
                            Close Ticket
                        </Button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Main Content (2/3 width) -->
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Ticket Info Card -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Ticket Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Status</div>
                                        <Badge
                                            v-if="ticket.status"
                                            :style="
                                                ticket.status?.color
                                                    ? { backgroundColor: ticket.status.color, color: '#fff' }
                                                    : {}
                                            "
                                            variant="secondary"
                                        >
                                            {{ ticket.status.name }}
                                        </Badge>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Priority</div>
                                        <Badge
                                            v-if="ticket.priority"
                                            :style="
                                                ticket.priority?.color
                                                    ? { backgroundColor: ticket.priority.color, color: '#fff' }
                                                    : {}
                                            "
                                            variant="secondary"
                                        >
                                            {{ ticket.priority.name }}
                                        </Badge>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Category</div>
                                        <Badge
                                            v-if="ticket.category"
                                            :style="
                                                ticket.category?.color
                                                    ? { backgroundColor: ticket.category.color, color: '#fff' }
                                                    : {}
                                            "
                                            variant="secondary"
                                        >
                                            {{ ticket.category.name }}
                                        </Badge>
                                    </div>
                                    <div v-if="ticket.server">
                                        <div class="text-sm text-muted-foreground mb-1">Server</div>
                                        <Button
                                            variant="link"
                                            class="h-auto p-0 text-sm font-medium"
                                            @click="router.push(`/admin/servers/${ticket.server.id}/edit`)"
                                        >
                                            {{ ticket.server.name }}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Description -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p class="whitespace-pre-wrap text-sm">{{ ticket.description }}</p>
                            </CardContent>
                        </Card>

                        <!-- Messages Thread -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Conversation</CardTitle>
                                <CardDescription>
                                    {{ messages.length }} message{{ messages.length !== 1 ? 's' : '' }}
                                    <span v-if="internalNotesCount > 0" class="text-muted-foreground">
                                        • {{ internalNotesCount }} internal note{{
                                            internalNotesCount !== 1 ? 's' : ''
                                        }}
                                    </span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div v-if="messages.length === 0" class="text-muted-foreground text-center py-8">
                                    No messages yet
                                </div>
                                <div v-else class="space-y-4">
                                    <div
                                        v-for="message in messages"
                                        :key="message.id"
                                        class="border rounded-lg p-4 transition-colors"
                                        :class="
                                            message.is_internal
                                                ? 'bg-muted/50 border-muted border-dashed'
                                                : 'bg-card border-border'
                                        "
                                    >
                                        <div class="flex items-start gap-4">
                                            <Avatar v-if="message.user" class="h-10 w-10 shrink-0">
                                                <AvatarImage
                                                    :src="message.user.avatar || ''"
                                                    :alt="message.user.username || ''"
                                                />
                                                <AvatarFallback class="text-sm font-semibold">
                                                    {{ message.user.username?.[0]?.toUpperCase() || '?' }}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center justify-between mb-2">
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <span class="font-semibold text-sm">{{
                                                            message.user?.username || 'System'
                                                        }}</span>
                                                        <Badge
                                                            v-if="message.user?.role"
                                                            variant="secondary"
                                                            class="text-xs font-medium"
                                                            :style="
                                                                message.user.role.color
                                                                    ? {
                                                                          backgroundColor: message.user.role.color,
                                                                          color: '#fff',
                                                                      }
                                                                    : {}
                                                            "
                                                        >
                                                            {{
                                                                message.user.role.display_name || message.user.role.name
                                                            }}
                                                        </Badge>
                                                        <Badge
                                                            v-if="message.is_internal"
                                                            variant="outline"
                                                            class="text-xs border-dashed"
                                                        >
                                                            <Lock class="h-3 w-3 mr-1" />
                                                            Staff Only
                                                        </Badge>
                                                    </div>
                                                    <span class="text-xs text-muted-foreground shrink-0">{{
                                                        formatDate(message.created_at)
                                                    }}</span>
                                                </div>
                                                <div
                                                    v-if="message.user?.email"
                                                    class="text-xs text-muted-foreground mb-2"
                                                >
                                                    <a :href="`mailto:${message.user.email}`" class="hover:underline">
                                                        {{ message.user.email }}
                                                    </a>
                                                </div>
                                                <p
                                                    v-if="message.user?.first_name || message.user?.last_name"
                                                    class="text-xs text-muted-foreground mb-3"
                                                >
                                                    {{ message.user.first_name }} {{ message.user.last_name }}
                                                </p>
                                                <!-- eslint-disable vue/no-v-html -->
                                                <div
                                                    class="prose prose-sm dark:prose-invert max-w-none mb-3"
                                                    v-html="renderMarkdown(message.message)"
                                                ></div>
                                                <!-- eslint-enable vue/no-v-html -->
                                                <div
                                                    v-if="message.attachments && message.attachments.length > 0"
                                                    class="mt-4 pt-3 border-t space-y-2"
                                                >
                                                    <div class="text-xs font-semibold text-muted-foreground mb-2">
                                                        Attachments:
                                                    </div>
                                                    <div class="flex flex-wrap gap-2">
                                                        <a
                                                            v-for="attachment in message.attachments"
                                                            :key="attachment.id"
                                                            :href="attachment.url"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            class="inline-flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm transition-colors"
                                                        >
                                                            <Paperclip class="h-4 w-4" />
                                                            <span class="font-medium">{{ attachment.file_name }}</span>
                                                            <span class="text-xs text-muted-foreground"
                                                                >({{ formatFileSize(attachment.file_size) }})</span
                                                            >
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- Reply Form -->
                        <Card v-if="!ticket.closed_at">
                            <CardHeader>
                                <CardTitle>Add Reply</CardTitle>
                                <CardDescription
                                    >Reply to this ticket or add an internal note for staff</CardDescription
                                >
                            </CardHeader>
                            <CardContent>
                                <form @submit.prevent="submitReply">
                                    <div class="space-y-4">
                                        <div>
                                            <Label for="reply-message">Message</Label>
                                            <Textarea
                                                id="reply-message"
                                                v-model="replyForm.message"
                                                placeholder="Type your reply or internal note..."
                                                rows="6"
                                                required
                                                class="resize-none"
                                            />
                                        </div>
                                        <div class="space-y-2">
                                            <div class="flex items-center gap-2">
                                                <Checkbox
                                                    id="reply-internal"
                                                    :checked="replyForm.is_internal"
                                                    @update:checked="(val: boolean) => (replyForm.is_internal = val)"
                                                />
                                                <Label for="reply-internal" class="cursor-pointer text-sm">
                                                    <Lock class="h-3 w-3 inline mr-1" />
                                                    Staff Only
                                                </Label>
                                            </div>
                                        </div>
                                        <div class="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                @click="
                                                    replyForm.message = '';
                                                    replyForm.is_internal = false;
                                                "
                                            >
                                                Clear
                                            </Button>
                                            <Button type="submit" :loading="replying">
                                                <Send class="h-4 w-4 mr-2" />
                                                {{ replyForm.is_internal ? 'Add Internal Note' : 'Send Reply' }}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                        <Card v-else>
                            <CardContent class="p-6 text-center text-muted-foreground">
                                <Lock class="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p class="font-medium">This ticket is closed</p>
                                <p class="text-sm mt-1">You cannot reply to closed tickets</p>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Sidebar (1/3 width) -->
                    <div class="space-y-6">
                        <!-- User Info Card -->
                        <Card v-if="ticket.user">
                            <CardHeader>
                                <CardTitle>User Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="flex items-center gap-4 mb-4">
                                    <Avatar class="h-14 w-14">
                                        <AvatarImage
                                            :src="ticket.user.avatar || ''"
                                            :alt="ticket.user.username || ''"
                                        />
                                        <AvatarFallback class="text-lg font-bold">
                                            {{ ticket.user.username?.[0]?.toUpperCase() || '?' }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-bold text-lg truncate">{{ ticket.user.username }}</div>
                                        <div class="text-sm text-muted-foreground truncate">
                                            <a :href="`mailto:${ticket.user.email}`" class="hover:underline">
                                                {{ ticket.user.email }}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <Button
                                        variant="outline"
                                        class="flex-1"
                                        @click="router.push(`/admin/users?search=${ticket.user.uuid}`)"
                                    >
                                        <Eye class="h-4 w-4 mr-2" />
                                        View Profile
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        :title="`Email ${ticket.user.username}`"
                                        @click="openEmail(ticket.user.email)"
                                    >
                                        <Mail class="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <!-- User Details Tabs -->
                        <Card v-if="userDetails">
                            <CardContent class="p-0">
                                <Tabs default-value="account" class="w-full">
                                    <TabsList class="w-full grid grid-cols-4 h-auto">
                                        <TabsTrigger value="account" class="text-xs">Account</TabsTrigger>
                                        <TabsTrigger value="servers" class="text-xs">Servers</TabsTrigger>
                                        <TabsTrigger value="tickets" class="text-xs">Tickets</TabsTrigger>
                                        <TabsTrigger value="emails" class="text-xs">Emails</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="account" class="p-4 space-y-3">
                                        <div>
                                            <div class="text-xs text-muted-foreground mb-1">User ID</div>
                                            <div class="font-medium text-sm">{{ userDetails.id }}</div>
                                        </div>
                                        <div>
                                            <div class="text-xs text-muted-foreground mb-1">UUID</div>
                                            <div class="font-mono text-xs break-all">{{ userDetails.uuid }}</div>
                                        </div>
                                        <div v-if="userDetails.email">
                                            <div class="text-xs text-muted-foreground mb-1">Email</div>
                                            <div class="text-sm">
                                                <a
                                                    :href="`mailto:${userDetails.email}`"
                                                    class="hover:underline text-primary"
                                                >
                                                    {{ userDetails.email }}
                                                </a>
                                            </div>
                                        </div>
                                        <div v-if="userDetails.role">
                                            <div class="text-xs text-muted-foreground mb-1">Role</div>
                                            <Badge
                                                :style="
                                                    userDetails.role.color
                                                        ? { backgroundColor: userDetails.role.color, color: '#fff' }
                                                        : {}
                                                "
                                                variant="secondary"
                                                class="text-xs"
                                            >
                                                {{ userDetails.role.display_name || userDetails.role.name }}
                                            </Badge>
                                        </div>
                                        <div v-if="userDetails.first_name || userDetails.last_name">
                                            <div class="text-xs text-muted-foreground mb-1">Full Name</div>
                                            <div class="font-medium text-sm">
                                                {{ userDetails.first_name }} {{ userDetails.last_name }}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-xs text-muted-foreground mb-1">Account Status</div>
                                            <div class="flex gap-2 flex-wrap">
                                                <Badge
                                                    :variant="
                                                        userDetails.banned === 'true' ? 'destructive' : 'secondary'
                                                    "
                                                    class="text-xs"
                                                >
                                                    {{ userDetails.banned === 'true' ? 'Banned' : 'Active' }}
                                                </Badge>
                                                <Badge
                                                    :variant="
                                                        userDetails.two_fa_enabled === 'true' ? 'secondary' : 'outline'
                                                    "
                                                    class="text-xs"
                                                >
                                                    2FA:
                                                    {{ userDetails.two_fa_enabled === 'true' ? 'Enabled' : 'Disabled' }}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div v-if="userDetails.first_ip">
                                            <div class="text-xs text-muted-foreground mb-1">First IP</div>
                                            <div class="font-mono text-xs">{{ userDetails.first_ip }}</div>
                                        </div>
                                        <div v-if="userDetails.last_ip">
                                            <div class="text-xs text-muted-foreground mb-1">Last IP</div>
                                            <div class="font-mono text-xs">{{ userDetails.last_ip }}</div>
                                        </div>
                                        <div v-if="userDetails.created_at">
                                            <div class="text-xs text-muted-foreground mb-1">Account Created</div>
                                            <div class="text-xs">{{ formatDate(userDetails.created_at) }}</div>
                                        </div>
                                        <div v-if="userDetails.last_seen">
                                            <div class="text-xs text-muted-foreground mb-1">Last Seen</div>
                                            <div class="text-xs">{{ formatDate(userDetails.last_seen) }}</div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="servers" class="p-4">
                                        <div
                                            v-if="userServers.length === 0"
                                            class="text-sm text-muted-foreground text-center py-4"
                                        >
                                            No servers found
                                        </div>
                                        <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
                                            <div
                                                v-for="server in userServers"
                                                :key="server.id"
                                                class="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                                                @click="router.push(`/admin/servers/${server.id}/edit`)"
                                            >
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-sm truncate">{{ server.name }}</div>
                                                    <div class="text-xs text-muted-foreground">
                                                        {{ formatDate(server.created_at) }}
                                                    </div>
                                                </div>
                                                <ExternalLink class="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="tickets" class="p-4">
                                        <div
                                            v-if="userTickets.length === 0"
                                            class="text-sm text-muted-foreground text-center py-4"
                                        >
                                            No other tickets found
                                        </div>
                                        <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
                                            <div
                                                v-for="userTicket in userTickets"
                                                :key="userTicket.uuid"
                                                class="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                                                @click="router.push(`/admin/tickets/${userTicket.uuid}`)"
                                            >
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium text-sm truncate">
                                                        {{ userTicket.title }}
                                                    </div>
                                                    <div class="flex items-center gap-2 mt-1">
                                                        <Badge
                                                            v-if="userTicket.status"
                                                            :style="
                                                                userTicket.status.color
                                                                    ? {
                                                                          backgroundColor: userTicket.status.color,
                                                                          color: '#fff',
                                                                      }
                                                                    : {}
                                                            "
                                                            variant="secondary"
                                                            class="text-xs"
                                                        >
                                                            {{ userTicket.status.name }}
                                                        </Badge>
                                                        <span class="text-xs text-muted-foreground">
                                                            {{ formatDate(userTicket.created_at) }}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ExternalLink class="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="emails" class="p-4">
                                        <div
                                            v-if="!userDetails.mails || userDetails.mails.length === 0"
                                            class="text-sm text-muted-foreground text-center py-4"
                                        >
                                            No emails found
                                        </div>
                                        <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
                                            <div
                                                v-for="(mail, idx) in userDetails.mails"
                                                :key="idx"
                                                class="p-2 border rounded text-sm hover:bg-muted/50 transition-colors cursor-pointer"
                                                @click="showMailPreview(mail)"
                                            >
                                                <div class="font-medium truncate">
                                                    {{ mail.subject || 'No Subject' }}
                                                </div>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <Badge
                                                        :variant="mail.status === 'sent' ? 'secondary' : 'destructive'"
                                                        class="text-xs"
                                                    >
                                                        {{ mail.status }}
                                                    </Badge>
                                                    <span class="text-xs text-muted-foreground">
                                                        {{ formatDate(mail.created_at) }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <!-- Admin Utilities -->
                        <Card>
                            <CardHeader>
                                <CardTitle>Admin Utilities</CardTitle>
                            </CardHeader>
                            <CardContent class="space-y-2">
                                <Button
                                    v-if="ticket.user"
                                    variant="outline"
                                    class="w-full justify-start"
                                    @click="router.push(`/admin/users?search=${ticket.user.uuid}`)"
                                >
                                    <User class="h-4 w-4 mr-2" />
                                    View User Profile
                                </Button>
                                <Button
                                    v-if="ticket.user"
                                    variant="outline"
                                    class="w-full justify-start"
                                    @click="router.push(`/admin/tickets?user_uuid=${ticket.user.uuid}`)"
                                >
                                    <Ticket class="h-4 w-4 mr-2" />
                                    View All User Tickets
                                </Button>
                                <Button
                                    v-if="ticket.server"
                                    variant="outline"
                                    class="w-full justify-start"
                                    @click="router.push(`/admin/servers/${ticket.server.id}/edit`)"
                                >
                                    <Server class="h-4 w-4 mr-2" />
                                    View Server
                                </Button>
                                <Button
                                    v-if="ticket.user"
                                    variant="outline"
                                    class="w-full justify-start"
                                    @click="openEmailWithSubject(ticket.user.email, ticket.title)"
                                >
                                    <Mail class="h-4 w-4 mr-2" />
                                    Email User
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Drawer -->
        <Drawer
            :open="editDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeEditDrawer();
                }
            "
        >
            <DrawerContent v-if="ticket">
                <DrawerHeader>
                    <DrawerTitle>Edit Ticket</DrawerTitle>
                    <DrawerDescription>Edit ticket: {{ ticket.title }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                    <div>
                        <Label for="edit-title">Title</Label>
                        <Input id="edit-title" v-model="editForm.title" placeholder="Ticket title" required />
                    </div>
                    <div>
                        <Label for="edit-description">Description</Label>
                        <Textarea
                            id="edit-description"
                            v-model="editForm.description"
                            placeholder="Ticket description"
                            rows="4"
                            required
                        />
                    </div>
                    <div>
                        <Label for="edit-status">Status</Label>
                        <Select v-model="editForm.status_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="status in statuses" :key="status.id" :value="String(status.id)">
                                    {{ status.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label for="edit-priority">Priority</Label>
                        <Select v-model="editForm.priority_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="priority in priorities"
                                    :key="priority.id"
                                    :value="String(priority.id)"
                                >
                                    {{ priority.name || '' }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label for="edit-category">Category</Label>
                        <Select v-model="editForm.category_id">
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="category in categories"
                                    :key="category.id"
                                    :value="String(category.id)"
                                >
                                    {{ category.name || '' }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                        <Button type="submit" :loading="updating">Save</Button>
                    </div>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Mail Preview Dialog -->
        <Dialog v-model:open="mailPreviewOpen">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{{ mailPreview?.subject || 'Email Preview' }}</DialogTitle>
                    <DialogDescription>
                        {{ mailPreview?.created_at ? formatDate(mailPreview.created_at) : '' }} |
                        {{ mailPreview?.status || 'unknown' }}
                    </DialogDescription>
                </DialogHeader>
                <div class="overflow-auto max-h-[60vh] border rounded bg-background p-4">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div v-if="sanitizedMailBody" v-html="sanitizedMailBody"></div>
                    <div v-else class="text-muted-foreground">No content</div>
                </div>
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

import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    ArrowLeft,
    Pencil,
    Send,
    Eye,
    Paperclip,
    ExternalLink,
    Lock,
    RotateCcw,
    Mail,
    User,
    Ticket,
    Server,
} from 'lucide-vue-next';
import axios, { type AxiosError } from 'axios';
import { useToast } from 'vue-toastification';
import { renderMarkdown } from '@/lib/markdown';
import DOMPurify from 'dompurify';

type ApiTicket = {
    id: number;
    uuid: string;
    user_uuid: string;
    server_id?: number;
    category_id: number;
    priority_id: number;
    status_id: number;
    title: string;
    description: string;
    closed_at?: string;
    created_at: string;
    updated_at?: string;
    user?: {
        uuid: string;
        username: string;
        email: string;
        avatar?: string;
        first_name?: string;
        last_name?: string;
    };
    server?: {
        id: number;
        uuid: string;
        name: string;
    };
    category?: {
        id: number;
        name: string;
        color?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
    };
    status?: {
        id: number;
        name: string;
        color?: string;
    };
};

type ApiTicketMessage = {
    id: number;
    ticket_id: number;
    user_uuid?: string;
    message: string;
    is_internal: boolean;
    created_at: string;
    updated_at?: string;
    user?: {
        uuid: string;
        username: string;
        email: string;
        avatar?: string;
        first_name?: string;
        last_name?: string;
        role?: {
            id: number;
            name: string;
            display_name?: string;
            color?: string;
        };
    };
    attachments?: Array<{
        id: number;
        file_name: string;
        file_path: string;
        file_size: number;
        file_type: string;
        url: string;
    }>;
};

type Category = {
    id: number;
    name: string;
    color?: string;
};

type Priority = {
    id: number;
    name: string;
    color?: string;
};

type Status = {
    id: number;
    name: string;
    color?: string;
};

type UserDetails = {
    id: number;
    uuid: string;
    username: string;
    email: string;
    avatar?: string;
    first_name?: string;
    last_name?: string;
    banned?: string;
    two_fa_enabled?: string;
    first_ip?: string;
    last_ip?: string;
    created_at?: string;
    last_seen?: string;
    role?: {
        name: string;
        display_name?: string;
        color?: string;
    };
    activities?: Array<{
        name: string;
        context: string;
        created_at: string;
    }>;
    mails?: Array<{
        subject: string;
        body?: string;
        status: string;
        created_at: string;
    }>;
};

type UserServer = {
    id: number;
    name: string;
    created_at: string;
};

type UserTicket = {
    uuid: string;
    title: string;
    created_at: string;
    status?: {
        name: string;
        color?: string;
    };
};

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const error = ref<string | null>(null);
const ticket = ref<ApiTicket | null>(null);
const messages = ref<ApiTicketMessage[]>([]);
const userDetails = ref<UserDetails | null>(null);
const userServers = ref<UserServer[]>([]);
const userTickets = ref<UserTicket[]>([]);
const categories = ref<Category[]>([]);
const priorities = ref<Priority[]>([]);
const statuses = ref<Status[]>([]);
const replying = ref(false);
const updating = ref(false);
const closing = ref(false);
const reopening = ref(false);
const editDrawerOpen = ref(false);
const mailPreviewOpen = ref(false);
const mailPreview = ref<{ subject: string; body?: string; status: string; created_at: string } | null>(null);

const replyForm = ref({
    message: '',
    is_internal: false,
});

const editForm = ref({
    title: '',
    description: '',
    status_id: '',
    priority_id: '',
    category_id: '',
});

const internalNotesCount = computed(() => {
    return messages.value.filter((m) => m.is_internal).length;
});

const sanitizedMailBody = computed(() => {
    const body = mailPreview.value?.body;
    if (!body) return '';
    return DOMPurify.sanitize(body, {
        ALLOWED_TAGS: [
            'p',
            'br',
            'hr',
            'strong',
            'em',
            'u',
            's',
            'b',
            'i',
            'small',
            'sub',
            'sup',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'ul',
            'ol',
            'li',
            'dl',
            'dt',
            'dd',
            'a',
            'img',
            'figure',
            'figcaption',
            'code',
            'pre',
            'blockquote',
            'cite',
            'div',
            'span',
            'section',
            'article',
            'table',
            'thead',
            'tbody',
            'tfoot',
            'tr',
            'th',
            'td',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'width', 'height', 'target', 'rel'],
        KEEP_CONTENT: true,
    });
});

async function fetchTicketDetails() {
    loading.value = true;
    error.value = null;
    try {
        const uuid = route.params.uuid as string;
        const { data } = await axios.get(`/api/admin/tickets/${uuid}`);
        if (data && data.success) {
            ticket.value = data.data.ticket;
            messages.value = data.data.messages || [];

            // Fetch user details if ticket has a user
            if (ticket.value?.user?.uuid) {
                await Promise.all([fetchUserDetails(ticket.value.user.uuid), fetchUserTickets(ticket.value.user.uuid)]);
            }

            // Fetch categories, priorities, statuses for edit form
            await Promise.all([fetchCategories(), fetchPriorities(), fetchStatuses()]);
        } else {
            error.value = 'Failed to load ticket';
        }
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to load ticket';
        error.value = errorMessage;
    } finally {
        loading.value = false;
    }
}

async function fetchUserDetails(userUuid: string) {
    try {
        const { data } = await axios.get(`/api/admin/users/${userUuid}`);
        if (data && data.success) {
            userDetails.value = data.data.user;

            // Fetch user servers
            const serversRes = await axios.get(`/api/admin/users/${userUuid}/servers`);
            if (serversRes.data?.data?.servers) {
                userServers.value = serversRes.data.data.servers;
            }
        }
    } catch (err: unknown) {
        console.error('Failed to fetch user details:', err);
    }
}

async function fetchUserTickets(userUuid: string) {
    try {
        const { data } = await axios.get('/api/admin/tickets', {
            params: {
                user_uuid: userUuid,
                limit: 10,
                page: 1,
            },
        });
        if (data && data.success) {
            // Filter out the current ticket
            userTickets.value = (data.data.tickets || []).filter((t: ApiTicket) => t.uuid !== ticket.value?.uuid);
        }
    } catch (err: unknown) {
        console.error('Failed to fetch user tickets:', err);
    }
}

async function fetchCategories() {
    try {
        const { data } = await axios.get('/api/admin/tickets/categories');
        categories.value = data.data.categories || [];
    } catch (err: unknown) {
        console.error('Failed to fetch categories:', err);
    }
}

async function fetchPriorities() {
    try {
        const { data } = await axios.get('/api/admin/tickets/priorities');
        priorities.value = data.data.priorities || [];
    } catch (err: unknown) {
        console.error('Failed to fetch priorities:', err);
    }
}

async function fetchStatuses() {
    try {
        const { data } = await axios.get('/api/admin/tickets/statuses');
        statuses.value = data.data.statuses || [];
    } catch (err: unknown) {
        console.error('Failed to fetch statuses:', err);
    }
}

async function submitReply() {
    if (!ticket.value || !replyForm.value.message.trim()) return;

    replying.value = true;
    try {
        await axios.post(`/api/admin/tickets/${ticket.value.uuid}/reply`, {
            message: replyForm.value.message.trim(),
            is_internal: replyForm.value.is_internal,
        });
        toast.success(replyForm.value.is_internal ? 'Internal note added successfully' : 'Reply sent successfully');
        replyForm.value = {
            message: '',
            is_internal: false,
        };
        await fetchTicketDetails();
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to send reply';
        toast.error(errorMessage);
    } finally {
        replying.value = false;
    }
}

async function closeTicket() {
    if (!ticket.value) return;

    closing.value = true;
    try {
        // Find "Closed" status
        const closedStatus = statuses.value.find((s) => s.name.toLowerCase() === 'closed');
        if (!closedStatus) {
            toast.error('Closed status not found');
            return;
        }

        await axios.patch(`/api/admin/tickets/${ticket.value.uuid}`, {
            status_id: closedStatus.id,
        });
        toast.success('Ticket closed successfully');
        await fetchTicketDetails();
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to close ticket';
        toast.error(errorMessage);
    } finally {
        closing.value = false;
    }
}

async function reopenTicket() {
    if (!ticket.value) return;

    reopening.value = true;
    try {
        // Find "Open" status
        const openStatus = statuses.value.find((s) => s.name.toLowerCase() === 'open');
        if (!openStatus) {
            toast.error('Open status not found');
            return;
        }

        await axios.patch(`/api/admin/tickets/${ticket.value.uuid}`, {
            status_id: openStatus.id,
        });
        toast.success('Ticket reopened successfully');
        await fetchTicketDetails();
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to reopen ticket';
        toast.error(errorMessage);
    } finally {
        reopening.value = false;
    }
}

function openEditDrawer() {
    if (!ticket.value) return;
    editForm.value = {
        title: ticket.value.title,
        description: ticket.value.description,
        status_id: String(ticket.value.status_id),
        priority_id: String(ticket.value.priority_id),
        category_id: String(ticket.value.category_id),
    };
    editDrawerOpen.value = true;
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
}

async function submitEdit() {
    if (!ticket.value) return;

    updating.value = true;
    try {
        await axios.patch(`/api/admin/tickets/${ticket.value.uuid}`, editForm.value);
        toast.success('Ticket updated successfully');
        closeEditDrawer();
        await fetchTicketDetails();
    } catch (err: unknown) {
        const errorMessage =
            ((err as AxiosError)?.response?.data as { message?: string })?.message || 'Failed to update ticket';
        toast.error(errorMessage);
    } finally {
        updating.value = false;
    }
}

function showMailPreview(mail: { subject: string; body?: string; status: string; created_at: string }) {
    mailPreview.value = mail;
    mailPreviewOpen.value = true;
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function openEmail(email: string) {
    const link = document.createElement('a');
    link.href = `mailto:${email}`;
    link.click();
}

function openEmailWithSubject(email: string, subject: string) {
    const link = document.createElement('a');
    link.href = `mailto:${email}?subject=Re: ${encodeURIComponent(subject)}`;
    link.click();
}

onMounted(() => {
    fetchTicketDetails();
});
</script>
