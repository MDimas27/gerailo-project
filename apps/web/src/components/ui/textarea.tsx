import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
