import { SwissHeader } from "@/components/SwissHeader";
import { OrderChat } from "@/components/OrderChat";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { HandCoins, Loader2, MessageCircle, Repeat } from "lucide-react";
import { Link, useParams } from "react-router";
import { formatTime, statusColor } from "@/lib/shop-format";

const OFFER_STEPS = ["new", "ready", "delivered"] as const;

export default function OrderTracking() {
  const { token } = useParams<{ token: string }>();
  const order = useQuery(api.shops.orderByToken, token ? { token } : "skip");

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SwissHeader />
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SwissHeader />
        <div className="container-swiss max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold uppercase">Order not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This order link is invalid — check the link you saved at checkout.
          </p>
          <Link
            to="/shops"
            className="mt-6 inline-block text-sm font-bold uppercase tracking-wider underline hover:text-primary"
          >
            Browse shops
          </Link>
        </div>
      </div>
    );
  }

  const stepIndex = OFFER_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Order tracking
        </div>

        <h1 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">
          {order.quantity}× {order.itemName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.shopEmoji} {order.shopName} · placed{" "}
          {new Date(order.createdAt).toLocaleString()}
        </p>

        {/* Status timeline */}
        <div className="mt-8 grid max-w-2xl grid-cols-3 gap-px border-2 border-foreground bg-foreground">
          {OFFER_STEPS.map((step, idx) => (
            <div
              key={step}
              className={`px-4 py-3 ${
                idx <= stepIndex ? "bg-background" : "bg-muted"
              }`}
            >
              <span className="grid-label">{`Step ${idx + 1}`}</span>
              <p
                className={`mt-1 text-sm font-bold uppercase tracking-wide ${
                  idx <= stepIndex ? "" : "text-muted-foreground"
                }`}
              >
                {step === "new"
                  ? "Offer sent"
                  : step === "ready"
                    ? "Ready for you"
                    : "Handed over"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Order details */}
          <div>
            <h2 className="mb-4 text-xl font-bold uppercase">Your offer</h2>
            <div className="border-2 border-foreground">
              <div className="border-b border-border px-4 py-3">
                <span className="grid-label">Pickup</span>
                <p className="mt-0.5 text-sm font-bold uppercase">
                  {order.period}
                </p>
              </div>
              <div className="border-b border-border px-4 py-3">
                <span className="grid-label">Paying with</span>
                <p className="mt-1 flex items-center gap-2 text-sm font-bold uppercase">
                  {order.offerKind === "money" ? (
                    <>
                      <HandCoins className="size-4 text-primary" />
                      Money
                    </>
                  ) : (
                    <>
                      <Repeat className="size-4 text-primary" />
                      Trade
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm leading-5">
                  {order.offerKind === "money"
                    ? `${order.moneyCents !== null ? `$${(order.moneyCents / 100).toFixed(2)}` : "—"} (pay the owner directly)`
                    : order.tradeOffer}
                </p>
              </div>
              <div className="px-4 py-3">
                <span className="grid-label">Status</span>
                <p className="mt-1">
                  <span
                    className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Negotiation chat */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold uppercase">
              <MessageCircle className="size-5 text-primary" />
              Chat with the shop
            </h2>
            <p className="mb-4 text-xs leading-4 text-muted-foreground">
              Negotiate here — counter-offers, questions, where to meet. Both
              of you see the same messages instantly.
            </p>
            <OrderChat
              orderId={order._id}
              token={token}
              role="buyer"
            />
          </div>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Order opened {formatTime(order.createdAt)} · keep this link private —
          anyone who has it can view this order and chat.
        </p>
      </div>
    </div>
  );
}
