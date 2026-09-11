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
import { Loader2, Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { PICKUP_PERIODS, formatPrice } from "@/lib/shop-format";

export default function Storefront() {
  const { shopId } = useParams<{ shopId: string }>();
  const shop = useQuery(api.shops.publicShop, {
    shopId: shopId as never,
  });
  const placeOrder = useMutation(api.shops.placeOrder);

  const [dialogItem, setDialogItem] = useState<{
    _id: string;
    name: string;
    priceCents: number;
  } | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [period, setPeriod] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const openOrderDialog = (item: {
    _id: string;
    name: string;
    priceCents: number;
  }) => {
    setDialogItem(item);
    setBuyerName("");
    setPeriod("");
    setNote("");
    setQuantity(1);
  };

  const closeDialog = () => {
    setDialogItem(null);
    setSubmitting(false);
  };

  const submitOrder = async () => {
    if (!dialogItem || !shopId) return;
    setSubmitting(true);
    try {
      await placeOrder({
        shopId: shopId as never,
        itemId: dialogItem._id as never,
        quantity,
        buyerName,
        period,
        note: note || undefined,
      });
      toast.success(`Order placed for ${dialogItem.name}`);
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      {shop === undefined ? (
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : shop === null ? (
        <div className="container-swiss py-20 text-center">
          <h1 className="text-3xl font-bold uppercase">Shop not found</h1>
          <p className="mt-3 text-muted-foreground">
            This shop doesn't exist.{" "}
            <a href="/" className="underline hover:text-primary">
              Back to all shops
            </a>
          </p>
        </div>
      ) : (
        <>
          <section className="border-b-2 border-foreground">
            <div className="container-swiss py-10 md:py-14">
              <div className="grid-label mb-5 flex items-center gap-2">
                <span className="inline-block size-2.5 bg-primary" />
                School shop
              </div>
              <h1 className="text-4xl font-bold uppercase tracking-tight md:text-6xl">
                {shop.name}
              </h1>
              {shop.description && (
                <p className="mt-4 max-w-2xl text-base leading-6 text-muted-foreground md:text-lg">
                  {shop.description}
                </p>
              )}
              <p className="mt-5 text-sm text-muted-foreground">
                Pick an item, choose the period you want it delivered in, and
                the shop owner will see it instantly.
              </p>
            </div>
          </section>

          <section className="border-b-2 border-foreground bg-muted">
            <div className="container-swiss py-10 md:py-14">
              <h2 className="mb-8 text-2xl font-bold uppercase tracking-tight md:text-3xl">
                Items for sale
              </h2>
              {shop.items.length === 0 ? (
                <div className="border border-foreground bg-background p-10 text-center">
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
                      className="flex flex-col bg-background p-5"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-lg font-bold uppercase leading-tight">
                          {item.name}
                        </h3>
                        <span className="font-mono-swiss shrink-0 text-lg font-bold text-primary">
                          {formatPrice(item.priceCents)}
                        </span>
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
                        >
                          <ShoppingBag className="size-3.5" />
                          Order for pickup
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
              {dialogItem &&
                `${formatPrice(dialogItem.priceCents)} · pay the owner directly`}
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
                    {PICKUP_PERIODS.map((p) => (
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
              disabled={submitting || !buyerName.trim() || !period}
              className="w-full py-6 text-xs font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Place order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
