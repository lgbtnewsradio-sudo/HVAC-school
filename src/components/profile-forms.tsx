"use client";
import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions";
import { Button, Notice } from "./ui";

const input = "focus-ring h-11 w-full rounded-xl border border-white/10 bg-ink-800 px-3 text-white";

export function ProfileForm({ u }: { u: { displayName: string; mode: string; timezone: string; leaderboardOptIn: boolean } }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && <Notice tone="ok">{state.message}</Notice>}
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Display name (used on certificates & leaderboard)</span>
        <input name="displayName" defaultValue={u.displayName} className={input} required minLength={2} maxLength={40} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Learning mode</span>
        <select name="mode" defaultValue={u.mode} className={input}>
          <option value="beginner">Beginner — hints and extra explanations</option>
          <option value="advanced">Advanced — no hints, +25% simulator XP</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Time zone (for streaks and daily challenges)</span>
        <input name="timezone" defaultValue={u.timezone} className={input} />
      </label>
      <label className="flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" name="leaderboardOptIn" defaultChecked={u.leaderboardOptIn} className="h-5 w-5 accent-sky-400" />
        Show my display name and weekly XP on the leaderboard
      </label>
      <Button disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Current password</span>
        <input type="password" name="current" autoComplete="current-password" className={input} required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">New password</span>
        <input type="password" name="next" autoComplete="new-password" className={input} required minLength={10} />
      </label>
      <Button variant="secondary" disabled={pending}>{pending ? "Updating…" : "Change password"}</Button>
      <p className="text-xs text-slate-500">Changing your password signs you out on all devices.</p>
    </form>
  );
}
