import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users, auditLog } from "@/server/db/schema";
import { verifyStripeSignature } from "@/server/stripe";
import { newId } from "@/server/crypto";

type Evt = { type: string; data: { object: Record<string, unknown> } };

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 501 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  const evt = JSON.parse(payload) as Evt;
  const o = evt.data.object;
  const db = await getDb();
  const setPlan = async (where: { userId?: string; customer?: string }, plan: "pro" | "free", customer?: string) => {
    const cond = where.userId ? eq(users.id, where.userId) : eq(users.stripeCustomerId, String(where.customer));
    await db.update(users).set({ plan, ...(customer ? { stripeCustomerId: customer } : {}) }).where(cond);
    await db.insert(auditLog).values({ id: newId("al_"), actorId: "stripe", action: `plan:${plan}`, target: where.userId ?? String(where.customer), detail: { type: evt.type } });
  };
  if (evt.type === "checkout.session.completed") {
    const userId = String(o.client_reference_id ?? (o.metadata as Record<string, string> | undefined)?.userId ?? "");
    if (userId) await setPlan({ userId }, "pro", String(o.customer ?? ""));
  } else if (evt.type === "customer.subscription.updated" || evt.type === "customer.subscription.created") {
    const active = ["active", "trialing", "past_due"].includes(String(o.status));
    await setPlan({ customer: String(o.customer) }, active ? "pro" : "free");
  } else if (evt.type === "customer.subscription.deleted") {
    await setPlan({ customer: String(o.customer) }, "free");
  }
  return NextResponse.json({ received: true });
}
