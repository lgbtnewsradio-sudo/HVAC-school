"use client";
import { useActionState } from "react";
import { updateUserAction } from "@/app/admin-actions";

export function AdminUserRow({ u }: { u: { id: string; displayName: string; email: string; role: string; plan: string; xp: number; createdAt: string } }) {
  const [state, action, pending] = useActionState(updateUserAction, undefined);
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-3">
        <div className="font-medium text-white">{u.displayName}</div>
        <div className="text-xs text-slate-500">{u.email}</div>
      </td>
      <td className="py-2 pr-3 text-slate-300">{u.xp.toLocaleString()}</td>
      <td className="py-2 pr-3 text-slate-500">{u.createdAt}</td>
      <td className="py-2">
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="userId" value={u.id} />
          <select name="role" defaultValue={u.role} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2 text-sm text-white" aria-label="Role">
            <option value="student">student</option>
            <option value="admin">admin</option>
          </select>
          <select name="plan" defaultValue={u.plan} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2 text-sm text-white" aria-label="Plan">
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
          <button disabled={pending} className="h-9 rounded-lg bg-ink-600 px-3 text-sm font-semibold text-white hover:bg-ink-500">Save</button>
          {state?.ok && <span className="text-xs text-ok-400">Saved</span>}
          {state?.error && <span className="text-xs text-bad-400">{state.error}</span>}
        </form>
      </td>
    </tr>
  );
}
