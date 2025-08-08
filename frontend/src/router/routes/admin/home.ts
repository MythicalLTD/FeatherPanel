import type { RouteRecordRaw } from 'vue-router';

const adminRoutes: RouteRecordRaw[] = [
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('@/pages/admin/Home.vue'),
    },
    {
        path: '/admin/users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/Users.vue'),
    },
    {
        path: '/admin/locations',
        name: 'AdminLocations',
        component: () => import('@/pages/admin/Locations.vue'),
    },
    {
        path: '/admin/realms',
        name: 'AdminRealms',
        component: () => import('@/pages/admin/Realms.vue'),
    },
    {
        path: '/admin/roles',
        name: 'AdminRoles',
        component: () => import('@/pages/admin/Roles.vue'),
    },
    {
        path: '/admin/spells',
        name: 'AdminSpells',
        component: () => import('@/pages/admin/Spells.vue'),
    },
    {
        path: '/admin/nodes',
        name: 'AdminNodes',
        component: () => import('@/pages/admin/Nodes.vue'),
    },
    {
        path: '/admin/nodes/:nodeId/databases',
        name: 'AdminNodeDatabases',
        component: () => import('@/pages/admin/NodeDatabases.vue'),
    },
    {
        path: '/admin/nodes/:nodeId/allocations',
        name: 'AdminNodeAllocations',
        component: () => import('@/pages/admin/Allocations.vue'),
    },
    {
        path: '/admin/servers',
        name: 'AdminServers',
        component: () => import('@/pages/admin/Servers.vue'),
    },
    {
        path: '/admin/servers/create',
        name: 'AdminServersCreate',
        component: () => import('@/pages/admin/Servers/Create.vue'),
    },
    {
        path: '/admin/servers/:id/edit',
        name: 'AdminServersEdit',
        component: () => import('@/pages/admin/Servers/Edit.vue'),
    },
    {
        path: '/admin/settings',
        name: 'AdminSettings',
        component: () => import('@/pages/admin/Settings.vue'),
    },
];

export default adminRoutes;
