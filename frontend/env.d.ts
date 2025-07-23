/// <reference types="vite/client" />

declare module '*.vue' {
    import { DefineComponent } from 'vue';
// oxlint-disable-next-line no-empty-object-type
    const component: DefineComponent<{}, {}, unknown>;
    export default component;
}

declare module '@vueuse/sound' {
    export function useSound(url: string): { play: () => void };
}

declare module '*.yml' {
    const content: unknown;
    export default content;
}  

declare module 'vite-plugin-eslint';