import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastItem } from '../../context/ToastContext';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const BORDER_COLORS = {
  success: 'border-l-himalayan-green',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-himalayan',
};

const ICON_COLORS = {
  success: 'text-himalayan-green',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-himalayan',
};

interface ToastItemProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastMessage({ toast, onDismiss }: ToastItemProps) {
  const Icon = ICONS[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`flex items-start gap-3 bg-white rounded-xl shadow-xl border border-gray-100 border-l-4 px-4 py-3.5 min-w-[280px] max-w-sm ${BORDER_COLORS[toast.type]}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
      <p className="flex-1 text-sm text-charcoal leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="flex-shrink-0 text-gray-400 hover:text-charcoal transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastMessage toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
