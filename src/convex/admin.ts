import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no lookalike characters

const randomCode = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
};

const currentIsAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return false;
  const user = await ctx.db.get(userId);
  return user?.isAdmin === true;
};

const requireUserId = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
};

/* ------------------------------- admin state ------------------------------- */

export const adminState = query({
  args: {},
  handler: async (ctx) => {
    const invites = await ctx.db.query("adminInvites").collect();
    const hasAdmin = invites.length > 0;
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { isAdmin: false, hasAdmin };
    const user = await ctx.db.get(userId);
    return { isAdmin: user?.isAdmin === true, hasAdmin };
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => currentIsAdmin(ctx),
});

export const claimAdmin = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const code = args.code.trim().toUpperCase();
    const invite = await ctx.db
      .query("adminInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!invite) throw new Error("Invalid admin code");
    await ctx.db.patch(userId, { isAdmin: true });
    await ctx.db.delete(invite._id);
  },
});

export const createAdminInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const hasAdmin = (await ctx.db.query("adminInvites").collect()).length > 0;
    if (hasAdmin && !(await currentIsAdmin(ctx))) {
      throw new Error("Admin access required");
    }
    // Keep at most one unclaimed invite code at a time.
    const existing = await ctx.db.query("adminInvites").collect();
    if (existing.length > 0) return existing[0].code;
    const code = randomCode(8);
    await ctx.db.insert("adminInvites", { code, createdAt: Date.now() });
    return code;
  },
});

/* ---------------------------- featured management -------------------------- */

export const allShops = query({
  args: {},
  handler: async (ctx) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    return await ctx.db.query("shops").collect();
  },
});

export const setFeatured = mutation({
  args: { shopId: v.id("shops"), featured: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (args.featured) {
      const maxOrder = (await ctx.db.query("shops").collect())
        .filter((s) => s.featured)
        .reduce((m, s) => Math.max(m, s.featuredOrder), 0);
      await ctx.db.patch(args.shopId, {
        featured: true,
        featuredOrder: maxOrder + 1,
      });
    } else {
      await ctx.db.patch(args.shopId, { featured: false });
    }
  },
});

export const moveFeatured = mutation({
  args: {
    shopId: v.id("shops"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const featured = (await ctx.db.query("shops").collect())
      .filter((s) => s.featured)
      .sort((a, b) => a.featuredOrder - b.featuredOrder);
    const index = featured.findIndex((s) => s._id === args.shopId);
    if (index === -1) return;
    const swapIndex = args.direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= featured.length) return;
    await ctx.db.patch(featured[index]._id, { featuredOrder: swapIndex + 1 });
    await ctx.db.patch(featured[swapIndex]._id, { featuredOrder: index + 1 });
  },
});
