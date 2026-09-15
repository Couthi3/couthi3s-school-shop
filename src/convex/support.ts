import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import {
  ADMIN_RANK_LEVEL,
  CAP,
  isAdminRank,
  type AdminRank,
} from "./adminRanks";

/* -------------------------------- helpers --------------------------------- */

/**
 * The signed-in viewer's effective admin level (0 = not an admin):
 * - flagged user with an adminRank → that rank's level
 * - flagged user named Couthi3 without a rank → Owner (5)
 * - flagged user without a rank → Trainee (1, view-only)
 * - browser session granted by the owner credential sign-in → Owner (5)
 */
export const currentAdminLevel = async (
  ctx: QueryCtx | MutationCtx,
): Promise<number> => {
  const userId = await getAuthUserId(ctx);
  if (userId !== null) {
    const user = await ctx.db.get(userId);
    if (user?.isAdmin === true) {
      if (user.adminRank !== undefined && isAdminRank(user.adminRank))
        return ADMIN_RANK_LEVEL[user.adminRank];
      return user.name === HEAD_ADMIN_USERNAME
        ? ADMIN_RANK_LEVEL.owner
        : ADMIN_RANK_LEVEL.trainee;
    }
  }
  const sessionId = await getAuthSessionId(ctx);
  if (sessionId === null) return 0;
  const grant = await ctx.db
    .query("adminSessions")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  return grant !== null ? ADMIN_RANK_LEVEL.owner : 0;
};

/** Throws unless the viewer's admin level is at least `minLevel`. */
export const requireAdminLevel = async (
  ctx: QueryCtx | MutationCtx,
  minLevel: number,
) => {
  const level = await currentAdminLevel(ctx);
  if (level < minLevel) throw new Error("Admin access required");
};

// Site admins are the flagged user OR a browser session granted via the
// admin-panel credential sign-in (same rule as admin.ts).
export const requireAdmin = async (ctx: QueryCtx | MutationCtx) =>
  requireAdminLevel(ctx, CAP.viewPanel);

/**
 * The single account allowed to manage staff ranks: the site owner's
 * credential account. Must match ADMIN_USERNAME in admin.ts.
 */
export const HEAD_ADMIN_USERNAME = "Couthi3";

/**
 * Stricter than requireAdmin: only the Owner (Couthi3) passes — either the
 * flagged user with that exact username, or a browser session granted admin
 * by signing in with the owner credentials.
 */
export const requireHeadAdmin = async (ctx: QueryCtx | MutationCtx) =>
  requireAdminLevel(ctx, CAP.manageAccounts);

/** Whether the current viewer is the Owner account (for hiding UI). */
export const isHeadAdmin = query({
  args: {},
  handler: async (ctx) => (await currentAdminLevel(ctx)) >= CAP.manageAccounts,
});

/** The viewer's admin level — lets the panel show/hide powers by rank. */
export const myAdminLevel = query({
  args: {},
  handler: async (ctx) => currentAdminLevel(ctx),
});

/* ------------------------------ user functions ---------------------------- */

/**
 * File a ticket. Guests can submit (contact string only); signed-in users
 * get their account attached automatically.
 */
export const createTicket = mutation({
  args: {
    category: v.union(v.literal("issue"), v.literal("suggestion"), v.literal("staff")),
    title: v.string(),
    body: v.string(),
    contact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const body = args.body.trim();
    const contact = args.contact?.trim() || undefined;
    if (title.length < 3) throw new Error("Title is too short");
    if (title.length > 80) throw new Error("Title is too long (max 80)");
    if (body.length < 10) throw new Error("Please add some detail (min 10 chars)");
    if (body.length > 2000) throw new Error("Ticket body is too long (max 2000)");
    if (contact && contact.length > 60)
      throw new Error("Contact is too long (max 60)");

    const userId = await getAuthUserId(ctx);

    await ctx.db.insert("tickets", {
      category: args.category,
      title,
      body,
      contact,
      userId: userId ?? undefined,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

// The signed-in user's own tickets, newest first.
export const myTickets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const all = await ctx.db.query("tickets").collect();
    return all
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/* ------------------------------ admin functions --------------------------- */

// All tickets for the admin dashboard, newest first.
export const allTickets = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminLevel(ctx, CAP.viewPanel);
    const tickets = await ctx.db.query("tickets").collect();
    return tickets.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Update a ticket's status and/or attach a private admin note. */
export const updateTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.optional(
      v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved")),
    ),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminLevel(ctx, CAP.tickets);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    if (args.status !== undefined) {
      await ctx.db.patch(args.ticketId, { status: args.status });
    }
    if (args.adminNote !== undefined) {
      const note = args.adminNote.trim();
      if (note.length > 500)
        throw new Error("Note is too long (max 500)");
      await ctx.db.patch(args.ticketId, {
        adminNote: note || undefined,
      });
    }
  },
});

/** Delete a ticket permanently. */
// Record the GitHub issue created for a ticket (called after the
// createIssueFromTicket action succeeds). Admin with tickets cap.
export const linkTicketIssue = mutation({
  args: {
    ticketId: v.id("tickets"),
    issueUrl: v.string(),
    issueNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdminLevel(ctx, CAP.tickets);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.patch(args.ticketId, {
      githubIssueUrl: args.issueUrl,
      githubIssueNumber: args.issueNumber,
    });
  },
});

export const deleteTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    await requireAdminLevel(ctx, CAP.tickets);
    await ctx.db.delete(args.ticketId);
  },
});

/** Open + in-progress counts, shown as a badge in the admin panel nav. */
export const openTicketCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminLevel(ctx, CAP.viewPanel);
    const tickets = await ctx.db.query("tickets").collect();
    return tickets.filter((t) => t.status !== "resolved").length;
  },
});
