import Link from "next/link";

export function AdminTabs({ active }: { active: "overview" | "users" | "content" }) {
  const tabs = [
    ["overview", "/admin", "Overview"],
    ["users", "/admin/users", "Users"],
    ["content", "/admin/content", "Curriculum & content"],
  ] as const;
  return (
    <div className="mb-6 flex gap-1 rounded-xl bg-white/5 p-1">
      {tabs.map(([k, href, label]) => (
        <Link key={k} href={href} aria-current={active === k ? "page" : undefined} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold ${active === k ? "bg-cool-500 text-ink-950" : "text-slate-300 hover:text-white"}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}
