import { useEffect, useRef, useState } from 'react';
import { Check, Ellipsis, type LucideIcon } from 'lucide-react';

export type ActionMenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  label?: string;
  align?: 'left' | 'right';
  className?: string;
};

/**
 * Menu d'actions secondaires — remplace les rangées de boutons par un seul
 * bouton « … » à la iOS, tout en gardant chaque fonction accessible.
 */
export function ActionMenu({
  items,
  label = 'Plus d’actions',
  align = 'right',
  className = '',
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div className={`action-menu ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`icon-btn action-menu-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((visible) => !visible)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Ellipsis size={20} strokeWidth={2.2} />
      </button>

      {open ? (
        <div className={`action-menu-popover is-${align}`} role="menu" aria-label={label}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`action-menu-item ${item.destructive ? 'is-destructive' : ''} ${
                  item.checked ? 'is-checked' : ''
                }`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {Icon ? (
                  <span className="action-menu-icon">
                    <Icon size={17} strokeWidth={1.9} />
                  </span>
                ) : null}
                <span className="action-menu-label">{item.label}</span>
                {item.checked ? <Check size={16} strokeWidth={2.4} className="action-menu-check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
