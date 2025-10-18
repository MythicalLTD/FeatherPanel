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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, type Ref } from 'vue';
import axios from 'axios';

interface SelectionModalState {
    isOpen: boolean;
    searchQuery: string;
    currentPage: number;
    items: any[];
    loading: boolean;
    totalPages: number;
    totalItems: number;
    selectedItem: any;
}

export function useSelectionModal(
    apiEndpoint: string,
    pageSize: number = 20,
    searchParam: string = 'search',
    pageParam: string = 'page',
    additionalParams:
        | Record<string, string | number | null | undefined>
        | Ref<Record<string, string | number | null | undefined>> = {},
) {
    const state = ref<SelectionModalState>({
        isOpen: false,
        searchQuery: '',
        currentPage: 1,
        items: [],
        loading: false,
        totalPages: 1,
        totalItems: 0,
        selectedItem: null,
    });

    const openModal = () => {
        state.value.isOpen = true;
        state.value.currentPage = 1;
        state.value.searchQuery = '';
        state.value.selectedItem = null;
        loadItems();
    };

    const closeModal = () => {
        state.value.isOpen = false;
    };

    const loadItems = async () => {
        state.value.loading = true;

        try {
            const params = new URLSearchParams();
            params.append('per_page', pageSize.toString());
            params.append(pageParam, state.value.currentPage.toString());

            if (state.value.searchQuery.trim()) {
                params.append(searchParam, state.value.searchQuery.trim());
            }

            // Add additional query parameters (handle both Ref and plain object)
            const paramsToAdd =
                'value' in additionalParams && additionalParams.value
                    ? additionalParams.value
                    : (additionalParams as Record<string, string | number | null | undefined>);
            Object.entries(paramsToAdd).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    params.append(key, String(value));
                }
            });

            const response = await axios.get(`${apiEndpoint}?${params.toString()}`);

            if (response.data?.success) {
                // Handle the nested structure: data.users, data.locations, etc.
                const data = response.data.data;
                const pagination = data.pagination;

                // Find the items array (could be users, locations, nodes, realms, spells, allocations)
                const itemsKey = Object.keys(data).find(
                    (key) => key !== 'pagination' && key !== 'search' && Array.isArray(data[key]),
                );

                state.value.items = itemsKey ? data[itemsKey] : [];
                state.value.totalItems = pagination?.total_records || state.value.items.length;
                state.value.totalPages = pagination?.total_pages || Math.ceil(state.value.totalItems / pageSize);
            } else {
                state.value.items = [];
                state.value.totalItems = 0;
                state.value.totalPages = 1;
            }
        } catch (error) {
            console.error('Failed to load items:', error);
            state.value.items = [];
            state.value.totalItems = 0;
            state.value.totalPages = 1;
        } finally {
            state.value.loading = false;
        }
    };

    const handleSearch = (query?: string) => {
        if (query !== undefined) {
            state.value.searchQuery = query;
        }
        state.value.currentPage = 1;
        loadItems();
    };

    const handleSearchQueryUpdate = (query: string) => {
        // Just update the query in state, don't search yet
        state.value.searchQuery = query;

        // If clearing search, immediately search
        if (query === '') {
            state.value.currentPage = 1;
            loadItems();
        }
    };

    const handlePageChange = (page: number) => {
        state.value.currentPage = page;
        loadItems();
    };

    const selectItem = (item: any) => {
        state.value.selectedItem = item;
    };

    const confirmSelection = () => {
        if (state.value.selectedItem) {
            closeModal();
            return state.value.selectedItem;
        }
        return null;
    };

    return {
        state: computed(() => state.value),
        openModal,
        closeModal,
        loadItems,
        handleSearch,
        handleSearchQueryUpdate,
        handlePageChange,
        selectItem,
        confirmSelection,
    };
}
