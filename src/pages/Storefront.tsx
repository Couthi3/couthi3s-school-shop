import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwissHeader } from "@/components/SwissHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Copy,
  HandCoins,
  Loader2,
  Minus,
  MessagesSquare,
  Package,
  Plus,
  Repeat,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { formatPrice } from "@/lib/shop-format";
import { resolveShopTheme, shopThemeStyle } from "@/lib/shop-theme";

type StoreItem = {
  _id: string;
  name: string;
  description?: string;
  emoji?: string | null;
  priceCents: number | null;
};

export default function Storefront() {
  const { shopId } = useParams<{ shopId: string }>();
  const shop = useQuery(api.shops.publicShop, {
    shopId: shopId as never,
  });
  const placeOrder = useMutation(api.shops.placeOrder);

  const theme = useMemo(() => resolveShopTheme(shop?.theme), [shop?.theme]);
  const themedStyle = useMemo(
    () => (shop ? shopThemeStyle(theme) : undefined),
    [shop, theme],
  );

  const [dialogItem, setDialogItem] = useState<StoreItem | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [period, setPeriod] = useState("");
  const [offerKind, setOfferKind] = useState<"money" | "trade">("money");
  const [moneyOffer, setMoneyOffer] = useState("");
  const [tradeOffer, setTradeOffer] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Post-checkout receipt with the private tracking link.
  const [receipt, setReceipt] = useState<{
    itemName: string;
    trackingUrl: string;
  } | null>(null);

  const openOrderDialog = (item: StoreItem) => {
    setDialogItem(item);
    setBuyerName("");
    setPeriod("");
    setOfferKind("money");
    setMoneyOffer(item.priceCents ? (item.priceCents / 100).toFixed(2) : "");
    setTradeOffer("");
    setNote("");
    setQuantity(1);
  };

  const closeDialog = () => {
    setDialogItem(null);
    setSubmitting(false);
  };

  const submitOrder = async () => {
    if (!dialogItem || !shopId) return;
    const moneyCents =
      offerKind === "money"
        ? Math.round(parseFloat(moneyOffer || "0") * 100)
        : undefined;
    setSubmitting(true);
    try {
      const result = await placeOrder({
        shopId: shopId as never,
        itemId: dialogItem._id as never,
        quantity,
        buyerName,
        period,
        offerKind,
        moneyCents: offerKind === "money" ? moneyCents : undefined,
        tradeOffer: offerKind === "trade" ? tradeOffer : undefined,
        note: note || undefined,
      });
      const url = `${window.location.origin}/order/${result.trackingToken}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard may be unavailable — the link is still shown
      }
      setReceipt({ itemName: dialogItem.name, trackingUrl: url });
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      setSubmitting(false);
    }
  };

  const canSubmit =
    buyerName.trim().length > 0 &&
    period.length > 0 &&
    (offerKind === "money"
      ? parseFloat(moneyOffer || "0") >= 0 && moneyOffer.trim() !== ""
      : tradeOffer.trim().length > 0);

  const copyLink = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.trackingUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed — select the link and copy manually");
    }
  };

  return (
    <div
      className="min-h-screen text-foreground"
      style={themedStyle}
    >
      <SwissHeader />

      {shop === undefined ? (
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin opacity-60" />
        </div>
      ) : shop === null ? (
        <div className="container-swiss py-20 text-center">
          <h1 className="text-3xl font-bold uppercase">Shop not found</h1>
          <p className="mt-3 text-muted-foreground">
            This shop doesn't exist.{" "}
            <Link to="/shops" className="underline hover:text-primary">
              Back to all shops
            </Link>
          </p>
        </div>
      ) : (
        <>
          {theme.banner && (
            <div
              className="border-b-2 border-foreground px-5 py-2.5 text-center text-xs font-bold uppercase tracking-wider"
              style={{
                background: theme.accent,
                color: theme.accentText,
              }}
            >
              {theme.banner}
            </div>
          )}

          <section className="border-b-2 border-foreground">
            <div className="container-swiss py-10 md:py-14">
              <div className="grid-label mb-5 flex items-center gap-2">
                <span
                  className="flex size-8 items-center justify-center text-2xl"
                  aria-hidden
                >
                  {theme.emoji}
                </span>
                <span>School shop</span>
              </div>
              <h1 className="text-4xl font-bold uppercase tracking-tight md:text-6xl">
                {shop.name}
              </h1>
              {shop.description && (
                <p className="mt-4 max-w-2xl text-base leading-6 text-muted-foreground md:text-lg">
                  {shop.description}
                </p>
              )}
              <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
                Pick an item, choose your delivery period, and make an offer —
                pay with money or propose a trade. The owner can chat with you
                to work out the details.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {shop.periods.map((p) => (
                  <span
                    key={p}
                    className="border border-current px-2 py-1 text-[10px] font-bold uppercase tracking-wide opacity-80"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="border-b-2 border-foreground bg-muted">
            <div className="container-swiss py-10 md:py-14">
              <h2 className="mb-8 text-2xl font-bold uppercase tracking-tight md:text-3xl">
                Items for sale
              </h2>
              {shop.items.length === 0 ? (
                <div className="border border-foreground bg-card p-10 text-center">
                  <Package className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-lg font-bold uppercase">
                    Nothing for sale yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check back soon — the owner hasn't listed any available
                    items.
                  </p>
                </div>
              ) : (
                <div className="grid gap-px border border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
                  {shop.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col bg-card p-5"
                      style={{ borderRadius: "var(--shop-radius, 0rem)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {item.emoji && (
                            <span
                              className="text-2xl leading-none"
                              aria-hidden
                            >
                              {item.emoji}
                            </span>
                          )}
                          <h3 className="text-lg font-bold uppercase leading-tight">
                            {item.name}
                          </h3>
                        </div>
                        {item.priceCents !== null && (
                          <span
                            className="font-mono-swiss shrink-0 text-right text-xs leading-tight"
                            title="Suggested amount — offer what you think is fair"
                          >
                            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                              Suggested
                            </span>
                            <span className="font-bold text-primary">
                              {formatPrice(item.priceCents)}
                            </span>
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-auto pt-4">
                        <Button
                          onClick={() => openOrderDialog(item)}
                          className="w-full gap-2 py-5 text-xs font-bold uppercase tracking-wider"
                          style={{ borderRadius: "var(--shop-radius, 0rem)" }}
                        >
                          <ShoppingBag className="size-3.5" />
                          Make an offer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <Dialog
        open={dialogItem !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="border-2 border-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {dialogItem?.name}
            </DialogTitle>
            <DialogDescription>
              Make an offer — pay with money or trade something. The owner can
              message you to negotiate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="buyer-name" className="grid-label mb-2 block">
                Your name
              </Label>
              <Input
                id="buyer-name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="First and last name"
                className="h-11 border-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="order-period" className="grid-label mb-2 block">
                  Period
                </Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger id="order-period" className="h-11 w-full border-foreground">
                    <SelectValue placeholder="Pick period" />
                  </SelectTrigger>
                  <SelectContent>
                    {(shop?.periods ?? []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="grid-label mb-2 block">Quantity</Label>
                <div className="flex h-11 items-center border border-foreground">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="flex h-full flex-1 items-center justify-center hover:bg-muted"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono-swiss font-bold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="flex h-full flex-1 items-center justify-center hover:bg-muted"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="h-0" />
              </div>
            </div>

            {/* Offer picker */}
            <div>
              <Label className="grid-label mb-2 block">Your offer</Label>
              <div className="grid grid-cols-2 gap-px border border-foreground bg-foreground">
                <button
                  type="button"
                  onClick={() => setOfferKind("money")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${
                    offerKind === "money"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  <HandCoins className="size-4" />
                  Money
                </button>
                <button
                  type="button"
                  onClick={() => setOfferKind("trade")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${
                    offerKind === "trade"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  <Repeat className="size-4" />
                  Trade
                </button>
              </div>

              {offerKind === "money" ? (
                <div className="mt-3">
                  <Label htmlFor="money-offer" className="grid-label mb-1.5 block">
                    {dialogItem?.priceCents
                      ? `Amount (suggested ${formatPrice(dialogItem.priceCents)})`
                      : "Amount (USD)"}
                  </Label>
                  <Input
                    id="money-offer"
                    value={moneyOffer}
                    onChange={(e) =>
                      setMoneyOffer(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder={dialogItem?.priceCents
                      ? (dialogItem.priceCents / 100).toFixed(2)
                      : "1.50"}
                    inputMode="decimal"
                    className="h-11 border-foreground font-mono-swiss"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Offer what you think is fair — you pay the owner directly.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <Label htmlFor="trade-offer" className="grid-label mb-1.5 block">
                    What are you offering?
                  </Label>
                  <Textarea
                    id="trade-offer"
                    value={tradeOffer}
                    onChange={(e) => setTradeOffer(e.target.value)}
                    placeholder="e.g. 2 packs of gum and a Pokémon card"
                    rows={2}
                    maxLength={200}
                    className="resize-none border-foreground"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="order-note" className="grid-label mb-2 block">
                Note to seller (optional)
              </Label>
              <Textarea
                id="order-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Allergies, custom requests…"
                rows={2}
                className="resize-none border-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={submitOrder}
              disabled={submitting || !canSubmit}
              className="w-full py-6 text-xs font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Send offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-checkout receipt with private tracking link */}
      <Dialog
        open={receipt !== null}
        onOpenChange={(open) => !open && setReceipt(null)}
      >
        <DialogContent className="border-2 border-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              Offer sent!
            </DialogTitle>
            <DialogDescription>
              {receipt && (
                <>
                  Your offer for {receipt.itemName} is with the shop owner.
                  They can accept, counter, or chat with you to negotiate.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {receipt && (
            <div className="space-y-4">
              <div className="border-2 border-foreground bg-muted p-3">
                <span className="grid-label mb-1.5 block">
                  Your private order link — save this
                </span>
                <p className="break-all font-mono-swiss text-xs leading-5">
                  {receipt.trackingUrl}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Open it to track your order status and chat with the owner.
                  Anyone with this link can see the order, so keep it private.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={copyLink}
                  className="gap-2 border-foreground"
                >
                  <Copy className="size-4" />
                  Copy link
                </Button>
                <Button asChild className="gap-2">
                  <a href={receipt.trackingUrl} target="_blank" rel="noreferrer">
                    <MessagesSquare className="size-4" />
                    Open order & chat
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
