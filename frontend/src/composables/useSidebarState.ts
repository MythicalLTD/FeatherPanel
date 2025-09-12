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
