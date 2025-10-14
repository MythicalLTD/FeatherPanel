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

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNavigation, type NavigationItem } from '@/composables/useNavigation';

const router = useRouter();
const { dockNavigation } = useNavigation();

// Hover state
const hoveredItem = ref<string | null>(null);

const handleItemClick = (item: NavigationItem) => {
    router.push(item.url);
};

const handleItemHover = (itemId: string) => {
    hoveredItem.value = itemId;
};

const handleItemLeave = () => {
    hoveredItem.value = null;
};
</script>

<template>
    <div class="mac-dock-container">
        <div class="mac-dock">
            <div class="dock-items">
                <div
                    v-for="item in dockNavigation"
                    :key="item.id"
                    class="dock-item"
                    :class="{
                        'dock-item--active': item.isActive,
                        'dock-item--hovered': hoveredItem === item.id,
                    }"
                    @click="handleItemClick(item)"
                    @mouseenter="handleItemHover(item.id)"
                    @mouseleave="handleItemLeave"
                >
                    <div class="dock-item-icon">
                        <!-- Render emoji if icon is a string, otherwise render Lucide icon component -->
                        <span v-if="typeof item.icon === 'string'" class="text-2xl">
                            {{ item.icon }}
                        </span>
                        <component :is="item.icon" v-else class="icon" />
                    </div>
                    <div v-if="hoveredItem === item.id" class="dock-item-label">
                        {{ item.title }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.mac-dock-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: var(--dock-display, none);
    justify-content: center;
    pointer-events: none;
    padding-bottom: 20px;
}

.mac-dock {
    background: rgba(255, 255, 255, calc(0.1 * var(--dock-opacity, 0.8)));
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 8px 16px;
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: auto;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: var(--dock-opacity, 0.8);
}

.dock-items {
    display: flex;
    gap: 8px;
    align-items: center;
}

.dock-item {
    position: relative;
    width: var(--dock-item-size, 48px);
    height: var(--dock-item-size, 48px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 12px;
}

.dock-item:hover,
.dock-item--hovered {
    transform: scale(1.2) translateY(-8px);
}

.dock-item--active {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dock-item-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-item--active .dock-item-icon {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dock-item:hover .dock-item-icon,
.dock-item--hovered .dock-item-icon {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
}

.icon {
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.9);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-item--active .icon {
    color: white;
}

.dock-item:hover .icon,
.dock-item--hovered .icon {
    color: white;
    transform: scale(1.1);
}

.dock-item-label {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    margin-bottom: 8px;
    opacity: 0;
    animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    pointer-events: none;
}

.dock-item-label::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.8);
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .mac-dock {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dock-item-icon {
        background: rgba(255, 255, 255, 0.05);
    }

    .dock-item--active .dock-item-icon {
        background: rgba(255, 255, 255, 0.15);
    }

    .dock-item:hover .dock-item-icon,
    .dock-item--hovered .dock-item-icon {
        background: rgba(255, 255, 255, 0.1);
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .mac-dock-container {
        padding-bottom: 10px;
    }

    .mac-dock {
        padding: 6px 12px;
        border-radius: 16px;
    }

    .dock-item {
        width: 40px;
        height: 40px;
    }

    .dock-item-icon {
        width: 28px;
        height: 28px;
    }

    .icon {
        width: 16px;
        height: 16px;
    }
}

/* Hide dock on mobile devices */
@media (max-width: 768px) {
    .mac-dock-container {
        display: none !important;
    }
}
</style>
