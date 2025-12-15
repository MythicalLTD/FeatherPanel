<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Loading state -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading user...</span>
                </div>
            </div>

            <!-- Error state -->
            <div v-else-if="!user" class="flex flex-col items-center justify-center py-12">
                <p class="text-red-500 mb-4">Failed to load user.</p>
                <Button variant="outline" @click="goBackToUsers">Back to Users</Button>
            </div>

            <!-- Content -->
            <div v-else class="p-6 space-y-6">
                <!-- User header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <Avatar class="h-14 w-14">
                            <AvatarImage :src="user.avatar" :alt="user.username" />
                            <AvatarFallback>{{ user.username[0] }}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 class="text-xl font-semibold text-foreground">{{ user.username }}</h1>
                            <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                            <div class="mt-2 flex flex-wrap gap-2">
                                <Badge
                                    v-if="user.role"
                                    :style="
                                        user.role.color ? { backgroundColor: user.role.color || '', color: '#fff' } : {}
                                    "
                                    variant="secondary"
                                >
                                    {{ user.role.display_name || user.role.name || '-' }}
                                </Badge>
                                <Badge :variant="user.banned === 'true' ? 'destructive' : 'secondary'">
                                    {{ user.banned === 'true' ? 'Banned' : 'Active' }}
                                </Badge>
                                <Badge :variant="user.locked === 'true' ? 'destructive' : 'secondary'">
                                    {{ user.locked === 'true' ? 'Locked' : 'Unlocked' }}
                                </Badge>
                                <Badge :variant="user.two_fa_enabled === 'true' ? 'secondary' : 'outline'">
                                    {{ user.two_fa_enabled === 'true' ? '2FA Enabled' : '2FA Disabled' }}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 justify-end">
                        <Button variant="outline" @click="goBackToUsers">Back to Users</Button>
                        <Button :variant="user.banned === 'true' ? 'secondary' : 'destructive'" @click="toggleBanUser">
                            {{ user.banned === 'true' ? 'Unban User' : 'Ban User' }}
                        </Button>
                        <Button v-if="user.two_fa_enabled === 'true'" variant="secondary" @click="disable2FA">
                            Disable 2FA
                        </Button>
                        <Button v-if="user.discord_oauth2_linked === 'true'" variant="secondary" @click="unlinkDiscord">
                            Unlink Discord
                        </Button>
                    </div>
                </div>

                <!-- Plugin Widgets: Before Form -->
                <WidgetRenderer v-if="widgetsBeforeForm.length > 0" :widgets="widgetsBeforeForm" />

                <!-- Tabs for Edit and View -->
                <Card>
                    <CardContent class="p-6">
                        <Tabs default-value="edit">
                            <TabsList class="mb-6">
                                <TabsTrigger value="edit">Edit User</TabsTrigger>
                                <TabsTrigger value="account">Account Info</TabsTrigger>
                                <TabsTrigger value="servers">Servers</TabsTrigger>
                                <TabsTrigger value="activities">Activities</TabsTrigger>
                                <TabsTrigger value="mails">Mails</TabsTrigger>
                            </TabsList>

                            <!-- Edit Tab -->
                            <TabsContent value="edit">
                                <form class="space-y-4 max-w-2xl" @submit.prevent="submitEdit">
                                    <div>
                                        <label for="edit-username" class="block mb-1 font-medium">Username</label>
                                        <Input
                                            id="edit-username"
                                            v-model="editForm.username"
                                            label="Username"
                                            placeholder="Username"
                                            required
                                        />
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label for="edit-firstname" class="block mb-1 font-medium"
                                                >First Name</label
                                            >
                                            <Input
                                                id="edit-firstname"
                                                v-model="editForm.first_name"
                                                label="First Name"
                                                placeholder="First Name"
                                            />
                                        </div>
                                        <div>
                                            <label for="edit-lastname" class="block mb-1 font-medium">Last Name</label>
                                            <Input
                                                id="edit-lastname"
                                                v-model="editForm.last_name"
                                                label="Last Name"
                                                placeholder="Last Name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label for="edit-email" class="block mb-1 font-medium">Email</label>
                                        <Input
                                            id="edit-email"
                                            v-model="editForm.email"
                                            label="Email"
                                            placeholder="Email"
                                            type="email"
                                        />
                                    </div>

                                    <div>
                                        <label class="block mb-2 font-medium">Role</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger as-child>
                                                <Button variant="outline" class="w-full text-left">
                                                    {{
                                                        availableRoles.find((r) => r.id === editForm.role_id)
                                                            ?.display_name || 'Select Role'
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
                                                        :value="role.id"
                                                    >
                                                        <span :style="{ color: role.color }">{{
                                                            role.display_name
                                                        }}</span>
                                                    </DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div>
                                        <label for="edit-externalid" class="block mb-1 font-medium">
                                            External ID (NULL to clear)
                                        </label>
                                        <Input
                                            id="edit-externalid"
                                            :model-value="editForm.external_id ?? ''"
                                            label="External ID"
                                            placeholder="External ID"
                                            type="number"
                                            @update:model-value="
                                                (val) => (editForm.external_id = val === '' ? undefined : Number(val))
                                            "
                                        />
                                        <p class="text-xs text-muted-foreground mt-1">
                                            External ID for integration. Leave empty or set to 0 to clear.
                                        </p>
                                    </div>

                                    <div>
                                        <label for="edit-password" class="block mb-1 font-medium">Password</label>
                                        <Input
                                            id="edit-password"
                                            v-model="editForm.password"
                                            label="Password"
                                            placeholder="Leave blank to keep current password"
                                            type="password"
                                        />
                                    </div>

                                    <div class="flex flex-wrap justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" @click="goBackToUsers">Cancel</Button>
                                        <Button type="submit" :loading="submitting">Save Changes</Button>
                                    </div>
                                </form>
                            </TabsContent>

                            <!-- Account Info Tab -->
                            <TabsContent value="account">
                                <h3 class="font-semibold text-base mb-4">Account Information</h3>
                                <div class="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">User ID</div>
                                        <div class="font-medium">{{ user.id }}</div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">UUID</div>
                                        <div class="font-mono text-xs">{{ user.uuid }}</div>
                                    </div>
                                    <div v-if="user.external_id">
                                        <div class="text-sm text-muted-foreground mb-1">External ID</div>
                                        <div class="font-medium">{{ user.external_id }}</div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-1">Role</div>
                                        <Badge
                                            :style="
                                                user.role?.color
                                                    ? { backgroundColor: user.role?.color || '', color: '#fff' }
                                                    : {}
                                            "
                                            variant="secondary"
                                        >
                                            {{ user.role?.display_name || user.role?.name || '-' }}
                                        </Badge>
                                    </div>
                                    <div v-if="user.first_name || user.last_name">
                                        <div class="text-sm text-muted-foreground mb-1">Full Name</div>
                                        <div class="font-medium">{{ user.first_name }} {{ user.last_name }}</div>
                                    </div>
                                    <div v-if="user.first_seen">
                                        <div class="text-sm text-muted-foreground mb-1">First Seen</div>
                                        <div class="font-medium">{{ user.first_seen }}</div>
                                    </div>
                                    <div v-if="user.last_seen">
                                        <div class="text-sm text-muted-foreground mb-1">Last Seen</div>
                                        <div class="font-medium">{{ user.last_seen }}</div>
                                    </div>
                                    <div v-if="user.created_at">
                                        <div class="text-sm text-muted-foreground mb-1">Account Created</div>
                                        <div class="font-medium">{{ user.created_at }}</div>
                                    </div>
                                </div>
                                <h3 class="font-semibold text-base mb-4 mt-6">Security & Status</h3>
                                <div class="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-2">Account Status</div>
                                        <div class="flex gap-2">
                                            <Badge :variant="user.banned === 'true' ? 'destructive' : 'secondary'">
                                                {{ user.banned === 'true' ? 'Banned' : 'Active' }}
                                            </Badge>
                                            <Badge :variant="user.locked === 'true' ? 'destructive' : 'secondary'">
                                                {{ user.locked === 'true' ? 'Locked' : 'Unlocked' }}
                                            </Badge>
                                            <Badge
                                                :variant="
                                                    user.deleted === 'true' || user.deleted === true
                                                        ? 'destructive'
                                                        : 'secondary'
                                                "
                                            >
                                                {{
                                                    user.deleted === 'true' || user.deleted === true
                                                        ? 'Deleted'
                                                        : 'Active'
                                                }}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-sm text-muted-foreground mb-2">Two-Factor Authentication</div>
                                        <Badge :variant="user.two_fa_enabled === 'true' ? 'secondary' : 'outline'">
                                            {{ user.two_fa_enabled === 'true' ? 'Enabled' : 'Disabled' }}
                                        </Badge>
                                        <Badge v-if="user.two_fa_blocked === 'true'" variant="destructive" class="ml-2">
                                            Blocked
                                        </Badge>
                                    </div>
                                    <div v-if="user.first_ip">
                                        <div class="text-sm text-muted-foreground mb-1">First IP</div>
                                        <div class="font-mono text-sm">{{ user.first_ip }}</div>
                                    </div>
                                    <div v-if="user.last_ip">
                                        <div class="text-sm text-muted-foreground mb-1">Last IP</div>
                                        <div class="font-mono text-sm">{{ user.last_ip }}</div>
                                    </div>
                                    <div class="col-span-2">
                                        <div class="text-sm text-muted-foreground mb-2">SSO Login Link</div>
                                        <div class="flex flex-col gap-2">
                                            <div class="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    :loading="ssoGenerating"
                                                    variant="outline"
                                                    data-umami-event="Generate SSO login link"
                                                    :data-umami-event-user="user.username"
                                                    @click="generateSsoLoginLink"
                                                >
                                                    Generate SSO Link
                                                </Button>
                                                <Button
                                                    v-if="ssoLink"
                                                    size="sm"
                                                    variant="secondary"
                                                    data-umami-event="Copy SSO login link"
                                                    :data-umami-event-user="user.username"
                                                    @click="copySsoLinkToClipboard"
                                                >
                                                    Copy Link
                                                </Button>
                                            </div>
                                            <div v-if="ssoLink">
                                                <Input
                                                    :model-value="ssoLink"
                                                    readonly
                                                    class="text-xs font-mono"
                                                    title="SSO login link"
                                                />
                                                <p class="text-xs text-muted-foreground mt-1">
                                                    This link will auto-login the user via SSO and redirect to the
                                                    dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="user.discord_oauth2_linked === 'true'" class="mt-6">
                                    <h3 class="font-semibold text-base mb-4">Discord Integration</h3>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <div class="text-sm text-muted-foreground mb-1">Discord ID</div>
                                            <div class="font-mono text-sm">{{ user.discord_oauth2_id || 'N/A' }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm text-muted-foreground mb-1">Discord Username</div>
                                            <div class="font-medium">{{ user.discord_oauth2_username || 'N/A' }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm text-muted-foreground mb-1">Discord Name</div>
                                            <div class="font-medium">{{ user.discord_oauth2_name || 'N/A' }}</div>
                                        </div>
                                        <div>
                                            <div class="text-sm text-muted-foreground mb-1">Status</div>
                                            <Badge
                                                :variant="
                                                    user.discord_oauth2_linked === 'true' ? 'secondary' : 'outline'
                                                "
                                            >
                                                {{ user.discord_oauth2_linked === 'true' ? 'Linked' : 'Not Linked' }}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <!-- Servers Tab -->
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
                                                <Badge
                                                    :variant="server.status === 'Online' ? 'secondary' : 'destructive'"
                                                >
                                                    {{ server.status || 'Offline' }}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{{ server.created_at }}</TableCell>
                                            <TableCell class="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="mr-2"
                                                    @click="goToServerManage(server.uuidShort)"
                                                >
                                                    View Server (Client)
                                                </Button>
                                                <Button size="sm" variant="outline" @click="goToServerEdit(server.id)">
                                                    Edit Server (Admin)
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            <!-- Activities Tab -->
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
                                            v-for="activity in user.activities"
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

                            <!-- Mails Tab -->
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
                                        <TableRow v-for="mail in user.mails" :key="mail.created_at + mail.subject">
                                            <TableCell>{{ mail.subject }}</TableCell>
                                            <TableCell>
                                                <Badge :variant="mail.status === 'sent' ? 'secondary' : 'destructive'">
                                                    {{ mail.status }}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{{ mail.created_at }}</TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    @click="() => showMailPreview(mail)"
                                                >
                                                    Preview
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Form -->
                <WidgetRenderer v-if="widgetsAfterForm.length > 0" :widgets="widgetsAfterForm" />
            </div>

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

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
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

import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
    mails?: { subject: string; status: string; created_at: string; body?: string }[];
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

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const submitting = ref(false);
const user = ref<ApiUser | null>(null);

const availableRoles = ref<{ id: string; name: string; display_name: string; color: string }[]>([]);
const editForm = ref<EditForm>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: '',
    external_id: undefined,
    password: '',
});

// Owned servers list
const ownedServers = ref<
    { id: number; name: string; description?: string; status?: string; uuidShort: string; created_at: string }[]
>([]);

// SSO login token/link
const ssoGenerating = ref(false);
const ssoToken = ref<string | null>(null);
const ssoLink = ref<string | null>(null);

// Mail preview
const mailPreview = ref<{ subject: string; body?: string; status: string; created_at: string } | null>(null);
const mailPreviewOpen = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-users-edit');
const widgetsTopOfPage = computed(() => getWidgets('admin-users-edit', 'top-of-page'));
const widgetsBeforeForm = computed(() => getWidgets('admin-users-edit', 'before-form'));
const widgetsAfterForm = computed(() => getWidgets('admin-users-edit', 'after-form'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-users-edit', 'bottom-of-page'));

const breadcrumbs = computed(() => [
    { text: 'Admin', to: '/admin' },
    { text: 'Users', to: '/admin/users' },
    { text: 'Edit User', to: `/admin/users/${route.params.uuid as string}/edit`, isCurrent: true },
]);

function goBackToUsers(): void {
    router.push({ name: 'AdminUsers' });
}

async function fetchUser(): Promise<void> {
    loading.value = true;
    try {
        const uuid = route.params.uuid as string;
        const { data } = await axios.get(`/api/admin/users/${uuid}`);
        const apiUser: ApiUser = data.data.user;
        user.value = apiUser;

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

        editForm.value = {
            username: apiUser.username || '',
            first_name: apiUser.first_name || '',
            last_name: apiUser.last_name || '',
            email: apiUser.email || '',
            role_id: apiUser.role_id != null ? String(apiUser.role_id) : '',
            external_id:
                apiUser.external_id !== null && apiUser.external_id !== undefined
                    ? Number(apiUser.external_id)
                    : undefined,
            password: '',
        };

        // Load owned servers for this user
        try {
            const serversRes = await axios.get(`/api/admin/users/${uuid}/servers`);
            ownedServers.value = serversRes.data?.data?.servers || [];
        } catch {
            // Silently fail if servers can't be loaded
            ownedServers.value = [];
        }
    } catch {
        toast.error('Failed to fetch user details');
        user.value = null;
    } finally {
        loading.value = false;
    }
}

async function submitEdit(): Promise<void> {
    if (!user.value) return;
    submitting.value = true;
    try {
        const uuid = user.value.uuid;
        const patchData: Partial<EditForm> = { ...editForm.value };

        if (!patchData.password || patchData.password.trim() === '') {
            delete patchData.password;
        }

        if (patchData.external_id === undefined || patchData.external_id === null || patchData.external_id === 0) {
            delete patchData.external_id;
        }

        const { data } = await axios.patch(`/api/admin/users/${uuid}`, patchData);
        if (data && data.success) {
            toast.success('User updated successfully');
            await fetchUser();
        } else {
            toast.error(data?.message || 'Failed to update user');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user';
        toast.error(errorMessage);
    } finally {
        submitting.value = false;
    }
}

async function toggleBanUser(): Promise<void> {
    if (!user.value) return;
    const currentlyBanned = user.value.banned === 'true';
    try {
        const { data } = await axios.patch(`/api/admin/users/${user.value.uuid}`, {
            banned: currentlyBanned ? 'false' : 'true',
        });
        if (data && data.success) {
            toast.success(currentlyBanned ? 'User unbanned successfully' : 'User banned successfully');
            await fetchUser();
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

async function disable2FA(): Promise<void> {
    if (!user.value) return;
    try {
        const { data } = await axios.patch(`/api/admin/users/${user.value.uuid}`, {
            two_fa_enabled: 'false',
            two_fa_key: null,
        });
        if (data && data.success) {
            toast.success('Two-factor authentication disabled successfully');
            await fetchUser();
        } else {
            toast.error(data?.message || 'Failed to disable 2FA');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to disable 2FA';
        toast.error(errorMessage);
    }
}

async function unlinkDiscord(): Promise<void> {
    if (!user.value) return;
    if (!confirm('Are you sure you want to unlink Discord from this user?')) {
        return;
    }
    try {
        const { data } = await axios.patch(`/api/admin/users/${user.value.uuid}`, {
            discord_oauth2_linked: 'false',
            discord_oauth2_id: null,
            discord_oauth2_access_token: null,
            discord_oauth2_username: null,
            discord_oauth2_name: null,
        });
        if (data && data.success) {
            toast.success('Discord unlinked successfully');
            await fetchUser();
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

function goToServerEdit(id: number): void {
    window.location.assign(`/admin/servers/${id}/edit`);
}

function goToServerManage(uuidShort: string): void {
    window.location.assign(`/server/${uuidShort}`);
}

async function generateSsoLoginLink(): Promise<void> {
    if (!user.value) {
        return;
    }

    ssoGenerating.value = true;
    try {
        const { data } = await axios.post(`/api/admin/users/${user.value.uuid}/sso-token`);
        if (data && data.success && data.data?.token) {
            ssoToken.value = data.data.token as string;

            const origin = window.location.origin;
            // Default redirect to dashboard if not specified later by the admin
            ssoLink.value = `${origin}/auth/login?sso_token=${encodeURIComponent(ssoToken.value)}&redirect=/`;

            toast.success('SSO login link generated');
        } else {
            toast.error(data?.message || 'Failed to generate SSO token');
        }
    } catch (e: unknown) {
        const errorMessage =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to generate SSO token';
        toast.error(errorMessage);
    } finally {
        ssoGenerating.value = false;
    }
}

async function copySsoLinkToClipboard(): Promise<void> {
    if (!ssoLink.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(ssoLink.value);
        toast.success('SSO link copied to clipboard');
    } catch {
        toast.error('Failed to copy SSO link');
    }
}

function showMailPreview(mail: { subject: string; body?: string; status: string; created_at: string }): void {
    mailPreview.value = mail;
    mailPreviewOpen.value = true;
}

onMounted(async () => {
    await fetchPluginWidgets();
    await fetchUser();
});
</script>
