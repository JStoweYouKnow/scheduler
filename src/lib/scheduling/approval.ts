import type { TeamConfig } from "../types";

export function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  if (at === -1) return "";
  return email.slice(at + 1).toLowerCase();
}

export function isExternalEmail(
  email: string | null | undefined,
  internalDomains: string[],
): boolean {
  if (!email) return false;
  const domain = domainOf(email);
  if (!domain) return true;
  return !internalDomains.some((internal) => internal.toLowerCase() === domain);
}

export function requiresApproval(args: {
  isExternal: boolean;
  counterpartyEmail?: string | null;
  team: TeamConfig;
}): boolean {
  if (args.isExternal) return true;
  return isExternalEmail(args.counterpartyEmail, args.team.internalDomains);
}

export function phaseAllowsEmail(phase: TeamConfig["phase"]): boolean {
  return phase >= 3;
}

export function phaseAllowsInbox(phase: TeamConfig["phase"]): boolean {
  return phase >= 3;
}

export function phaseAllowsAgenda(phase: TeamConfig["phase"]): boolean {
  return phase >= 2;
}
