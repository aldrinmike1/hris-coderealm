import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  toast?: { text?: string; message?: string; type?: 'success' | 'info' | 'error' | 'warning' } | null;
  message?: string;
  type?: 'success' | 'info' | 'error' | 'warning';
  isOpen?: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, message, type = 'info', isOpen, onClose }) => {
  const isVisible = isOpen !== undefined ? isOpen : !!toast;
  const displayText = message || toast?.message || toast?.text || '';
  const toastType = type || toast?.type || 'info';

  return (
    <AnimatePresence mode="wait">
      {isVisible && displayText ? (
        <motion.div
          key={`system-toast-${toastType}-${displayText}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded border backdrop-blur-md bg-slate-900/95 text-white max-w-md border-slate-800 shadow-2xl"
          id="system-toast-alert"
        >
          {toastType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastType === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toastType === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toastType === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}

          <p className="text-xs font-medium text-slate-100 flex-1 leading-snug">{displayText}</p>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            id="toast-close-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
