"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SetupCheck } from "@/lib/setup";
import type { TeamConfig } from "@/lib/types";
import { Card, PageHeader, RequestStatusBadge, StatCard, StatusBadge, Td, Th } from "./ui";

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
      clerkSignedIn={Boolean(isSignedIn)}
      demoMode={demoMode}
    />
  );
}

function DashboardInner({
  team,
  checks,
  clerkSignedIn,
  demoMode,
}: {
  team: TeamConfig;
  checks: SetupCheck[];
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

  const authHeaders: HeadersInit = adminKey
    ? { Authorization: `Bearer ${adminKey}` }
    : {};

  useEffect(() => {
    if (!authed) return;
    void fetch("/api/requests", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data: { requests?: RequestRow[] }) => setRequests(data.requests ?? []));
    void fetch("/api/approvals", { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : { approvals: [] }))
      .then((data: { approvals?: ApprovalRow[] }) => setApprovals(data.approvals ?? []));
  }, [authed, adminKey, reply, approvalBusy]);

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

  return (
    <div className="flex flex-col gap-8">
      <div id="home" className="scroll-mt-8">
        <PageHeader
          title="Home"
          subtitle={
            demoMode
              ? `Judge mode — seeded calendar and Gmail. ${team.studio} people in config/team.yaml are placeholders; matriarch.studio addresses are fine.`
              : `Availability, holds, and follow-up drafts for ${team.studio}. Mail on the ${team.sharedInbox?.label ?? "scheduling"} label is matched to an open request; outbound waits on an approval here.`
          }
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Phase"
            value={String(team.phase)}
            sub="Shared inbox + approvals"
          />
          <StatCard
            label="Services"
            value={`${ready}/${checks.length}`}
            sub={ready === checks.length ? "All configured" : "Slack optional"}
          />
          <StatCard
            label="Approvals"
            value={String(approvals.length)}
            sub="Waiting on you"
          />
          <StatCard
            label="Requests"
            value={String(requests.length)}
            sub="Recent rows"
          />
        </div>
      </div>

      <section id="setup" className="scroll-mt-8">
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
          Setup
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {checks.map((check) => (
            <Card key={check.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-bone">{check.name}</span>
                <StatusBadge ok={check.ok} label={check.ok ? "ready" : "missing"} />
              </div>
              <p className="mt-1.5 text-xs leading-5 text-dim">{check.hint}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card id="connect" className="scroll-mt-8 p-5">
        <h2 className="text-sm font-semibold text-bone">Connect calendars</h2>
        {demoMode ? null : (
        <p className="mt-1.5 text-sm text-dim">
          {clerkSignedIn
            ? "Connect the shared inbox"
            : "Paste the admin key, then connect the shared inbox"}
          {team.sharedInbox?.email ? ` (${team.sharedInbox.email})` : ""} and
          each teammate. Sign in with the Google account that owns that alias.
        </p>
        )}
        {demoMode ? (
          <p className="mt-1.5 text-sm text-dim">
            Demo calendar and inbox are already seeded. Connect Google only if you want live data.
          </p>
        ) : null}
        {clerkSignedIn || demoMode ? null : (
          <label className="mt-4 block text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
            Admin key
            <input
              className="mt-2 w-full border border-line bg-ink px-3 py-2.5 font-mono text-sm text-bone placeholder:text-faint focus:border-line-strong focus:outline-none"
              type="password"
              value={adminKey}
              onChange={(event) => writeKey(event.target.value)}
              placeholder="SCHEDULER_ADMIN_KEY"
            />
          </label>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {team.members.map((member) => (
            <a
              key={member.slug}
              className="border border-line px-3 py-1.5 text-xs font-medium uppercase tracking-[0.1em] text-bone hover:border-line-strong hover:text-accent"
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

      <Card id="agent" className="scroll-mt-8 p-5">
        <h2 className="text-sm font-semibold text-bone">Ask the agent</h2>
        <form className="mt-3 flex flex-col gap-3" onSubmit={runPrompt}>
          <textarea
            className="min-h-24 border border-line bg-ink px-3 py-2.5 text-sm text-bone placeholder:text-faint focus:border-line-strong focus:outline-none"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Set up 30 minutes with J next Tuesday afternoon"
          />
          <button
            className="self-start bg-bone px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-ink hover:opacity-90 disabled:opacity-40"
            disabled={busy || !authed}
            type="submit"
          >
            {busy ? "Working…" : "Run"}
          </button>
        </form>
        {reply ? (
          <pre className="mt-4 whitespace-pre-wrap border border-line bg-ink p-3 text-xs leading-5 text-dim">
            {reply}
          </pre>
        ) : null}
      </Card>

      <Card id="memory" className="scroll-mt-8 p-5">
        <h2 className="text-sm font-semibold text-bone">Memory</h2>
        <p className="mt-1.5 text-sm text-dim">
          Durable facts dump to Markdown files you own — people, projects, decisions.
        </p>
        <button
          className="mt-3 self-start bg-bone px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-ink hover:opacity-90 disabled:opacity-40"
          disabled={!authed}
          type="button"
          onClick={() => void dumpMemory()}
        >
          Dump to Markdown
        </button>
        {dumpPath ? (
          <p className="mt-3 text-xs text-dim">{dumpPath}</p>
        ) : null}
      </Card>

      <Card id="approvals" className="scroll-mt-8 p-5">
        <h2 className="text-sm font-semibold text-bone">Pending approvals</h2>
        <p className="mt-1.5 text-sm text-dim">
          Outbound mail and external holds wait here. Slack is not required.
        </p>
        {approvals.length === 0 ? (
          <div className="mt-4 border border-dashed border-line px-6 py-12 text-center text-sm text-dim">
            Nothing waiting.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {approvals.map((approval) => (
              <li key={approval.id} className="border border-line bg-ink p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
                  {approval.kind}
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-dim">
                  {approval.summary}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button
                    className="bg-bone px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-ink disabled:opacity-40"
                    disabled={approvalBusy === approval.id || !authed}
                    type="button"
                    onClick={() => void decide(approval.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="border border-line px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-dim hover:text-bone disabled:opacity-40"
                    disabled={approvalBusy === approval.id || !authed}
                    type="button"
                    onClick={() => void decide(approval.id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section id="requests" className="scroll-mt-8">
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
          Recent requests
        </h2>
        {requests.length === 0 ? (
          <div className="border border-dashed border-line px-6 py-16 text-center text-sm text-dim">
            No scheduling_request rows yet. The agent writes one on every ask.
          </div>
        ) : (
          <div className="overflow-hidden border border-line">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  <Th>Status</Th>
                  <Th>Title</Th>
                  <Th>Who</Th>
                  <Th>Scope</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-line hover:bg-panel/50">
                    <Td>
                      <RequestStatusBadge status={request.status} />
                    </Td>
                    <Td>{request.title}</Td>
                    <Td className="text-dim">
                      {request.attendeeSlugs.join(", ")}
                      {request.counterpartyName ? ` + ${request.counterpartyName}` : ""}
                    </Td>
                    <Td className="text-xs text-faint">
                      {request.isExternal ? "external" : "internal"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
