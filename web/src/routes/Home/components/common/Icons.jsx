import React from "react";

export function IconTasks() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h10V5H7zm2 3h6v2H9V8zm0 4h6v2H9v-2z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2zm15 8H2v10h20V10zM4 8h18V6H4v2z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconLeaf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.95"
        d="
          M12 21
          c-.55 0-1-.45-1-1v-6.2
          c-1.9.3-3.9-.4-5.3-1.9
          C3.9 10.3 3.4 7.6 3.6 5
          c2.6-.2 5.3.3 6.9 1.9
          .9.9 1.5 2 1.8 3.2
          .3-1.2.9-2.3 1.8-3.2
          1.6-1.6 4.3-2.1 6.9-1.9
          .2 2.6-.3 5.3-1.9 6.9
          -1.4 1.4-3.4 2.2-5.3 1.9V20
          c0 .55-.45 1-1 1z
        "
      />
    </svg>
  );
}

/**
 * NEW: better semantic icons
 * - IconRepeat: "intervals/cadence"
 * - IconClipboardCheck: "reminders -> tasks"
 * - IconActivity: "readings/trends"
 */
export function IconRepeat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.95"
        d="M17 2l4 4-4 4v-3H7a3 3 0 0 0-3 3v1H2v-1a5 5 0 0 1 5-5h10V2z"
      />
      <path
        fill="currentColor"
        opacity="0.95"
        d="M7 22l-4-4 4-4v3h10a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v3z"
      />
    </svg>
  );
}

export function IconClipboardCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.95"
        d="M16 4h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1zm-2 0V4h-4v0h4z"
      />
      <path
        fill="currentColor"
        opacity="0.95"
        d="M10.2 14.6 9 13.4l-1.4 1.4 2.6 2.6 6-6-1.4-1.4-4.6 4.6z"
      />
      <path
        fill="currentColor"
        opacity="0.95"
        d="M9 7h6v2H9V7zm0 3h6v2H9v-2z"
      />
    </svg>
  );
}

export function IconActivity() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.95"
        d="M22 12h-4.2l-2.3 5.6a1 1 0 0 1-1.9-.1L9.9 6.9 7.6 12H2v-2h4.3l2.4-5.3a1 1 0 0 1 1.9.1l3.8 10.5 1.8-4.3a1 1 0 0 1 .9-.6H22v2z"
      />
    </svg>
  );
}

export function IconQR() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm8 0v4h-4v-2h2v-2h2zm-6 6h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconSensor() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 1 7 7v5.3l1.7 1.7-1.4 1.4-1.3-1.3A7 7 0 1 1 12 2zm0 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm-1 5h2v6h-2V9zm0 8h2v2h-2v-2z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"
        opacity="0.95"
      />
    </svg>
  );
}

/* Store icons */
export function GooglePlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 3.8c0-.9 1-1.4 1.7-.9l13.4 9c.6.4.6 1.3 0 1.7l-13.4 9c-.7.5-1.7 0-1.7-.9V3.8z"
        opacity="0.95"
      />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 13.1c0-2.3 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.5 0-3 .9-3.8 2.2-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.2 0 2-.1 3.2-1.8.7-1 1-2 1.1-2.1-.1 0-2.6-1-2.6-3.4z"
      />
      <path
        fill="currentColor"
        d="M14.9 5.9c.6-.7 1-1.6.9-2.6-.9.1-1.9.6-2.6 1.3-.6.6-1 1.6-.9 2.5 1 .1 2-.5 2.6-1.2z"
        opacity="0.85"
      />
    </svg>
  );
}

/* Icon for globe */
export function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 21c-5.5 0-10-4.5-10-10S6.5 1 12 1s10 4.5 10 10-4.5 10-10 10zm0-18c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13h-2v-2h2v2zm0-4h-2V7h2v5z"
        opacity="0.95"
      />
    </svg>
  );
}

export function IconTimer() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.95"
        d="M10 2h4v2h-4V2zm2 4a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm-1 2h2v5.2l3.2 2-1 1.7L11 16V10z"
      />
    </svg>
  );
}