/*
MIT License

Copyright (c) 2025 MythicalSystems
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

import { ref, onMounted } from 'vue';
import { useSidebar } from '@/components/ui/sidebar';

export type SidebarVisibility = 'visible' | 'collapsed' | 'hidden';

export function useSidebarState() {
    const { setOpen } = useSidebar();
    const sidebarVisibility = ref<SidebarVisibility>('visible');

    // Load settings from localStorage
    const loadSidebarSettings = () => {
        const savedVisibility = localStorage.getItem('sidebar-visibility') as SidebarVisibility;
        if (savedVisibility && ['visible', 'collapsed', 'hidden'].includes(savedVisibility)) {
            sidebarVisibility.value = savedVisibility;
            applySidebarVisibility(savedVisibility);
        }
    };

    // Apply sidebar visibility settings
    const applySidebarVisibility = (visibility: SidebarVisibility) => {
        switch (visibility) {
            case 'visible':
                setOpen(true);
                document.documentElement.style.setProperty('--sidebar-display', 'block');
                break;
            case 'collapsed':
                setOpen(false);
                document.documentElement.style.setProperty('--sidebar-display', 'block');
                break;
            case 'hidden':
                setOpen(false);
                document.documentElement.style.setProperty('--sidebar-display', 'none');
                break;
        }
    };

    // Update sidebar visibility
    const updateSidebarVisibility = (visibility: SidebarVisibility) => {
        const previousVisibility = sidebarVisibility.value;
        sidebarVisibility.value = visibility;
        applySidebarVisibility(visibility);
        localStorage.setItem('sidebar-visibility', visibility);

        // Reload page when switching to/from hidden state for immediate effect
        if (visibility === 'hidden' || previousVisibility === 'hidden') {
            setTimeout(() => {
                window.location.reload();
            }, 100); // Small delay to ensure state is saved
        }
    };

    // Toggle sidebar visibility
    const toggleSidebar = () => {
        if (sidebarVisibility.value === 'visible') {
            updateSidebarVisibility('collapsed');
        } else if (sidebarVisibility.value === 'collapsed') {
            updateSidebarVisibility('hidden');
        } else {
            updateSidebarVisibility('visible');
        }
    };

    // Initialize on mount
    onMounted(() => {
        loadSidebarSettings();
    });

    return {
        sidebarVisibility,
        updateSidebarVisibility,
        toggleSidebar,
        applySidebarVisibility,
    };
}
