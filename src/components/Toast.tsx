import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastSystem({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    const duration = toast.duration || (toast.type === 'achievement' ? 5000 : 3500);
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, toast.type, onDismiss]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return {
        border: 'border-green-500/50',
        bg: 'bg-gradient-to-r from-green-950/90 to-[#0d1117]/95',
        icon: <CheckCircle size={16} className="text-green-400" />,
        glow: 'shadow-green-900/20',
      };
      case 'error': return {
        border: 'border-red-500/50',
        bg: 'bg-gradient-to-r from-red-950/90 to-[#0d1117]/95',
        icon: <AlertTriangle size={16} className="text-red-400" />,
        glow: 'shadow-red-900/20',
      };
      case 'info': return {
        border: 'border-blue-500/50',
        bg: 'bg-gradient-to-r from-blue-950/90 to-[#0d1117]/95',
        icon: <Info size={16} className="text-blue-400" />,
        glow: 'shadow-blue-900/20',
      };
      case 'achievement': return {
        border: 'border-yellow-500/60',
        bg: 'bg-gradient-to-r from-yellow-950/80 via-amber-950/60 to-[#0d1117]/95',
        icon: <Zap size={16} className="text-yellow-400" />,
        glow: 'shadow-yellow-900/30',
      };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
        shadow-2xl transition-all duration-300 cursor-pointer
        ${styles.border} ${styles.bg} ${styles.glow}
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }}
    >
      <div className="shrink-0 mt-0.5">
        {toast.icon ? (
          <span className="text-lg">{toast.icon}</span>
        ) : (
          styles.icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white leading-tight">{toast.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
