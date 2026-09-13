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

/* ------------------------------ shop deletion ----------------------------- */

// Permanently delete a shop and everything attached to it: items, orders,
// codes, and code sessions. Used to remove inappropriate shops.
export const deleteShop = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    // Delete every order in the shop.
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    for (const order of orders) await ctx.db.delete(order._id);

    // Delete every item.
    const items = await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);

    // Delete the shop's code(s) and any unlocked code sessions.
    const codes = await ctx.db
      .query("shopCodes")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    for (const code of codes) await ctx.db.delete(code._id);

    const sessions = await ctx.db
      .query("shopSessions")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);

    await ctx.db.delete(args.shopId);
    return { ok: true as const };
  },
});

/* --------------------------------- users ---------------------------------- */

// Moderate users: list accounts (with ban state) and ban/unban.
// Guest (anonymous) sessions are excluded — only real accounts are listed.
export const allUsers = query({
  args: {},
  handler: async (ctx) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.isAnonymous !== true)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        isAdmin: u.isAdmin === true,
        banned: u.banned === true,
        bannedAt: u.bannedAt ?? null,
      }));
  },
});

/**
 * Ban or unban a user. A banned user can no longer create shops, unlock shops
 * with codes, or place orders. Existing shop sessions are revoked on ban.
 */
export const setUserBanned = mutation({
  args: { userId: v.id("users"), banned: v.boolean() },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    if (target.isAdmin === true) throw new Error("Cannot ban a site admin");

    if (args.banned) {
      await ctx.db.patch(args.userId, { banned: true, bannedAt: Date.now() });
      // Revoke code sessions so a banned user loses shop access immediately.
      const sessions = await ctx.db
        .query("shopSessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      for (const session of sessions) await ctx.db.delete(session._id);
    } else {
      await ctx.db.patch(args.userId, { banned: false, bannedAt: undefined });
    }
    return { ok: true as const };
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

/* ------------------------------- site stats ------------------------------- */

// Platform-wide counts for the admin dashboard.
export const siteStats = query({
  args: {},
  handler: async (ctx) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");

    const [shops, users, items, orders, codes] = await Promise.all([
      ctx.db.query("shops").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("items").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("shopCodes").collect(),
    ]);

    const realUsers = users.filter((u) => u.isAnonymous !== true);
    const revenue = orders.reduce(
      (sum, o) => sum + o.priceCents * o.quantity,
      0,
    );

    return {
      shops: shops.length,
      featuredShops: shops.filter((s) => s.featured).length,
      users: realUsers.length,
      bannedUsers: realUsers.filter((u) => u.banned === true).length,
      items: items.length,
      orders: orders.length,
      revenueCents: revenue,
      codes: codes.length,
    };
  },
});

/* ----------------------------- announcements ------------------------------ */

// The newest active global announcement. Public — every page shows it.
export const activeAnnouncement = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .first();
    if (!row) return null;
    return { _id: row._id, text: row.text, createdAt: row.createdAt };
  },
});

// All announcements (active + past) for the admin dashboard.
export const allAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const rows = await ctx.db.query("announcements").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Post a global announcement shown on every page. Posting a new one
 * automatically retires the previous active announcement.
 */
export const postAnnouncement = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const text = args.text.trim();
    if (text.length === 0) throw new Error("Announcement cannot be empty");
    if (text.length > 200)
      throw new Error("Announcement is too long (max 200)");

    // Retire any currently active announcement.
    const active = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    for (const row of active) await ctx.db.patch(row._id, { active: false });

    await ctx.db.insert("announcements", {
      text,
      active: true,
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Take an announcement down (keeps it in the history list). */
export const clearAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    await ctx.db.patch(args.announcementId, { active: false });
  },
});

/** Permanently delete a past announcement from the history. */
export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    await ctx.db.delete(args.announcementId);
  },
});

/* ------------------------------ shop editing ------------------------------ */

/**
 * Edit a shop's public info as admin — e.g. fix an inappropriate name or
 * description without deleting the whole shop.
 */
export const adminUpdateShop = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 40)
      throw new Error("Shop name must be 2-40 characters");
    if (description.length > 200)
      throw new Error("Description is too long (max 200)");

    await ctx.db.patch(args.shopId, { name, description });
  },
});

/**
 * Generate a fresh sign-in code for a shop. The old code stops working
 * immediately — useful if a code was shared too widely.
 */
export const adminResetShopCode = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    if (!(await currentIsAdmin(ctx))) throw new Error("Admin access required");
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");

    // Remove old codes.
    const codes = await ctx.db
      .query("shopCodes")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    for (const row of codes) await ctx.db.delete(row._id);

    // Generate a unique new code.
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      let code = "";
      for (let i = 0; i < 8; i += 1) {
        code += alphabet[bytes[i] % alphabet.length];
      }
      const clash = await ctx.db
        .query("shopCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!clash) {
        await ctx.db.insert("shopCodes", { code, shopId: args.shopId });
        return { code };
      }
    }
    throw new Error("Could not generate a unique code — try again");
  },
});
