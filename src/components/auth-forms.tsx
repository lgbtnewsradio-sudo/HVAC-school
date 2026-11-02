"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/app/actions";
import { Button, Notice } from "./ui";

const input = "focus-ring h-12 w-full rounded-xl border border-white/10 bg-ink-800 px-4 text-white placeholder:text-slate-500";

export function LoginForm({ next, changed }: { next?: string; changed?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {changed && <Notice tone="ok">Password changed. Sign in with your new password.</Notice>}
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-300">Email</span>
        <input name="email" type="email" autoComplete="email" required className={input} defaultValue={state?.values?.email} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-300">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      <Button size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-400">
        New here?{" "}
        <Link href="/register" className="font-semibold text-cool-300 hover:text-cool-200">
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const err = (f: string) => (state?.field === f ? state.error : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && !["email", "displayName", "password"].includes(state.field ?? "") && <Notice tone="bad">{state.error}</Notice>}
      <input
        type="hidden"
        name="timezone"
        defaultValue="UTC"
        ref={(el) => {
          if (el) el.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        }}
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-300">Your name (shown on certificates)</span>
        <input name="displayName" autoComplete="name" required minLength={2} maxLength={40} className={input} aria-invalid={!!err("displayName")} defaultValue={state?.values?.displayName} />
        {err("displayName") && <span className="mt-1 block text-sm text-bad-400">{err("displayName")}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-300">Email</span>
        <input name="email" type="email" autoComplete="email" required className={input} aria-invalid={!!err("email")} defaultValue={state?.values?.email} />
        {err("email") && <span className="mt-1 block text-sm text-bad-400">{err("email")}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-300">Password</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={10} className={input} aria-invalid={!!err("password")} aria-describedby="pw-help" />
        <span id="pw-help" className="mt-1 block text-xs text-slate-500">At least 10 characters with letters and a number.</span>
        {err("password") && <span className="mt-1 block text-sm text-bad-400">{err("password")}</span>}
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-300">Your experience</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["beginner", "Brand new", "Hints and extra explanations"],
            ["advanced", "Some experience", "No hints · bonus XP in the simulator"],
          ].map(([v, t, d], i) => (
            <label key={v} className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-3 has-[:checked]:border-cool-400 has-[:checked]:bg-cool-500/10">
              <input type="radio" name="mode" value={v} defaultChecked={state?.values?.mode ? state.values.mode === v : i === 0} className="sr-only" />
              <span className="block font-semibold text-white">{t}</span>
              <span className="text-xs text-slate-400">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create free account"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        By signing up you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-cool-300 hover:text-cool-200">
          Sign in
        </Link>
      </p>
    </form>
  );
}
