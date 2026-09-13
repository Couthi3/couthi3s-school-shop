import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireHeadAdmin } from "./support";
import { isTeamRank, RANK_LEVEL, type TeamRank } from "./teamRanks";

/* -------------------------------- public ---------------------------------- */

// The public team roster, sorted by rank (Owner first), then by insertion
// order within the same rank. Image URLs are resolved server-side.
export const teamMembers = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("teamMembers").collect();
    const resolved = await Promise.all(
      members.map(async (m) => ({
        _id: m._id,
        name: m.name,
        rank: m.rank,
        tagline: m.tagline ?? null,
        imageUrl: m.imageId
          ? ((await ctx.storage.getUrl(m.imageId)) ?? null)
          : null,
        sortOrder: m.sortOrder,
      })),
    );
    return resolved.sort((a, b) => {
      const la = RANK_LEVEL[a.rank as TeamRank] ?? 99;
      const lb = RANK_LEVEL[b.rank as TeamRank] ?? 99;
      if (la !== lb) return la - lb;
      return a.sortOrder - b.sortOrder;
    });
  },
});

/* --------------------------------- admin ---------------------------------- */

/**
 * Create an upload URL for a staff photo. The client POSTs the file to it,
 * then passes the returned storage id to add/update.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireHeadAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Add a team member. */
export const addTeamMember = mutation({
  args: {
    name: v.string(),
    rank: v.string(),
    tagline: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireHeadAdmin(ctx);

    const name = args.name.trim();
    const rank = args.rank.trim();
    const tagline = args.tagline?.trim() || undefined;
    if (name.length < 1) throw new Error("Name is required");
    if (name.length > 40) throw new Error("Name is too long (max 40)");
    if (!isTeamRank(rank)) throw new Error("Pick one of the listed ranks");
    if (tagline && tagline.length > 100)
      throw new Error("Tagline is too long (max 100)");

    const existing = await ctx.db.query("teamMembers").collect();
    const maxOrder = existing.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    await ctx.db.insert("teamMembers", {
      name,
      rank,
      tagline,
      imageId: args.imageId,
      sortOrder: maxOrder + 1,
    });
  },
});

/** Edit a team member. Pass imageId: null to clear the photo, or a new storage id to replace it. */
export const updateTeamMember = mutation({
  args: {
    memberId: v.id("teamMembers"),
    name: v.string(),
    rank: v.string(),
    tagline: v.optional(v.string()),
    imageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    await requireHeadAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Team member not found");

    const name = args.name.trim();
    const rank = args.rank.trim();
    const tagline = args.tagline?.trim() || undefined;
    if (name.length < 1) throw new Error("Name is required");
    if (name.length > 40) throw new Error("Name is too long (max 40)");
    if (!isTeamRank(rank)) throw new Error("Pick one of the listed ranks");
    if (tagline && tagline.length > 100)
      throw new Error("Tagline is too long (max 100)");

    const patch: Record<string, unknown> = { name, rank, tagline };
    if (args.imageId !== undefined) {
      // Delete the old image so storage doesn't fill with orphans.
      if (member.imageId) await ctx.storage.delete(member.imageId);
      patch.imageId = args.imageId;
    }
    await ctx.db.patch(args.memberId, patch as never);
  },
});

/** Remove a team member (and their photo from storage). */
export const removeTeamMember = mutation({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    await requireHeadAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) return;
    if (member.imageId) await ctx.storage.delete(member.imageId);
    await ctx.db.delete(args.memberId);
  },
});

/** Explicit reorder (kept for fine-tuning within a rank group). */
export const moveTeamMember = mutation({
  args: {
    memberId: v.id("teamMembers"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireHeadAdmin(ctx);
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
