/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
        path: '/admin/nodes/status',
        name: 'AdminNodesStatus',
        component: () => import('@/pages/admin/NodesStatus.vue'),
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
    {
        path: '/admin/mail-templates',
        name: 'AdminMailTemplates',
        component: () => import('@/pages/admin/MailTemplates.vue'),
    },
    {
        path: '/admin/images',
        name: 'AdminImages',
        component: () => import('@/pages/admin/Images.vue'),
    },
    {
        path: '/admin/redirect-links',
        name: 'AdminRedirectLinks',
        component: () => import('@/pages/admin/RedirectLinks.vue'),
    },
    {
        path: '/admin/subdomains',
        name: 'AdminSubdomains',
        component: () => import('@/pages/admin/Subdomains.vue'),
    },
    {
        path: '/admin/plugins',
        name: 'AdminPlugins',
        component: () => import('@/pages/admin/Plugins.vue'),
    },
    {
        path: '/admin/databases/management',
        name: 'AdminDatabaseManagement',
        component: () => import('@/pages/admin/DatabaseManagement.vue'),
    },
    {
        path: '/admin/api-keys',
        name: 'AdminApiKeys',
        component: () => import('@/pages/admin/ApiKeys.vue'),
    },
    {
        path: '/admin/kpi/analytics',
        name: 'AdminKPIAnalytics',
        component: () => import('@/pages/admin/kpi/Analytics.vue'),
    },
    {
        path: '/admin/kpi/users',
        name: 'AdminKPIUsers',
        component: () => import('@/pages/admin/kpi/Users.vue'),
    },
    {
        path: '/admin/kpi/activity',
        name: 'AdminKPIActivity',
        component: () => import('@/pages/admin/kpi/Activity.vue'),
    },
    {
        path: '/admin/kpi/infrastructure',
        name: 'AdminKPIInfrastructure',
        component: () => import('@/pages/admin/kpi/Infrastructure.vue'),
    },
    {
        path: '/admin/kpi/servers',
        name: 'AdminKPIServers',
        component: () => import('@/pages/admin/kpi/Servers.vue'),
    },
    {
        path: '/admin/kpi/content',
        name: 'AdminKPIContent',
        component: () => import('@/pages/admin/kpi/Content.vue'),
    },
    {
        path: '/admin/kpi/system',
        name: 'AdminKPISystem',
        component: () => import('@/pages/admin/kpi/System.vue'),
    },
    {
        path: '/admin/featherpanel-cloud',
        name: 'AdminFeatherPanelCloud',
        component: () => import('@/pages/admin/cloud/FeatherPanelCloud.vue'),
    },
    {
        path: '/admin/feathercloud-ai-agent',
        name: 'AdminFeatherCloudAiAgent',
        component: () => import('@/pages/admin/cloud/FeatherCloudAiAgent.vue'),
    },
    {
        path: '/admin/cloud-management',
        name: 'AdminCloudManagement',
        component: () => import('@/pages/admin/CloudManagement.vue'),
    },
    {
        path: '/admin/feathercloud-zero-intelligence',
        name: 'AdminFeatherCloudZeroIntelligence',
        component: () => import('@/pages/admin/cloud/FeatherCloudZeroIntelligence.vue'),
    },
    {
        path: '/admin/dev/logs',
        name: 'AdminLogViewer',
        component: () => import('@/pages/admin/dev/LogViewer.vue'),
    },
    {
        path: '/admin/dev/files',
        name: 'AdminFileManager',
        component: () => import('@/pages/admin/dev/FileManager.vue'),
    },
    {
        path: '/admin/dev/console',
        name: 'AdminConsole',
        component: () => import('@/pages/admin/dev/Console.vue'),
    },
    {
        path: '/admin/dev/plugins',
        name: 'AdminPluginManager',
        component: () => import('@/pages/admin/dev/PluginManager.vue'),
    },
    {
        path: '/admin/feathercloud/tis',
        name: 'AdminTIS',
        component: () => import('@/pages/admin/feathercloud/TIS.vue'),
    },
    {
        path: '/admin/feathercloud/featherzerotrust',
        name: 'AdminFeatherZeroTrust',
        component: () => import('@/pages/admin/feathercloud/FeatherZeroTrust.vue'),
    },
    {
        path: '/admin/feathercloud/featherzerotrust/config',
        name: 'AdminFeatherZeroTrustConfig',
        component: () => import('@/pages/admin/feathercloud/FeatherZeroTrustConfig.vue'),
    },
    {
        path: '/admin/feathercloud/featherzerotrust/logs',
        name: 'AdminFeatherZeroTrustLogs',
        component: () => import('@/pages/admin/feathercloud/FeatherZeroTrustLogs.vue'),
    },
    {
        path: '/admin/feathercloud/featherzerotrust/logs/:executionId',
        name: 'AdminFeatherZeroTrustLogDetails',
        component: () => import('@/pages/admin/feathercloud/FeatherZeroTrustLogDetails.vue'),
    },
    {
        path: '/admin/:pathMatch(.*)*',
        name: 'AdminPluginRenderedPage',
        component: () => import('@/pages/dashboard/PluginRenderedPage.vue'),
    },
];

export default adminRoutes;
