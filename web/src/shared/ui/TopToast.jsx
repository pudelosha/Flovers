import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Props:
 * - visible: boolean
 * - message: string
 * - onDismiss: () => void
 * - duration?: number (ms)
 * - variant?: "default" | "success" | "error"
 */
export default function TopToast({
  visible,
  message,
  onDismiss,
  duration = 3000,
  variant = "default",
}) {
  useEffect(() => {
    if (!visible) return;
    if (!duration || duration <= 0) return;

    const id = window.setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => window.clearTimeout(id);
  }, [visible, duration, onDismiss]);

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return createPortal(
    <div className="toast-top-wrap" aria-live="polite" role="status">
      <div className={"toast-top toast-" + variant}>
        <span className="toast-msg">{message}</span>
        <button
          type="button"
          className="toast-x"
          onClick={onDismiss}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}
