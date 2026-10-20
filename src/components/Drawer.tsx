import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  headerActions,
  className = '',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside
        className={`drawer ${className}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <button type="button" className="drawer-back" onClick={onClose} aria-label="Retour">
            <ArrowLeft size={18} />
            <span>Retour</span>
          </button>
          <button type="button" className="icon-btn drawer-close" onClick={onClose} aria-label="Fermer">
            <X size={19} />
          </button>
          <div className="drawer-heading">
            {eyebrow ? <div className="drawer-eyebrow">{eyebrow}</div> : null}
            {title ? <div className="drawer-title">{title}</div> : null}
            {subtitle ? <div className="drawer-subtitle">{subtitle}</div> : null}
          </div>
          {headerActions ? <div className="drawer-header-actions">{headerActions}</div> : null}
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-footer">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}
