import type { ReactNode } from "react";

/**
 * The Clerk card is themed dark (see clerkAppearance in layout.tsx), so the
 * auth screens commit to dark in both themes rather than placing a dark card
 * on light paper. Literal values, not theme tokens, for that reason.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12"
      style={{ backgroundColor: "#0a0d0b", color: "#f0f3ee" }}
    >
      <div className="text-center">
        <div className="font-sans text-sm font-extrabold uppercase tracking-[0.32em]">
          Scheduler
        </div>
        <div
          className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6e7f75" }}
        >
          Matriarch studio
        </div>
      </div>
      {children}
    </div>
  );
}
