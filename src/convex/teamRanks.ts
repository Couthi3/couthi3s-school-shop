// Canonical staff rank hierarchy. Lives in the convex directory so the
// backend can import it (Convex cannot bundle files outside this folder);
// src/lib/team-ranks.ts re-exports it for the UI.

export const TEAM_RANKS = [
  "Owner",
  "Co-Owner",
  "Manager",
  "SR-Staff",
  "Admin",
  "Moderator",
  "JR-Staff",
  "Trainee",
] as const;

export type TeamRank = (typeof TEAM_RANKS)[number];

export const RANK_LEVEL: Record<TeamRank, number> = {
  Owner: 1,
  "Co-Owner": 2,
  Manager: 3,
  "SR-Staff": 4,
  Admin: 5,
  Moderator: 6,
  "JR-Staff": 7,
  Trainee: 8,
};

export const isTeamRank = (value: string): value is TeamRank =>
  (TEAM_RANKS as readonly string[]).includes(value);
