import type { AnyGame } from "./core";
import { buildTheSystem, matchTheComponent, nameThatPart } from "./components-games";
import { electricalDetective, wireItRight } from "./electrical-games";
import { findTheFault, pressureDetective, repairShop } from "./diag-games";
import { crossword, installationChallenge, mysteryCall, speedRound } from "./misc-games";

export const GAMES: AnyGame[] = [
  nameThatPart,
  buildTheSystem,
  wireItRight,
  findTheFault,
  pressureDetective,
  crossword,
  matchTheComponent,
  repairShop,
  installationChallenge,
  electricalDetective,
  speedRound,
  mysteryCall,
];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** Metadata safe for listing pages. */
export const GAME_INFO = GAMES.map(({ id, letter, title, tagline, description, skills, icon, pro, timeLimit }) => ({ id, letter, title, tagline, description, skills, icon, pro, timeLimit }));
export type GameInfo = (typeof GAME_INFO)[number];
