import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ja',
  cancelText = 'Annuller',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="clay-card p-6 max-w-sm w-full animate-clay-pop">
        <h3 className="font-heading text-xl font-semibold text-warm-dark mb-3">{title}</h3>
        <p className="text-warm-mid mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="clay-btn clay-btn-secondary flex-1 py-2"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="clay-btn clay-btn-primary flex-1 py-2"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
