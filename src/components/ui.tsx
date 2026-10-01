import type { ReactNode } from "react";

/**
 * Surfaces carry hierarchy. `flat` is a passive container, `raised` holds
 * primary work, `attention` marks the one thing waiting on a person and
 * earns an accent edge.
 */
type Surface = "flat" | "raised" | "attention";

const SURFACE_CLASS: Record<Surface, string> = {
  flat: "border border-line bg-panel",
  raised: "border border-line-strong bg-raise",
  attention: "border border-line border-l-2 border-l-accent bg-raise",
};

export function Card({
  children,
  className = "",
  surface = "flat",
  id,
}: {
  children: ReactNode;
  className?: string;
  surface?: Surface;
  id?: string;
}) {
  return (
    <div id={id} className={`${SURFACE_CLASS[surface]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * A single number in the console readout. Serif numerals against a tracked
 * sans label; `emphasis` promotes the one figure that implies an action.
 */
export function Figure({
  label,
  value,
  sub,
  href,
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
        {label}
      </div>
      <div
        className={`figure mt-3 text-[2.75rem] ${
          emphasis ? "text-accent" : "text-bone"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-2 text-xs leading-5 text-dim">{sub}</div>
      ) : null}
    </>
  );

  const shell =
    "block border-t border-line px-1 pb-1 pt-4 transition-colors duration-200";

  if (href) {
    return (
      <a href={href} className={`${shell} group hover:border-line-strong`}>
        {body}
      </a>
    );
  }
  return <div className={shell}>{body}</div>;
}

/**
 * Section heading. Deliberately a readable sans heading rather than another
 * tracked all-caps eyebrow — the small-caps treatment is reserved for data
 * labels, where it actually signals "field name".
 */
export function SectionHeading({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="font-sans text-base font-semibold tracking-tight text-bone">
          {title}
        </h2>
        {note ? (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-dim">
            {note}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  footnote,
}: {
  title: string;
  subtitle?: string;
  footnote?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h1 className="font-sans text-2xl font-extrabold tracking-tight text-bone md:text-[1.75rem]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-dim">
          {subtitle}
        </p>
      ) : null}
      {footnote ? (
        <p className="mt-3 max-w-[62ch] text-xs leading-5 text-faint">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

/** An empty screen is an invitation to act, so it names the next move. */
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium text-bone/70">{title}</p>
      {hint ? (
        <p className="mx-auto mt-1.5 max-w-[46ch] text-xs leading-5 text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const BUTTON_CLASS = {
  primary:
    "bg-bone text-ink hover:bg-accent hover:text-ink disabled:hover:bg-bone",
  ghost:
    "border border-line text-dim hover:border-line-strong hover:text-bone disabled:hover:border-line",
} as const;

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON_CLASS;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center px-3.5 py-2 text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_CLASS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const TONE_CLASS = {
  ok: "border-accent/35 bg-accent/15 text-accent",
  warn: "border-warn/35 bg-warn/15 text-warn",
  danger: "border-danger/35 bg-danger/15 text-danger",
  dim: "border-line bg-ghost/40 text-dim",
} as const;

const REQUEST_STATUS_TONE: Record<string, keyof typeof TONE_CLASS> = {
  proposing: "warn",
  awaiting_reply: "ok",
  confirmed: "ok",
  rescheduling: "warn",
  cancelled: "danger",
};

export function StatusBadge({
  ok,
  label,
  tone,
}: {
  ok?: boolean;
  label: string;
  tone?: keyof typeof TONE_CLASS;
}) {
  const resolved = tone ?? (ok === false ? "warn" : "ok");
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${TONE_CLASS[resolved]}`}
    >
      {label}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      label={status.replaceAll("_", " ")}
      tone={REQUEST_STATUS_TONE[status] ?? "dim"}
    />
  );
}

/** Small-caps data label, for field names and column heads. */
export function Label({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-[0.14em] text-faint ${className}`}
    >
      {children}
    </span>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-faint"
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-3 text-sm text-bone/80 ${className}`}>{children}</td>
  );
}

const FIELD_CLASS =
  "w-full border border-line bg-ink px-3 py-2.5 text-sm text-bone transition-colors duration-200 placeholder:text-faint hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export { FIELD_CLASS };
