import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { stripeConfigured, stripePost } from "@/server/stripe";
import { BRAND } from "@/lib/brand";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const origin = new URL(req.url).origin || BRAND.url;
  if (!user) return NextResponse.redirect(`${origin}/register?next=/pricing`, 303);
  if (!stripeConfigured()) return NextResponse.redirect(`${origin}/pricing?billing=unavailable`, 303);
  const session = await stripePost<{ url: string }>("checkout/sessions", {
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
  });
  return NextResponse.redirect(session.url, 303);
}
