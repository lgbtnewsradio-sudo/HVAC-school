"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { revertContentAction, saveContentAction } from "@/app/admin-actions";
import { Button, Notice } from "./ui";

export function ContentEditor({ kind, id, initial, hasOverride, published }: { kind: string; id: string; initial: string; hasOverride: boolean; published: boolean }) {
  const [state, action, pending] = useActionState(saveContentAction, undefined);
  const [text, setText] = useState(initial);
  const router = useRouter();
  let syntaxError: string | null = null;
  try {
    JSON.parse(text);
  } catch (e) {
    syntaxError = (e as Error).message;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      {state?.ok && <Notice tone="ok">{state.message}</Notice>}
      {state?.error && (
        <Notice tone="bad" title={state.error}>
          {state.issues && (
            <ul className="mt-1 space-y-0.5 font-mono text-xs">
              {state.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      <textarea name="json" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} className="focus-ring h-[60vh] w-full rounded-xl border border-white/10 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-slate-200" aria-label="Content JSON" />
      {syntaxError && <div className="text-xs text-bad-400">JSON: {syntaxError}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="published" defaultChecked={published || !hasOverride} className="h-4 w-4 accent-sky-400" /> Published (visible to learners)
        </label>
        <Button disabled={pending || !!syntaxError}>{pending ? "Validating…" : "Validate & save"}</Button>
        {hasOverride && (
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              if (!confirm("Remove the override and restore the bundled version?")) return;
              await revertContentAction(kind, id);
              router.refresh();
            }}
          >
            Revert to bundled version
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">Content is validated against the curriculum schema before saving. Changing a question&apos;s id creates a new question; learners&apos; history stays with the old id.</p>
    </form>
  );
}
