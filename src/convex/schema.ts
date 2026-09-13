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
      role: v.optional(v.string()),
      banned: v.optional(v.boolean()), // set by site admin; blocks all shop actions
      bannedAt: v.optional(v.number()),
    }).index("email", ["email"]),

    // A school shop owned by exactly one user.
    shops: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      description: v.string(),
      featured: v.boolean(), // hand-picked by the site admin
      featuredOrder: v.number(), // admin-controlled ordering of featured shops
      periods: v.optional(v.array(v.string())), // owner-defined pickup periods, e.g. "Period 1 — Math"
      theme: v.optional(
        v.object({
          accent: v.string(), // hex accent color
          accentText: v.string(), // hex text color used on accent surfaces
          page: v.string(), // hex page background
          pageText: v.string(), // hex body text on page background
          font: v.string(), // typography choice id
          corners: v.string(), // "square" | "soft" | "round"
          emoji: v.string(), // shop emoji badge
          banner: v.optional(v.string()), // top-of-page announcement strip
        }),
      ),
    })
      .index("by_owner", ["ownerId"])
      .index("by_featured", ["featured", "featuredOrder"]),

    // Permanent secret shop code used to sign into a shop and manage it.
    shopCodes: defineTable({
      code: v.string(),
      shopId: v.id("shops"),
    })
      .index("by_code", ["code"])
      .index("by_shop", ["shopId"]),

    // A signed-in user who has unlocked a shop with its code gets a session,
    // letting multiple staff manage the same shop.
    shopSessions: defineTable({
      userId: v.id("users"),
      shopId: v.id("shops"),
    })
      .index("by_user", ["userId"])
      .index("by_shop", ["shopId"]),

    // Browser sessions granted site-admin access by signing in with the
    // site administrator credentials on the admin page.
    adminSessions: defineTable({
      sessionId: v.string(),
      createdAt: v.number(),
    }).index("by_session", ["sessionId"]),

    // Items for sale in a shop.
    // Items for sale in a shop. Prices are suggested amounts — buyers pay
    // whatever they offer (money) or propose a trade.
    items: defineTable({
      shopId: v.id("shops"),
      name: v.string(),
      description: v.optional(v.string()),
      emoji: v.optional(v.string()), // per-item emoji chosen by the owner
      priceCents: v.optional(v.number()), // suggested price, optional
      available: v.boolean(),
      sortOrder: v.number(),
    }).index("by_shop", ["shopId"]),

    // Global announcements posted by the site admin. The newest active one
    // is displayed site-wide on every page. Urgent ones get a loud red
    // treatment and cannot be dismissed.
    announcements: defineTable({
      text: v.string(),
      active: v.boolean(),
      urgent: v.optional(v.boolean()),
      createdAt: v.number(),
    }).index("by_active", ["active", "createdAt"]),

    // Orders placed by buyers. The buyer offers either money or a trade.
    orders: defineTable({
      shopId: v.id("shops"),
      itemId: v.id("items"),
      itemName: v.string(), // denormalized snapshot
      quantity: v.number(),
      buyerName: v.string(),
      period: v.string(), // pickup period, e.g. "Period 4"
      offerKind: v.union(v.literal("money"), v.literal("trade")),
      moneyCents: v.optional(v.number()), // set when offerKind = money
      tradeOffer: v.optional(v.string()), // set when offerKind = trade
      note: v.optional(v.string()),
      status: v.union(
        v.literal("new"),
        v.literal("ready"),
        v.literal("delivered"),
      ),
      trackingToken: v.string(), // secret token so the buyer can view order + chat
      lastMessageAt: v.optional(v.number()), // bumped on chat activity
      createdAt: v.number(),
    })
      .index("by_shop", ["shopId"])
      .index("by_item", ["itemId"])
      .index("by_token", ["trackingToken"]),

    // Negotiation chat between shop owner and buyer, attached to an order.
    orderMessages: defineTable({
      orderId: v.id("orders"),
      from: v.union(v.literal("owner"), v.literal("buyer")),
      text: v.string(),
      createdAt: v.number(),
    }).index("by_order", ["orderId"]),

    // Support tickets: bug reports, suggestions, and staff applications.
    // Submitters are optional users (guests can file tickets too).
    tickets: defineTable({
      category: v.union(
        v.literal("issue"),
        v.literal("suggestion"),
        v.literal("staff"),
      ),
      title: v.string(),
      body: v.string(),
      contact: v.optional(v.string()), // guest contact, e.g. a username or name
      userId: v.optional(v.id("users")), // set when a signed-in user submits
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
      ),
      adminNote: v.optional(v.string()), // private reply from the site admin
      createdAt: v.number(),
    }).index("by_status", ["status"]),

    // Public "Meet the team" roster, managed by the site admin.
    teamMembers: defineTable({
      name: v.string(),
      rank: v.string(), // e.g. "Owner", "Admin", "Moderator", "Helper"
      tagline: v.optional(v.string()), // short blurb shown on the team page
      emoji: v.optional(v.string()), // avatar badge
      sortOrder: v.number(),
    }).index("by_order", ["sortOrder"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
