// UI helpers for the staff rank hierarchy. The canonical list lives in
// src/convex/teamRanks.ts (Convex can only bundle files inside its folder);
// this module re-exports it and adds presentation styles.

import type { TeamRank } from "../convex/teamRanks";
import { isTeamRank } from "../convex/teamRanks";

export {
  TEAM_RANKS,
  RANK_LEVEL,
  isTeamRank,
} from "../convex/teamRanks";
export type { TeamRank } from "../convex/teamRanks";

// Badge treatment per rank. Owner/Co-Owner red, Manager/SR-Staff blue,
// Admin/Moderator dark, JR-Staff/Trainee muted.
export const RANK_BADGE: Record<TeamRank, string> = {
  Owner: "bg-[var(--swiss-red)] text-white",
  "Co-Owner": "bg-[var(--swiss-red)] text-white",
  Manager: "bg-[var(--swiss-blue)] text-white",
  "SR-Staff": "bg-[var(--swiss-blue)] text-white",
  Admin: "bg-foreground text-background",
  Moderator: "bg-foreground text-background",
  "JR-Staff": "bg-muted text-foreground border border-foreground",
  Trainee: "bg-muted text-muted-foreground border border-border",
};

export const rankBadgeClass = (rank: string): string =>
  isTeamRank(rank)
    ? RANK_BADGE[rank]
    : "bg-muted text-foreground border border-foreground";
