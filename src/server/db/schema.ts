import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  loginId: text("login_id").notNull().unique(),
  name: text("name").notNull(),
  nickname: text("nickname").notNull(),
  role: text("role", { enum: ["student", "lecturer", "ta"] }).notNull(),
  passwordHash: text("password_hash").notNull(),
  xp: integer("xp").notNull().default(0),
  avatar: jsonb("avatar").$type<Avatar>().notNull().default({}),
  isSimulated: boolean("is_simulated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Avatar = { hat?: string; tool?: string; pet?: string; color?: string };

export const loginSessions = pgTable("login_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  language: text("language").notNull(),
  joinCode: text("join_code").notNull().unique(),
  lecturerId: uuid("lecturer_id").notNull().references(() => users.id),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courseTas = pgTable(
  "course_tas",
  {
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.userId] })],
);

export const enrolments = pgTable(
  "enrolments",
  {
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.userId] })],
);

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  language: text("language").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row = one pseudocode step (Slot) paired with the Snippet that belongs in it.
export const exerciseRows = pgTable(
  "exercise_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    pseudocode: text("pseudocode").notNull().default(""),
    code: text("code").notNull(),
    indent: integer("indent").notNull().default(0),
    given: boolean("given").notNull().default(false),
  },
  (t) => [uniqueIndex("exercise_rows_position").on(t.exerciseId, t.position)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    openedBy: uuid("opened_by").notNull().references(() => users.id),
    mode: text("mode", { enum: ["solo", "teams"] }).notNull(),
    handSize: integer("hand_size").notNull(),
    teamCount: integer("team_count").notNull().default(4),
    status: text("status", { enum: ["lobby", "live", "closed"] }).notNull().default("lobby"),
    currentRound: integer("current_round").notNull().default(-1),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("sessions_course").on(t.courseId)],
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    timeLimitS: integer("time_limit_s").notNull(),
    status: text("status", { enum: ["pending", "running", "paused", "ended", "revealed"] })
      .notNull()
      .default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    pausedRemainingMs: integer("paused_remaining_ms"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    dealSeed: integer("deal_seed").notNull().default(0),
  },
  (t) => [uniqueIndex("rounds_position").on(t.sessionId, t.position)],
);

export const participants = pgTable(
  "participants",
  {
    sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    team: integer("team"),
    seat: integer("seat").notNull(),
    points: integer("points").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    rankAtRoundStart: integer("rank_at_round_start"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })],
);

// cardId is what the student's device sees; rowId equals the correct Slot's id,
// so it never leaves the server before the solution is revealed.
export const hands = pgTable(
  "hands",
  {
    cardId: uuid("card_id").primaryKey().defaultRandom(),
    roundId: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rowId: uuid("row_id").notNull().references(() => exerciseRows.id, { onDelete: "cascade" }),
    placedSlotId: uuid("placed_slot_id").references(() => exerciseRows.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("hands_round_user_row").on(t.roundId, t.userId, t.rowId), index("hands_round").on(t.roundId)],
);

export const placements = pgTable(
  "placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rowId: uuid("row_id").notNull().references(() => exerciseRows.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id").notNull().references(() => exerciseRows.id, { onDelete: "cascade" }),
    correct: boolean("correct").notNull(),
    attempt: integer("attempt").notNull(),
    points: integer("points").notNull().default(0),
    reason: text("reason"),
    spotlighted: boolean("spotlighted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("placements_round").on(t.roundId), index("placements_user").on(t.userId)],
);

export const badges = pgTable(
  "badges",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badge: text("badge").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badge] })],
);

export const almanac = pgTable(
  "almanac",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    firstAt: timestamp("first_at", { withTimezone: true }).notNull().defaultNow(),
    bestPoints: integer("best_points").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })],
);
