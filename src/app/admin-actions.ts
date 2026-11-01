"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { auditLog, contentOverrides, users } from "@/server/db/schema";
import { getCurrentUser } from "@/server/auth";
import { newId } from "@/server/crypto";
import { invalidateCurriculum, OVERRIDE_KINDS, type OverrideKind } from "@/server/curriculum";

type State = { ok?: boolean; error?: string; issues?: string[]; message?: string } | undefined;

/** Every admin action re-checks authorization server-side; UI hiding is not security. */
async function admin() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") throw new Error("Forbidden");
  return u;
}

async function audit(actorId: string, action: string, target: string, detail?: unknown) {
  const db = await getDb();
  await db.insert(auditLog).values({ id: newId("al_"), actorId, action, target, detail: detail ?? null });
}

const userUpdate = z.object({ userId: z.string().min(3).max(40), role: z.enum(["student", "admin"]), plan: z.enum(["free", "pro"]) });

export async function updateUserAction(_: State, form: FormData): Promise<State> {
  const me = await admin();
  const p = userUpdate.safeParse({ userId: form.get("userId"), role: form.get("role"), plan: form.get("plan") });
  if (!p.success) return { error: "Invalid input" };
  if (p.data.userId === me.id && p.data.role !== "admin") return { error: "You can't remove your own admin role." };
  const db = await getDb();
  await db.update(users).set({ role: p.data.role, plan: p.data.plan }).where(eq(users.id, p.data.userId));
  await audit(me.id, "user:update", p.data.userId, { role: p.data.role, plan: p.data.plan });
  revalidatePath("/admin/users");
  return { ok: true, message: "Saved" };
}

export async function saveContentAction(_: State, form: FormData): Promise<State> {
  const me = await admin();
  const kind = String(form.get("kind")) as OverrideKind;
  if (!(kind in OVERRIDE_KINDS)) return { error: "Unknown content type" };
  let json: unknown;
  try {
    json = JSON.parse(String(form.get("json") ?? ""));
  } catch (e) {
    return { error: `JSON syntax error: ${(e as Error).message}` };
  }
  const parsed = OVERRIDE_KINDS[kind].safeParse(json);
  if (!parsed.success) return { error: "Validation failed", issues: parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  const id = (parsed.data as { id: string }).id;
  const published = form.get("published") === "on";
  const db = await getDb();
  await db
    .insert(contentOverrides)
    .values({ kind, id, data: parsed.data, published, updatedBy: me.id })
    .onConflictDoUpdate({ target: [contentOverrides.kind, contentOverrides.id], set: { data: parsed.data, published, updatedBy: me.id, updatedAt: new Date() } });
  await audit(me.id, published ? "content:publish" : "content:draft", `${kind}:${id}`);
  invalidateCurriculum();
  revalidatePath("/", "layout");
  return { ok: true, message: published ? `Published ${kind} “${id}”.` : `Saved draft of ${kind} “${id}”.` };
}

export async function revertContentAction(kind: string, id: string) {
  const me = await admin();
  if (!(kind in OVERRIDE_KINDS) || typeof id !== "string") return { ok: false };
  const db = await getDb();
  await db.delete(contentOverrides).where(and(eq(contentOverrides.kind, kind), eq(contentOverrides.id, id)));
  await audit(me.id, "content:revert", `${kind}:${id}`);
  invalidateCurriculum();
  revalidatePath("/", "layout");
  return { ok: true };
}
