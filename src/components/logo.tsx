import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0e1a33" stroke="#38bdf8" strokeOpacity="0.6" strokeWidth="2" />
      <g fill="none" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="20" cy="20" r="3" stroke="#e2e8f0" />
        <path d="M20 17c0-6 5-9 8-7M17 20c-6 0-9-5-7-8" stroke="#38bdf8" />
        <path d="M23 20c6 0 9 5 7 8M20 23c0 6-5 9-8 7" stroke="#fb923c" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="focus-ring flex items-center gap-2.5 rounded-lg" aria-label={BRAND.name}>
      <LogoMark />
      <span className={`font-display text-lg font-bold tracking-tight text-white ${compact ? "hidden sm:inline" : ""}`}>{BRAND.name}</span>
    </Link>
  );
}
