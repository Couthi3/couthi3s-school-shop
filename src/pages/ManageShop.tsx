import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwissHeader } from "@/components/SwissHeader";
import { useAuth } from "@/hooks/use-auth";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Eye,
  HandCoins,
  Loader2,
  MessageCircle,
  Package,
  Palette,
  Plus,
  Repeat,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { OrderChat } from "@/components/OrderChat";
import { PICKUP_PERIODS, formatPrice, formatTime, statusColor } from "@/lib/shop-format";
import {
  ITEM_EMOJI_CHOICES,
  SHOP_EMOJI_CHOICES,
  SHOP_THEME_PRESETS,
  THEME_CORNERS,
  THEME_FONTS,
  resolveShopTheme,
  shopThemeStyle,
  type ShopTheme,
} from "@/lib/shop-theme";

type ItemDraft = {
  key: string;
  itemId: string | null;
  name: string;
  description: string;
  emoji: string;
  price: string;
  available: boolean;
  saving: boolean;
  dirty: boolean;
};
const emptyDraft = (): ItemDraft => ({
  key: Math.random().toString(36).slice(2),
  itemId: null,
  name: "",
  description: "",
  emoji: "",
  price: "",
  available: true,
  saving: false,
  dirty: false,
});

export default function ManageShop() {
  const params = useParams<{ shopId?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const ownedShop = useQuery(api.shops.myShop);
  const session = useQuery(api.shops.myCodeSession);

  // Which shop are we managing? URL id > owned shop > code session.
  const shopId = useMemo(() => {
    if (params.shopId) return params.shopId as Id<"shops">;
    if (ownedShop) return ownedShop._id;
    if (session) return session.shopId;
    return null;
  }, [params.shopId, ownedShop, session]);

  const shop = useQuery(
    api.shops.publicShop,
    shopId ? { shopId } : "skip",
  );
  const items = useQuery(api.shops.shopItems, shopId ? { shopId } : "skip");
  const orders = useQuery(api.shops.shopOrders, shopId ? { shopId } : "skip");
  const myCode = useQuery(api.shops.myShopCode);

  const saveItem = useMutation(api.shops.saveItem);
  const deleteItem = useMutation(api.shops.deleteItem);
  const setOrderStatus = useMutation(api.shops.setOrderStatus);
  const saveProfile = useMutation(api.shops.saveShopProfile);
  const savePeriods = useMutation(api.shops.saveShopPeriods);
  const saveTheme = useMutation(api.shops.saveShopTheme);
  const unreadChat = useQuery(
    api.shops.unreadChatCount,
    shopId ? { shopId } : "skip",
  );

  const [drafts, setDrafts] = useState<ItemDraft[]>([emptyDraft()]);
  const [savingAll, setSavingAll] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [periodInputs, setPeriodInputs] = useState<string[]>([]);
  const [savingPeriods, setSavingPeriods] = useState(false);
  const [themeDraft, setThemeDraft] = useState<ShopTheme | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  // Seed drafts from server items once they load.
  useEffect(() => {
    if (items === undefined) return;
    setDrafts(
      items.map((i) => ({
        key: i._id,
        itemId: i._id,
        name: i.name,
        description: i.description ?? "",
        emoji: i.emoji ?? "",
        price: i.priceCents != null ? (i.priceCents / 100).toFixed(2) : "",
        available: i.available,
        saving: false,
        dirty: false,
      })),
    );
  }, [items]);

  useEffect(() => {
    if (shop) {
      setShopName(shop.name);
      setShopDesc(shop.description ?? "");
      setPeriodInputs(shop.periods ?? [...PICKUP_PERIODS]);
      setThemeDraft(resolveShopTheme(shop.theme));
    }
  }, [shop]);

  const updateDraft = (key: string, patch: Partial<ItemDraft>) => {
    setDrafts((ds) =>
      ds.map((d) => (d.key === key ? { ...d, ...patch, dirty: true } : d)),
    );
  };

  const persistDraft = async (draft: ItemDraft) => {
    if (!shopId) return;
    const priceCents =
      draft.price.trim() === ""
        ? undefined
        : Math.round(parseFloat(draft.price || "0") * 100);
    if (!draft.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (priceCents !== undefined && (Number.isNaN(priceCents) || priceCents < 0)) {
      toast.error(`“${draft.name || "Item"}” has an invalid price`);
      return;
    }
    updateDraft(draft.key, { saving: true });
    try {
      const savedId = await saveItem({
        shopId,
        itemId: (draft.itemId ?? undefined) as never,
        name: draft.name,
        description: draft.description || undefined,
        emoji: draft.emoji || undefined,
        priceCents,
        available: draft.available,
      });
      setDrafts((ds) =>
        ds.map((d) =>
          d.key === draft.key
            ? { ...d, itemId: savedId, saving: false, dirty: false }
            : d,
        ),
      );
    } catch (err) {
      updateDraft(draft.key, { saving: false });
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      for (const d of drafts) {
        if (d.dirty || !d.itemId) await persistDraft(d);
      }
      // Remove saved empty rows
      setDrafts((ds) => ds.filter((d) => d.itemId || d.name.trim()));
      toast.success("Saved — your storefront is live");
    } finally {
      setSavingAll(false);
    }
  };

  const handleRemoveDraft = async (draft: ItemDraft) => {
    if (draft.itemId && shopId) {
      try {
        await deleteItem({ itemId: draft.itemId as never });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
        return;
      }
    }
    setDrafts((ds) => ds.filter((d) => d.key !== draft.key));
  };

  const handleSaveProfile = async () => {
    if (!shopId) return;
    setSavingProfile(true);
    try {
      await saveProfile({
        shopId,
        name: shopName,
        description: shopDesc,
      });
      toast.success("Shop profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const copyCode = async () => {
    if (!myCode?.code) return;
    try {
      await navigator.clipboard.writeText(myCode.code);
      toast.success("Code copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  const updatePeriod = (index: number, value: string) => {
    setPeriodInputs((ps) => ps.map((p, i) => (i === index ? value : p)));
  };

  const handleSavePeriods = async () => {
    if (!shopId) return;
    setSavingPeriods(true);
    try {
      await savePeriods({
        shopId,
        periods: periodInputs,
      });
      toast.success("Pickup periods saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPeriods(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!shopId || !themeDraft) return;
    setSavingTheme(true);
    try {
      await saveTheme({
        shopId,
        accent: themeDraft.accent,
        accentText: themeDraft.accentText,
        page: themeDraft.page,
        pageText: themeDraft.pageText,
        font: themeDraft.font,
        corners: themeDraft.corners,
        emoji: themeDraft.emoji,
        banner: themeDraft.banner,
      });
      toast.success("Theme saved — your storefront is restyled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingTheme(false);
    }
  };

  const markStatus = async (orderId: string, status: string) => {
    try {
      await setOrderStatus({ orderId: orderId as never, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (authLoading || ownedShop === undefined || session === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold uppercase">Sign in required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Create an account with a username and password, then enter your
            shop code to manage it.
          </p>
          <Button asChild className="mt-6 w-full py-6 text-sm font-bold uppercase tracking-wider">
            <Link to="/auth?returnTo=%2Fmanage">Continue to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!shopId || shop === null) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold uppercase">No shop unlocked</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You don't own a shop yet and no shop code session is active. Open a
            shop or sign in with a shop code.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full py-6 text-sm font-bold uppercase tracking-wider">
              <Link to="/create-shop">Open a shop</Link>
            </Button>
            <Button asChild variant="outline" className="w-full py-6 text-sm font-bold uppercase tracking-wider">
              <Link to="/shop-signin">Use a shop code</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (shop === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const newOrders = (orders ?? []).filter((o) => o.status === "new").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Shop dashboard
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
            {shop.name}
          </h1>
          <Button asChild variant="outline" className="gap-2 border-foreground">
            <Link to={`/shop/${shopId}`}>
              <Eye className="size-4" />
              View storefront
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="orders" className="mt-10">
          <TabsList className="h-11 w-full justify-start rounded-none border-2 border-foreground bg-muted p-0">
            <TabsTrigger
              value="orders"
              className="h-full rounded-none px-5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-none"
            >
              Orders
              {newOrders > 0 && (
                <span className="ml-2 bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {newOrders}
                </span>
              )}
              {(unreadChat ?? 0) > 0 && (
                <span
                  className="ml-1.5 inline-flex items-center gap-1 bg-[var(--swiss-blue)] px-1.5 py-0.5 text-[10px] font-bold text-background"
                  title="Orders with new buyer messages"
                >
                  <MessageCircle className="size-3" />
                  {unreadChat}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="h-full rounded-none px-5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-none"
            >
              Items
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="h-full rounded-none px-5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-none"
            >
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="theme"
              className="h-full rounded-none px-5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-none"
            >
              <Palette className="mr-1.5 size-3.5" />
              Theme
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------- ORDERS ------------------------------ */}
          <TabsContent value="orders" className="mt-8">
            {orders === undefined ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="border-2 border-foreground p-10 text-center">
                <Package className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-lg font-bold uppercase">No orders yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders appear here the moment a buyer checks out.
                </p>
              </div>
            ) : (
              <div className="border-2 border-foreground">
                <div className="hidden grid-cols-[1.2fr_1.6fr_1fr_auto] gap-4 border-b-2 border-foreground bg-muted px-5 py-3 md:grid">
                  <span className="grid-label">Item</span>
                  <span className="grid-label">Buyer · period</span>
                  <span className="grid-label">Placed</span>
                  <span className="grid-label">Status</span>
                </div>
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[1.2fr_1.6fr_1fr_auto] md:items-center md:gap-4"
                  >
                    <div>
                      <span className="font-bold uppercase">
                        {order.quantity}× {order.itemName}
                      </span>
                    </div>
                    <div className="text-sm">
                      {order.buyerName}
                      <span className="ml-2 inline-block bg-[var(--swiss-blue)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                        {order.period}
                      </span>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {order.offerKind === "money" ? (
                          <span className="inline-flex items-center gap-1.5 border-2 border-foreground px-2 py-0.5 text-xs font-bold">
                            <HandCoins className="size-3.5 text-primary" />
                            {order.moneyCents != null
                              ? formatPrice(order.moneyCents)
                              : "—"}
                            <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                              {order.quantity > 1 ? "each" : "offered"}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 border-2 border-foreground px-2 py-0.5 text-xs font-bold">
                            <Repeat className="size-3.5 text-primary" />
                            {order.tradeOffer}
                          </span>
                        )}
                        {order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-foreground"
                            onClick={() => setChatOrderId(order._id)}
                          >
                            <MessageCircle className="size-3.5" />
                            Chat
                          </Button>
                        )}
                      </div>
                      {order.note && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          “{order.note}”
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(order.createdAt)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                      {order.status === "new" && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="border-foreground"
                          title="Mark ready"
                          onClick={() => markStatus(order._id, "ready")}
                        >
                          <CircleDashed className="size-3.5" />
                        </Button>
                      )}
                      {order.status !== "delivered" && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="border-foreground"
                          title="Mark delivered"
                          onClick={() => markStatus(order._id, "delivered")}
                        >
                          <CheckCircle2 className="size-3.5" />
                        </Button>
                      )}
                      {order.status !== "new" && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Back to new"
                          onClick={() => markStatus(order._id, "new")}
                        >
                          <CircleDashed className="size-3.5 rotate-180" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* -------------------------------- ITEMS ------------------------------- */}
          <TabsContent value="items" className="mt-8">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold uppercase">Your items</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5 border-foreground"
                      onClick={() => setDrafts((ds) => [...ds, emptyDraft()])}
                    >
                      <Plus className="size-4" />
                      Add item
                    </Button>
                    <Button
                      onClick={handleSaveAll}
                      disabled={savingAll}
                      className="gap-1.5"
                    >
                      {savingAll ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Save changes
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {drafts.length === 0 && (
                    <div className="border-2 border-dashed border-foreground p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No items yet — add your first one.
                      </p>
                    </div>
                  )}
                  {drafts.map((draft, idx) => (
                    <div
                      key={draft.key}
                      className="border-2 border-foreground p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="grid-label">
                          Item {String(idx + 1).padStart(2, "0")}
                          {draft.dirty && (
                            <span className="ml-2 text-primary">• unsaved</span>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                            {draft.available ? "Available" : "Sold out"}
                            <Switch
                              checked={draft.available}
                              onCheckedChange={(v) =>
                                updateDraft(draft.key, { available: v })
                              }
                            />
                          </label>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Delete item"
                            onClick={() => handleRemoveDraft(draft)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                        <div>
                          <Label className="grid-label mb-1.5 block">Name</Label>
                          <Input
                            value={draft.name}
                            onChange={(e) =>
                              updateDraft(draft.key, { name: e.target.value })
                            }
                            placeholder="Chocolate bar"
                            className="h-10 border-foreground"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <Label className="grid-label mb-1.5 block">
                            Suggested price (USD, optional)
                          </Label>
                          <Input
                            value={draft.price}
                            onChange={(e) =>
                              updateDraft(draft.key, {
                                price: e.target.value.replace(/[^0-9.]/g, ""),
                              })
                            }
                            placeholder="Buyers choose — e.g. 1.50"
                            inputMode="decimal"
                            className="h-10 border-foreground"
                          />
                          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                            Buyers can pay this or offer their own amount / a
                            trade.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label className="grid-label mb-1.5 block">
                          Description (optional)
                        </Label>
                        <Input
                          value={draft.description}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Milk chocolate with hazelnuts"
                          className="h-10 border-foreground"
                          maxLength={200}
                        />
                      </div>
                      <div className="mt-3">
                        <Label className="grid-label mb-1.5 block">
                          Item icon (optional)
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {ITEM_EMOJI_CHOICES.map((em) => (
                            <button
                              key={em || "none"}
                              type="button"
                              title={em ? `Use ${em}` : "No icon"}
                              aria-label={em ? `Use ${em}` : "No icon"}
                              onClick={() =>
                                updateDraft(draft.key, { emoji: em })
                              }
                              className={`flex size-9 items-center justify-center border text-lg ${
                                draft.emoji === em
                                  ? "border-foreground bg-muted"
                                  : "border-border hover:border-foreground"
                              }`}
                            >
                              {em || <span className="text-xs">None</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      {draft.saving && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" /> Saving…
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live storefront preview */}
              <div>
                <h2 className="mb-4 text-xl font-bold uppercase">
                  Storefront preview
                </h2>
                <p className="mb-4 text-xs leading-4 text-muted-foreground">
                  Exactly what buyers see on your public page, updated live as
                  you edit. Press save to publish.
                </p>
                <div className="border-2 border-foreground">
                  <div className="border-b-2 border-foreground px-4 py-3">
                    <span className="grid-label">Preview</span>
                    <h3 className="mt-1 text-lg font-bold uppercase leading-tight">
                      {shopName || "Your shop"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {shopDesc || "Your description appears here."}
                    </p>
                  </div>
                  <div className="grid gap-px bg-foreground">
                    {drafts
                      .filter((d) => d.available && d.name.trim())
                      .map((d) => (
                        <div
                          key={d.key}
                          className="flex items-baseline justify-between gap-3 bg-background px-4 py-2.5"
                        >
                          <span className="text-sm font-bold uppercase">
                            {d.emoji && <span className="mr-1.5">{d.emoji}</span>}
                            {d.name}
                          </span>
                          <span className="font-mono-swiss text-sm font-bold text-primary">
                            {d.price
                              ? formatPrice(
                                  Math.round(
                                    parseFloat(d.price || "0") * 100,
                                  ),
                                )
                              : "Your pick"}
                          </span>
                        </div>
                      ))}
                    {drafts.filter((d) => d.available && d.name.trim())
                      .length === 0 && (
                      <div className="bg-background px-4 py-6 text-center text-xs text-muted-foreground">
                        Available items will be listed here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ------------------------------ SETTINGS ------------------------------ */}
          <TabsContent value="settings" className="mt-8">
            <div className="grid max-w-xl gap-10">
              <div>
                <h2 className="mb-4 text-xl font-bold uppercase">
                  Shop profile
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="settings-name" className="grid-label mb-1.5 block">
                      Shop name
                    </Label>
                    <Input
                      id="settings-name"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      maxLength={40}
                      className="h-11 border-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="settings-desc" className="grid-label mb-1.5 block">
                      Description
                    </Label>
                    <Textarea
                      id="settings-desc"
                      value={shopDesc}
                      onChange={(e) => setShopDesc(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="resize-none border-foreground"
                    />
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="gap-1.5"
                  >
                    {savingProfile ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Save profile
                  </Button>
                </div>
              </div>

              {myCode?.code && ownedShop && ownedShop._id === shopId && (
                <div>
                  <h2 className="mb-2 text-xl font-bold uppercase">
                    Your shop code
                  </h2>
                  <p className="mb-4 text-xs leading-4 text-muted-foreground">
                    Share this only with people you trust to run your shop. It
                    signs them in at Shop Owner Sign-In.
                  </p>
                  <div className="flex max-w-sm items-center justify-between border-2 border-foreground bg-muted px-4 py-3">
                    <span className="font-mono-swiss text-xl font-bold tracking-[0.3em]">
                      {myCode.code}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyCode}
                      className="gap-1.5 border-foreground"
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h2 className="mb-2 text-xl font-bold uppercase">
                  Pickup periods
                </h2>
                <p className="mb-4 text-xs leading-4 text-muted-foreground">
                  Buyers choose one of these at checkout. Add a subject to a
                  period, like “Period 3 — Science”, so you know where to
                  deliver.
                </p>
                <div className="space-y-2">
                  {periodInputs.map((p, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={p}
                        onChange={(e) => updatePeriod(idx, e.target.value)}
                        placeholder={`Period ${idx + 1} — Subject`}
                        maxLength={40}
                        className="h-10 border-foreground"
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Remove period"
                        className="shrink-0"
                        disabled={periodInputs.length <= 1}
                        onClick={() =>
                          setPeriodInputs((ps) =>
                            ps.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-foreground"
                    disabled={periodInputs.length >= 15}
                    onClick={() => setPeriodInputs((ps) => [...ps, ""])}
                  >
                    <Plus className="size-3.5" />
                    Add period
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={savingPeriods}
                    onClick={handleSavePeriods}
                  >
                    {savingPeriods ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Save periods
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tip: name periods with the subject, e.g. “Period 2 — Gym”.
                  Buyers see these exact labels.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* -------------------------------- THEME -------------------------------- */}
          <TabsContent value="theme" className="mt-8">
            {themeDraft && (
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <h2 className="text-xl font-bold uppercase">Theme editor</h2>
                  <p className="mt-1 max-w-md text-xs leading-4 text-muted-foreground">
                    Make your storefront feel like yours — colors, fonts, corner
                    style, an emoji badge and a banner. Everything applies to
                    the preview live; press save to publish for buyers.
                  </p>

                  {/* Presets */}
                  <div className="mt-6">
                    <Label className="grid-label mb-2 block">Presets</Label>
                    <div className="flex flex-wrap gap-2">
                      {SHOP_THEME_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setThemeDraft(preset.theme)}
                          className="flex items-center gap-2 border-2 border-foreground px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-muted"
                        >
                          <Sparkles className="size-3 text-primary" />
                          {preset.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setThemeDraft(resolveShopTheme(shop?.theme))
                        }
                        className="flex items-center gap-2 border-2 border-border px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:border-foreground hover:text-foreground"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="grid-label mb-1.5 block">Accent</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeDraft.accent}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, accent: e.target.value } : t,
                            )
                          }
                          className="size-10 cursor-pointer border-2 border-foreground bg-background p-0.5"
                          aria-label="Accent color"
                        />
                        <Input
                          value={themeDraft.accent.toUpperCase()}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, accent: e.target.value } : t,
                            )
                          }
                          maxLength={7}
                          className="h-10 border-foreground font-mono-swiss text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="grid-label mb-1.5 block">
                        Accent text
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeDraft.accentText}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, accentText: e.target.value } : t,
                            )
                          }
                          className="size-10 cursor-pointer border-2 border-foreground bg-background p-0.5"
                          aria-label="Accent text color"
                        />
                        <Input
                          value={themeDraft.accentText.toUpperCase()}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, accentText: e.target.value } : t,
                            )
                          }
                          maxLength={7}
                          className="h-10 border-foreground font-mono-swiss text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="grid-label mb-1.5 block">
                        Page background
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeDraft.page}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, page: e.target.value } : t,
                            )
                          }
                          className="size-10 cursor-pointer border-2 border-foreground bg-background p-0.5"
                          aria-label="Page background color"
                        />
                        <Input
                          value={themeDraft.page.toUpperCase()}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, page: e.target.value } : t,
                            )
                          }
                          maxLength={7}
                          className="h-10 border-foreground font-mono-swiss text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="grid-label mb-1.5 block">Body text</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={themeDraft.pageText}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, pageText: e.target.value } : t,
                            )
                          }
                          className="size-10 cursor-pointer border-2 border-foreground bg-background p-0.5"
                          aria-label="Body text color"
                        />
                        <Input
                          value={themeDraft.pageText.toUpperCase()}
                          onChange={(e) =>
                            setThemeDraft((t) =>
                              t ? { ...t, pageText: e.target.value } : t,
                            )
                          }
                          maxLength={7}
                          className="h-10 border-foreground font-mono-swiss text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Font + corners */}
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="grid-label mb-1.5 block">Typeface</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {THEME_FONTS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() =>
                              setThemeDraft((t) =>
                                t ? { ...t, font: f.id } : t,
                              )
                            }
                            className={`border-2 px-3 py-2 text-sm ${
                              themeDraft.font === f.id
                                ? "border-foreground bg-muted font-bold"
                                : "border-border hover:border-foreground"
                            }`}
                            style={{ fontFamily: f.stack }}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="grid-label mb-1.5 block">Corners</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {THEME_CORNERS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setThemeDraft((t) =>
                                t ? { ...t, corners: c.id } : t,
                              )
                            }
                            className={`border-2 px-2 py-2 text-xs font-bold uppercase tracking-wide ${
                              themeDraft.corners === c.id
                                ? "border-foreground bg-muted"
                                : "border-border hover:border-foreground"
                            }`}
                          >
                            <span
                              className="mx-auto mb-1 block h-4 w-4 border-2 border-current"
                              style={{ borderRadius: c.radius }}
                            />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Shop emoji */}
                  <div className="mt-8">
                    <Label className="grid-label mb-2 block">Shop emoji</Label>
                    <div className="flex flex-wrap gap-1">
                      {SHOP_EMOJI_CHOICES.map((em) => (
                        <button
                          key={em}
                          type="button"
                          title={`Use ${em}`}
                          aria-label={`Use ${em}`}
                          onClick={() =>
                            setThemeDraft((t) =>
                              t ? { ...t, emoji: em } : t,
                            )
                          }
                          className={`flex size-9 items-center justify-center border text-lg ${
                            themeDraft.emoji === em
                              ? "border-foreground bg-muted"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner */}
                  <div className="mt-8">
                    <Label
                      htmlFor="theme-banner"
                      className="grid-label mb-1.5 block"
                    >
                      Banner (optional)
                    </Label>
                    <Input
                      id="theme-banner"
                      value={themeDraft.banner ?? ""}
                      onChange={(e) =>
                        setThemeDraft((t) =>
                          t
                            ? {
                                ...t,
                                banner: e.target.value || undefined,
                              }
                            : t,
                        )
                      }
                      placeholder="Fresh cookies every morning!"
                      maxLength={120}
                      className="h-10 border-foreground"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Shown in the accent color strip at the top of your page.
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveTheme}
                    disabled={savingTheme}
                    className="mt-8 gap-1.5"
                  >
                    {savingTheme ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save theme
                  </Button>
                </div>

                {/* Live themed preview */}
                <div>
                  <h2 className="mb-4 text-xl font-bold uppercase">
                    Live preview
                  </h2>
                  <p className="mb-4 text-xs leading-4 text-muted-foreground">
                    Exactly what buyers see — updates as you edit.
                  </p>
                  <div
                    className="border-2 border-foreground"
                    style={shopThemeStyle(themeDraft)}
                  >
                    {themeDraft.banner && (
                      <div
                        className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: themeDraft.accent,
                          color: themeDraft.accentText,
                        }}
                      >
                        {themeDraft.banner}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl" aria-hidden>
                          {themeDraft.emoji}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">
                          School shop
                        </span>
                      </div>
                      <h3 className="mt-2 text-2xl font-bold uppercase leading-tight">
                        {shopName || "Your shop"}
                      </h3>
                      <p className="mt-1 text-xs opacity-70">
                        {shopDesc || "Your description appears here."}
                      </p>
                      <div className="mt-4 space-y-px">
                        {drafts
                          .filter((d) => d.available && d.name.trim())
                          .slice(0, 4)
                          .map((d) => (
                            <div
                              key={d.key}
                              className="flex items-baseline justify-between gap-3 bg-card px-3 py-2"
                              style={{
                                borderRadius: "var(--shop-radius, 0rem)",
                              }}
                            >
                              <span className="text-xs font-bold uppercase">
                                {d.emoji && (
                                  <span className="mr-1">{d.emoji}</span>
                                )}
                                {d.name}
                              </span>
                              <span
                                className="font-mono-swiss text-xs font-bold"
                                style={{ color: themeDraft.accent }}
                              >
                                {d.price
                                  ? formatPrice(
                                      Math.round(
                                        parseFloat(d.price || "0") * 100,
                                      ),
                                    )
                                  : "Your pick"}
                              </span>
                            </div>
                          ))}
                        {drafts.filter((d) => d.available && d.name.trim())
                          .length === 0 && (
                          <div className="px-3 py-4 text-center text-xs opacity-60">
                            Available items appear here.
                          </div>
                        )}
                      </div>
                      <div
                        className="mt-4 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider"
                        style={{
                          background: themeDraft.accent,
                          color: themeDraft.accentText,
                          borderRadius: "var(--shop-radius, 0rem)",
                        }}
                      >
                        Order for pickup
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Order negotiation chat dialog */}
      <Dialog open={chatOrderId !== null} onOpenChange={(open) => !open && setChatOrderId(null)}>
        <DialogContent className="border-2 border-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase tracking-tight">
              Negotiate with buyer
            </DialogTitle>
            <DialogDescription>
              Discuss the offer, counter, and settle the details. The buyer
              replies from their private order link.
            </DialogDescription>
          </DialogHeader>
          {chatOrderId && (
            <OrderChat
              orderId={chatOrderId}
              role="owner"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
