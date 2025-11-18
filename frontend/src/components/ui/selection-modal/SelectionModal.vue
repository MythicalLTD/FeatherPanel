<template>
    <Dialog :open="isOpen" @update:open="$emit('update:open', $event)">
        <DialogContent class="max-w-4xl w-full h-[95vh] sm:h-[80vh] flex flex-col">
            <!-- Header -->
            <DialogHeader class="pb-4">
                <DialogTitle class="text-xl font-semibold">{{ title }}</DialogTitle>
                <DialogDescription class="text-muted-foreground">{{ description }}</DialogDescription>
            </DialogHeader>

            <!-- Search Bar -->
            <div class="flex flex-col sm:flex-row gap-3 mb-6">
                <div class="relative flex-1">
                    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        :model-value="searchQuery"
                        @update:model-value="(value: string | number) => $emit('searchQueryUpdate', String(value))"
                        :placeholder="searchPlaceholder"
                        class="pl-10"
                        @keydown.enter="$emit('search', searchQuery)"
                    />
                </div>
                <div class="flex gap-2 sm:gap-3">
                    <Button @click="$emit('search', searchQuery)" variant="default" class="flex-1 sm:flex-none">
                        <Search class="h-4 w-4 mr-2" />
                        <span class="hidden sm:inline">Search</span>
                    </Button>
                    <Button @click="clearSearch" variant="outline" class="flex-1 sm:flex-none">Clear</Button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-hidden flex flex-col">
                <!-- Loading State -->
                <div v-if="loading" class="flex-1 flex items-center justify-center">
                    <div class="flex items-center gap-2">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading...</span>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else-if="items.length === 0 && !loading" class="flex-1 flex items-center justify-center">
                    <div class="text-center">
                        <h3 class="text-lg font-medium mb-2">No {{ itemType }} found</h3>
                        <p v-if="searchQuery" class="text-muted-foreground">No results for "{{ searchQuery }}"</p>
                        <p v-else class="text-muted-foreground">No {{ itemType }} available</p>
                        <Button @click="clearSearch" variant="outline" class="mt-4" v-if="searchQuery">
                            Clear Search
                        </Button>
                    </div>
                </div>

                <!-- Items List -->
                <div v-else class="flex-1 overflow-auto border rounded-lg">
                    <div class="divide-y">
                        <div
                            v-for="item in items"
                            :key="getItemKey(item)"
                            @click="!isItemDisabled?.(item) && selectItem(item)"
                            class="p-3 sm:p-4 transition-colors touch-manipulation"
                            :class="{
                                'bg-primary/5 border-l-4 border-l-primary': isSelected(item),
                                'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800': !isItemDisabled?.(item),
                                'opacity-50': isItemDisabled?.(item),
                            }"
                        >
                            <slot :item="item" :isSelected="isSelected(item)" :isDisabled="isItemDisabled?.(item) ?? false">
                                <!-- Default item display -->
                                <div class="flex items-center justify-between">
                                    <div class="flex-1 min-w-0">
                                        <h4 class="font-medium truncate text-sm sm:text-base">
                                            {{ getItemName(item) }}
                                        </h4>
                                        <p class="text-xs sm:text-sm text-muted-foreground truncate">
                                            {{ getItemDescription(item) }}
                                        </p>
                                    </div>
                                    <div v-if="isSelected(item)" class="shrink-0 ml-2 sm:ml-4">
                                        <Check class="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    </div>
                                </div>
                            </slot>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div v-if="totalPages > 1" class="mt-4 pt-4 border-t">
                    <div class="text-xs sm:text-sm text-muted-foreground text-center mb-3">
                        Showing {{ (currentPage - 1) * pageSize + 1 }} to
                        {{ Math.min(currentPage * pageSize, totalItems) }} of {{ totalItems }} {{ itemType }}
                    </div>
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <Button @click="previousPage" :disabled="currentPage === 1" variant="outline" size="sm">
                                Previous
                            </Button>
                            <Button
                                @click="nextPage"
                                :disabled="currentPage === totalPages"
                                variant="outline"
                                size="sm"
                            >
                                Next
                            </Button>
                        </div>
                        <div class="flex items-center gap-1 overflow-x-auto">
                            <Button
                                v-for="page in visiblePages"
                                :key="page"
                                @click="goToPage(page)"
                                :variant="page === currentPage ? 'default' : 'outline'"
                                size="sm"
                                class="w-8 h-8 p-0 shrink-0"
                            >
                                {{ page }}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <DialogFooter class="pt-4 flex-col sm:flex-row gap-2">
                <Button
                    @click="$emit('update:open', false)"
                    variant="outline"
                    class="w-full sm:w-auto order-2 sm:order-1"
                >
                    Cancel
                </Button>
                <Button
                    @click="confirmSelection"
                    :disabled="!selectedItem"
                    variant="default"
                    class="w-full sm:w-auto order-1 sm:order-2"
                >
                    Select {{ itemType }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-vue-next';

interface Props {
    isOpen: boolean;
    title: string;
    description?: string;
    itemType: string;
    searchPlaceholder?: string;
    items: any[];
    loading: boolean;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    selectedItem: any;
    searchQuery: string;
    isItemDisabled?: (item: any) => boolean;
}

interface Emits {
    (e: 'update:open', value: boolean): void;
    (e: 'search', query: string): void;
    (e: 'searchQueryUpdate', query: string): void;
    (e: 'pageChange', page: number): void;
    (e: 'select', item: any): void;
    (e: 'confirm'): void;
}

const props = withDefaults(defineProps<Props>(), {
    description: '',
    searchPlaceholder: 'Search...',
});

const emit = defineEmits<Emits>();

// Computed properties for pagination
const visiblePages = computed(() => {
    const pages = [];
    const start = Math.max(1, props.currentPage - 2);
    const end = Math.min(props.totalPages, props.currentPage + 2);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return pages;
});

// Helper functions
const getItemKey = (item: any) => item.id || item.uuid || JSON.stringify(item);
const getItemName = (item: any) => item.name || item.username || item.title || 'Unknown';
const getItemDescription = (item: any) => item.description || item.email || item.short_description || '';

const isSelected = (item: any) => {
    if (!props.selectedItem) return false;
    return getItemKey(item) === getItemKey(props.selectedItem);
};

// Event handlers
const clearSearch = () => {
    emit('search', '');
};

const previousPage = () => {
    if (props.currentPage > 1) {
        emit('pageChange', props.currentPage - 1);
    }
};

const nextPage = () => {
    if (props.currentPage < props.totalPages) {
        emit('pageChange', props.currentPage + 1);
    }
};

const goToPage = (page: number) => {
    emit('pageChange', page);
};

const selectItem = (item: any) => {
    emit('select', item);
};

const confirmSelection = () => {
    emit('confirm');
};
</script>
