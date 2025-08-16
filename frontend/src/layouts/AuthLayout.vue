<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <!-- Theme Toggle Button - Top Right -->
        <div class="absolute top-4 right-4 flex gap-2">
            <BackgroundPicker />
            <button
                class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-all duration-200 hover:scale-105"
                :title="isDarkTheme ? $t('user.switchToLight') : $t('user.switchToDark')"
                @click="toggleTheme"
            >
                <Sun v-if="isDarkTheme" class="size-5 text-foreground" />
                <Moon v-else class="size-5 text-foreground" />
            </button>
        </div>

        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <router-link
                    to="/"
                    class="flex flex-col items-center gap-2 font-medium transition-all duration-300 hover:scale-105"
                >
                    <img
                        :src="String(settingsStore.appLogo)"
                        alt="MythicalPanel Logo"
                        class="size-10 transition-all duration-300"
                    />
                    <span class="sr-only">{{ settingsStore.appName }}</span>
                </router-link>
                <h1 class="text-xl font-bold transition-all duration-300">
                    {{ $t('auth.welcome', { appName: settingsStore.appName }) }}
                </h1>
            </div>
            <br />
            <transition name="auth-form" mode="in-out" appear>
                <router-view />
            </transition>
            <br />
            <div
                class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 transition-all duration-200"
            >
                {{ $t('auth.runningOn', { version: '1.0.0' }) }} <br />
                <a
                    href="https://mythical.systems"
                    class="text-primary transition-colors duration-200 hover:text-primary/80"
                    >{{ $t('auth.mythicalSystems') }}</a
                >
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { Sun, Moon } from 'lucide-vue-next';
import BackgroundPicker from '@/components/BackgroundPicker.vue';

const settingsStore = useSettingsStore();

// Theme management
const isDarkTheme = ref(true);

// Toggle theme function
const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value;

    // Update body class
    if (isDarkTheme.value) {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
    }

    // Dispatch custom event for other components to listen to
    window.dispatchEvent(
        new CustomEvent('theme-changed', {
            detail: { theme: isDarkTheme.value ? 'dark' : 'light' },
        }),
    );
};

// Initialize theme on mount
onMounted(async () => {
    await settingsStore.fetchSettings();

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme or system preference, default to dark
    isDarkTheme.value = savedTheme ? savedTheme === 'dark' : prefersDark;

    // Apply theme to body
    if (isDarkTheme.value) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            // Only auto-update if no manual preference
            isDarkTheme.value = e.matches;
            if (e.matches) {
                document.body.classList.add('dark');
                document.body.classList.remove('light');
            } else {
                document.body.classList.add('light');
                document.body.classList.remove('dark');
            }
        }
    });
});
</script>

<style scoped>
/* Auth form transitions */
.auth-form-enter-active,
.auth-form-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-form-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}

.auth-form-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(1.05);
}

/* Logo hover effects */
img {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

img:hover {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
}

/* Smooth text transitions */
h1 {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Link hover effects */
a:hover {
    transform: translateY(-1px);
}

/* Theme toggle button styles */
button {
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

button:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

/* Dark mode specific button styles */
:deep(.dark) button {
    border-color: rgba(255, 255, 255, 0.1);
}

:deep(.dark) button:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

/* Light mode specific button styles */
:deep(.light) button {
    border-color: rgba(0, 0, 0, 0.1);
}

:deep(.light) button:hover {
    border-color: rgba(0, 0, 0, 0.2);
}
</style>
