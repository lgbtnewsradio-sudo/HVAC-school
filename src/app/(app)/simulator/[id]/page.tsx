import { notFound, redirect } from "next/navigation";
import { pageCtx } from "@/server/page-ctx";
import { getSimRun, scenarioAccess } from "@/server/play";
import { publicScenario } from "@/engine/sim/engine";
import { SimLauncher, SimRunner } from "@/components/sim-runner";

export const metadata = { title: "Service call" };

export default async function SimPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ run?: string }> }) {
  const { id } = await params;
  const { run } = await searchParams;
  const { user, db, scenarios } = await pageCtx(`/simulator/${id}`);
  const s = scenarios.find((x) => x.id === id);
  if (!s) notFound();
  if (scenarioAccess(user, s)) redirect("/pricing?from=sim");
  if (run) {
    const r = await getSimRun(db, user, scenarios, run);
    if (r.ok && r.scenario.id === id) return <SimRunner runId={r.runId} scenario={r.scenario} state={r.state} mode={r.mode} score={r.score} />;
  }
  return <SimLauncher scenario={publicScenario(s)} mode={user.mode} />;
}
