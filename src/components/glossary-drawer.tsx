"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookA, X, Search } from "lucide-react";
import type { GlossaryTerm } from "@/content/types";

/** Glossary available from every app page (button + "/" keyboard shortcut). */
export function GlossaryDrawer({ terms }: { terms: GlossaryTerm[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = (e: Event) => {
      setQ((e as CustomEvent<string>).detail ?? "");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("glossary:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("glossary:open", onOpen);
    };
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50);
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return terms;
    return terms.filter((t) => t.term.toLowerCase().includes(s) || t.definition.toLowerCase().includes(s));
  }, [q, terms]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="focus-ring flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:text-white" aria-label="Open glossary">
        <BookA size={18} aria-hidden />
        <span className="hidden sm:inline">Glossary</span>
        <kbd className="hidden rounded bg-white/10 px-1.5 text-xs text-slate-400 md:inline">/</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Glossary">
          <button className="absolute inset-0 bg-black/60" aria-label="Close glossary" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 animate-[rise_.25s_ease-out]">
            <div className="flex items-center gap-2 border-b border-white/10 p-4">
              <Search size={18} className="text-slate-400" aria-hidden />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search HVAC terms…" className="w-full bg-transparent text-white outline-none placeholder:text-slate-500" aria-label="Search glossary" />
              <button onClick={() => setOpen(false)} className="focus-ring rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {results.map((t) => (
                <div key={t.slug} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="font-semibold text-cool-300">{t.term}</div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-300">{t.definition}</div>
                  {t.plain && <div className="mt-1.5 text-sm text-slate-400">In plain English: {t.plain}</div>}
                </div>
              ))}
              {!results.length && <div className="text-sm text-slate-400">No matching terms.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function openGlossary(term: string) {
  window.dispatchEvent(new CustomEvent("glossary:open", { detail: term }));
}
