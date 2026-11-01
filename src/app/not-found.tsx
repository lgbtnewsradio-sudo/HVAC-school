import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="bg-grid grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="font-display text-7xl font-bold text-white/10">404</div>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">No airflow here.</h1>
        <p className="mt-2 text-slate-400">The page you&apos;re looking for doesn&apos;t exist.</p>
        <LinkButton href="/" className="mt-6">Back home</LinkButton>
      </div>
    </div>
  );
}
