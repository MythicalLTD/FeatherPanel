/// <reference types="vite/client" />

declare module '*.yml' {
    const value: any;
    export default value;
}

declare module 'vite-plugin-eslint';