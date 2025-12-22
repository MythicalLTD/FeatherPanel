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

import { ref, type Ref } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';

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
    const toast = useToast();
    const loading = ref(false);
    const error = ref<string | null>(null);

    const fetchSummary = async (): Promise<CloudSummary | null> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.get<{ success: boolean; data: CloudSummary }>('/api/admin/cloud/data/summary');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } } };
            error.value = e?.response?.data?.message || 'Failed to fetch cloud summary';
            toast.error(error.value);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const fetchCredits = async (): Promise<CreditsData | null> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.get<{ success: boolean; data: CreditsData }>('/api/admin/cloud/data/credits');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } } };
            error.value = e?.response?.data?.message || 'Failed to fetch credits';
            toast.error(error.value);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const fetchTeam = async (): Promise<TeamData | null> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.get<{ success: boolean; data: TeamData }>('/api/admin/cloud/data/team');
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } } };
            error.value = e?.response?.data?.message || 'Failed to fetch team information';
            toast.error(error.value);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const fetchProducts = async (page = 1, limit = 50): Promise<ProductsData | null> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.get<{ success: boolean; data: ProductsData }>('/api/admin/cloud/data/products', {
                params: { page, limit },
            });
            if (response.data.success) {
                return response.data.data;
            }
            return null;
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } } };
            error.value = e?.response?.data?.message || 'Failed to fetch products';
            toast.error(error.value);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const downloadPremiumPackage = async (packageName: string, version: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.get(`/api/admin/cloud/data/download/${packageName}/${version}`, {
                responseType: 'blob',
            });

            // Create download link
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
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } } };
            error.value = e?.response?.data?.message || 'Failed to download premium package';
            toast.error(error.value);
            return false;
        } finally {
            loading.value = false;
        }
    };

    return {
        loading: loading as Ref<boolean>,
        error: error as Ref<string | null>,
        fetchSummary,
        fetchCredits,
        fetchTeam,
        fetchProducts,
        downloadPremiumPackage,
    };
}

