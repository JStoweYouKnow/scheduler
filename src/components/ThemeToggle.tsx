"use client";

import { useTheme, type Theme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.8 5.8 0 1 0 7 7Z" />
    </svg>
  );
}

const MODES: { mode: Theme; label: string; icon: () => React.ReactElement }[] = [
  { mode: "light", label: "Light", icon: SunIcon },
  { mode: "dark", label: "Dark", icon: MoonIcon },
];

/**
 * Both options stay visible with the current one marked, rather than a single
 * label that could read as either the current state or the action.
 *
 * `aria-pressed` comes from React state, so it is briefly wrong on the server
 * pass; the visible active segment is chosen in CSS (see .theme-seg) and is
 * correct from first paint.
 */
export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={`inline-flex border border-line ${className}`}
    >
      {MODES.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          data-mode={mode}
          aria-pressed={theme === mode}
          aria-label={compact ? `${label} theme` : undefined}
          title={`${label} theme`}
          onClick={() => setTheme(mode)}
          className={`theme-seg inline-flex flex-1 items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
            compact ? "px-2 py-1.5" : "px-2.5 py-1.5"
          }`}
        >
          <Icon />
          {compact ? null : label}
        </button>
      ))}
    </div>
  );
}
