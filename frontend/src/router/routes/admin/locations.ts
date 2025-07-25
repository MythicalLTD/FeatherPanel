import type { RouteRecordRaw } from 'vue-router';

const adminRoutes: RouteRecordRaw[] = [
    {
        path: '/admin/locations',
        name: 'AdminLocations',
        component: () => import('@/pages/admin/Locations.vue'),
    },
];

export default adminRoutes;
