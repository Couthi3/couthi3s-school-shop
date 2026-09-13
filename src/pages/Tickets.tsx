import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwissHeader } from "@/components/SwissHeader";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  Bug,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Loader2,
  Send,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type Category = "issue" | "suggestion" | "staff";

const CATEGORIES: {
  id: Category;
  label: string;
  icon: typeof Bug;
  blurb: string;
}[] = [
  {
    id: "issue",
    label: "Report issue",
    icon: Bug,
    blurb: "Something broken? A shop misbehaving? Tell us what happened.",
  },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: Sparkles,
    blurb: "Ideas for the site — new features, changes, improvements.",
  },
  {
    id: "staff",
    label: "Apply for staff",
    icon: UserPlus,
    blurb: "Want to help run the site? Tell us who you are and why.",
  },
];

const STATUS_BADGE: Record<string, string> = {
  open: "bg-[var(--swiss-red)] text-white",
  in_progress: "bg-[var(--swiss-blue)] text-white",
  resolved: "bg-foreground text-background",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export default function Tickets() {
  const { isAuthenticated } = useAuth();
  const myTickets = useQuery(api.support.myTickets);
  const createTicket = useMutation(api.support.createTicket);

  const [category, setCategory] = useState<Category>("issue");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = CATEGORIES.find((c) => c.id === category)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket({
        category,
        title,
        body,
        contact: contact || undefined,
      });
      toast.success("Ticket submitted — the site admin will review it");
      setTitle("");
      setBody("");
      setContact("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Support
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Tickets & feedback
        </h1>
        <p className="mt-4 max-w-xl text-base leading-6 text-muted-foreground">
          Report a problem, suggest an idea, or apply to join the team. Every
          ticket goes straight to the site admin.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Submit form */}
          <div>
            <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
              <TabsList className="h-11 w-full justify-start rounded-none border-2 border-foreground bg-muted p-0">
                {CATEGORIES.map((c) => (
                  <TabsTrigger
                    key={c.id}
                    value={c.id}
                    className="h-full rounded-none px-4 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    <c.icon className="mr-1.5 size-3.5" />
                    {c.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <p className="border-l-4 border-primary bg-muted px-3 py-2 text-sm text-muted-foreground">
                {active.blurb}
              </p>
              <div>
                <Label htmlFor="ticket-title" className="grid-label mb-1.5 block">
                  Title
                </Label>
                <Input
                  id="ticket-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    category === "issue"
                      ? "Checkout button not working"
                      : category === "suggestion"
                        ? "Add a wish-list feature"
                        : "Staff application — your name"
                  }
                  maxLength={80}
                  className="h-11 border-foreground"
                />
              </div>
              <div>
                <Label htmlFor="ticket-body" className="grid-label mb-1.5 block">
                  Details
                </Label>
                <Textarea
                  id="ticket-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    category === "staff"
                      ? "Who are you, how long have you used the site, and why should we pick you?"
                      : "Describe it in as much detail as you can…"
                  }
                  rows={6}
                  maxLength={2000}
                  className="resize-none border-foreground"
                />
              </div>
              {!isAuthenticated && (
                <div>
                  <Label htmlFor="ticket-contact" className="grid-label mb-1.5 block">
                    How can we reach you? (optional)
                  </Label>
                  <Input
                    id="ticket-contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Your name or username"
                    maxLength={60}
                    className="h-11 border-foreground"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Sign in and we'll attach your account so you can track
                    replies.{" "}
                    <Link to="/auth?returnTo=%2Ftickets" className="underline hover:text-primary">
                      Sign in
                    </Link>
                  </p>
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting || title.trim().length < 3 || body.trim().length < 10}
                className="w-full gap-2 py-6 text-xs font-bold uppercase tracking-wider"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit ticket
              </Button>
            </form>
          </div>

          {/* My tickets */}
          <div>
            <h2 className="mb-4 text-xl font-bold uppercase">Your tickets</h2>
            {!isAuthenticated ? (
              <div className="border-2 border-dashed border-foreground p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in before submitting and your tickets (with the admin's
                  replies) will show up here.
                </p>
              </div>
            ) : myTickets === undefined ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
              </div>
            ) : myTickets.length === 0 ? (
              <div className="border-2 border-dashed border-foreground p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing yet — submitted tickets and their status appear here.
                </p>
              </div>
            ) : (
              <div className="border-2 border-foreground">
                {myTickets.map((t) => (
                  <div
                    key={t._id}
                    className="border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold uppercase">
                        {t.title}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t.category === "issue" ? (
                        <Bug className="size-3" />
                      ) : t.category === "suggestion" ? (
                        <Sparkles className="size-3" />
                      ) : (
                        <UserPlus className="size-3" />
                      )}
                      {t.category.replace("_", " ")} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                    {t.adminNote && (
                      <div className="mt-2 border-l-4 border-primary bg-muted px-3 py-2">
                        <span className="grid-label flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Admin reply
                        </span>
                        <p className="mt-1 text-sm leading-5">{t.adminNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
