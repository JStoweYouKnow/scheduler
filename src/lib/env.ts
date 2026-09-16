import { isDemoMode } from "./demo/mode";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getEnv() {
  return {
    databaseUrl: optional("DATABASE_URL"),
    appUrl: optional("APP_URL") ?? "http://localhost:3000",
    adminKey: optional("SCHEDULER_ADMIN_KEY"),
    tokenKey: optional("TOKEN_ENCRYPTION_KEY"),
    nebius: optional("NEBIUS_API_KEY"),
    modelReasoning: optional("MODEL_REASONING"),
    modelFast: optional("MODEL_FAST"),
    modelUltra: optional("MODEL_ULTRA"),
    demoMode: isDemoMode(),
    googleClientId: optional("GOOGLE_CLIENT_ID"),
    googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri: optional("GOOGLE_REDIRECT_URI"),
    googleDelegationSubject: optional("GOOGLE_DELEGATION_SUBJECT"),
    slackSigningSecret: optional("SLACK_SIGNING_SECRET"),
    slackBotToken: optional("SLACK_BOT_TOKEN"),
    slackChannel: optional("SLACK_CHANNEL"),
    cronSecret: optional("CRON_SECRET"),
  };
}

export function requireDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function requireAdminKey(): string {
  return required("SCHEDULER_ADMIN_KEY");
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function hasPersistence(): boolean {
  return hasDatabase() || isDemoMode();
}

export { isDemoMode };
