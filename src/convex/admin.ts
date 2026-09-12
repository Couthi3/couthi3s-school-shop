import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

/* ------------------------------ credentials ------------------------------- */

// Site administrator credentials. Password is compared in constant time so the
// check never leaks through response timing.
const ADMIN_USERNAME = "Couthi3";
const ADMIN_PASSWORD = "Iamsupercool123couthi3";

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

/* -------------------------------- helpers --------------------------------- */

const requireUserId = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
};

// True when the current user is flagged admin OR the current browser session
// was granted admin via the credential sign-in on the admin page.
const currentIsAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId !== null) {
    const user = await ctx.db.get(userId);
    if (user?.isAdmin === true) return true;
  }
  const sessionId = await getAuthSessionId(ctx);
  if (sessionId === null) return false;
  const grant = await ctx.db
    .query("adminSessions")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .first();
  return grant !== null;
};

/* ------------------------------- admin state ------------------------------ */

export const adminState = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await currentIsAdmin(ctx);
    const signedIn = (await getAuthUserId(ctx)) !== null;
    return { isAdmin, signedIn };
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => currentIsAdmin(ctx),
});

/**
 * Sign in as site admin with username + password. Grants the current browser
 * session admin rights. The client establishes an (anonymous) session first.
 */
export const adminSignIn = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const usernameOk = timingSafeEqual(args.username, ADMIN_USERNAME);
    const passwordOk = timingSafeEqual(args.password, ADMIN_PASSWORD);
    if (!usernameOk || !passwordOk) {
      throw new Error("Incorrect username or password");
    }

    const sessionId = await getAuthSessionId(ctx);
    if (sessionId === null) {
      throw new Error("No active session — reload the page and try again");
    }

    const existing = await ctx.db
      .query("adminSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (!existing) {
      await ctx.db.insert("adminSessions", {
        sessionId,
        createdAt: Date.now(),
      });
    }
    return { ok: true as const };
  },
});

/** Drop this browser's admin grant. */
export const adminSignOut = mutation({
  args: {},
  handler: async (ctx) => {
    const sessionId = await getAuthSessionId(ctx);
    if (sessionId === null) return;
    const grant = await ctx.db
      .query("adminSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    if (grant) await ctx.db.delete(grant._id);
  },
});

/* ---------------------------- featured management ------------------------- */

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

// keep requireUserId referenced for future admin mutations
void requireUserId;
