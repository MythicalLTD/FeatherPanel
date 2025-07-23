/// <reference types="vite/client" />

declare module '*.vue' {
    import { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

declare module '@vueuse/sound' {
    export function useSound(url: string): { play: () => void };
}

declare module '*.yml' {
    const value: any;
    export default value;
}

declare module 'vite-plugin-eslint';
