import { hasDatabase } from "./env";

export interface SetupCheck {
  name: string;
  ok: boolean;
  hint: string;
}

export function setupChecks(): SetupCheck[] {
  return [
    {
      name: "DATABASE_URL",
      ok: hasDatabase(),
      hint: "Supabase Postgres connection string (session or transaction pooler).",
    },
    {
      name: "SCHEDULER_ADMIN_KEY",
      ok: Boolean(process.env.SCHEDULER_ADMIN_KEY),
      hint: "Shared secret for CLI and dashboard actions.",
    },
    {
      name: "TOKEN_ENCRYPTION_KEY",
      ok: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
      hint: "32-byte key, base64. openssl rand -base64 32",
    },
    {
      name: "AI (Gateway or Anthropic)",
      ok: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY),
      hint: "Prefer Vercel AI Gateway. Anthropic key works as fallback.",
    },
    {
      name: "Google OAuth",
      ok: Boolean(
        process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_REDIRECT_URI,
      ),
      hint: "Calendar + Gmail read/compose/send. Re-consent after scope changes.",
    },
    {
      name: "Slack",
      ok: Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET),
      hint: "Events API + interactive buttons. Optional for CLI-only v0.",
    },
  ];
}
