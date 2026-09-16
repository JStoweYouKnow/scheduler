import { loadTeamConfig } from "@/lib/config/team";
import { domainOf } from "@/lib/scheduling/approval";

export function emailAllowed(email: string): boolean {
  const team = loadTeamConfig();
  const normalized = email.trim().toLowerCase();
  if (team.members.some((member) => member.email.toLowerCase() === normalized)) {
    return true;
  }
  const domain = domainOf(normalized);
  return team.internalDomains.some((item) => item.toLowerCase() === domain);
}
