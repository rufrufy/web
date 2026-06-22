"use client";

import { useEffect, ReactNode } from "react";

interface ModalShellProps {
  title: string;
  onClose: () => void;
  closeable?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  badge?: string;
  maxW?: string;
}

export function ModalShell({
  title,
  onClose,
  closeable = true,
  children,
  footer,
  badge,
  maxW = "sm:max-w-md",
}: ModalShellProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevPos = document.body.style.position;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.position = prevPos;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeable) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeable, onClose]);

  return (
    <div
      className="modal-backdrop animate-fade-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (closeable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-slide-up card flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl ${maxW}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="safe-top flex shrink-0 items-center justify-between bg-primary px-4 py-3 text-white">
          <button
            onClick={closeable ? onClose : undefined}
            disabled={!closeable}
            className="text-sm font-semibold hover:bg-white/10 active:scale-95 disabled:opacity-50"
          >
            {closeable ? "Tutup" : title}
          </button>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                {badge}
              </span>
            )}
            <span className="font-semibold">{closeable ? title : ""}</span>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && <div className="shrink-0 border-t border-gray-100 p-3">{footer}</div>}
      </div>
    </div>
  );
}
