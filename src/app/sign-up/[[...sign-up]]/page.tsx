import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="font-sans text-sm font-extrabold uppercase tracking-[0.32em] text-bone">
            Scheduler
          </div>
          <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
            Matriarch Studios
          </div>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
