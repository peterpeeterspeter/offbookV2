import React, { createContext, useContext, useState, useCallback } from "react";

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

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue = {
    toasts,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      <div className="fixed bottom-0 right-0 p-4 space-y-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
          >
            <h4 className="font-semibold">{toast.title}</h4>
            {toast.description && <p>{toast.description}</p>}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-sm text-gray-500"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
