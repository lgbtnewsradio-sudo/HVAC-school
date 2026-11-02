import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { stripeConfigured, stripePost } from "@/server/stripe";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, 303);
  const db = await getDb();
  const [row] = await db.select({ c: users.stripeCustomerId }).from(users).where(eq(users.id, user.id));
  if (!stripeConfigured() || !row?.c) return NextResponse.redirect(`${origin}/profile?billing=none`, 303);
  const s = await stripePost<{ url: string }>("billing_portal/sessions", { customer: row.c, return_url: `${origin}/profile` });
  return NextResponse.redirect(s.url, 303);
}
