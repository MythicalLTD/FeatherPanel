<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Users', isCurrent: true, href: '/admin/users' }]">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Users</CardTitle>
                            <CardDescription>Manage all users in your system.</CardDescription>
                        </div>
                        <Input
                            v-model="searchQuery"
                            placeholder="Search by username, email, or role..."
                            class="max-w-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead></TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Last Seen</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="user in users" :key="user.uuid">
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage :src="user.avatar" :alt="user.username" />
                                        <AvatarFallback>{{ user.username[0] }}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>{{ user.username }}</TableCell>
                                <TableCell>{{ user.email || '-' }}</TableCell>
                                <TableCell>
                                    <Badge
                                        :style="
                                            user.role && user.role.color
                                                ? { backgroundColor: user.role.color, color: '#fff' }
                                                : {}
                                        "
                                        variant="secondary"
                                    >
                                        {{
                                            user.role && user.role.real_name
                                                ? user.role.real_name
                                                : user.role?.name || '-'
                                        }}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {{ user.last_seen || '-' }}
                                </TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(user)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(user)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <Button size="sm" variant="destructive" @click="onDelete(user)">
                                            <Trash2 :size="16" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <div class="mt-6 flex justify-end">
                        <Pagination
                            :items-per-page="pagination.pageSize"
                            :total="pagination.total"
                            :default-page="pagination.page"
                            @page-change="onPageChange"
                        />
                    </div>
                </CardContent>
            </Card>
        </main>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2 } from 'lucide-vue-next';
import axios from 'axios';

type ApiUser = {
    uuid: string;
    avatar: string;
    username: string;
    email?: string;
    role?: { name: string; real_name: string; color: string };
    status?: string;
    last_seen?: string;
};

const users = ref<ApiUser[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
});
const loading = ref(false);

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
        pagination.value.total = data.data.pagination.total;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchUsers);
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchUsers);

function onPageChange(page: number) {
    pagination.value.page = page;
}
function onView(_user: ApiUser) {
    // handle view user
}
function onEdit(_user: ApiUser) {
    // handle edit user
}
function onDelete(_user: ApiUser) {
    // handle delete user
}
</script>
