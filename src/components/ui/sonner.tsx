"use client";
import { cn } from "./utils";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-[1.5rem] border border-slate-200/90 bg-white/96 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl",
          title: "text-[15px] font-semibold tracking-[-0.02em] text-slate-900",
          description: "text-[15px] leading-8 text-slate-600",
          actionButton:
            "rounded-xl bg-emerald-700 text-white transition-colors hover:bg-emerald-800",
          cancelButton:
            "rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50",
          error:
            "!border-rose-200/90 !bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,245,245,0.98))] !text-slate-900",
          success:
            "!border-emerald-200/90 !bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.98))] !text-slate-900",
          warning:
            "!border-amber-200/90 !bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.98))] !text-slate-900",
          info:
            "!border-sky-200/90 !bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))] !text-slate-900",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "#FFF7F7",
          "--error-text": "#0F172A",
          "--error-border": "#FECACA",
          "--success-bg": "#F3FFF7",
          "--success-text": "#0F172A",
          "--success-border": "#BBF7D0",
          "--warning-bg": "#FFFBEA",
          "--warning-text": "#0F172A",
          "--warning-border": "#FDE68A",
          "--info-bg": "#F4FAFF",
          "--info-text": "#0F172A",
          "--info-border": "#BAE6FD",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
