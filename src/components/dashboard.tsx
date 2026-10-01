"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SetupCheck } from "@/lib/setup";
import type { TeamConfig } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  FIELD_CLASS,
  Figure,
  Label,
  PageHeader,
  RequestStatusBadge,
  SectionHeading,
  StatusBadge,
  Td,
  Th,
} from "./ui";

const KEY = "scheduler_admin_key";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readKey() {
  return window.localStorage.getItem(KEY) ?? "";
}

function writeKey(value: string) {
  window.localStorage.setItem(KEY, value);
  for (const listener of listeners) listener();
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

interface RequestRow {
  id: string;
  status: string;
  title: string;
  isExternal: boolean;
  attendeeSlugs: string[];
  counterpartyName: string | null;
  createdAt: string;
}

interface ApprovalRow {
  id: string;
  kind: string;
  summary: string;
  schedulingRequestId: string | null;
  createdAt: string;
}

export function Dashboard({
  team,
  checks,
  clerkEnabled = false,
  demoMode = false,
}: {
  team: TeamConfig;
  checks: SetupCheck[];
  clerkEnabled?: boolean;
  demoMode?: boolean;
}) {
  if (clerkEnabled) {
    return <ClerkDashboard team={team} checks={checks} demoMode={demoMode} />;
  }
  return (
    <DashboardInner
      team={team}
      checks={checks}
      clerkEnabled={false}
      clerkSignedIn={false}
      demoMode={demoMode}
    />
  );
}

function ClerkDashboard({
  team,
  checks,
  demoMode,
}: {
  team: TeamConfig;
  checks: SetupCheck[];
  demoMode: boolean;
}) {
  const { isSignedIn } = useAuth();
  return (
    <DashboardInner
      team={team}
      checks={checks}
      clerkEnabled
      clerkSignedIn={Boolean(isSignedIn)}
      demoMode={demoMode}
    />
  );
}

function DashboardInner({
  team,
  checks,
  clerkEnabled,
  clerkSignedIn,
  demoMode,
}: {
  team: TeamConfig;
  checks: SetupCheck[];
  clerkEnabled: boolean;
  clerkSignedIn: boolean;
  demoMode: boolean;
}) {
  const adminKey = useSyncExternalStore(subscribe, readKey, () => "");
  const authed = demoMode || clerkSignedIn || Boolean(adminKey);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [approvalBusy, setApprovalBusy] = useState<string | null>(null);
  const [dumpPath, setDumpPath] = useState<string | null>(null);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (adminKey) headers.Authorization = `Bearer ${adminKey}`;
    return headers;
  }, [adminKey]);

  useEffect(() => {
    if (!authed) return;
    void fetch("/api/requests", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data: { requests?: RequestRow[] }) => setRequests(data.requests ?? []));
    void fetch("/api/approvals", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { approvals: [] }))
      .then((data: { approvals?: ApprovalRow[] }) => setApprovals(data.approvals ?? []));
  }, [authed, authHeaders, reply, approvalBusy]);

  async function runPrompt(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || !authed) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, source: "cli" }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setReply(data.text ?? data.error ?? "No response");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    if (!authed) return;
    setApprovalBusy(id);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, decision }),
      });
    } finally {
      setApprovalBusy(null);
    }
  }

  async function dumpMemory() {
    if (!authed) return;
    const res = await fetch("/api/memory", { method: "POST", headers: authHeaders });
    const data = (await res.json()) as { dir?: string; error?: string };
    setDumpPath(data.dir ?? data.error ?? "dumped");
  }

  const ready = checks.filter((check) => check.ok).length;
  const missing = checks.filter((check) => !check.ok);
  const inboxLabel = team.sharedInbox?.label ?? "scheduling";

  // One sentence stating the real state of the system, in the order a person
  // cares about it: what's blocked on you, then what's in flight.
  const status = !authed
    ? "Unlock the dashboard to see what the agent is holding."
    : approvals.length > 0
      ? `${approvals.length} ${plural(approvals.length, "draft is", "drafts are")} waiting on you. Nothing goes out until you approve it.`
      : requests.length > 0
        ? `${requests.length} ${plural(requests.length, "thread", "threads")} open, nothing waiting on you. Mail on the ${inboxLabel} label is matched automatically.`
        : `Nothing in flight. Ask for a meeting below and the agent opens a thread for it.`;

  return (
    <div className="flex flex-col gap-12">
      {/* Overview + the primary action, together above the fold. */}
      <div id="home" className="scroll-mt-24 animate-settle">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {demoMode ? (
            <StatusBadge tone="warn" label="Demo data" />
          ) : (
            <StatusBadge tone="ok" label="Live" />
          )}
          {!authed ? <StatusBadge tone="dim" label="Locked" /> : null}
        </div>

        <PageHeader
          title={team.studio}
          subtitle={status}
          footnote={
            demoMode
              ? "Calendar and Gmail are seeded fiction. The people in config/team.yaml are placeholders."
              : undefined
          }
        />

        {!authed ? (
          <Card surface="raised" className="mb-8 p-5">
            <h2 className="font-sans text-base font-semibold tracking-tight text-bone">
              Unlock the dashboard
            </h2>
            <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-dim">
              {clerkEnabled
                ? "Sign in with your Matriarch account, or paste the admin key to work without signing in."
                : "Paste the admin key to run the agent, approve drafts, and connect calendars."}
            </p>
            <label className="mt-4 block max-w-sm">
              <Label>Admin key</Label>
              <input
                className={`mt-2 font-mono ${FIELD_CLASS}`}
                type="password"
                value={adminKey}
                onChange={(event) => writeKey(event.target.value)}
                placeholder="SCHEDULER_ADMIN_KEY"
                autoComplete="off"
              />
            </label>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          <Figure
            label="Waiting on you"
            value={String(approvals.length)}
            sub={approvals.length ? "Review below" : "Queue is clear"}
            href={approvals.length ? "#approvals" : undefined}
            emphasis={approvals.length > 0}
          />
          <Figure
            label="Open threads"
            value={String(requests.length)}
            sub={requests.length ? "In conversation" : "None yet"}
            href={requests.length ? "#requests" : undefined}
          />
          <Figure
            label="Services ready"
            value={`${ready}/${checks.length}`}
            sub={
              missing.length === 0
                ? "Everything configured"
                : `${missing.length} ${plural(missing.length, "needs", "need")} a key`
            }
            href="#setup"
          />
        </div>
      </div>

      {/* The hero action: say what you want in plain words. */}
      <section id="agent" className="scroll-mt-24">
        <SectionHeading
          title="Ask for a meeting"
          note="Plain language. The agent checks real availability, never invents a slot, and drafts any outbound mail for your approval."
        />
        <Card surface="raised" className="p-5 sm:p-6">
          <form className="flex flex-col gap-4" onSubmit={runPrompt}>
            <label className="block">
              <span className="sr-only">What should the agent schedule?</span>
              <textarea
                className={`min-h-28 resize-y leading-relaxed ${FIELD_CLASS}`}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Set up 30 minutes with J next Tuesday afternoon"
                disabled={!authed}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={busy || !authed} type="submit">
                {busy ? "Working" : "Send to agent"}
              </Button>
              {busy ? (
                <span className="text-xs text-faint">
                  Checking calendars and rules
                </span>
              ) : null}
              {!authed ? (
                <span className="text-xs text-faint">
                  Unlock the dashboard to run the agent
                </span>
              ) : null}
            </div>
          </form>

          {reply ? (
            <div className="mt-6 border-t border-line pt-5">
              <Label>Agent</Label>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-bone/85">
                {reply}
              </p>
            </div>
          ) : null}
        </Card>
      </section>

      <section id="approvals" className="scroll-mt-24">
        <SectionHeading
          title="Approvals"
          note="Outbound mail and external holds stop here. Slack is optional — this queue is the same gate."
        >
          {approvals.length > 0 ? (
            <span className="flex items-center gap-2">
              <span className="animate-breathe h-1.5 w-1.5 bg-accent" aria-hidden />
              <Label>
                {approvals.length} {plural(approvals.length, "item", "items")}
              </Label>
            </span>
          ) : null}
        </SectionHeading>

        {approvals.length === 0 ? (
          <EmptyState
            title="Nothing waiting"
            hint="When the agent drafts an email or holds time with someone outside the studio, it appears here first."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {approvals.map((approval) => (
              <li key={approval.id}>
                <Card surface="attention" className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-sans text-sm font-semibold tracking-tight text-bone">
                      {humanize(approval.kind)}
                    </h3>
                    <Label>
                      {new Date(approval.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Label>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap border-l border-line pl-3 text-sm leading-6 text-dim">
                    {approval.summary}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      disabled={approvalBusy === approval.id || !authed}
                      type="button"
                      onClick={() => void decide(approval.id, "approved")}
                    >
                      {approvalBusy === approval.id ? "Sending" : "Approve and send"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={approvalBusy === approval.id || !authed}
                      type="button"
                      onClick={() => void decide(approval.id, "rejected")}
                    >
                      Discard
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="requests" className="scroll-mt-24">
        <SectionHeading
          title="Threads"
          note="Every ask opens one, and replies on the shared inbox attach to it."
        />
        {requests.length === 0 ? (
          <EmptyState
            title="No threads yet"
            hint="Ask for a meeting above and the agent opens a thread to track it through to a confirmed time."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  <Th>Status</Th>
                  <Th>What</Th>
                  <Th>Who</Th>
                  <Th>Scope</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-line transition-colors hover:bg-panel-2/60"
                  >
                    <Td>
                      <RequestStatusBadge status={request.status} />
                    </Td>
                    <Td className="font-medium text-bone">{request.title}</Td>
                    <Td className="text-dim">
                      {request.attendeeSlugs.join(", ")}
                      {request.counterpartyName
                        ? ` + ${request.counterpartyName}`
                        : ""}
                    </Td>
                    <Td className="text-xs text-faint">
                      {request.isExternal ? "External" : "Internal"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section id="connect" className="scroll-mt-24">
        <SectionHeading
          title="Calendars"
          note={
            demoMode
              ? "A seeded calendar and inbox are already running. Connect Google only if you want live data."
              : `Connect the shared inbox${
                  team.sharedInbox?.email ? ` (${team.sharedInbox.email})` : ""
                } and each teammate. Sign in with the Google account that owns that alias.`
          }
        />
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {team.members.map((member) => (
              <a
                key={member.slug}
                className={`border px-3.5 py-2 text-xs font-medium uppercase tracking-[0.1em] transition-colors duration-200 ${
                  authed
                    ? "border-line text-bone hover:border-accent hover:text-accent"
                    : "pointer-events-none border-line text-faint opacity-40"
                }`}
                aria-disabled={!authed}
                href={
                  clerkSignedIn
                    ? `/api/google/oauth?slug=${member.slug}`
                    : adminKey
                      ? `/api/google/oauth?slug=${member.slug}&key=${encodeURIComponent(adminKey)}`
                      : undefined
                }
                onClick={(event) => {
                  if (!authed) event.preventDefault();
                }}
              >
                Connect {member.name}
              </a>
            ))}
          </div>
        </Card>
      </section>

      <section id="memory" className="scroll-mt-24">
        <SectionHeading
          title="Memory"
          note="Durable facts — people, projects, decisions — written to Markdown files you keep."
        />
        <Card className="p-5">
          <Button disabled={!authed} type="button" onClick={() => void dumpMemory()}>
            Export Markdown
          </Button>
          {dumpPath ? (
            <p className="mt-3 font-mono text-xs text-dim">{dumpPath}</p>
          ) : null}
        </Card>
      </section>

      {/* Diagnostics last: useful when something breaks, noise otherwise. */}
      <section id="setup" className="scroll-mt-24">
        <SectionHeading
          title="Diagnostics"
          note={
            missing.length === 0
              ? "Every service this app touches is configured."
              : `${missing.length} of ${checks.length} ${plural(missing.length, "service needs", "services need")} a key. Slack is always optional.`
          }
        />
        <Card>
          <ul>
            {checks.map((check, index) => (
              <li
                key={check.name}
                className={`flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <StatusBadge ok={check.ok} label={check.ok ? "ready" : "missing"} />
                  <span className="truncate font-mono text-xs text-bone">
                    {check.name}
                  </span>
                </div>
                <p className="max-w-[58ch] text-xs leading-5 text-faint sm:flex-1">
                  {check.hint}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
