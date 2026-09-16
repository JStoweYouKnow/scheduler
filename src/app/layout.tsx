import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Archivo, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { clerkAppOptions } from "@/lib/auth/clerk";
import { isDemoMode } from "@/lib/demo/mode";
import { ThemeProvider } from "@/components/ThemeProvider";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Scheduler — Matriarch",
  description: "Internal scheduling agent — availability, holds, reschedules.",
};

const THEME_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem("dailie-theme-v1")==="light")document.documentElement.classList.add("light-theme")}catch(e){}})();`;

const clerkAppearance = {
  theme: dark,
  variables: {
    colorBackground: "#141a17",
    colorInputBackground: "#0a0d0b",
    colorInputText: "#f0f3ee",
    colorText: "#f0f3ee",
    colorTextSecondary: "#9aaba1",
    colorPrimary: "#f0f3ee",
    colorDanger: "#c08d7a",
    borderRadius: "0px",
    fontFamily: "var(--font-archivo), system-ui, sans-serif",
  },
  elements: {
    card: "bg-panel border border-line shadow-none",
    headerTitle: "font-sans tracking-tight",
    formButtonPrimary:
      "bg-bone text-ink hover:opacity-90 rounded-none font-medium",
    footerActionLink: "text-accent hover:text-bone",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrument.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-ink text-bone">
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        <ThemeProvider>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !isDemoMode() ? (
            <ClerkProvider
              appearance={clerkAppearance}
              publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
              {...clerkAppOptions()}
            >
              {children}
            </ClerkProvider>
          ) : (
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
