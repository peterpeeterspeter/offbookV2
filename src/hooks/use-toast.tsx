"use client";

import * as React from "react";

type ToastOptions = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

const ToastContext = React.createContext<{
  toast: (options: ToastOptions) => void;
  dismiss: () => void;
}>({
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export { ToastContext, type ToastOptions };
