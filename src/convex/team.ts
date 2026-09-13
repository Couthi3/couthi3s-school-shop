import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./support";

/* -------------------------------- public ---------------------------------- */

// The public team roster, ordered by rank (Owner first).
export const teamMembers = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("teamMembers").collect();
    return members.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/* --------------------------------- admin ---------------------------------- */

/** Add a team member. Highest rank entries should get the lowest sortOrder. */
export const addTeamMember = mutation({
  args: {
    name: v.string(),
    rank: v.string(),
    tagline: v.optional(v.string()),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const name = args.name.trim();
    const rank = args.rank.trim();
    const tagline = args.tagline?.trim() || undefined;
    const emoji = args.emoji?.trim() || undefined;
    if (name.length < 1) throw new Error("Name is required");
    if (name.length > 40) throw new Error("Name is too long (max 40)");
    if (rank.length < 1) throw new Error("Rank is required");
    if (rank.length > 30) throw new Error("Rank is too long (max 30)");
    if (tagline && tagline.length > 100)
      throw new Error("Tagline is too long (max 100)");
    if (emoji && Array.from(emoji).length > 4)
      throw new Error("Emoji is too long");

    const existing = await ctx.db.query("teamMembers").collect();
    const maxOrder = existing.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    await ctx.db.insert("teamMembers", {
      name,
      rank,
      tagline,
      emoji,
      sortOrder: maxOrder + 1,
    });
  },
});

/** Edit a team member's name, rank, tagline, or emoji. */
export const updateTeamMember = mutation({
  args: {
    memberId: v.id("teamMembers"),
    name: v.string(),
    rank: v.string(),
    tagline: v.optional(v.string()),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Team member not found");

    const name = args.name.trim();
    const rank = args.rank.trim();
    const tagline = args.tagline?.trim() || undefined;
    const emoji = args.emoji?.trim() || undefined;
    if (name.length < 1) throw new Error("Name is required");
    if (name.length > 40) throw new Error("Name is too long (max 40)");
    if (rank.length < 1) throw new Error("Rank is required");
    if (rank.length > 30) throw new Error("Rank is too long (max 30)");
    if (tagline && tagline.length > 100)
      throw new Error("Tagline is too long (max 100)");
    if (emoji && Array.from(emoji).length > 4)
      throw new Error("Emoji is too long");

    await ctx.db.patch(args.memberId, { name, rank, tagline, emoji });
  },
});

/** Remove a team member from the public roster. */
export const removeTeamMember = mutation({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.memberId);
  },
});

/** Move a team member up or down the roster (rank display order). */
export const moveTeamMember = mutation({
  args: {
    memberId: v.id("teamMembers"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const members = (await ctx.db.query("teamMembers").collect()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const index = members.findIndex((m) => m._id === args.memberId);
    if (index === -1) return;
    const swapIndex = args.direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= members.length) return;
    await ctx.db.patch(members[index]._id, { sortOrder: swapIndex + 1 });
    await ctx.db.patch(members[swapIndex]._id, { sortOrder: index + 1 });
  },
});
