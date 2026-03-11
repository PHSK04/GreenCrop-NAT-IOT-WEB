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
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "#FEF2F2",
          "--error-text": "#B91C1C",
          "--error-border": "#FCA5A5",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
