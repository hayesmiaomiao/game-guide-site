import Link from "next/link";
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "mana" | "ember" | "toxic";

const tones: Record<BadgeTone, string> = {
  default: "bg-white/5 text-slate-300",
  mana: "bg-mana/10 text-mana",
  ember: "bg-ember/15 text-ember",
  toxic: "bg-toxic/10 text-toxic"
};

type SharedProps = {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

type LinkBadgeProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type SpanBadgeProps = SharedProps &
  HTMLAttributes<HTMLSpanElement> & {
    href?: undefined;
  };

export function Badge({ children, className, tone = "default", href, ...props }: LinkBadgeProps | SpanBadgeProps) {
  const badgeClass = cn("inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", tones[tone], className);

  if (href) {
    return (
      <Link href={href} className={badgeClass} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <span className={badgeClass} {...(props as HTMLAttributes<HTMLSpanElement>)}>
      {children}
    </span>
  );
}
