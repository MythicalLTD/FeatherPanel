/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useSession } from '@/contexts/SessionContext';

export interface VmInstance {
    id: number;
    vmid: number;
    hostname: string | null;
    status: string;
    vm_type: 'qemu' | 'lxc';
    ip_address: string | null;
    ip_pool_address?: string | null;
    user_uuid: string;
    vm_node_id: number;
    pve_node?: string | null;
    plan_name?: string | null;
    plan_memory?: number | null;
    plan_cpus?: number | null;
    plan_cores?: number | null;
    plan_disk?: number | null;
    node_name?: string | null;
    node_fqdn?: string | null;
    created_at?: string;
    is_owner?: boolean;
    is_subuser?: boolean;
    permissions?: string[];
    access_password?: string | null;
    suspended?: number;
}

interface VmInstanceContextType {
    instance: VmInstance | null;
    loading: boolean;
    error: Error | null;
    refreshInstance: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

export const VmInstanceContext = createContext<VmInstanceContextType | undefined>(undefined);

interface VmInstanceProviderProps {
    children: ReactNode;
    instanceId: number;
    initialInstance?: VmInstance | null;
}

export function VmInstanceProvider({ children, instanceId, initialInstance }: VmInstanceProviderProps) {
    const [instance, setInstance] = useState<VmInstance | null>(initialInstance || null);
    const [loading, setLoading] = useState(!initialInstance);
    const [error, setError] = useState<Error | null>(null);
    const { hasPermission: hasGlobalPermission } = useSession();

    const fetchInstance = useCallback(async () => {
        if (!instanceId) return;
        if (!instance) setLoading(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: { instance: VmInstance } }>(
                `/api/user/vm-instances/${instanceId}`,
            );
            if (data.success) {
                setInstance(data.data.instance);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to fetch VM instance:', err);
            if (axios.isAxiosError(err) && err.response?.status === 403) {
                const errorData = err.response.data;
                if (errorData?.error_code === 'VM_INSTANCE_SUSPENDED') {
                    const suspendedVm: VmInstance = {
                        id: instanceId,
                        vmid: 0,
                        hostname: 'Suspended VDS',
                        status: 'suspended',
                        vm_type: 'qemu',
                        ip_address: null,
                        user_uuid: '',
                        vm_node_id: 0,
                        suspended: 1,
                        is_owner: true,
                        is_subuser: false,
                        permissions: [],
                    };
                    setInstance(suspendedVm);
                    setError(null);
                    return;
                }
            }
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [instanceId, instance]);

    useEffect(() => {
        if (!initialInstance) {
            fetchInstance();
        } else {
            setInstance(initialInstance);
            setLoading(false);
        }
    }, [instanceId, initialInstance, fetchInstance]);

    const hasPermission = useCallback(
        (permission: string): boolean => {
            // Admins always have access
            if (hasGlobalPermission('admin.root')) return true;

            // Owner always has access
            if (instance?.is_owner) return true;

            // Subusers: check granular permissions from backend
            if (instance?.is_subuser) {
                return instance.permissions?.includes(permission) ?? false;
            }

            return false;
        },
        [instance, hasGlobalPermission],
    );

    return (
        <VmInstanceContext.Provider
            value={{
                instance,
                loading,
                error,
                refreshInstance: fetchInstance,
                hasPermission,
            }}
        >
            {children}
        </VmInstanceContext.Provider>
    );
}

export function useVmInstance() {
    const context = useContext(VmInstanceContext);
    if (context === undefined) {
        throw new Error('useVmInstance must be used within a VmInstanceProvider');
    }
    return context;
}
