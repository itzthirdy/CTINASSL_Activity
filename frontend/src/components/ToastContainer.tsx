import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export interface ToastNotice {
  id: string;
  title: string;
  type: "success" | "info" | "error";
}

interface ToastContainerProps {
  toasts: ToastNotice[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === "success"
            ? CheckCircle2
            : toast.type === "error"
              ? XCircle
              : Info;
        const iconColor =
          toast.type === "success"
            ? "text-emerald-400"
            : toast.type === "error"
              ? "text-red-400"
              : "text-amber-300";

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#101118]/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md"
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <p className="flex-1 font-medium">{toast.title}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="cursor-pointer rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

