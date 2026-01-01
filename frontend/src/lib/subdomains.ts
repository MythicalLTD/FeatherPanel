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

import axios from 'axios';
import type {
    SubdomainAdminResponse,
    SubdomainDomain,
    SubdomainDomainPayload,
    SubdomainOverview,
    SubdomainSettings,
    SubdomainSettingsPayload,
    ServerSubdomainPayload,
} from '@/composables/types/subdomain';

export async function fetchAdminSubdomains(
    params: { page?: number; limit?: number; search?: string; includeInactive?: boolean } = {},
): Promise<SubdomainAdminResponse> {
    const response = await axios.get('/api/admin/subdomains', { params });
    return response.data.data;
}

export async function fetchAdminDomain(uuid: string): Promise<SubdomainDomain> {
    const response = await axios.get(`/api/admin/subdomains/${uuid}`);
    return response.data.data.domain;
}

export async function createAdminDomain(payload: SubdomainDomainPayload): Promise<SubdomainDomain> {
    const response = await axios.put('/api/admin/subdomains', payload);
    return response.data.data.domain;
}

export async function updateAdminDomain(
    uuid: string,
    payload: Partial<SubdomainDomainPayload>,
): Promise<SubdomainDomain> {
    const response = await axios.patch(`/api/admin/subdomains/${uuid}`, payload);
    return response.data.data.domain;
}

export async function deleteAdminDomain(uuid: string): Promise<void> {
    await axios.delete(`/api/admin/subdomains/${uuid}`);
}

export async function fetchAdminSubdomainList(uuid: string) {
    const response = await axios.get(`/api/admin/subdomains/${uuid}/subdomains`);
    return response.data.data.subdomains;
}

export async function fetchAdminSubdomainSettings(): Promise<SubdomainSettings> {
    const response = await axios.get('/api/admin/subdomains/settings');
    return response.data.data.settings;
}

export async function updateAdminSubdomainSettings(payload: SubdomainSettingsPayload): Promise<void> {
    await axios.patch('/api/admin/subdomains/settings', payload);
}

export async function fetchAdminSubdomainSpells(): Promise<
    Array<{ id: number; uuid: string; name: string; realm_id: number }>
> {
    const response = await axios.get('/api/admin/subdomains/spells');
    return response.data.data.spells;
}

export async function fetchServerSubdomains(uuidShort: string): Promise<SubdomainOverview> {
    const response = await axios.get(`/api/user/servers/${uuidShort}/subdomains`);
    return response.data.data.overview;
}

export async function createServerSubdomain(uuidShort: string, payload: ServerSubdomainPayload) {
    const response = await axios.put(`/api/user/servers/${uuidShort}/subdomains`, payload);
    return response.data.data.subdomain;
}

export async function deleteServerSubdomain(uuidShort: string, uuid: string) {
    await axios.delete(`/api/user/servers/${uuidShort}/subdomains/${uuid}`);
}
