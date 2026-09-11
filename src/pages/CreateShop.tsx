import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import { useAuth } from "@/hooks/use-auth";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { Copy, Loader2, Lock, Store } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function CreateShop() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const createShop = useMutation(api.shops.createShop);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [created, setCreated] = useState<{ shopId: string; code: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createShop({ name, description });
      setCreated(res);
      toast.success("Shop created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shop");
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
              Shop created
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This is your private sign-in code. Save it — it's how you open
              your shop's dashboard and see orders.
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
        {/* Reassuring note about the code being stored for the owner */}
        <div className="container-swiss pb-10">
          <p className="grid-label text-center">
            Keep this code private — anyone with it can manage your shop
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />
      <div className="container-swiss max-w-xl py-12 md:py-16">
        <div className="grid-label mb-6 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Free · takes two minutes
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Open your shop
        </h1>
        <p className="mt-4 text-base leading-6 text-muted-foreground">
          Name it, describe it, get your code. You can change everything later.
        </p>

        {isLoading ? (
          <div className="mt-10 border border-foreground p-8 text-center">
            <Loader2 className="mx-auto size-5 animate-spin" />
          </div>
        ) : !isAuthenticated ? (
          <div className="mt-10 border-2 border-foreground p-8">
            <h2 className="text-lg font-bold uppercase">Sign in first</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A free account keeps your shop claimable only by you, and your
              code lets anyone you trust manage it.
            </p>
            <Button
              asChild
              className="mt-6 w-full py-6 text-sm font-bold uppercase tracking-wider"
            >
              <Link to="/auth?returnTo=%2Fcreate-shop">Continue to sign in</Link>
            </Button>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label htmlFor="shop-name" className="grid-label mb-2 block">
                Shop name
              </label>
              <Input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan's Snack Bar"
                maxLength={40}
                required
                className="h-11 border-foreground text-base"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                2–40 characters.
              </p>
            </div>
            <div>
              <label htmlFor="shop-desc" className="grid-label mb-2 block">
                What do you sell?
              </label>
              <Input
                id="shop-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fresh snacks, drinks, and school supplies"
                maxLength={200}
                className="h-11 border-foreground text-base"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Shown on your storefront card. Max 200 characters.
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
                <>
                  <Store className="size-4" />
                  Create shop & get code
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have a code?{" "}
              <Link to="/shop-signin" className="underline hover:text-primary">
                Sign in to your shop
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
