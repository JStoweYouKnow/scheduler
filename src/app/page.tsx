import { loadTeamConfig } from "@/lib/config/team";
import { setupChecks } from "@/lib/setup";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const team = loadTeamConfig();
  return <Dashboard team={team} checks={setupChecks()} />;
}
