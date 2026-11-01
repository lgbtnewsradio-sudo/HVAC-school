import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; changed?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect(sp.next?.startsWith("/") ? sp.next : "/dashboard");
  return (
    <div className="bg-grid px-4 py-16">
      <div className="glass mx-auto max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
        <p className="mb-6 mt-1 text-slate-400">Pick up right where you left off — on any device.</p>
        <LoginForm next={sp.next} changed={!!sp.changed} />
      </div>
    </div>
  );
}
