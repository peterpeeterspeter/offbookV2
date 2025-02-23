interface Toast {
    id: string;
    title: string;
    description?: string;
}
interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
}
export declare function useToast(): ToastContextValue;
export declare function Toaster(): import("react/jsx-runtime").JSX.Element;
export {};
