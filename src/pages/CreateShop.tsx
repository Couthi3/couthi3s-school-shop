import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Copy, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function CreateShop() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const createShop = useMutation(api.shops.createShop);

  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ shopId: string; code: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  // Anonymous sign-in happens automatically so creating a store is one step.
  useEffect(() => {
    if (isLoading || isAuthenticated || autoStarted) return;
    setAutoStarted(true);
    signIn("anonymous").catch(() => {
      toast.error("Couldn't start a session — please enable cookies");
    });
  }, [isLoading, isAuthenticated, autoStarted, signIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createShop({ name });
      setCreated(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      toast.success("Code copied");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  if (created) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SwissHeader />
        <div className="container-swiss flex min-h-[70vh] items-center justify-center py-16">
          <div className="w-full max-w-md border-4 border-foreground bg-card p-8">
            <div className="mb-4 flex size-10 items-center justify-center bg-primary">
              <Lock className="size-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">
              Store created
            </h1>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              This is your private sign-in code. Save it — it's how you open
              your dashboard and see orders from any device.
            </p>
            <div className="mt-6 flex items-center justify-between border-2 border-foreground bg-muted px-4 py-3">
              <span className="font-mono-swiss text-2xl font-bold tracking-[0.3em]">
                {created.code}
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
              <span className="sr-only">{created.code}</span>
            </div>
            <Button
              onClick={() => navigate(`/manage/${created.shopId}`)}
              className="mt-6 w-full py-6 text-sm font-bold uppercase tracking-wider"
            >
              Open my dashboard
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              You can also sign in later at{" "}
              <Link to="/shop-signin" className="underline hover:text-primary">
                Shop Owner Sign-In
              </Link>
            </p>
          </div>
        </div>
        <div className="container-swiss pb-10">
          <p className="grid-label text-center">
            Keep this code private — anyone with it can manage your store
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />
      <div className="container-swiss flex min-h-[75vh] max-w-xl flex-col justify-center py-12 md:py-16">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Free · one step
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Name your store
        </h1>
        <p className="mt-4 text-base leading-6 text-muted-foreground">
          Type a name and you're in. We'll generate your private sign-in code
          and take you straight to the dashboard.
        </p>

        {isLoading ? (
          <div className="mt-10 border border-foreground p-8 text-center">
            <Loader2 className="mx-auto size-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label htmlFor="shop-name" className="grid-label mb-2 block">
                Store name
              </label>
              <Input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan's Snack Bar"
                maxLength={40}
                required
                className="h-14 border-2 border-foreground text-xl font-bold"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                2–40 characters. You can change it later in settings.
              </p>
            </div>
            <Button
              type="submit"
              disabled={submitting || name.trim().length < 2}
              className="w-full py-6 text-sm font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create store & get code"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have a code?{" "}
              <Link to="/shop-signin" className="underline hover:text-primary">
                Sign in to your store
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
