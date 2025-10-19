<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <FileWarningIcon class="size-10 text-destructive transition-all duration-300 animate-pulse" />
                <h1 class="text-xl font-bold text-destructive mt-2 transition-all duration-300">
                    <slot name="title">{{ title }}</slot>
                </h1>
                <p class="text-muted-foreground text-center transition-all duration-300">
                    <slot name="message">{{ message }}</slot>
                </p>
            </div>
            <Button class="w-full mt-6 transition-all duration-200 hover:scale-105" @click="goHome">
                {{ $t('Go Home') }}
            </Button>
            <div class="text-muted-foreground text-center text-xs mt-6 transition-all duration-200">
                <slot name="footer"></slot>
            </div>
        </div>
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

import { Button } from '@/components/ui/button';
import { useI18n } from 'vue-i18n';
import { FileWarningIcon } from 'lucide-vue-next';

const props = defineProps({
    errorCode: {
        type: [String, Number],
        default: '',
    },
    title: {
        type: String,
        default: 'Oops! Something went wrong.',
    },
    message: {
        type: String,
        default: 'An unexpected error has occurred. Please try again later.',
    },
});

document.title = `${props.errorCode} - ${props.title}`;

const { t: $t } = useI18n();

function goHome() {
    window.location.href = '/';
}
</script>

<style scoped>
/* Error icon animations */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.05);
    }
}

/* Smooth hover effects */
Button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Text shadow effects */
h1 {
    text-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

/* Smooth transitions for all elements */
* {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
