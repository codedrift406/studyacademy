import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import styles from './Toast.module.css';
import type { ToastMessage } from './ToastProvider';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const variantConfig = {
  success: {
    label: 'Success',
    icon: CheckCircle2,
    tone: 'var(--success)',
    background: 'rgba(16, 185, 129, 0.12)',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    tone: 'var(--danger)',
    background: 'rgba(239, 68, 68, 0.12)',
  },
  info: {
    label: 'Info',
    icon: Info,
    tone: 'var(--primary)',
    background: 'rgba(59, 130, 246, 0.12)',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    tone: 'var(--warning)',
    background: 'rgba(245, 158, 11, 0.12)',
  },
} as const;

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className={styles.toastRoot} aria-live="polite">
      {toasts.map((toast) => {
        const config = variantConfig[toast.variant];
        const Icon = config.icon;

        return (
          <div key={toast.id} className={`${styles.toastCard} ${styles[toast.variant]}`} style={{ background: config.background }}>
            <div className={styles.iconFrame} style={{ color: config.tone }}>
              <Icon size={18} />
            </div>
            <div className={styles.textBlock}>
              <div className={styles.toastTitle} style={{ color: 'var(--text-primary)' }}>
                {toast.title || config.label}
              </div>
              <div className={styles.toastDescription}>{toast.description}</div>
            </div>
            <button className={styles.closeButton} type="button" onClick={() => onRemove(toast.id)} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
