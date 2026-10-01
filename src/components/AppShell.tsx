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
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:border focus:border-line-strong focus:bg-panel focus:px-3 focus:py-2 focus:text-xs focus:font-medium focus:uppercase focus:tracking-[0.1em] focus:text-bone"
      >
        Skip to content
      </a>
      <Sidebar clerkEnabled={clerkEnabled} />
      <main
        id="main"
        className="min-h-screen px-5 pb-16 pt-6 sm:px-8 md:px-10 lg:ml-56 lg:pt-10"
      >
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </>
  );
}
