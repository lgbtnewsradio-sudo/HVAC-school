"use client";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { GlossaryTerm } from "@/content/types";
import { toggleBookmarkAction } from "@/app/actions";

export function GlossaryList({ terms, bookmarked }: { terms: GlossaryTerm[]; bookmarked: string[] }) {
  const [q, setQ] = useState("");
  const [bm, setBm] = useState(new Set(bookmarked));
  const list = useMemo(() => terms.filter((t) => (t.term + t.definition).toLowerCase().includes(q.toLowerCase())), [q, terms]);
  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${terms.length} terms…`} className="focus-ring h-12 w-full rounded-xl border border-white/10 bg-ink-800 px-4 text-white" aria-label="Search glossary" />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <div key={t.slug} id={t.slug} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-cool-300">{t.term}</div>
              <button
                onClick={async () => {
                  const r = await toggleBookmarkAction("term", t.slug);
                  if (r.ok) {
                    const s = new Set(bm);
                    if (r.bookmarked) s.add(t.slug);
                    else s.delete(t.slug);
                    setBm(s);
                  }
                }}
                className="focus-ring rounded p-1 text-slate-400 hover:text-white"
                aria-label={bm.has(t.slug) ? `Remove bookmark for ${t.term}` : `Bookmark ${t.term}`}
                aria-pressed={bm.has(t.slug)}
              >
                {bm.has(t.slug) ? <BookmarkCheck size={18} className="text-cool-300" /> : <Bookmark size={18} />}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-300">{t.definition}</p>
            {t.plain && <p className="mt-1 text-sm text-slate-400">Plain English: {t.plain}</p>}
            {t.related && <p className="mt-2 text-xs text-slate-500">Related: {t.related.join(", ")}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
