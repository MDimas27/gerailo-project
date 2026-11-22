import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return (
    <span role="alert" className="text-xs font-medium text-danger">
      {children}
    </span>
  );
}
