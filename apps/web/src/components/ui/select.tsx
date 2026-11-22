import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-12 w-full rounded-control border border-border bg-surface px-3 text-base text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
