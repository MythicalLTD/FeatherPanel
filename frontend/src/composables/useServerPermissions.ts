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

import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

export interface ServerPermissions {
    permissions: string[];
    isOwner: boolean;
    isSubuser: boolean;
}

/**
 * Composable to check subuser permissions for a specific server
 */
export function useServerPermissions() {
    const route = useRoute();

    const permissions = ref<string[]>([]);
    const isOwner = ref(true);
    const isLoading = ref(false);

    // Get current server UUID from route
    const serverUuid = computed(() => route.params.uuidShort as string);

    /**
     * Fetch server permissions from the API
     */
    const fetchPermissions = async (uuidShort: string): Promise<void> => {
        if (!uuidShort) {
            permissions.value = [];
            isOwner.value = true;
            return;
        }

        isLoading.value = true;
        try {
            const response = await axios.get('/api/user/servers');
            const data = response.data;

            if (data.success && data.data?.servers) {
                // Find the current server in the list
                const server = data.data.servers.find((s: { uuidShort: string }) => s.uuidShort === uuidShort);

                if (server) {
                    isOwner.value = !server.is_subuser;

                    if (server.is_subuser && server.subuser_permissions) {
                        permissions.value = server.subuser_permissions;
                    } else if (isOwner.value) {
                        // Owner has all permissions
                        permissions.value = ['*'];
                    } else {
                        permissions.value = [];
                    }
                } else {
                    // Server not found
                    permissions.value = [];
                    isOwner.value = true;
                }
            }
        } catch (error) {
            console.error('Failed to fetch server permissions:', error);
            // Default to owner permissions on error
            permissions.value = ['*'];
            isOwner.value = true;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Check if user has a specific permission
     */
    const hasPermission = (permission: string): boolean => {
        // Owners have all permissions
        if (isOwner.value) return true;

        // Check if user has the specific permission or wildcard
        return permissions.value.includes(permission) || permissions.value.includes('*');
    };

    /**
     * Check if user has any of the specified permissions
     */
    const hasAnyPermission = (requiredPermissions: string[]): boolean => {
        if (isOwner.value) return true;

        return requiredPermissions.some((perm) => permissions.value.includes(perm));
    };

    /**
     * Check if user has all of the specified permissions
     */
    const hasAllPermissions = (requiredPermissions: string[]): boolean => {
        if (isOwner.value) return true;

        return requiredPermissions.every((perm) => permissions.value.includes(perm));
    };

    // Fetch permissions when composable is used and server UUID changes
    onMounted(() => {
        if (serverUuid.value) {
            void fetchPermissions(serverUuid.value);
        }
    });

    return {
        permissions: computed(() => permissions.value),
        isOwner: computed(() => isOwner.value),
        isLoading: computed(() => isLoading.value),
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        fetchPermissions,
    };
}
