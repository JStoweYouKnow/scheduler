import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`border border-line bg-panel ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
        {label}
      </div>
      <div className="mt-2 font-sans text-2xl font-semibold tracking-tight text-bone">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-dim">{sub}</div> : null}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  italicWord,
}: {
  title: string;
  subtitle?: string;
  italicWord?: string;
}) {
  let heading: ReactNode = title;
  if (italicWord && title.includes(italicWord)) {
    const [before, after] = title.split(italicWord);
    heading = (
      <>
        {before}
        <em className="font-serif italic font-normal text-bone">{italicWord}</em>
        {after}
      </>
    );
  }

  return (
    <div className="mb-8 animate-fade-up">
      <h1 className="font-sans text-2xl font-extrabold tracking-tight text-bone md:text-[1.75rem]">
        {heading}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">{subtitle}</p>
      ) : null}
    </div>
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

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
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
    <td className={`px-3 py-2.5 text-sm text-bone/80 ${className}`}>{children}</td>
  );
}
