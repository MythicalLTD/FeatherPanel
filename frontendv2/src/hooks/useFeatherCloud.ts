/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
            const e = err as {
                response?: { data?: { error_code?: string; message?: string } };
            };
            const errorCode = e?.response?.data?.error_code;
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = e?.response?.data?.message || 'Failed to fetch cloud summary';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

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
            const e = err as {
                response?: { data?: { error_code?: string; message?: string } };
            };
            const errorCode = e?.response?.data?.error_code;
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = e?.response?.data?.message || 'Failed to fetch credits';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

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
            const e = err as {
                response?: { data?: { error_code?: string; message?: string } };
            };
            const errorCode = e?.response?.data?.error_code;
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = e?.response?.data?.message || 'Failed to fetch team information';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProducts = useCallback(async (page = 1, limit = 50): Promise<ProductsData | null> => {
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
            const e = err as {
                response?: { data?: { error_code?: string; message?: string } };
            };
            const errorCode = e?.response?.data?.error_code;
            if (errorCode === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                return null;
            }
            const message = e?.response?.data?.message || 'Failed to fetch products';
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const downloadPremiumPackage = useCallback(async (packageName: string, version: string): Promise<boolean> => {
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

            toast.success(`Premium package ${packageName} v${version} downloaded successfully`);
            return true;
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            const message = e?.response?.data?.message || 'Failed to download premium package';
            setError(message);
            toast.error(message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

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
