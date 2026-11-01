"use client";
import type { GameInfo } from "@/engine/games";
import { GameShell, type PlayerProps } from "./shell";
import { BuildSystemPlayer, MatchComponentPlayer, NameThatPartPlayer } from "./component-players";
import { ElectricalDetectivePlayer, WireItRightPlayer } from "./electrical-players";
import { FindTheFaultPlayer, PressureDetectivePlayer, RepairShopPlayer } from "./diag-players";
import { CrosswordPlayer, InstallationPlayer, MysteryPlayer, SpeedRoundPlayer } from "./misc-players";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLAYERS: Record<string, (p: PlayerProps<any>) => React.ReactNode> = {
  "name-that-part": NameThatPartPlayer,
  "build-the-system": BuildSystemPlayer,
  "wire-it-right": WireItRightPlayer,
  "find-the-fault": FindTheFaultPlayer,
  "pressure-detective": PressureDetectivePlayer,
  crossword: CrosswordPlayer,
  "match-the-component": MatchComponentPlayer,
  "repair-shop": RepairShopPlayer,
  "installation-challenge": InstallationPlayer,
  "electrical-detective": ElectricalDetectivePlayer,
  "speed-round": SpeedRoundPlayer,
  "mystery-call": MysteryPlayer,
};

export function GamePlayer({ info }: { info: GameInfo }) {
  const P = PLAYERS[info.id];
  return <GameShell info={info} render={(p) => <P {...p} />} />;
}
