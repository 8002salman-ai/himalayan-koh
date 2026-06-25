'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ToastContainer from '../components/ui/Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${++counter}`;
      setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
      if (toast.duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), toast.duration));
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, add, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');

  return {
    success: (message: string, duration = 4000) =>
      ctx.add({ type: 'success', message, duration }),
    error: (message: string, duration = 6000) =>
      ctx.add({ type: 'error', message, duration }),
    warning: (message: string, duration = 4000) =>
      ctx.add({ type: 'warning', message, duration }),
    info: (message: string, duration = 4000) =>
      ctx.add({ type: 'info', message, duration }),
    dismiss: ctx.dismiss,
  };
}
