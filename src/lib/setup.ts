import { hasDatabase, hasPersistence, isDemoMode } from "./env";
import { hasNebius } from "./ai/models";

export interface SetupCheck {
  name: string;
  ok: boolean;
  hint: string;
}

export function setupChecks(): SetupCheck[] {
  return [
    {
      name: "NEBIUS_API_KEY",
      ok: hasNebius(),
      hint: "Token Factory key. Base URL is https://api.tokenfactory.nebius.com/v1/",
    },
    {
      name: "MODEL_REASONING / MODEL_FAST",
      ok: true,
      hint: "Defaults: nvidia/nemotron-3-super-120b-a12b and nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B. Optional MODEL_ULTRA for multi-party conflicts.",
    },
    {
      name: "DEMO_MODE",
      ok: isDemoMode() || hasPersistence(),
      hint: isDemoMode()
        ? "In-memory calendar + Gmail with seeded fiction. Judges only need a Nebius key."
        : "Set DEMO_MODE=1 to run without Google/Slack.",
    },
    {
      name: "DATABASE_URL",
      ok: hasDatabase() || isDemoMode(),
      hint: isDemoMode()
        ? "Optional in demo — facts live in memory until you dump Markdown."
        : "Supabase Postgres connection string (session or transaction pooler).",
    },
    {
      name: "SCHEDULER_ADMIN_KEY",
      ok: Boolean(process.env.SCHEDULER_ADMIN_KEY) || isDemoMode(),
      hint: "Shared secret for CLI and dashboard actions. Skipped in DEMO_MODE.",
    },
    {
      name: "TOKEN_ENCRYPTION_KEY",
      ok: Boolean(process.env.TOKEN_ENCRYPTION_KEY) || isDemoMode(),
      hint: "32-byte key, base64. openssl rand -base64 32",
    },
    {
      name: "Google OAuth",
      ok:
        isDemoMode() ||
        Boolean(
          process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET &&
            process.env.GOOGLE_REDIRECT_URI,
        ),
      hint: isDemoMode()
        ? "Bypassed — MemoryCalendar + MemoryGmail."
        : "Calendar + Gmail + Drive. Re-consent after scope changes.",
    },
    {
      name: "Clerk",
      ok: isDemoMode()
        ? true
        : Boolean(
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
              process.env.CLERK_SECRET_KEY,
          ),
      hint: isDemoMode()
        ? "Bypassed in judge mode."
        : "Same suite Clerk app as Interface. Sign-in is on this host.",
    },
    {
      name: "Slack",
      ok: Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET),
      hint: "Optional. Approvals also live on this dashboard without Slack.",
    },
  ];
}
