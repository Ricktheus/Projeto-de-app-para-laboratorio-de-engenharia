import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
const nextId = (): string => `t-${Date.now()}-${counter++}`;

/**
 * Global toast queue. Kept in a store (not React context) so non-component code
 * — e.g. the route guard in ProtectedRoute — can raise a toast imperatively via
 * `useToastStore.getState().show(...)`.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, variant = 'info') =>
    set((state) => ({ toasts: [...state.toasts, { id: nextId(), message, variant }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
