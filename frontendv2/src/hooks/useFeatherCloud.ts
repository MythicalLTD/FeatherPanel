/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/api-errors';

export interface CloudSummary {
    cloud: {
        id: number;
        cloud_name: string;
        featherpanel_url: string;
    };
    team: {
        uuid: string;
        name: string;
        description?: string;
    };
    statistics: {
        total_members: number;
        total_credits: number;
        total_purchases: number;
    };
    entitlements?: {
        featherpanel_premium?: {
            active: boolean;
            features: {
                remove_branding: boolean;
                rename_ai_agent: boolean;
                custom_sidebar: boolean;
                higher_limits: boolean;
                priority_support: boolean;
                priority_suggestions: boolean;
            };
        };
    };
}

export interface CreditsData {
    total_credits: number;
    member_credits: Array<{
        user_uuid: string;
        username: string;
        email: string;
        credits: number;
    }>;
    member_count: number;
}

export interface TeamData {
    team: {
        id: number;
        uuid: string;
        name: string;
        description?: string;
        logo?: string;
        created_at: string;
        updated_at: string;
    };
}

export interface ProductPurchase {
    access_id: number;
    user_uuid: string;
    username: string;
    email: string;
    product: {
        id: number;
        name: string;
        identifier: string;
        price: string;
    };
    purchased_at: string;
    payment_reference?: string;
}

export interface ProductsData {
    purchases: ProductPurchase[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

export function useFeatherCloud() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async (): Promise<CloudSummary | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<{
                success: boolean;
                data: CloudSummary;
            }>('/api/admin/cloud/data/summary');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err: unknown) {
            const errorCode = getApiErrorCode(err);
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = getApiErrorMessage(err, t, 'admin.cloud_management.premium.fetch_summary_failed');
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchCredits = useCallback(async (): Promise<CreditsData | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<{ success: boolean; data: CreditsData }>('/api/admin/cloud/data/credits');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err: unknown) {
            const errorCode = getApiErrorCode(err);
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = getApiErrorMessage(err, t, 'admin.cloud_management.premium.fetch_credits_failed');
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchTeam = useCallback(async (): Promise<TeamData | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<{ success: boolean; data: TeamData }>('/api/admin/cloud/data/team');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err: unknown) {
            const errorCode = getApiErrorCode(err);
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = getApiErrorMessage(err, t, 'admin.cloud_management.premium.fetch_team_failed');
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchProducts = useCallback(
        async (page = 1, limit = 50): Promise<ProductsData | null> => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get<{
                    success: boolean;
                    data: ProductsData;
                }>('/api/admin/cloud/data/products', { params: { page, limit } });
                if (response.data.success) {
                    return response.data.data;
                }
                return null;
            } catch (err: unknown) {
                const errorCode = getApiErrorCode(err);
                if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                    return null;
                }
                const message = getApiErrorMessage(err, t, 'admin.cloud_management.premium.fetch_products_failed');
                setError(message);
                toast.error(message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [t],
    );

    const downloadPremiumPackage = useCallback(
        async (packageName: string, version: string): Promise<boolean> => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`/api/admin/cloud/data/download/${packageName}/${version}`, {
                    responseType: 'blob',
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${packageName}-${version}.fpa`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                toast.success(
                    t('admin.cloud_management.premium.download_success', {
                        name: packageName,
                        version,
                    }),
                );
                return true;
            } catch (err: unknown) {
                const message = getApiErrorMessage(err, t, 'admin.cloud_management.premium.download_failed');
                setError(message);
                toast.error(message);
                return false;
            } finally {
                setLoading(false);
            }
        },
        [t],
    );

    return {
        loading,
        error,
        fetchSummary,
        fetchCredits,
        fetchTeam,
        fetchProducts,
        downloadPremiumPackage,
    };
}
