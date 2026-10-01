"use client";

import { useEffect, useState } from "react";
import { SignInLink } from "./SignInLink";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "#home", label: "Overview", hint: "What needs you now" },
  { href: "#agent", label: "Ask", hint: "Schedule in plain words" },
  { href: "#approvals", label: "Approvals", hint: "Nothing sends unseen" },
  { href: "#requests", label: "Threads", hint: "Open conversations" },
  { href: "#connect", label: "Calendars", hint: "Google accounts" },
  { href: "#memory", label: "Memory", hint: "Facts you own" },
  { href: "#setup", label: "Diagnostics", hint: "Services and keys" },
];

const SUITE = [
  { href: "https://www.thewizardofops.app", label: "Dailie" },
  { href: "https://www.thewizardofops.app/production", label: "Interface" },
  { href: "https://bench.thewizardofops.app", label: "Bench" },
];

export function Sidebar({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  const [active, setActive] = useState("#home");
  const [open, setOpen] = useState(false);

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

  // The drawer is modal on small screens: lock the page behind it and let
  // Escape dismiss it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const brand = (
    <a href="#home" className="group block min-w-0" onClick={() => setOpen(false)}>
      <div className="font-sans text-[11px] font-extrabold uppercase tracking-[0.28em] text-bone transition-colors group-hover:text-accent">
        Scheduler
      </div>
      <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
        Matriarch studio
      </div>
    </a>
  );

  const nav = (
    <nav className="flex flex-col px-3" aria-label="Sections">
      {NAV.map((item) => {
        const isActive = active === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={isActive ? "true" : undefined}
            className={`group flex flex-col border-l-2 py-2 pl-3 pr-2 transition-colors duration-200 ${
              isActive
                ? "border-l-accent text-bone"
                : "border-l-transparent text-dim hover:border-l-line-strong hover:text-bone"
            }`}
          >
            <span className="text-sm font-medium">{item.label}</span>
            {/* The hint is only worth the space on the section you're in. */}
            <span
              className={`overflow-hidden text-[10px] leading-4 text-faint transition-all duration-300 ${
                isActive ? "mt-0.5 max-h-5 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {item.hint}
            </span>
          </a>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-line px-4 py-4">
      {clerkEnabled ? <SignInLink /> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {SUITE.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-faint transition-colors hover:text-bone"
          >
            {item.label}
          </a>
        ))}
      </div>
      <ThemeToggle className="mt-3 block w-full" />
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/95 px-5 py-3 backdrop-blur lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="nav-drawer"
          className="border border-line px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-dim transition-colors hover:border-line-strong hover:text-bone"
        >
          Menu
        </button>
      </div>

      {/* Drawer backdrop — above the grain overlay, which sits at z-100. */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[200] bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        id="nav-drawer"
        className={`fixed inset-y-0 left-0 z-[201] flex w-60 flex-col border-r border-line bg-ink transition-transform duration-300 lg:z-20 lg:w-56 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint transition-colors hover:text-bone lg:hidden"
          >
            Close
          </button>
        </div>

        <div className="mx-5 border-t border-line" />
        <div className="mt-4" />
        {nav}
        {footer}
      </aside>
    </>
  );
}
