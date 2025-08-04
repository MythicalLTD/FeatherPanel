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
];

export default adminRoutes;
