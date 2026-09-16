import { and, eq } from "drizzle-orm";
import { google } from "googleapis";
import { decryptSecret, encryptSecret } from "../crypto";
import { getDb } from "../db/client";
import { googleAccounts, teamMembers } from "../db/schema";

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly",
];

/** Read email from a Google id_token payload without verifying the JWT. */
export function emailFromIdToken(idToken: string | null | undefined): string | undefined {
  if (!idToken) return undefined;
  const payload = idToken.split(".")[1];
  if (!payload) return undefined;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown;
    };
    return typeof json.email === "string" ? json.email : undefined;
  } catch {
    return undefined;
  }
}

export function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars are not configured");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function googleAuthUrl(slug: string): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: slug,
  });
}

export async function exchangeGoogleCode(code: string, slug: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Re-consent the account.");
  }
  client.setCredentials(tokens);
  let googleEmail = emailFromIdToken(tokens.id_token);
  if (!googleEmail) {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    googleEmail = profile.data.email ?? undefined;
  }
  if (!googleEmail) {
    throw new Error("Google profile is missing an email");
  }

  const db = getDb();
  const member = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.slug, slug))
    .then((rows) => rows[0]);
  if (!member) {
    throw new Error(`Team member ${slug} is not seeded`);
  }

  const existing = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.teamMemberId, member.id))
    .then((rows) => rows[0]);

  const payload = {
    googleEmail,
    refreshTokenEnc: encryptSecret(tokens.refresh_token),
    accessTokenEnc: tokens.access_token ? encryptSecret(tokens.access_token) : null,
    tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scopes: GOOGLE_SCOPES,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(googleAccounts)
      .set(payload)
      .where(eq(googleAccounts.id, existing.id));
    return;
  }

  await db.insert(googleAccounts).values({
    teamMemberId: member.id,
    ...payload,
  });
}

export async function authForEmail(userEmail: string) {
  const db = getDb();
  const row = await db
    .select({
      account: googleAccounts,
      member: teamMembers,
    })
    .from(googleAccounts)
    .innerJoin(teamMembers, eq(googleAccounts.teamMemberId, teamMembers.id))
    .where(and(eq(teamMembers.email, userEmail)))
    .then((rows) => rows[0]);

  if (!row) {
    throw new Error(`No Google account connected for ${userEmail}`);
  }

  const client = oauthClient();
  client.setCredentials({
    refresh_token: decryptSecret(row.account.refreshTokenEnc),
    access_token: row.account.accessTokenEnc
      ? decryptSecret(row.account.accessTokenEnc)
      : undefined,
    expiry_date: row.account.tokenExpiry?.getTime(),
  });
  return { client, calendarId: "primary" as const, googleEmail: row.account.googleEmail };
}
