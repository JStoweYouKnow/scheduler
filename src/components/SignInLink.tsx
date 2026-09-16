"use client";

import { Show, UserButton } from "@clerk/nextjs";

export function SignInLink() {
  return (
    <div className="mb-3">
      <Show when="signed-out">
        <a
          href="/sign-in"
          className="block px-0.5 text-[11px] text-faint transition-colors hover:text-bone"
        >
          Sign in with Matriarch
        </a>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-2 px-0.5">
          <UserButton
            appearance={{
              elements: { avatarBox: "h-7 w-7 rounded-none" },
            }}
          />
          <span className="text-[11px] text-faint">Signed in</span>
        </div>
      </Show>
    </div>
  );
}
