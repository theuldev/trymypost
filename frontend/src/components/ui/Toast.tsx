import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export type ToastProps = ToastItem;

export interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
            "bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 text-xs text-surface-800 dark:text-surface-200"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === "success" && (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            {toast.type === "error" && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            {toast.type === "warning" && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            )}
            {toast.type === "info" && (
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
            )}

            <p className="leading-snug truncate font-medium text-[11px] sm:text-xs">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="shrink-0 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors p-0.5 rounded"
            aria-label="Fechar notificação"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export const Toast = ToastContainer;
