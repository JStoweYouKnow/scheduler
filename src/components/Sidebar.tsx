"use client";

import { useEffect, useState } from "react";
import { SignInLink } from "./SignInLink";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "#home", label: "Home", hint: "Studio snapshot" },
  { href: "#setup", label: "Setup", hint: "Services and keys" },
  { href: "#connect", label: "Calendars", hint: "Connect V and J" },
  { href: "#agent", label: "Agent", hint: "Ask to schedule" },
  { href: "#memory", label: "Memory", hint: "Facts you own" },
  { href: "#approvals", label: "Approvals", hint: "Outbound gate" },
  { href: "#requests", label: "Requests", hint: "Open threads" },
];

const SUITE = [
  { href: "https://www.thewizardofops.app", label: "← Dailie" },
  { href: "https://www.thewizardofops.app/production", label: "Interface" },
  { href: "https://bench.thewizardofops.app", label: "Bench" },
];

export function Sidebar({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  const [active, setActive] = useState("#home");

  useEffect(() => {
    const syncHash = () => {
      setActive(window.location.hash || "#home");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);

    const ids = NAV.map((item) => item.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(`#${id}`);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => {
      window.removeEventListener("hashchange", syncHash);
      observer.disconnect();
    };
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-line bg-ink">
      <div className="px-5 pb-4 pt-6">
        <a href="#home" className="group block min-w-0">
          <div className="font-sans text-[11px] font-extrabold uppercase tracking-[0.28em] text-bone transition-colors group-hover:text-accent">
            Scheduler
          </div>
          <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
            Matriarch · Scheduling
          </div>
        </a>
      </div>

      <div className="mx-5 border-t border-line" />

      <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label="Main">
        {NAV.map((item) => {
          const isActive = active === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              title={item.hint}
              className={`flex flex-col px-2 py-2 text-sm transition-colors duration-200 ${
                isActive ? "text-bone" : "text-dim hover:text-bone"
              }`}
            >
              <span
                className={`font-medium ${
                  isActive ? "self-start border-b border-bone/40 pb-px" : ""
                }`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 text-[10px] text-faint">{item.hint}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-4 py-4">
        {clerkEnabled ? <SignInLink /> : null}
        {SUITE.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="mb-2 block px-0.5 text-[11px] text-faint transition-colors hover:text-bone"
          >
            {item.label}
          </a>
        ))}
        <ThemeToggle className="mt-1 block w-full px-0.5" />
      </div>
    </aside>
  );
}
