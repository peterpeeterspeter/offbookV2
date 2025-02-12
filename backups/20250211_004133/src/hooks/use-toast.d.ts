interface ToastOptions {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
    duration?: number;
}
interface Toast extends ToastOptions {
    id: string;
}
export declare function useToast(): {
    toast: ({ title, description, variant, duration }: ToastOptions) => void;
    toasts: Toast[];
};
export {};
