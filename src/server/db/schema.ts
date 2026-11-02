import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  date,
  real,
} from "drizzle-orm/pg-core";

/** Registered students and staff. Role drives authorization; plan drives entitlements. */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("student"), // student | admin
    plan: text("plan").notNull().default("free"), // free | pro
    mode: text("mode").notNull().default("beginner"), // beginner | advanced
    timezone: text("timezone").notNull().default("UTC"),
    leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
    xp: integer("xp").notNull().default(0),
    lastPath: text("last_path"),
    stripeCustomerId: text("stripe_customer_id"),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the opaque cookie token; the raw token is never stored. */
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** One row per completed lesson attempt (best score kept on lesson_progress). */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    bestScore: integer("best_score").notNull().default(0), // percent
    attempts: integer("attempts").notNull().default(1),
    lastReplayXpDate: date("last_replay_xp_date"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/** Every graded answer (lessons, quizzes, review, exams). Feeds mastery + history. */
export const answers = pgTable(
  "answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    correct: boolean("correct").notNull(),
    context: text("context").notNull(), // lesson | review | quiz | exam
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("answers_user_idx").on(t.userId, t.createdAt)],
);

/** Leitner-style spaced repetition card state per question per user. */
export const reviewCards = pgTable(
  "review_cards",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    box: integer("box").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lapses: integer("lapses").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] }), index("review_due_idx").on(t.userId, t.dueAt)],
);

/** Ledger of every XP grant. users.xp is the sum; ledger allows audit and weekly boards. */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    source: text("source").notNull(), // lesson | game | sim | review | exam | challenge | achievement
    ref: text("ref").notNull(),
    day: date("day").notNull(), // local day in user's timezone
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("xp_user_day_idx").on(t.userId, t.day)],
);

export const achievements = pgTable(
  "achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

/**
 * Server-held state for a game, exam, or field-simulator run. The private
 * payload (answers, hidden fault, action log) never leaves the server.
 */
export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // game | sim | exam | speed
    refId: text("ref_id").notNull(), // game id / scenario id / exam id
    state: jsonb("state").$type<Record<string, unknown>>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    score: integer("score"),
    maxScore: integer("max_score"),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    result: jsonb("result").$type<Record<string, unknown>>(),
  },
  (t) => [index("runs_user_kind_idx").on(t.userId, t.kind, t.refId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // lesson | term
    refId: text("ref_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.refId] })],
);

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  levelId: text("level_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  score: real("score").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Admin-authored content that overrides or extends the bundled curriculum. */
export const contentOverrides = pgTable(
  "content_overrides",
  {
    kind: text("kind").notNull(), // lesson | question | scenario
    id: text("id").notNull(),
    data: jsonb("data").$type<unknown>().notNull(),
    published: boolean("published").notNull().default(true),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detail: jsonb("detail").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
