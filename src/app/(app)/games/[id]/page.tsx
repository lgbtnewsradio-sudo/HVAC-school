import { notFound, redirect } from "next/navigation";
import { pageCtx } from "@/server/page-ctx";
import { canAccessPro } from "@/server/progress";
import { GAME_INFO } from "@/engine/games";
import { GamePlayer } from "@/components/games/game-player";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: GAME_INFO.find((g) => g.id === id)?.title ?? "Game" };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await pageCtx(`/games/${id}`);
  const info = GAME_INFO.find((g) => g.id === id);
  if (!info) notFound();
  if (info.pro && !canAccessPro(user)) redirect("/pricing?from=game");
  return <GamePlayer info={info} />;
}
