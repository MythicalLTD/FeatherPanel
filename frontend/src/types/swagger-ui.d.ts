declare module 'swagger-ui-dist/swagger-ui-bundle.js' {
    export interface SwaggerUIBundleConfig {
        url?: string;
        dom_id: string;
        presets?: unknown[];
        layout?: string;
        deepLinking?: boolean;
        docExpansion?: 'none' | 'list' | 'full';
        filter?: boolean;
        requestInterceptor?: (req: unknown) => unknown;
        responseInterceptor?: (res: unknown) => unknown;
    }

    export interface SwaggerUIBundleInstance {
        destroy: () => void;
    }

    export const presets: { apis: unknown };
    export default function SwaggerUIBundle(config: SwaggerUIBundleConfig): SwaggerUIBundleInstance;
}

declare module 'swagger-ui-dist/swagger-ui-standalone-preset.js' {
    const SwaggerUIStandalonePreset: unknown;
    export default SwaggerUIStandalonePreset;
}
