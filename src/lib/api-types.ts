// Shapes exchanged between route handlers and the browser. No server imports here.

export type Role = "student" | "lecturer" | "ta";

export type Viewer = { id: string; loginId: string; name: string; nickname: string; role: Role };

export type AvatarDto = { hat?: string; tool?: string; pet?: string; color?: string };

export type LevelDto = { level: number; xp: number; into: number; span: number };

export type CourseCard = {
  id: string;
  code: string;
  title: string;
  language: string;
  isSample: boolean;
  live: { sessionId: string; status: "lobby" | "live" } | null;
};

export type StudentHome = {
  viewer: Viewer;
  level: LevelDto;
  avatar: AvatarDto;
  badgeCount: number;
  almanacCount: number;
  courses: CourseCard[];
};

export type StaffCourseCard = CourseCard & {
  joinCode: string;
  enrolled: number;
  exercises: number;
  canEdit: boolean;
  canRun: boolean;
};

export type ExerciseSummary = { id: string; title: string; language: string; steps: number; dealable: number; played: boolean };

export type SessionSummary = {
  id: string;
  status: "lobby" | "live" | "closed";
  mode: "solo" | "teams";
  createdAt: string;
  rounds: number;
  participants: number;
};

export type CourseDetail = {
  course: StaffCourseCard;
  exercises: ExerciseSummary[];
  sessions: SessionSummary[];
};

export type ExerciseRowDto = {
  id?: string;
  pseudocode: string;
  code: string;
  indent: number;
  given: boolean;
};

export type ExerciseDto = {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  description: string;
  language: string;
  rows: (ExerciseRowDto & { id: string; played: boolean })[];
  played: boolean;
  canEdit: boolean;
};

export type RoundStatus = "pending" | "running" | "paused" | "ended" | "revealed";

export type TimerDto = {
  status: RoundStatus;
  deadlineAt: string | null;
  pausedRemainingMs: number | null;
  timeLimitS: number;
};

export type SlotDto = {
  id: string;
  position: number;
  pseudocode: string;
  indent: number;
  given: boolean;
  // Present for Given Slots, the student's own correct Placements, and after the reveal.
  code: string | null;
};

export type CardDto = { cardId: string; code: string; placedSlotId: string | null };

export type BadgeEarned = { id: string; name: string; description: string; icon: string };

export type TeamDto = { index: number; name: string; color: string; score: number; members: number };

export type StudentState = {
  serverNow: string;
  session: {
    id: string;
    status: "lobby" | "live" | "closed";
    mode: "solo" | "teams";
    courseCode: string;
    courseTitle: string;
    roundIndex: number;
    roundCount: number;
    version: number;
  };
  me: {
    joined: boolean;
    nickname: string;
    points: number;
    rank: number | null;
    of: number;
    team: TeamDto | null;
    streak: number;
  };
  round: null | {
    id: string;
    position: number;
    timer: TimerDto;
    exercise: { title: string; language: string };
    slots: SlotDto[];
    hand: CardDto[];
    revealed: boolean;
  };
  result: null | {
    roundPoints: number;
    rank: number;
    previousRank: number | null;
    harvested: boolean;
    badges: BadgeEarned[];
  };
  teams: TeamDto[];
};

export type PlaceResult = {
  correct: boolean;
  points: number;
  attempt: number;
  streak: number;
  placementId: string;
  badges: BadgeEarned[];
  handDone: boolean;
};

export type ClassSlotDto = SlotDto & {
  heldBy: number;
  placedCorrect: number;
  firstTryRate: number | null;
};

export type LeaderDto = { nickname: string; points: number; level: number; avatar: AvatarDto };

export type ProjectorState = {
  serverNow: string;
  session: {
    id: string;
    status: "lobby" | "live" | "closed";
    mode: "solo" | "teams";
    courseCode: string;
    courseTitle: string;
    joinCode: string;
    roundIndex: number;
    roundCount: number;
    participants: number;
  };
  round: null | {
    timer: TimerDto;
    exercise: { title: string; language: string };
    slots: ClassSlotDto[];
    revealed: boolean;
  };
  progress: { placed: number; dealt: number };
  top: LeaderDto[];
  teams: TeamDto[];
  spotlight: null | { nickname: string; reason: string; step: number; pseudocode: string };
  feed: { nickname: string; kind: "sprout" | "wilt"; at: string }[];
  lobbyNames: string[];
};

export type ConsoleParticipant = {
  userId: string;
  name: string;
  loginId: string;
  nickname: string;
  isSimulated: boolean;
  team: number | null;
  points: number;
  placed: number;
  hand: number;
  wrong: number;
};

export type ConsolePlacement = {
  id: string;
  userId: string;
  name: string;
  nickname: string;
  snippet: string;
  slotPosition: number;
  slotPseudocode: string;
  correct: boolean;
  attempt: number;
  reason: string | null;
  spotlighted: boolean;
  at: string;
};

export type SlotStatDto = {
  slotId: string;
  position: number;
  pseudocode: string;
  heldBy: number;
  placedCorrect: number;
  firstTryCorrect: number;
  firstTryRate: number | null;
  commonWrong: { slotId: string; position: number; pseudocode: string; holders: number; share: number } | null;
};

export type ConsoleState = {
  serverNow: string;
  session: ProjectorState["session"] & {
    handSize: number;
    teamCount: number;
    rounds: { position: number; exerciseTitle: string; timeLimitS: number; status: RoundStatus }[];
  };
  round: null | { position: number; timer: TimerDto; exercise: { title: string; language: string } };
  participants: ConsoleParticipant[];
  placements: ConsolePlacement[];
  stats: SlotStatDto[];
  progress: { placed: number; dealt: number };
};

export type ControlAction = "start" | "pause" | "resume" | "end" | "reveal" | "next" | "close";

export type DashboardStudent = {
  userId: string;
  name: string;
  loginId: string;
  nickname: string;
  isSimulated: boolean;
  rounds: number;
  placements: number;
  firstTryRate: number | null;
  avgRetries: number | null;
  points: number;
  trend: number[];
};

export type DashboardExercise = { exerciseId: string; title: string; rounds: number; steps: SlotStatDto[] };

export type CourseDashboard = {
  course: { id: string; code: string; title: string; language: string };
  students: DashboardStudent[];
  exercises: DashboardExercise[];
};

export type StudentDetail = {
  student: { userId: string; name: string; loginId: string; nickname: string; isSimulated: boolean };
  course: { id: string; code: string; title: string };
  placements: {
    id: string;
    at: string;
    exerciseTitle: string;
    snippet: string;
    slotPosition: number;
    slotPseudocode: string;
    correct: boolean;
    attempt: number;
    points: number;
    reason: string | null;
  }[];
};

export type TaOverview = {
  courses: {
    id: string;
    code: string;
    title: string;
    language: string;
    isSample: boolean;
    enrolled: number;
    sessions: number;
    rounds: number;
    placements: number;
    firstTryRate: number | null;
    avgRetries: number | null;
    hardest: { exerciseTitle: string; position: number; pseudocode: string; firstTryRate: number } | null;
  }[];
};

export type ProfileDto = {
  viewer: Viewer;
  level: LevelDto;
  avatar: AvatarDto;
  unlocked: { id: string; slot: "hat" | "tool" | "pet"; name: string; level: number }[];
  badges: (BadgeEarned & { earnedAt: string | null })[];
  almanac: { exerciseId: string; title: string; language: string; courseCode: string; bestPoints: number; firstAt: string }[];
};
