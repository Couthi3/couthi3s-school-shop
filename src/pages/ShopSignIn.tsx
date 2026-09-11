import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import { useAuth } from "@/hooks/use-auth";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function ShopSignIn() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startSession = useMutation(api.shops.startCodeSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await startSession({ code });
      toast.success(`Signed in to ${res.shopName}`);
      navigate(`/manage/${res.shopId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />
      <div className="container-swiss flex min-h-[75vh] max-w-xl flex-col justify-center py-12 md:py-16">
        <div className="grid-label mb-6 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Shop owners
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Shop sign-in
        </h1>
        <p className="mt-4 text-base leading-6 text-muted-foreground">
          Enter the private code you received when you created your shop. It
          unlocks the dashboard with live orders.
        </p>

        {!isAuthenticated ? (
          <div className="mt-10 border-2 border-foreground p-8">
            <h2 className="text-lg font-bold uppercase">Sign in first</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your email, then enter your shop code. The code is
              what grants access — your email just holds the session.
            </p>
            <Button
              asChild
              className="mt-6 w-full py-6 text-sm font-bold uppercase tracking-wider"
            >
              <Link to="/auth?returnTo=%2Fshop-signin">
                Continue to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label htmlFor="shop-code" className="grid-label mb-2 block">
                Shop code
              </label>
              <Input
                id="shop-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                required
                className="h-14 border-foreground text-center font-mono-swiss text-2xl tracking-[0.3em]"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || code.trim().length < 4}
              className="w-full py-6 text-sm font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="size-4" />
                  Unlock dashboard
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Lost your code? It's shown in{" "}
              <Link to="/manage" className="underline hover:text-primary">
                My Shop
              </Link>{" "}
              if you're still the owner.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
