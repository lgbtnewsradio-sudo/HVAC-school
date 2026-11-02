"use client";
import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Something tripped a breaker.</h1>
        <p className="mt-2 text-slate-400">An unexpected error occurred. Your progress is saved.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
