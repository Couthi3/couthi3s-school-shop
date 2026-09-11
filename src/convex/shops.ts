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

const requireUserId = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
};

/* ---------------------------------- shops --------------------------------- */

export const createShop = mutation({
  args: { name: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
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
    const userId = await requireUserId(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.ownerId !== userId) throw new Error("Not your shop");
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 2 || name.length > 40)
      throw new Error("Shop name must be 2-40 characters");
    if (description.length > 200)
      throw new Error("Description is too long (max 200)");
    await ctx.db.patch(args.shopId, { name, description });
  },
});

/* ------------------------------ public queries ----------------------------- */

export const featuredShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    return shops.sort((a, b) => a.featuredOrder - b.featuredOrder);
  },
});

export const allShops = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    return shops
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
    const items = await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return {
      _id: shop._id,
      name: shop.name,
      description: shop.description,
      items: items
        .filter((i) => i.available)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          _id: i._id,
          name: i.name,
          description: i.description,
          priceCents: i.priceCents,
        })),
    };
  },
});

/* ---------------------------------- items ---------------------------------- */

export const shopItems = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
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
    priceCents: v.number(),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.ownerId !== userId) throw new Error("Not your shop");

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

    if (args.itemId) {
      const item = await ctx.db.get(args.itemId);
      if (!item || item.shopId !== args.shopId)
        throw new Error("Item not found in this shop");
      await ctx.db.patch(args.itemId, {
        name,
        description,
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
      priceCents: Math.round(args.priceCents),
      available: args.available,
      sortOrder: maxOrder + 1,
    });
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) return;
    const shop = await ctx.db.get(item.shopId);
    if (!shop || shop.ownerId !== userId) throw new Error("Not your shop");
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
    const item = await ctx.db.get(args.itemId);
    if (!item || item.shopId !== args.shopId)
      throw new Error("Item not found in this shop");
    if (!item.available) throw new Error("This item is not available");

    const buyerName = args.buyerName.trim();
    const period = args.period.trim();
    const note = args.note?.trim() || undefined;
    if (buyerName.length < 1) throw new Error("Your name is required");
    if (buyerName.length > 60) throw new Error("Name is too long (max 60)");
    if (period.length < 1) throw new Error("Pick a period");
    if (period.length > 40) throw new Error("Period is too long");
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
    const userId = await requireUserId(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.ownerId !== userId) throw new Error("Not your shop");
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
    const userId = await requireUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const shop = await ctx.db.get(order.shopId);
    if (!shop || shop.ownerId !== userId) throw new Error("Not your shop");
    if (args.status !== "new" && args.status !== "ready" && args.status !== "delivered")
      throw new Error("Invalid status");
    await ctx.db.patch(args.orderId, {
      status: args.status as "new" | "ready" | "delivered",
    });
  },
});
