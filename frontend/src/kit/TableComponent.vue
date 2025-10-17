<template>
    <div class="space-y-6">
        <!-- Header Section -->
        <div class="bg-card rounded-lg border p-4 sm:p-6 shadow-sm">
            <!-- Mobile Header Layout -->
            <div class="block sm:hidden">
                <div class="mb-4">
                    <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
                    <p class="text-muted-foreground mt-1 text-sm">
                        {{ description }}
                    </p>
                    <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span v-if="totalRecords > 0" class="text-xs bg-muted px-2 py-1 rounded">
                            {{ totalRecords }} {{ $t('table.records') }}
                        </span>
                        <span v-if="totalRecords > 0" class="text-xs bg-muted px-2 py-1 rounded">
                            {{ $t('table.page') }} {{ currentPage }} {{ $t('table.of') }} {{ totalPages }}
                        </span>
                        <span
                            v-if="visibleColumns.length > 0"
                            class="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                        >
                            {{ $t('table.columnsSelected', { count: visibleColumns.length }) }}
                        </span>
                    </div>
                </div>

                <!-- Mobile Action Buttons -->
                <div class="flex flex-col gap-2 mb-4">
                    <div class="flex gap-2">
                        <Button variant="outline" size="sm" class="flex-1" @click="showColumnSelector = true">
                            <Settings class="h-4 w-4 mr-2" />
                            {{ $t('table.columns') }}
                        </Button>
                        <slot name="header-actions"></slot>
                    </div>
                </div>

                <!-- Mobile Search Bar -->
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        v-model="localSearchQuery"
                        :placeholder="searchPlaceholder"
                        class="pl-10 pr-16"
                        @keydown="handleKeyDown"
                    />
                    <div class="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Button
                            v-if="localSearchQuery"
                            variant="ghost"
                            size="sm"
                            class="h-6 w-6 p-0"
                            @click="clearSearch"
                        >
                            <X class="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="handleSearch">
                            <Search class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Desktop Header Layout -->
            <div class="hidden sm:block">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">{{ title }}</h1>
                        <p class="text-muted-foreground mt-2">
                            {{ description }}
                            <span v-if="totalRecords > 0" class="ml-2">
                                • {{ totalRecords }} {{ $t('table.records') }} • {{ $t('table.page') }}
                                {{ currentPage }} {{ $t('table.of') }} {{ totalPages }}
                            </span>
                            <span
                                v-if="visibleColumns.length > 0"
                                class="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                            >
                                {{ $t('table.columnsSelected', { count: visibleColumns.length }) }}
                            </span>
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <Button variant="outline" size="sm" @click="showColumnSelector = true">
                            <Settings class="h-4 w-4 mr-2" />
                            {{ $t('table.columns') }}
                        </Button>
                        <slot name="header-actions"></slot>
                    </div>
                </div>

                <!-- Desktop Search Bar -->
                <div class="relative max-w-md">
                    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        v-model="localSearchQuery"
                        :placeholder="searchPlaceholder"
                        class="pl-10 pr-16"
                        @keydown="handleKeyDown"
                    />
                    <div class="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Button
                            v-if="localSearchQuery"
                            variant="ghost"
                            size="sm"
                            class="h-6 w-6 p-0"
                            @click="clearSearch"
                        >
                            <X class="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="handleSearch">
                            <Search class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Card Layout -->
        <div v-if="paginatedData.length > 0" class="block sm:hidden">
            <div class="space-y-3">
                <div
                    v-for="(item, index) in paginatedData"
                    :key="getItemKey(item, index)"
                    class="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                    <!-- Main Content -->
                    <div class="space-y-3">
                        <div v-for="column in visibleColumnDefinitions" :key="column.key" class="flex flex-col gap-1">
                            <!-- Skip actions column in main content -->
                            <template v-if="column.key !== 'actions'">
                                <div
                                  v-if="!column.hideLabelOnLayout"
                                  class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                                >
                                    {{ column.label }}
                                </div>
                                <div class="text-sm">
                                    <slot
                                        :name="`cell-${column.key}`"
                                        :item="item"
                                        :column="column"
                                        :value="getItemValue(item, column.key)"
                                    >
                                        <div class="truncate" :title="formatCellValue(getItemValue(item, column.key))">
                                            {{ formatCellValue(getItemValue(item, column.key)) }}
                                        </div>
                                    </slot>
                                </div>
                            </template>
                        </div>
                    </div>

                    <!-- Actions Section - Separate for better mobile layout -->
                    <div
                        v-if="visibleColumnDefinitions.some((col) => col.key === 'actions')"
                        class="mt-4 pt-3 border-t border-border/50"
                    >
                        <div class="flex flex-wrap gap-2">
                            <slot
                                name="cell-actions"
                                :item="item"
                                :column="{ key: 'actions', label: 'Actions' }"
                                :value="getItemValue(item, 'actions')"
                            >
                                <!-- Default actions if no slot provided -->
                                <div class="text-sm text-muted-foreground">No actions available</div>
                            </slot>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Pagination -->
            <div v-if="showPagination" class="mt-4 bg-card rounded-lg border p-4">
                <div class="flex flex-col items-center gap-4">
                    <div class="text-sm text-muted-foreground text-center">
                        <span v-if="totalRecords === 0"> {{ $t('table.noRecordsFound') }} </span>
                        <span v-else-if="from === 0 && to === 0">
                            {{ $t('table.showingZeroRecords', { total: totalRecords }) }}
                        </span>
                        <span v-else> {{ $t('table.showingRecords', { from, to, total: totalRecords }) }} </span>
                    </div>

                    <div class="flex items-center gap-2 w-full justify-center">
                        <Button variant="outline" size="sm" :disabled="!hasPrev" @click="changePage(currentPage - 1)">
                            <ChevronLeft class="h-4 w-4" />
                        </Button>
                        <div class="flex items-center gap-1">
                            <Button
                                v-for="page in visiblePages.slice(0, 3)"
                                :key="page"
                                :variant="page === currentPage ? 'default' : 'outline'"
                                size="sm"
                                @click="changePage(page)"
                            >
                                {{ page }}
                            </Button>
                            <span v-if="visiblePages.length > 3" class="px-2 text-muted-foreground">...</span>
                        </div>
                        <Button variant="outline" size="sm" :disabled="!hasNext" @click="changePage(currentPage + 1)">
                            <ChevronRight class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Desktop Table Layout -->
        <div v-if="paginatedData.length > 0" class="hidden sm:block bg-card rounded-lg border shadow-sm">
            <div class="p-4 sm:p-6">
                <div class="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow class="bg-muted/50">
                                <TableHead
                                    v-for="column in visibleColumnDefinitions"
                                    :key="column.key"
                                    :class="column.headerClass || ''"
                                >
                                    <!-- Only show label if hideLabelOnLayout is not true -->
                                    <template v-if="!column.hideLabelOnLayout">
                                      {{ column.label }}
                                    </template>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow
                                v-for="(item, index) in paginatedData"
                                :key="getItemKey(item, index)"
                                class="cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                                <TableCell
                                    v-for="column in visibleColumnDefinitions"
                                    :key="column.key"
                                    :class="column.cellClass || ''"
                                >
                                    <slot
                                        :name="`cell-${column.key}`"
                                        :item="item"
                                        :column="column"
                                        :value="getItemValue(item, column.key)"
                                    >
                                        <div class="truncate" :title="formatCellValue(getItemValue(item, column.key))">
                                            {{ formatCellValue(getItemValue(item, column.key)) }}
                                        </div>
                                    </slot>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            <!-- Desktop Pagination Section -->
            <div v-if="showPagination" class="border-t bg-muted/30 px-4 sm:px-6 py-4">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="text-sm text-muted-foreground text-center sm:text-left">
                        <span v-if="totalRecords === 0"> {{ $t('table.noRecordsFound') }} </span>
                        <span v-else-if="from === 0 && to === 0">
                            {{ $t('table.showingZeroRecords', { total: totalRecords }) }}
                        </span>
                        <span v-else> {{ $t('table.showingRecords', { from, to, total: totalRecords }) }} </span>
                    </div>

                    <!-- Mobile Pagination -->
                    <div class="flex sm:hidden items-center gap-2 w-full justify-center">
                        <Button variant="outline" size="sm" :disabled="!hasPrev" @click="changePage(currentPage - 1)">
                            <ChevronLeft class="h-4 w-4" />
                        </Button>
                        <div class="flex items-center gap-1">
                            <Button
                                v-for="page in visiblePages.slice(0, 3)"
                                :key="page"
                                :variant="page === currentPage ? 'default' : 'outline'"
                                size="sm"
                                @click="changePage(page)"
                            >
                                {{ page }}
                            </Button>
                            <span v-if="visiblePages.length > 3" class="px-2 text-muted-foreground">...</span>
                        </div>
                        <Button variant="outline" size="sm" :disabled="!hasNext" @click="changePage(currentPage + 1)">
                            <ChevronRight class="h-4 w-4" />
                        </Button>
                    </div>

                    <!-- Desktop Pagination -->
                    <div class="hidden sm:flex items-center gap-2">
                        <Button variant="outline" size="sm" :disabled="!hasPrev" @click="changePage(currentPage - 1)">
                            <ChevronLeft class="h-4 w-4 mr-1" />
                            {{ $t('table.previous') }}
                        </Button>
                        <div class="flex items-center gap-1">
                            <Button
                                v-for="page in visiblePages"
                                :key="page"
                                :variant="page === currentPage ? 'default' : 'outline'"
                                size="sm"
                                @click="changePage(page)"
                            >
                                {{ page }}
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" :disabled="!hasNext" @click="changePage(currentPage + 1)">
                            {{ $t('table.next') }}
                            <ChevronRight class="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- No Results -->
        <div v-if="localSearchQuery && paginatedData.length === 0" class="bg-card rounded-lg border p-12 text-center">
            <div class="text-muted-foreground mb-4">
                <Search class="h-12 w-12 mx-auto" />
            </div>
            <h3 class="text-lg font-medium text-muted-foreground mb-2">{{ $t('table.noSearchResults') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('table.tryDifferentKeywords') }}</p>
        </div>

        <!-- Column Selector Dialog -->
        <Dialog v-model:open="showColumnSelector">
            <DialogContent class="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ $t('table.selectColumnsTitle') }}</DialogTitle>
                    <DialogDescription>
                        {{ $t('table.selectColumnsDescription') }}
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div class="max-h-[400px] overflow-y-auto space-y-2">
                        <div v-for="column in availableColumns" :key="column.key" class="flex items-center gap-2">
                            <Checkbox
                                :model-value="visibleColumns.includes(column.key)"
                                @update:model-value="() => toggleColumn(column.key)"
                            />
                            <label class="text-sm">{{ column.label }}</label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="resetColumnPreferences">{{ $t('table.resetToDefault') }}</Button>
                    <Button @click="showColumnSelector = false">{{ $t('table.apply') }}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Search, Settings, ChevronLeft, ChevronRight, X } from 'lucide-vue-next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import type { TableProps } from './types';

const props = withDefaults(defineProps<TableProps>(), {
    description: '',
    searchPlaceholder: 'Search records...',
    searchQuery: '',
    showPagination: true,
    pageSize: 20,
    localStorageKey: 'table-columns',
    getItemKey: (item: Record<string, unknown>, index: number) => (item.id as string | number) || index,
    formatCellValue: (value: unknown) => value?.toString() || '-',
    serverSidePagination: false,
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});

const emit = defineEmits<{
    search: [query: string];
    pageChange: [page: number];
    columnToggle: [columns: string[]];
}>();

// State
const localSearchQuery = ref(props.searchQuery);
const showColumnSelector = ref(false);
const visibleColumns = ref<string[]>([]);

// Computed
const availableColumns = computed(() => props.columns);

const visibleColumnDefinitions = computed(() => {
    return props.columns.filter((column) => visibleColumns.value.includes(column.key));
});

const filteredData = computed(() => {
    if (!localSearchQuery.value || props.serverSidePagination) {
        return props.data;
    }

    const query = localSearchQuery.value.toLowerCase();
    return props.data.filter((item) => {
        return props.columns.some((column) => {
            if (!column.searchable) return false;
            const value = getItemValue(item, column.key);
            return value?.toString().toLowerCase().includes(query);
        });
    });
});

const paginatedData = computed(() => {
    if (props.serverSidePagination) {
        return props.data;
    }

    const start = (props.currentPage - 1) * props.pageSize;
    const end = start + props.pageSize;
    return filteredData.value.slice(start, end);
});

const totalPages = computed(() => {
    if (props.serverSidePagination) {
        return props.totalPages;
    }
    return Math.ceil(filteredData.value.length / props.pageSize);
});

const visiblePages = computed(() => {
    const pages: number[] = [];
    const total = totalPages.value;
    const current = props.currentPage;

    // Always show first page
    pages.push(1);

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
    }

    // Always show last page
    if (total > 1 && !pages.includes(total)) {
        pages.push(total);
    }

    return pages.sort((a, b) => a - b);
});

// Methods
function getItemValue(item: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((obj, k) => {
        const current = obj as Record<string, unknown>;
        return current?.[k];
    }, item);
}

function getItemKey(item: Record<string, unknown>, index: number): string | number {
    return props.getItemKey?.(item as never, index) ?? (item.id as string | number) ?? index;
}

function formatCellValue(value: unknown): string {
    return props.formatCellValue?.(value) ?? value?.toString() ?? '-';
}

function handleSearch() {
    emit('search', localSearchQuery.value);
}

function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
    } else if (event.key === 'Escape') {
        clearSearch();
    }
}

function clearSearch() {
    localSearchQuery.value = '';
    emit('search', '');
}

function changePage(page: number) {
    emit('pageChange', page);
}

function toggleColumn(key: string) {
    const index = visibleColumns.value.indexOf(key);
    if (index > -1) {
        visibleColumns.value.splice(index, 1);
    } else {
        visibleColumns.value.push(key);
    }
    saveColumnPreferences();
    emit('columnToggle', visibleColumns.value);
}

function resetColumnPreferences() {
    visibleColumns.value = props.columns.map((col) => col.key);
    saveColumnPreferences();
    emit('columnToggle', visibleColumns.value);
}

function saveColumnPreferences() {
    localStorage.setItem(props.localStorageKey, JSON.stringify(visibleColumns.value));
}

function loadColumnPreferences() {
    const saved = localStorage.getItem(props.localStorageKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                visibleColumns.value = parsed.filter((key) => props.columns.some((col) => col.key === key));
            }
        } catch {
            // If parsing fails, use defaults
            visibleColumns.value = props.columns.map((col) => col.key);
        }
    } else {
        // Default to all columns
        visibleColumns.value = props.columns.map((col) => col.key);
    }
}

// Lifecycle
onMounted(() => {
    loadColumnPreferences();
});

// Watch for column changes
watch(
    () => props.columns,
    () => {
        loadColumnPreferences();
    },
    { immediate: true },
);

// Watch for prop changes from parent
watch(
    () => props.searchQuery,
    (val) => {
        if (val !== undefined && val !== localSearchQuery.value) {
            localSearchQuery.value = val;
        }
    },
);

// Cleanup timeout on unmount
onUnmounted(() => {
    // No timeout cleanup needed since we removed debouncing
});
</script>
