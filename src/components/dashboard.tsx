"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { SetupCheck } from "@/lib/setup";
import type { TeamConfig } from "@/lib/types";

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

export function Dashboard({
  team,
  checks,
}: {
  team: TeamConfig;
  checks: SetupCheck[];
}) {
  const adminKey = useSyncExternalStore(subscribe, readKey, () => "");
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    if (!adminKey) return;
    void fetch("/api/requests", {
      headers: { Authorization: `Bearer ${adminKey}` },
    })
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data: { requests?: RequestRow[] }) => setRequests(data.requests ?? []));
  }, [adminKey, reply]);

  async function runPrompt(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || !adminKey) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminKey}`,
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

  const ready = checks.filter((check) => check.ok).length;

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          {team.studio} · phase {team.phase}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Scheduler</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400">
          Availability, holds, T-1 agendas, and follow-up drafts. External
          mail from the {team.sharedInbox?.label ?? "scheduling"} label is
          matched to an open request; anything outbound waits on a Slack
          approval card.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.name}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{check.name}</span>
              <span
                className={
                  check.ok ? "text-xs text-emerald-400" : "text-xs text-amber-400"
                }
              >
                {check.ok ? "ready" : "missing"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{check.hint}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-zinc-500">
        {ready}/{checks.length} services configured
      </p>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-sm font-medium">Connect calendars</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Paste the admin key, then connect each teammate. Tokens are encrypted
          at rest.
        </p>
        <label className="mt-4 block text-xs text-zinc-400">
          Admin key
          <input
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm"
            type="password"
            value={adminKey}
            onChange={(event) => writeKey(event.target.value)}
            placeholder="SCHEDULER_ADMIN_KEY"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {team.members.map((member) => (
            <a
              key={member.slug}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-900"
              href={
                adminKey
                  ? `/api/google/oauth?slug=${member.slug}&key=${encodeURIComponent(adminKey)}`
                  : undefined
              }
              onClick={(event) => {
                if (!adminKey) event.preventDefault();
              }}
            >
              Connect {member.name}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-sm font-medium">Ask the agent</h2>
        <form className="mt-3 flex flex-col gap-3" onSubmit={runPrompt}>
          <textarea
            className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Set up 30 minutes with cofounder next Tuesday afternoon"
          />
          <button
            className="self-start rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
            disabled={busy || !adminKey}
            type="submit"
          >
            {busy ? "Working…" : "Run"}
          </button>
        </form>
        {reply ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-zinc-900 p-3 text-xs leading-5 text-zinc-300">
            {reply}
          </pre>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Recent requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No scheduling_request rows yet. The agent writes one on every ask.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Who</th>
                  <th className="px-3 py-2">Scope</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2 font-mono text-xs">{request.status}</td>
                    <td className="px-3 py-2">{request.title}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {request.attendeeSlugs.join(", ")}
                      {request.counterpartyName ? ` + ${request.counterpartyName}` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {request.isExternal ? "external" : "internal"}
                    </td>
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
