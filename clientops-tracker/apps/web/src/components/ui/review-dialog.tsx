'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface ReviewDialogProps {
  title: string;
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
}
export function ReviewDialog({ title, children, busy, onClose }: ReviewDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="review-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const elements = Array.from(
          ref.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
          ),
        ).filter((element) => element.getClientRects().length);
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border p-6">
        <div>
          <p className="meridian-meta mb-2 text-brand-700">Scope decision</p>
          <h2 id={titleId} className="meridian-heading text-3xl">
            {title}
          </h2>
        </div>
        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close review"
        >
          <X size={20} />
        </Button>
      </header>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
