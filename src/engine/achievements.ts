/** Badge definitions. Evaluated server-side from a stats snapshot — never from client claims. */
export type BadgeStats = {
  lessonsCompleted: number;
  perfectLessons: number;
  levelsCompleted: string[]; // all lessons done
  levelExamsPassed: string[];
  streak: number;
  simPassedDistinct: number; // distinct scenarios passed with ≥80
  simSafeRuns: number; // finished sims with full safety marks
  simAGrades: number;
  bestGame: Record<string, number>; // game id → best score fraction
  certPassed: number;
  reviewCorrect: number;
  finalPassed: boolean;
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  xp: number;
  earned: (s: BadgeStats) => boolean;
};

export const BADGES: Badge[] = [
  { id: "first-lesson", title: "First Day on the Job", description: "Complete your first lesson.", icon: "Sparkles", tier: "bronze", xp: 10, earned: (s) => s.lessonsCompleted >= 1 },
  { id: "apprentice", title: "Apprentice", description: "Complete every lesson in Level 1 — HVAC Fundamentals.", icon: "GraduationCap", tier: "bronze", xp: 50, earned: (s) => s.levelsCompleted.includes("l1") },
  { id: "perfectionist", title: "Perfectionist", description: "Get every question right on the first try in 5 lessons.", icon: "Target", tier: "silver", xp: 40, earned: (s) => s.perfectLessons >= 5 },
  { id: "refrigeration-rookie", title: "Refrigeration Rookie", description: "Complete Level 3 — The Refrigeration Cycle.", icon: "RefreshCw", tier: "bronze", xp: 50, earned: (s) => s.levelsCompleted.includes("l3") },
  { id: "electrical-detective", title: "Electrical Detective", description: "Complete Level 4 and score 80%+ in Electrical Detective.", icon: "Zap", tier: "silver", xp: 75, earned: (s) => s.levelsCompleted.includes("l4") && (s.bestGame["electrical-detective"] ?? 0) >= 0.8 },
  { id: "wiring-wizard", title: "Wiring Wizard", description: "Wire every circuit perfectly in Wire It Right.", icon: "Cable", tier: "silver", xp: 50, earned: (s) => (s.bestGame["wire-it-right"] ?? 0) >= 1 },
  { id: "airflow-expert", title: "Airflow Expert", description: "Complete Level 5 — Airflow & Ductwork.", icon: "Wind", tier: "bronze", xp: 50, earned: (s) => s.levelsCompleted.includes("l5") },
  { id: "pressure-pro", title: "Pressure Pro", description: "Score 90%+ in Pressure Detective.", icon: "Gauge", tier: "silver", xp: 50, earned: (s) => (s.bestGame["pressure-detective"] ?? 0) >= 0.9 },
  { id: "safety-first", title: "Safety First", description: "Finish 3 field calls with zero safety violations.", icon: "ShieldCheck", tier: "silver", xp: 60, earned: (s) => s.simSafeRuns >= 3 },
  { id: "troubleshooting-specialist", title: "Troubleshooting Specialist", description: "Pass 5 different field calls with 80% or better.", icon: "Stethoscope", tier: "gold", xp: 120, earned: (s) => s.simPassedDistinct >= 5 },
  { id: "evidence-based", title: "Evidence-Based", description: "Earn an A grade on 3 field calls.", icon: "Microscope", tier: "gold", xp: 100, earned: (s) => s.simAGrades >= 3 },
  { id: "installation-pro", title: "Installation Pro", description: "Complete Level 7 and score 80%+ in the Installation Challenge.", icon: "HardHat", tier: "gold", xp: 100, earned: (s) => s.levelsCompleted.includes("l7") && (s.bestGame["installation-challenge"] ?? 0) >= 0.8 },
  { id: "streak-7", title: "Week Warrior", description: "Learn 7 days in a row.", icon: "Flame", tier: "bronze", xp: 50, earned: (s) => s.streak >= 7 },
  { id: "streak-30", title: "Unstoppable", description: "Learn 30 days in a row.", icon: "Flame", tier: "gold", xp: 200, earned: (s) => s.streak >= 30 },
  { id: "memory-master", title: "Memory Master", description: "Answer 50 spaced-review questions correctly.", icon: "Brain", tier: "silver", xp: 60, earned: (s) => s.reviewCorrect >= 50 },
  { id: "cert-ready", title: "Test Ready", description: "Pass a certification practice exam.", icon: "FileCheck", tier: "silver", xp: 60, earned: (s) => s.certPassed >= 1 },
  { id: "hvac-master", title: "HVAC Master", description: "Pass all ten level checkpoints and the final exam.", icon: "Crown", tier: "gold", xp: 500, earned: (s) => s.levelExamsPassed.length >= 10 && s.finalPassed },
];

export function newlyEarned(stats: BadgeStats, already: Set<string>): Badge[] {
  return BADGES.filter((b) => !already.has(b.id) && b.earned(stats));
}
