<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar';
import { useI18n } from 'vue-i18n';

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
    FileText,
} from 'lucide-vue-next';
import NavMain from '@/components/nav/NavMain.vue';
import NavUser from '@/components/NavUser.vue';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import { useSessionStore } from '@/stores/session';
import { useRouter, useRoute } from 'vue-router';
import { computed, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import Permissions from '@/lib/permissions';

const { t } = useI18n();

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

const route = useRoute();

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
                title: t('nav.dashboard'),
                url: '/dashboard',
                icon: Home,
                isActive: currentPath.startsWith('/dashboard'),
            },
            {
                name: 'Account',
                title: t('nav.account'),
                url: '/dashboard/account',
                icon: Users,
                isActive: currentPath.startsWith('/dashboard/account'),
            },
        ],
        navAdmin: [
            {
                name: 'Dashboard',
                title: t('nav.dashboard'),
                url: '/admin',
                icon: Home,
            },
            ...(sessionStore.hasPermission(Permissions.ADMIN_USERS_VIEW)
                ? [
                      {
                          name: 'Users',
                          title: t('nav.users'),
                          url: '/admin/users',
                          icon: Users,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_LOCATIONS_VIEW)
                ? [
                      {
                          name: 'Locations',
                          title: t('nav.locations'),
                          url: '/admin/locations',
                          icon: Globe,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_REALMS_VIEW)
                ? [
                      {
                          name: 'Realms',
                          title: t('nav.realms'),
                          url: '/admin/realms',
                          icon: Newspaper,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_ROLES_VIEW)
                ? [
                      {
                          name: 'Roles',
                          title: t('nav.roles'),
                          url: '/admin/roles',
                          icon: Users,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_SERVERS_VIEW)
                ? [
                      {
                          name: 'Servers',
                          title: t('nav.servers'),
                          url: '/admin/servers',
                          icon: Server,
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_SETTINGS_VIEW)
                ? [
                      {
                          name: 'Settings',
                          title: t('nav.settings'),
                          url: '/admin/settings',
                          icon: Settings2,
                      },
                  ]
                : []),
        ],
        navServer: [
            {
                title: t('nav.console'),
                url: `/server/${route.params.uuidShort}`,
                icon: SquareTerminal,
                items: [
                    {
                        title: t('nav.console'),
                        url: `/server/${route.params.uuidShort}`,
                        icon: SquareTerminal,
                    },
                ],
            },
            {
                title: t('nav.logs'),
                url: `/server/${route.params.uuidShort}/logs`,
                icon: FileText,
                items: [
                    {
                        title: t('nav.logs'),
                        url: `/server/${route.params.uuidShort}/logs`,
                        icon: FileText,
                    },
                ],
            },
            {
                title: t('nav.files'),
                url: '#',
                icon: Folder,
                items: [
                    {
                        title: t('nav.files'),
                        url: '#',
                        icon: Folder,
                    },
                ],
            },
            {
                title: t('nav.databases'),
                url: '#',
                icon: Database,
                items: [
                    {
                        title: t('nav.databases'),
                        url: '#',
                        icon: Database,
                    },
                ],
            },
            {
                title: t('nav.schedules'),
                url: '#',
                icon: Calendar,
                items: [
                    {
                        title: t('nav.schedules'),
                        url: '#',
                        icon: Calendar,
                    },
                ],
            },
            {
                title: t('nav.users'),
                url: '#',
                icon: Users,
                items: [
                    {
                        title: t('nav.users'),
                        url: '#',
                        icon: Users,
                    },
                ],
            },
            {
                title: t('nav.backups'),
                url: '#',
                icon: Archive,
                items: [
                    {
                        title: t('nav.backups'),
                        url: '#',
                        icon: Archive,
                    },
                ],
            },
            {
                title: t('nav.network'),
                url: '#',
                icon: Globe,
                items: [
                    {
                        title: t('nav.network'),
                        url: '#',
                        icon: Globe,
                    },
                ],
            },
            {
                title: t('nav.startup'),
                url: '#',
                icon: PlayCircle,
                items: [
                    {
                        title: t('nav.startup'),
                        url: '#',
                        icon: PlayCircle,
                    },
                ],
            },
            {
                title: t('nav.settings'),
                url: '#',
                icon: Settings2,
                items: [
                    {
                        title: t('nav.settings'),
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
</script>

<template>
    <Sidebar v-bind="props">
        <SidebarHeader>
            <div class="flex items-center gap-4 px-4 py-3">
                <div class="flex items-center gap-2 min-w-0 cursor-pointer" @click="router.push('/')">
                    <img
                        v-if="settingsStore.appLogo"
                        :src="String(settingsStore.appLogo || '')"
                        :alt="String(settingsStore.appName || '')"
                        class="h-8 w-8 object-contain flex-shrink-0"
                    />
                    <span v-if="!$attrs.collapsed" class="font-medium text-lg truncate">
                        {{ settingsStore.appName || '' }}
                    </span>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/dashboard')"
                :name="t('nav.dashboard')"
                :items="data.navMain"
            />
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/server')"
                :name="t('nav.serverManagement')"
                :items="data.navServer"
            />
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/admin') && user.hasAdminPanel"
                :name="t('nav.adminPanel')"
                :items="data.navAdmin"
            />
        </SidebarContent>
        <SidebarFooter>
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
