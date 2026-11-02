import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create your account" };

export default async function Register() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="bg-grid px-4 py-16">
      <div className="glass mx-auto max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-bold text-white">Start learning HVAC — free</h1>
        <p className="mb-6 mt-1 text-slate-400">No experience needed. Your progress saves automatically.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
