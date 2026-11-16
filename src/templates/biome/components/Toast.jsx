import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { cn } from '../utils/helpers';

const Toast = () => {
  const { toasts } = useUI();

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/30 text-green-500',
    error: 'bg-error/10 border-error/30 text-error',
    info: 'bg-accent/10 border-accent/30 text-accent',
    warning: 'bg-warning/10 border-warning/30 text-warning',
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-error',
    info: 'text-accent',
    warning: 'text-warning',
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-atomic="true">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border',
              'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)]',
              'min-w-[280px] max-w-md',
              colors[toast.type]
            )}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            role="alert"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
            >
              {(() => {
                const Icon = icons[toast.type];
                return <Icon className={cn('w-5 h-5 flex-shrink-0', iconColors[toast.type])} />;
              })()}
            </motion.div>
            <p className="text-sm font-body text-text flex-1">{toast.message}</p>
            <button
              className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              onClick={() => {}}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
};

export default Toast;