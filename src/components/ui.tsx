import NextLink from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "heat";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-cool-500 text-ink-950 hover:bg-cool-400 shadow-[0_8px_24px_-8px_rgb(14_165_233/0.6)]",
  secondary: "bg-ink-700 text-slate-100 hover:bg-ink-600 border border-white/10",
  ghost: "text-slate-300 hover:text-white hover:bg-white/5",
  danger: "bg-bad-500 text-white hover:bg-bad-400",
  success: "bg-ok-500 text-ink-950 hover:bg-ok-400",
  heat: "bg-heat-500 text-ink-950 hover:bg-heat-400",
};
const SIZES = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-14 px-7 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZES = "md", extra?: string) {
  return clsx(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <button {...p} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({ variant = "primary", size = "md", className, ...p }: ComponentProps<typeof NextLink> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <NextLink {...p} className={buttonClass(variant, size, className)} />;
}

export function Card({ className, children, ...p }: ComponentProps<"div">) {
  return (
    <div {...p} className={clsx("glass rounded-2xl p-5", className)}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "slate", className }: { children: ReactNode; tone?: "slate" | "cool" | "heat" | "ok" | "bad" | "volt" | "pro"; className?: string }) {
  const tones = {
    slate: "bg-white/5 text-slate-300 border-white/10",
    cool: "bg-cool-500/10 text-cool-300 border-cool-400/30",
    heat: "bg-heat-500/10 text-heat-400 border-heat-400/30",
    ok: "bg-ok-500/10 text-ok-400 border-ok-400/30",
    bad: "bg-bad-500/10 text-bad-400 border-bad-400/30",
    volt: "bg-volt-400/10 text-volt-400 border-volt-400/30",
    pro: "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function Progress({ value, className, color = "bg-cool-400", label }: { value: number; className?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("h-2.5 w-full overflow-hidden rounded-full bg-white/10", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx("h-full rounded-full transition-[width] duration-700", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = "#38bdf8", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.1)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: "stroke-dashoffset 0.8s" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{children}</div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-6", className)}>
      {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-cool-400">{eyebrow}</div>}
      <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      {children && <p className="mt-2 max-w-2xl text-slate-400">{children}</p>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
      <div className="font-semibold text-white">{title}</div>
      {children && <div className="mt-2 text-sm text-slate-400">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "cool", title, children }: { tone?: "cool" | "heat" | "bad" | "ok" | "volt"; title?: string; children: ReactNode }) {
  const tones = {
    cool: "border-cool-400/30 bg-cool-500/10 text-cool-100",
    heat: "border-heat-400/40 bg-heat-500/10 text-orange-100",
    bad: "border-bad-400/40 bg-bad-500/10 text-red-100",
    ok: "border-ok-400/40 bg-ok-500/10 text-green-100",
    volt: "border-volt-400/40 bg-volt-400/10 text-yellow-100",
  };
  return (
    <div className={clsx("rounded-xl border p-4 text-sm leading-relaxed", tones[tone])} role={tone === "bad" ? "alert" : undefined}>
      {title && <div className="mb-1 font-bold">{title}</div>}
      {children}
    </div>
  );
}
