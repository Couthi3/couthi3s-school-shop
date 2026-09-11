import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema(
  {
    ...authTables, // do not remove or modify

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      isAdmin: v.optional(v.boolean()), // site admin, promoted via invite code
    }).index("email", ["email"]),

    // A school shop owned by exactly one user.
    shops: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      description: v.string(),
      featured: v.boolean(), // hand-picked by the site admin
      featuredOrder: v.number(), // admin-controlled ordering of featured shops
    })
      .index("by_owner", ["ownerId"])
      .index("by_featured", ["featured", "featuredOrder"]),

    // Permanent secret shop code used to sign in as the shop owner.
    shopCodes: defineTable({
      code: v.string(),
      shopId: v.id("shops"),
    }).index("by_code", ["code"]),

    // Short-lived admin invite codes created by a user in a browser.
    // Redeeming the code promotes that browser's user to the site admin.
    adminInvites: defineTable({
      code: v.string(),
      createdAt: v.number(),
    }).index("by_code", ["code"]),

    // Items for sale in a shop.
    items: defineTable({
      shopId: v.id("shops"),
      name: v.string(),
      description: v.optional(v.string()),
      priceCents: v.number(),
      available: v.boolean(),
      sortOrder: v.number(),
    }).index("by_shop", ["shopId"]),

    // Orders placed by buyers.
    orders: defineTable({
      shopId: v.id("shops"),
      itemId: v.id("items"),
      itemName: v.string(), // denormalized snapshot
      priceCents: v.number(), // price at time of order
      quantity: v.number(),
      buyerName: v.string(),
      period: v.string(), // pickup period, e.g. "Period 4"
      note: v.optional(v.string()),
      status: v.union(
        v.literal("new"),
        v.literal("ready"),
        v.literal("delivered"),
      ),
      createdAt: v.number(),
    })
      .index("by_shop", ["shopId"])
      .index("by_item", ["itemId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
