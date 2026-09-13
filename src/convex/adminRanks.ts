// Staff rank ladder for ADMIN accounts (separate from the public team roster
// ranks). Each level unlocks more of the admin panel; the Owner (Couthi3)
// sits above everything and is the only account that can mint new admins.
//
// Level 5 — Owner: everything, incl. creating/removing admin accounts
// Level 4 — Co-Owner: everything except account management
// Level 3 — Manager: bans, featured, edit/delete shops, announcements, tickets
// Level 2 — Staff: tickets, announcements, edit shops
// Level 1 — Trainee: view-only panel access

export const ADMIN_RANKS = [
  "trainee",
  "staff",
  "manager",
  "co_owner",
  "owner",
] as const;

export type AdminRank = (typeof ADMIN_RANKS)[number];

export const ADMIN_RANK_LEVEL: Record<AdminRank, number> = {
  trainee: 1,
  staff: 2,
  manager: 3,
  co_owner: 4,
  owner: 5,
};

// Human-facing labels for the UI.
export const ADMIN_RANK_LABEL: Record<AdminRank, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  manager: "Manager",
  staff: "Staff",
  trainee: "Trainee",
};

// Minimum level required for each admin capability. Mutations call
// requireAdminLevel(ctx, CAP.x) so the ladder is enforced server-side.
export const CAP = {
  viewPanel: 1,
  tickets: 2,
  announcements: 3,
  editShops: 3,
  featured: 3,
  bans: 4,
  deleteShops: 4,
  manageAccounts: 5,
} as const;

export const isAdminRank = (value: string): value is AdminRank =>
  (ADMIN_RANKS as readonly string[]).includes(value);
