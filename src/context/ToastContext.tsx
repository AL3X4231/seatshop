import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'sale';

export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; to?: string; onClick?: () => void };
};

type ToastItem = ToastInput & { id: string; tone: ToastTone };

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  sale: Sparkles,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  const navigate = useNavigate();

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        ...input,
        id,
        tone: input.tone || 'info',
        duration: input.duration ?? (input.tone === 'sale' ? 9000 : 5500),
      };
      setItems((current) => [...current.slice(-3), item]);
      const timer = window.setTimeout(() => dismiss(id), item.duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div key={item.id} className={`toast toast-${item.tone}`} role="status">
              <div className="toast-icon">
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div className="toast-content">
                <div className="toast-title">{item.title}</div>
                {item.message ? <div className="toast-message">{item.message}</div> : null}
                {item.action ? (
                  <button
                    type="button"
                    className="toast-action"
                    onClick={() => {
                      dismiss(item.id);
                      if (item.action?.to) navigate(item.action.to);
                      item.action?.onClick?.();
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="toast-close"
                aria-label="Fermer"
                onClick={() => dismiss(item.id)}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
