import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no lookalike characters

// Default pickup periods for new shops. Owners can customize these (with
// subjects) from their dashboard settings.
export const DEFAULT_PERIODS = [
  "Before school",
  "Period 1",
  "Period 2",
  "Period 3",
  "Period 4",
  "Period 5",
  "Period 6",
  "Period 7",
  "Period 8",
  "After school",
];

const randomCode = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
};

const requireUserId = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
};

// Owner OR a user holding an unlocked shop code session may manage the shop.
// Banned users are locked out of all shop actions.
const assertShopAccess = async (ctx: QueryCtx | MutationCtx, shopId: Id<"shops">) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new Error("Shop not found");
  const user = await ctx.db.get(userId);
  if (user?.banned === true) throw new Error("Your account has been suspended");
  if (shop.ownerId === userId) return { userId, shop, viaCode: false };
  const session = await ctx.db
    .query("shopSessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("shopId"), shopId))
    .first();
  if (!session) throw new Error("Not your shop");
  return { userId, shop, viaCode: true };
};

/* ------------------------------- code access ------------------------------- */

// Unlock a shop by entering its secret code. Creates a persistent session for
// the signed-in user so they can manage that shop from any device.
export const startCodeSession = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const code = args.code.trim().toUpperCase();
    const row = await ctx.db
      .query("shopCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!row) throw new Error("Code not recognized");
    const shop = await ctx.db.get(row.shopId);
    if (!shop) throw new Error("Shop not found");
    const user = await ctx.db.get(userId);
    if (user?.banned === true)
      throw new Error("Your account has been suspended");
    const existing = await ctx.db
      .query("shopSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("shopId"), row.shopId))
      .first();
    if (!existing) {
      await ctx.db.insert("shopSessions", { userId, shopId: row.shopId });
    }
    return { shopId: row.shopId, shopName: shop.name };
  },
});

export const endCodeSession = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db
      .query("shopSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("shopId"), args.shopId))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});

// The shop this user has unlocked with a code (not the one they own).
export const myCodeSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const session = await ctx.db
      .query("shopSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!session) return null;
    const shop = await ctx.db.get(session.shopId);
    if (!shop) return null;
    return {
      shopId: shop._id,
      shopName: shop.name,
      isOwner: shop.ownerId === userId,
    };
  },
});

/* ---------------------------------- shops --------------------------------- */

export const createShop = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (user?.banned === true) throw new Error("Your account has been suspended");
    const name = args.name.trim();
    const description = (args.description ?? "").trim();
    if (name.length < 2) throw new Error("Shop name is too short");
    if (name.length > 40) throw new Error("Shop name is too long (max 40)");
    if (description.length > 200)
      throw new Error("Description is too long (max 200)");

    const existing = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) throw new Error("You already own a shop");

    const shopId = await ctx.db.insert("shops", {
      ownerId: userId,
      name,
      description,
      featured: false,
      featuredOrder: 0,
      periods: [...DEFAULT_PERIODS],
    });
    const code = randomCode(8);
    await ctx.db.insert("shopCodes", { code, shopId });
    return { shopId, code };
  },
});

export const myShop = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
  },
});

export const saveShopProfile = mutation({
  args: { shopId: v.id("shops"), name: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 40)
      throw new Error("Shop name must be 2-40 characters");
    if (description.length > 200)
      throw new Error("Description is too long (max 200)");
    await ctx.db.patch(args.shopId, { name, description });
  },
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FONT_IDS = ["system", "mono", "rounded", "serif"];
const CORNER_IDS = ["square", "soft", "round"];

/**
 * Save the shop's personal theme from the theme editor. Fields arrive
 * pre-shaped from the client; validated defensively here.
 */
export const saveShopTheme = mutation({
  args: {
    shopId: v.id("shops"),
    accent: v.string(),
    accentText: v.string(),
    page: v.string(),
    pageText: v.string(),
    font: v.string(),
    corners: v.string(),
    emoji: v.string(),
    banner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);

    const accent = args.accent.trim();
    const accentText = args.accentText.trim();
    const page = args.page.trim();
    const pageText = args.pageText.trim();
    if (!HEX_COLOR.test(accent)) throw new Error("Accent must be a hex color");
    if (!HEX_COLOR.test(accentText))
      throw new Error("Accent text must be a hex color");
    if (!HEX_COLOR.test(page)) throw new Error("Page color must be a hex color");
    if (!HEX_COLOR.test(pageText))
      throw new Error("Page text must be a hex color");
    if (!FONT_IDS.includes(args.font)) throw new Error("Unknown font");
    if (!CORNER_IDS.includes(args.corners)) throw new Error("Unknown corner style");
    const emoji = args.emoji.trim() || "🏪";
    if (Array.from(emoji).length > 4)
      throw new Error("Emoji is too long");
    const banner = args.banner?.trim() || undefined;
    if (banner && banner.length > 120)
      throw new Error("Banner is too long (max 120)");

    await ctx.db.patch(args.shopId, {
      theme: {
        accent,
        accentText,
        page,
        pageText,
        font: args.font,
        corners: args.corners,
        emoji,
        banner,
      },
    });
  },
});

/**
 * Replace the shop's pickup-period list, e.g.
 * ["Before school", "Period 1 — Math", "Period 3 — Science"].
 * Buyers must pick one of these when ordering.
 */
export const saveShopPeriods = mutation({
  args: { shopId: v.id("shops"), periods: v.array(v.string()) },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);

    const periods = args.periods
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (periods.length === 0)
      throw new Error("Add at least one pickup period");
    if (periods.length > 15)
      throw new Error("Too many periods (max 15)");
    for (const p of periods) {
      if (p.length > 40)
        throw new Error(`“${p}” is too long (max 40 characters)`);
    }
    const lower = periods.map((p) => p.toLowerCase());
    if (new Set(lower).size !== periods.length)
      throw new Error("Periods must be unique");

    await ctx.db.patch(args.shopId, { periods });
  },
});

/* ------------------------------ public queries ----------------------------- */

// The owner's secret shop code, shown only to the shop owner.
export const myShopCode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (!shop) return null;
    const row = (await ctx.db.query("shopCodes").collect()).find(
      (r) => r.shopId === shop._id,
    );
    return { code: row?.code ?? null, shopName: shop.name };
  },
});

export const featuredShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    // Hide shops whose owner has been banned by the site admin.
    const visible = [];
    for (const shop of shops) {
      const owner = await ctx.db.get(shop.ownerId);
      if (owner?.banned !== true) visible.push(shop);
    }
    return visible.sort((a, b) => a.featuredOrder - b.featuredOrder);
  },
});

export const allShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    // Hide shops whose owner has been banned by the site admin.
    const visible = [];
    for (const shop of shops) {
      const owner = await ctx.db.get(shop.ownerId);
      if (owner?.banned !== true) visible.push(shop);
    }
    return visible
      .map((s) => ({ _id: s._id, name: s.name, description: s.description }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const shopByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    const row = await ctx.db
      .query("shopCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!row) return null;
    const shop = await ctx.db.get(row.shopId);
    if (!shop) return null;
    return { _id: shop._id, name: shop.name, description: shop.description };
  },
});

export const publicShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop) return null;
    // Banned owners' storefronts are taken offline.
    const owner = await ctx.db.get(shop.ownerId);
    if (owner?.banned === true) return null;
    const items = await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return {
      _id: shop._id,
      name: shop.name,
      description: shop.description,
      periods: shop.periods ?? DEFAULT_PERIODS,
      theme: shop.theme ?? null,
      items: items
        .filter((i) => i.available)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          _id: i._id,
          name: i.name,
          description: i.description,
          emoji: i.emoji ?? null,
          priceCents: i.priceCents,
        })),
    };
  },
});

/* ---------------------------------- items ---------------------------------- */

export const shopItems = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);
    const items = await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const saveItem = mutation({
  args: {
    shopId: v.id("shops"),
    itemId: v.optional(v.id("items")),
    name: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    priceCents: v.number(),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);

    const name = args.name.trim();
    if (name.length < 1) throw new Error("Item name is required");
    if (name.length > 60) throw new Error("Item name is too long (max 60)");
    const description = args.description?.trim() || undefined;
    if (description && description.length > 200)
      throw new Error("Item description is too long (max 200)");
    if (!Number.isFinite(args.priceCents) || args.priceCents < 0)
      throw new Error("Price must be zero or more");
    if (args.priceCents > 100000000)
      throw new Error("Price is too large");
    const emoji = args.emoji?.trim() || undefined;
    if (emoji && Array.from(emoji).length > 4)
      throw new Error("Emoji is too long");

    if (args.itemId) {
      const item = await ctx.db.get(args.itemId);
      if (!item || item.shopId !== args.shopId)
        throw new Error("Item not found in this shop");
      await ctx.db.patch(args.itemId, {
        name,
        description,
        emoji,
        priceCents: Math.round(args.priceCents),
        available: args.available,
      });
      return args.itemId;
    }

    const existing = await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    const maxOrder = existing.reduce((m, i) => Math.max(m, i.sortOrder), 0);
    return await ctx.db.insert("items", {
      shopId: args.shopId,
      name,
      description,
      emoji,
      priceCents: Math.round(args.priceCents),
      available: args.available,
      sortOrder: maxOrder + 1,
    });
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;
    await assertShopAccess(ctx, item.shopId);
    await ctx.db.delete(args.itemId);
  },
});

/* ---------------------------------- orders --------------------------------- */

export const placeOrder = mutation({
  args: {
    shopId: v.id("shops"),
    itemId: v.id("items"),
    quantity: v.number(),
    buyerName: v.string(),
    period: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    const userId = await getAuthUserId(ctx);
    if (userId !== null) {
      const user = await ctx.db.get(userId);
      if (user?.banned === true)
        throw new Error("Your account has been suspended");
    }
    const item = await ctx.db.get(args.itemId);
    if (!item || item.shopId !== args.shopId)
      throw new Error("Item not found in this shop");
    if (!item.available) throw new Error("This item is not available");

    const buyerName = args.buyerName.trim();
    const period = args.period.trim();
    const note = args.note?.trim() || undefined;
    if (buyerName.length < 1) throw new Error("Your name is required");
    if (buyerName.length > 60) throw new Error("Name is too long (max 60)");
    const allowedPeriods = shop.periods ?? DEFAULT_PERIODS;
    if (!allowedPeriods.includes(period))
      throw new Error("Pick one of this shop's delivery periods");
    if (note && note.length > 200)
      throw new Error("Note is too long (max 200)");
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 20)
      throw new Error("Quantity must be between 1 and 20");

    await ctx.db.insert("orders", {
      shopId: args.shopId,
      itemId: args.itemId,
      itemName: item.name,
      priceCents: item.priceCents,
      quantity: args.quantity,
      buyerName,
      period,
      note,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

export const shopOrders = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await assertShopAccess(ctx, args.shopId);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const setOrderStatus = mutation({
  args: { orderId: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await assertShopAccess(ctx, order.shopId);
    if (args.status !== "new" && args.status !== "ready" && args.status !== "delivered")
      throw new Error("Invalid status");
    await ctx.db.patch(args.orderId, {
      status: args.status as "new" | "ready" | "delivered",
    });
  },
});
