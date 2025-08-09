export { default as Toast } from './Toast.vue';
export type { ToastProps, ToastActionElement } from './Toast.vue';

export const toastVariants = {
    variant: {
        default: 'border bg-background text-foreground',
        destructive: 'destructive group border-destructive bg-destructive text-destructive-foreground',
        success:
            'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
        warning:
            'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
        info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    },
} as const;

export type ToastVariants = {
    variant: keyof typeof toastVariants.variant;
};
