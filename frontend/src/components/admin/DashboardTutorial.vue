<template>
    <div
        v-if="showTutorial"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
        @click.self="closeTutorial"
    >
        <Card class="max-w-2xl w-full p-8 animate-in zoom-in-95 duration-300">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div
                        class="h-14 w-14 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center"
                    >
                        <Sparkles :size="28" class="text-white" />
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold">Welcome to Your Dashboard! 🎉</h2>
                        <p class="text-muted-foreground text-sm">Let's show you around</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="closeTutorial">
                    <X :size="16" />
                </Button>
            </div>

            <div class="space-y-6">
                <!-- Feature 1 -->
                <div class="flex gap-4">
                    <div
                        class="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"
                    >
                        1
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold mb-1 flex items-center gap-2">
                            <Settings :size="18" />
                            Customize Your Dashboard
                        </h3>
                        <p class="text-sm text-muted-foreground">
                            Click the <strong>"Customize Dashboard"</strong> button to manage your widgets and
                            personalize your dashboard layout.
                        </p>
                    </div>
                </div>

                <!-- Feature 2 -->
                <div class="flex gap-4">
                    <div
                        class="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"
                    >
                        2
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold mb-1 flex items-center gap-2">
                            <Eye :size="18" />
                            Show/Hide Widgets
                        </h3>
                        <p class="text-sm text-muted-foreground">
                            Use the customization sidebar to toggle widget visibility. Click the eye icon to show or
                            hide any widget.
                        </p>
                    </div>
                </div>

                <!-- Feature 3 -->
                <div class="flex gap-4">
                    <div
                        class="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"
                    >
                        3
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold mb-1 flex items-center gap-2">
                            <GripVertical :size="18" />
                            Reorder Widgets
                        </h3>
                        <p class="text-sm text-muted-foreground">
                            Drag widgets by their header bar to reorder them. Your layout preferences are automatically
                            saved!
                        </p>
                    </div>
                </div>

                <!-- Feature 4 -->
                <div class="flex gap-4">
                    <div
                        class="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold"
                    >
                        4
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold mb-1 flex items-center gap-2">
                            <Zap :size="18" />
                            Quick Actions Everywhere
                        </h3>
                        <p class="text-sm text-muted-foreground">
                            Use the Quick Links widget and action buttons throughout the dashboard to navigate faster.
                        </p>
                    </div>
                </div>
            </div>

            <div class="mt-8 flex items-center justify-between gap-4 pt-6 border-t">
                <div class="flex items-center gap-2">
                    <input
                        id="dont-show-again"
                        v-model="dontShowAgain"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300"
                    />
                    <label for="dont-show-again" class="text-sm text-muted-foreground cursor-pointer">
                        Don't show this again
                    </label>
                </div>
                <Button class="px-6" @click="closeTutorial"> Got it, thanks! 🚀 </Button>
            </div>
        </Card>
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

import { ref, onMounted } from 'vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Settings, GripVertical, Eye, Zap, X } from 'lucide-vue-next';

const showTutorial = ref(false);
const dontShowAgain = ref(false);

onMounted(() => {
    const hasSeenTutorial = localStorage.getItem('dashboard-tutorial-seen');
    if (!hasSeenTutorial) {
        // Show tutorial after a short delay for better UX
        setTimeout(() => {
            showTutorial.value = true;
        }, 1000);
    }
});

const closeTutorial = () => {
    showTutorial.value = false;
    if (dontShowAgain.value) {
        localStorage.setItem('dashboard-tutorial-seen', 'true');
    }
};
</script>
