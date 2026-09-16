import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  clerkEnabled = false,
}: {
  children: ReactNode;
  clerkEnabled?: boolean;
}) {
  return (
    <>
      <Sidebar clerkEnabled={clerkEnabled} />
      <main className="ml-56 min-h-screen px-8 py-8 md:px-10">{children}</main>
    </>
  );
}
