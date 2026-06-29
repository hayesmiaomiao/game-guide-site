import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hover?: boolean;
};

export function Card({ children, className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-panel",
        hover && "transition hover:-translate-y-0.5 hover:border-mana/70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
