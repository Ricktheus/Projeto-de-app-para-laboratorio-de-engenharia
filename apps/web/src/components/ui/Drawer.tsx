import { X } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Width class (plan §6.5: 480–640px). */
  widthClassName?: string;
}

/**
 * Right-side detail panel (plan §6.5). Keeps the list visible behind it instead
 * of opening details below the list. Closes on Esc and on backdrop click.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClassName = 'max-w-[640px]',
}: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-grafite/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={`relative flex h-full w-full ${widthClassName} animate-slide-in flex-col bg-concreto-25 shadow-drawer`}
      >
        <header className="flex items-start gap-3 border-b border-concreto-100 bg-white px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold text-grafite">{title}</h2>
            {subtitle ? <p className="truncate text-[13px] text-concreto-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-concreto-500 hover:bg-concreto-50 hover:text-grafite"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}
