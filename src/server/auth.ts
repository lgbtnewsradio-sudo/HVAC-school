import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { SESSION_DAYS, userForToken, type SessionUser } from "./auth-core";

export const SESSION_COOKIE = "hvac_session";

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Current user for this request (deduplicated per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const db = await getDb();
  return userForToken(db, await sessionToken());
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

/** Authorization gate for every admin page and admin server action. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export type { SessionUser };
