<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Marketplace', isCurrent: true, href: '/admin/feathercloud/marketplace' }]">
        <div class="min-h-screen bg-background">
            <div class="p-4 sm:p-6">
                <!-- Header with animation -->
                <div class="mb-12 animate-fade-in">
                    <h1
                        class="text-4xl sm:text-5xl font-bold mb-3 bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                    >
                        FeatherCloud Marketplace
                    </h1>
                    <p class="text-base sm:text-lg text-muted-foreground max-w-2xl">
                        Browse and install extensions, spells, and AI agents to enhance your FeatherPanel experience
                    </p>
                </div>

                <!-- Marketplace Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <!-- Plugins -->
                    <div
                        class="marketplace-card marketplace-card-blue animate-slide-up"
                        style="animation-delay: 0.1s"
                        @click="router.push('/admin/feathercloud/plugins')"
                    >
                        <Card
                            class="h-full border-2 border-blue-500/20 dark:border-blue-400/20 bg-linear-to-br from-blue-500/5 via-blue-500/3 to-transparent hover:border-blue-500/40 dark:hover:border-blue-400/40 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                        >
                            <!-- Glowing background effect -->
                            <div
                                class="absolute inset-0 bg-linear-to-br from-blue-500/0 via-blue-500/0 to-blue-600/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-blue-600/10 transition-all duration-500 pointer-events-none"
                            ></div>

                            <!-- Animated border glow -->
                            <div
                                class="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            >
                                <div
                                    class="absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/20 via-blue-400/20 to-blue-500/20 blur-xl"
                                ></div>
                            </div>

                            <CardContent class="p-6 relative z-10">
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-start gap-4">
                                        <div class="relative">
                                            <!-- Icon container with glow -->
                                            <div
                                                class="h-20 w-20 rounded-2xl bg-linear-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center shrink-0 border-2 border-blue-500/30 dark:border-blue-400/30 group-hover:border-blue-500/50 dark:group-hover:border-blue-400/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40"
                                            >
                                                <Puzzle
                                                    class="h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <!-- Pulsing glow effect -->
                                            <div
                                                class="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 animate-pulse-slow"
                                            ></div>
                                        </div>
                                        <div class="flex-1 min-w-0 pt-1">
                                            <h3
                                                class="text-2xl font-bold text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                                            >
                                                Plugins
                                            </h3>
                                            <p class="text-sm text-muted-foreground leading-relaxed">
                                                Addons that extend FeatherPanel with new features and functionality
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between pt-2">
                                        <Badge
                                            variant="secondary"
                                            class="text-xs px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                        >
                                            Available
                                        </Badge>
                                        <div
                                            class="flex items-center gap-2 text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all duration-300"
                                        >
                                            <span
                                                class="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                >Explore</span
                                            >
                                            <ArrowRight
                                                class="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Spells -->
                    <div
                        class="marketplace-card marketplace-card-purple animate-slide-up"
                        style="animation-delay: 0.2s"
                        @click="router.push('/admin/feathercloud/spells')"
                    >
                        <Card
                            class="h-full border-2 border-purple-500/20 dark:border-purple-400/20 bg-linear-to-br from-purple-500/5 via-purple-500/3 to-transparent hover:border-purple-500/40 dark:hover:border-purple-400/40 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                        >
                            <!-- Glowing background effect -->
                            <div
                                class="absolute inset-0 bg-linear-to-br from-purple-500/0 via-purple-500/0 to-purple-600/0 group-hover:from-purple-500/10 group-hover:via-purple-500/5 group-hover:to-purple-600/10 transition-all duration-500 pointer-events-none"
                            ></div>

                            <!-- Animated border glow -->
                            <div
                                class="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            >
                                <div
                                    class="absolute inset-0 rounded-lg bg-linear-to-r from-purple-500/20 via-purple-400/20 to-purple-500/20 blur-xl"
                                ></div>
                            </div>

                            <CardContent class="p-6 relative z-10">
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-start gap-4">
                                        <div class="relative">
                                            <!-- Icon container with glow -->
                                            <div
                                                class="h-20 w-20 rounded-2xl bg-linear-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center shrink-0 border-2 border-purple-500/30 dark:border-purple-400/30 group-hover:border-purple-500/50 dark:group-hover:border-purple-400/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40"
                                            >
                                                <Sparkles
                                                    class="h-10 w-10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <!-- Pulsing glow effect -->
                                            <div
                                                class="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 animate-pulse-slow"
                                            ></div>
                                        </div>
                                        <div class="flex-1 min-w-0 pt-1">
                                            <h3
                                                class="text-2xl font-bold text-foreground mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300"
                                            >
                                                Spells
                                            </h3>
                                            <p class="text-sm text-muted-foreground leading-relaxed">
                                                Server templates to run specific games and applications on Pterodactyl
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between pt-2">
                                        <Badge
                                            variant="secondary"
                                            class="text-xs px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                        >
                                            Available
                                        </Badge>
                                        <div
                                            class="flex items-center gap-2 text-purple-600 dark:text-purple-400 group-hover:gap-3 transition-all duration-300"
                                        >
                                            <span
                                                class="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                >Explore</span
                                            >
                                            <ArrowRight
                                                class="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- FeatherAI Agents -->
                    <div class="marketplace-card marketplace-card-gray animate-slide-up" style="animation-delay: 0.3s">
                        <Card
                            class="h-full border-2 border-gray-500/20 dark:border-gray-400/20 bg-linear-to-br from-gray-500/5 via-gray-500/3 to-transparent transition-all duration-500 relative overflow-hidden opacity-75"
                        >
                            <!-- Subtle glow for disabled state -->
                            <div
                                class="absolute inset-0 bg-linear-to-br from-gray-500/0 via-gray-500/0 to-gray-600/0 pointer-events-none"
                            ></div>

                            <CardContent class="p-6 relative z-10">
                                <div class="flex flex-col gap-4">
                                    <div class="flex items-start gap-4">
                                        <div class="relative">
                                            <!-- Icon container -->
                                            <div
                                                class="h-20 w-20 rounded-2xl bg-linear-to-br from-gray-500/20 to-gray-600/10 flex items-center justify-center shrink-0 border-2 border-gray-500/30 dark:border-gray-400/30 shadow-lg shadow-gray-500/10"
                                            >
                                                <Bot class="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                            </div>
                                        </div>
                                        <div class="flex-1 min-w-0 pt-1">
                                            <h3 class="text-2xl font-bold text-foreground mb-2 opacity-75">
                                                FeatherAI Agents
                                            </h3>
                                            <p class="text-sm text-muted-foreground leading-relaxed opacity-75">
                                                AI-powered agents to automate tasks and enhance your panel experience
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between pt-2">
                                        <Badge
                                            variant="outline"
                                            class="text-xs px-3 py-1 bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20"
                                        >
                                            Coming Soon
                                        </Badge>
                                        <div class="flex items-center gap-2 text-gray-400">
                                            <span class="text-sm font-medium">Locked</span>
                                            <Lock class="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <!-- Info Section with animation -->
                <div class="mt-12 animate-fade-in-delay">
                    <Card
                        class="border-2 border-border/50 bg-linear-to-br from-card/50 to-card/30 backdrop-blur-sm hover:border-border transition-all duration-300"
                    >
                        <CardContent class="p-6">
                            <div class="flex items-start gap-4">
                                <div
                                    class="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20"
                                >
                                    <Info class="h-6 w-6 text-primary" />
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-lg text-foreground mb-2">About the Marketplace</h4>
                                    <p class="text-sm text-muted-foreground leading-relaxed">
                                        The FeatherCloud Marketplace provides access to community-created and official
                                        extensions for FeatherPanel. Browse verified plugins, install spells for your
                                        servers, and discover new ways to customize your panel experience.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>
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

import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Sparkles, Bot, ArrowRight, Info, Lock } from 'lucide-vue-next';

const router = useRouter();
</script>

<style scoped>
/* Fade in animation */
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Slide up animation */
@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Slow pulse animation */
@keyframes pulse-slow {
    0%,
    100% {
        opacity: 0.5;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.05);
    }
}

.animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
}

.animate-fade-in-delay {
    animation: fade-in 0.8s ease-out 0.4s forwards;
    opacity: 0;
}

.animate-slide-up {
    animation: slide-up 0.6s ease-out forwards;
    opacity: 0;
}

.animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
}

/* Card hover effects */
.marketplace-card {
    position: relative;
}

.marketplace-card-blue:hover {
    transform: translateY(-4px);
    transition: transform 0.3s ease-out;
}

.marketplace-card-purple:hover {
    transform: translateY(-4px);
    transition: transform 0.3s ease-out;
}

.marketplace-card-gray {
    cursor: not-allowed;
}

/* Smooth transitions for all interactive elements */
.marketplace-card * {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
