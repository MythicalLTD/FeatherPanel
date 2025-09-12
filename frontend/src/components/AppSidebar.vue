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
    Clock,
    Network,
    Key,
    ImageIcon,
    Link,
} from 'lucide-vue-next';
import NavMain from '@/components/nav/NavMain.vue';
import NavUser from '@/components/NavUser.vue';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { useSessionStore } from '@/stores/session';
import { useRouter, useRoute } from 'vue-router';
import { computed, onMounted, watchEffect } from 'vue';
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

const { state } = useSidebar();
const route = useRoute();

// This is sample data.
const data = computed(() => {
    // Get current route path
    const currentPath = router.currentRoute.value.path;
    console.log('Current path:', currentPath);
    return {
        user: {
            name: sessionStore.user?.username || '',
            email: sessionStore.user?.email || '',
            avatar: sessionStore.user?.avatar || '',
            avatar_alt: sessionStore.user?.username?.charAt(0) || '',
        },
        navMain: [
            {
                name: 'Main',
                title: t('nav.dashboard'),
                url: '/dashboard',
                icon: Home,
                isActive: currentPath.startsWith('/dashboard'),
            },
            {
                name: 'Activities',
                title: t('nav.activities'),
                url: '/dashboard/activities',
                icon: Clock,
                isActive: currentPath.startsWith('/dashboard/activities'),
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
                isActive: currentPath.startsWith('/admin') && currentPath === '/admin',
            },
            ...(sessionStore.hasPermission(Permissions.ADMIN_USERS_VIEW)
                ? [
                      {
                          name: 'Users',
                          title: t('nav.users'),
                          url: '/admin/users',
                          icon: Users,
                          isActive: currentPath.startsWith('/admin/users'),
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)
                ? [
                      {
                          name: 'API Keys',
                          title: t('nav.apiKeys'),
                          url: '/admin/api-keys',
                          icon: Key,
                          isActive: currentPath.startsWith('/admin/api-keys'),
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
                          isActive: currentPath.startsWith('/admin/locations'),
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
                          isActive: currentPath.startsWith('/admin/realms'),
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
                          isActive: currentPath.startsWith('/admin/roles'),
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
                          isActive: currentPath.startsWith('/admin/servers'),
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_TEMPLATE_EMAIL_VIEW)
                ? [
                      {
                          name: 'Mail Templates',
                          title: t('nav.mailTemplates'),
                          url: '/admin/mail-templates',
                          icon: FileText,
                          isActive: currentPath.startsWith('/admin/mail-templates'),
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_IMAGES_VIEW)
                ? [
                      {
                          name: 'Images',
                          title: t('nav.images'),
                          url: '/admin/images',
                          icon: ImageIcon,
                          isActive: currentPath.startsWith('/admin/images'),
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_REDIRECT_LINKS_VIEW)
                ? [
                      {
                          name: 'Redirect Links',
                          title: t('nav.redirectLinks'),
                          url: '/admin/redirect-links',
                          icon: Link,
                          isActive: currentPath.startsWith('/admin/redirect-links'),
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
                          isActive: currentPath.startsWith('/admin/settings'),
                      },
                  ]
                : []),
            ...(sessionStore.hasPermission(Permissions.ADMIN_PLUGINS_VIEW)
                ? [
                      {
                          name: 'Plugins',
                          title: t('nav.plugins'),
                          url: '/admin/plugins',
                          icon: PlayCircle,
                          isActive: currentPath.startsWith('/admin/plugins'),
                      },
                  ]
                : []),
        ],
        navServer: [
            {
                title: t('nav.console'),
                url: `/server/${route.params.uuidShort}`,
                icon: SquareTerminal,
                isActive: currentPath === `/server/${route.params.uuidShort}`,
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
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/logs`),
                items: [
                    {
                        title: t('nav.logs'),
                        url: `/server/${route.params.uuidShort}/logs`,
                        icon: FileText,
                    },
                ],
            },
            {
                title: t('nav.activities'),
                url: `/server/${route.params.uuidShort}/activities`,
                icon: Clock,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/activities`),
                items: [
                    {
                        title: t('nav.activities'),
                        url: `/server/${route.params.uuidShort}/activities`,
                        icon: Clock,
                    },
                ],
            },
            {
                title: t('nav.files'),
                url: `/server/${route.params.uuidShort}/files`,
                icon: Folder,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/files`),
                items: [
                    {
                        title: t('nav.files'),
                        url: `/server/${route.params.uuidShort}/files`,
                        icon: Folder,
                    },
                ],
            },
            {
                title: t('nav.databases'),
                url: `/server/${route.params.uuidShort}/databases`,
                icon: Database,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/databases`),
                items: [
                    {
                        title: t('nav.databases'),
                        url: `/server/${route.params.uuidShort}/databases`,
                        icon: Database,
                    },
                ],
            },
            {
                title: t('nav.schedules'),
                url: `/server/${route.params.uuidShort}/schedules`,
                icon: Calendar,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/schedules`),
                items: [
                    {
                        title: t('nav.schedules'),
                        url: `/server/${route.params.uuidShort}/schedules`,
                        icon: Calendar,
                    },
                ],
            },
            {
                title: t('nav.users'),
                url: `/server/${route.params.uuidShort}/users`,
                icon: Users,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/users`),
                items: [
                    {
                        title: t('nav.users'),
                        url: `/server/${route.params.uuidShort}/users`,
                        icon: Users,
                    },
                ],
            },
            {
                title: t('nav.backups'),
                url: `/server/${route.params.uuidShort}/backups`,
                icon: Archive,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/backups`),
                items: [
                    {
                        title: t('nav.backups'),
                        url: '#',
                        icon: Archive,
                    },
                ],
            },
            {
                title: 'Allocations',
                url: `/server/${route.params.uuidShort}/allocations`,
                icon: Network,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/allocations`),
                items: [
                    {
                        title: 'Allocations',
                        url: `/server/${route.params.uuidShort}/allocations`,
                        icon: Network,
                    },
                ],
            },
            {
                title: t('nav.startup'),
                url: `/server/${route.params.uuidShort}/startup`,
                icon: PlayCircle,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/startup`),
                items: [
                    {
                        title: t('nav.startup'),
                        url: `/server/${route.params.uuidShort}/startup`,
                        icon: PlayCircle,
                    },
                ],
            },
            {
                title: t('nav.settings'),
                url: `/server/${route.params.uuidShort}/settings`,
                icon: Settings2,
                isActive: currentPath.startsWith(`/server/${route.params.uuidShort}/settings`),
                items: [
                    {
                        title: t('nav.settings'),
                        url: `/server/${route.params.uuidShort}/settings`,
                        icon: Settings2,
                    },
                ],
            },
        ],
    };
});

// Debug: Log active states
watchEffect(() => {
    console.log(
        'Dashboard items active states:',
        data.value.navMain.map((item) => ({ title: item.title, isActive: item.isActive })),
    );
    if (data.value.navAdmin.length > 0) {
        console.log(
            'Admin items active states:',
            data.value.navAdmin.map((item) => ({ title: item.title, isActive: item.isActive })),
        );
    }
    if (data.value.navServer.length > 0) {
        console.log(
            'Server items active states:',
            data.value.navServer.map((item) => ({ title: item.title, isActive: item.isActive })),
        );
    }
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
        <SidebarHeader class="flex-shrink-0">
            <div class="flex items-center justify-center px-4 py-3">
                <div class="flex items-center gap-2 min-w-0 cursor-pointer flex-shrink-0" @click="router.push('/')">
                    <img
                        v-if="settingsStore.appLogo"
                        :src="String(settingsStore.appLogo || '')"
                        :alt="String(settingsStore.appName || '')"
                        class="h-8 w-8 object-contain flex-shrink-0"
                    />
                    <div
                        v-else
                        class="h-8 w-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    >
                        {{ String(settingsStore.appName || '').charAt(0) || 'M' }}
                    </div>
                    <span v-if="state === 'expanded'" class="font-medium text-lg truncate ml-2">
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
