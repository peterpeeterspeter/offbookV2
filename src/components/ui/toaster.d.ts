import React from "react";
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
export declare function Toaster(): React.JSX.Element;
export {};
