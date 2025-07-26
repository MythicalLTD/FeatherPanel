<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar';

import {
    Settings2,
    SquareTerminal,
    Folder,
    Database,
    Calendar,
    Users,
    Archive,
    Globe,
    PlayCircle,
    Home,
    Server,
    Newspaper,
} from 'lucide-vue-next';
import NavMain from '@/components/nav/NavMain.vue';
import NavUser from '@/components/NavUser.vue';
import TeamSwitcher from '@/components/TeamSwitcher.vue';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { computed, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import Permissions from '@/lib/permissions';

const sessionStore = useSessionStore();
const router = useRouter();
const settingsStore = useSettingsStore();
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;
    await settingsStore.fetchSettings();
});

const props = withDefaults(defineProps<SidebarProps>(), {
    collapsible: 'icon',
});

// This is sample data.
const data = computed(() => {
    // Get current route path
    const currentPath = router.currentRoute.value.path;
    return {
        user: {
            name: sessionStore.user?.username || '',
            email: sessionStore.user?.email || '',
            avatar: sessionStore.user?.avatar || '',
            avatar_alt: sessionStore.user?.username?.charAt(0) || '',
        },
        servers: [
            {
                name: 'Minecraft Server',
                logo: 'https://github.com/mythicalltd.png', // Use image URL
                plan: 'running',
            },
            {
                name: 'Python Bot',
                logo: 'https://github.com/mythicalltd.png', // Use image URL
                plan: 'stopped',
            },
            {
                name: 'Discord Bot',
                logo: 'https://github.com/mythicalltd.png', // Use image URL
                plan: 'starting',
            },
        ],
        navMain: [
            {
                name: 'Main',
                title: 'Dashboard',
                url: '/dashboard',
                icon: Home,
                isActive: currentPath.startsWith('/dashboard'),
            },
            {
                name: 'Servers',
                title: 'Servers',
                url: '/servers',
                icon: Server,
                isActive: currentPath.startsWith('/servers'),
            },
        ],
        navAdmin: [
            {
                name: 'Dashboard',
                title: 'Dashboard',
                url: '/admin',
                icon: Home,
            },
            ...(sessionStore.hasPermission(Permissions.ADMIN_USERS_VIEW)
                ? [
                      {
                          name: 'Users',
                          title: 'Users',
                          url: '/admin/users',
                          icon: Users,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_LOCATIONS_VIEW)
                ? [
                      {
                          name: 'Locations',
                          title: 'Locations',
                          url: '/admin/locations',
                          icon: Globe,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_REALMS_VIEW)
                ? [
                      {
                          name: 'Realms',
                          title: 'Realms',
                          url: '/admin/realms',
                          icon: Newspaper,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_ROLES_VIEW)
                ? [
                      {
                          name: 'Roles',
                          title: 'Roles',
                          url: '/admin/roles',
                          icon: Users,
                      },
                  ]
                : []),
        ],
        navServer: [
            {
                title: 'Console',
                url: '#',
                icon: SquareTerminal,
                items: [
                    {
                        title: 'Console',
                        url: '#',
                        icon: SquareTerminal,
                    },
                ],
            },
            {
                title: 'Files',
                url: '#',
                icon: Folder,
                items: [
                    {
                        title: 'Files',
                        url: '#',
                        icon: Folder,
                    },
                ],
            },
            {
                title: 'Databases',
                url: '#',
                icon: Database,
                items: [
                    {
                        title: 'Databases',
                        url: '#',
                        icon: Database,
                    },
                ],
            },
            {
                title: 'Schedules',
                url: '#',
                icon: Calendar,
                items: [
                    {
                        title: 'Schedules',
                        url: '#',
                        icon: Calendar,
                    },
                ],
            },
            {
                title: 'Users',
                url: '#',
                icon: Users,
                items: [
                    {
                        title: 'Users',
                        url: '#',
                        icon: Users,
                    },
                ],
            },
            {
                title: 'Backups',
                url: '#',
                icon: Archive,
                items: [
                    {
                        title: 'Backups',
                        url: '#',
                        icon: Archive,
                    },
                ],
            },
            {
                title: 'Network',
                url: '#',
                icon: Globe,
                items: [
                    {
                        title: 'Network',
                        url: '#',
                        icon: Globe,
                    },
                ],
            },
            {
                title: 'Startup',
                url: '#',
                icon: PlayCircle,
                items: [
                    {
                        title: 'Startup',
                        url: '#',
                        icon: PlayCircle,
                    },
                ],
            },
            {
                title: 'Settings',
                url: '#',
                icon: Settings2,
                items: [
                    {
                        title: 'Settings',
                        url: '#',
                        icon: Settings2,
                    },
                ],
            },
        ],
    };
});

const user = computed(() => {
    return {
        name: sessionStore.user?.username || '',
        email: sessionStore.user?.email || '',
        avatar: sessionStore.user?.avatar || '',
        avatar_alt: sessionStore.user?.username?.charAt(0) || '',
        hasAdminPanel: sessionStore.hasPermission(Permissions.ADMIN_DASHBOARD_VIEW) || false,
    };
});

const firstTeam = computed(() => {
    return {
        name: String(settingsStore.settings?.name || 'MythicalPanel'),
        logo: String(settingsStore.settings?.logo || 'https://github.com/mythicalltd.png'), // Always a string URL
        plan: String(settingsStore.settings?.plan || 'Dashboard'),
    };
});

const servers = computed(() => [firstTeam.value, ...data.value.servers]);
</script>

<template>
    <Sidebar v-bind="props">
        <SidebarHeader>
            <TeamSwitcher :servers="servers" />
        </SidebarHeader>
        <SidebarContent>
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/dashboard')"
                name="Dashboard"
                :items="data.navMain"
            />
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/server')"
                name="Server Management"
                :items="data.navServer"
            />
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/admin') && user.hasAdminPanel"
                name="Admin Panel"
                :items="data.navAdmin"
            />
        </SidebarContent>
        <SidebarFooter>
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
