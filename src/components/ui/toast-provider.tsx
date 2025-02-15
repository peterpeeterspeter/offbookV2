"use client";

import * as React from "react";
import {
  ToastProvider as RadixToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  type ToastOptions,
} from "./toast";
import { ToastContext } from "@/hooks/use-toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastOptions & { id: string })[]>(
    []
  );

  const toast = React.useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((prev) => (toastId ? prev.filter((t) => t.id !== toastId) : []));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <RadixToastProvider>
        {children}
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => dismiss(id)} />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

export { type ToastOptions };
