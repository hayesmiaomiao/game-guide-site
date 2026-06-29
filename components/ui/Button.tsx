import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-mana text-slate-950 hover:bg-white",
  secondary: "border border-line bg-transparent text-white hover:border-mana hover:bg-white/[0.03]",
  ghost: "text-slate-300 hover:bg-white/[0.05] hover:text-white"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-sm"
};

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-mana/60 focus:ring-offset-2 focus:ring-offset-void";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: LinkButtonProps | NativeButtonProps) {
  const buttonClass = cn(baseClass, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link href={href} className={buttonClass} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClass} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
