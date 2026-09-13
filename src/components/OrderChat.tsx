import { api } from "@/convex/_generated/api";
import { Loader2, Send } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatTime } from "@/lib/shop-format";

type Props = {
  orderId: string;
  /** Buyer mode requires the secret tracking token. */
  token?: string;
  /** Whose side of the conversation is this client on. */
  role: "owner" | "buyer";
  className?: string;
  compact?: boolean;
};

/**
 * Mini chat attached to an order. The shop owner negotiates with the buyer —
 * the buyer participates through their private order-tracking link, so no
 * account is needed on their side.
 */
export function OrderChat({
  orderId,
  token,
  role,
  className,
  compact = false,
}: Props) {
  const messages = useQuery(api.shops.orderMessages, {
    orderId: orderId as never,
    token,
  });
  const sendOwner = useMutation(api.shops.sendOwnerMessage);
  const sendBuyer = useMutation(api.shops.sendBuyerMessage);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      if (role === "buyer") {
        if (!token) return;
        await sendBuyer({ orderId: orderId as never, token, text });
      } else {
        await sendOwner({ orderId: orderId as never, text });
      }
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const mine = role === "buyer" ? "buyer" : "owner";

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        className={`space-y-2 overflow-y-auto border-2 border-foreground bg-muted p-3 ${
          compact ? "max-h-44 min-h-24" : "max-h-64 min-h-32"
        }`}
      >
        {messages === undefined ? (
          <div className="py-4 text-center">
            <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            {role === "owner"
              ? "No messages yet — send the buyer an opening offer or question."
              : "No messages yet — the shop owner will reply here."}
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.from === mine;
            return (
              <div
                key={m._id}
                className={`flex flex-col ${
                  isMine ? "items-end" : "items-start"
                }`}
              >
                <span className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {m.from === "owner" ? "Shop" : "Buyer"}
                  {isMine && " · you"}
                </span>
                <div
                  className={`max-w-[85%] border-2 px-3 py-1.5 text-sm leading-5 ${
                    isMine
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-foreground bg-background"
                  }`}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={500}
          className="h-10 w-full border-2 border-foreground bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send message"
          className="flex h-10 w-11 shrink-0 items-center justify-center bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}
