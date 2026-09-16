import { loadTeamConfig } from "@/lib/config/team";
import { setupChecks } from "@/lib/setup";
import { isDemoMode } from "@/lib/demo/mode";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const team = loadTeamConfig();
  const clerkEnabled =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && !isDemoMode();
  return (
    <AppShell clerkEnabled={clerkEnabled}>
      <Dashboard
        team={team}
        checks={setupChecks()}
        clerkEnabled={clerkEnabled}
        demoMode={isDemoMode()}
      />
    </AppShell>
  );
}
