import { useToastStore } from '../store/toastStore';

const typeStyles = {
  error: 'bg-red-50 border-red-300 text-red-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  info: 'bg-sky-50 border-sky-300 text-sky-800',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`clay-card px-4 py-3 border-3 flex items-start gap-2 animate-fade-slide-in ${typeStyles[toast.type]}`}
        >
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-50 hover:opacity-100 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
