import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker } from "@/components/ColorPicker";
import { useAuth } from "@/hooks/use-auth";
import { api } from "../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowRight, Loader2, ShieldCheck, Store, User } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

function Home() {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const featuredCount = useQuery(api.shops.featuredShops);
  const navigate = useNavigate();
  const { signIn: rawSignIn } = useAuthActions();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // The home screen doubles as a guest entry: give every visitor a session
  // so "Open a shop" is always one step away.
  useEffect(() => {
    if (authLoading || isAuthenticated || autoStarted) return;
    setAutoStarted(true);
    rawSignIn("anonymous").catch(() => {});
  }, [authLoading, isAuthenticated, autoStarted, rawSignIn]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", {
        username: username.trim(),
        password,
        flow: mode === "signIn" ? "signIn" : "signUp",
      });
      toast.success(mode === "signIn" ? "Welcome back" : "Account created");
      navigate("/shops");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        mode === "signUp" && message.includes("already")
          ? "That username is taken — try signing in instead."
          : mode === "signIn"
            ? "Incorrect username or password."
            : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goShopping = () => {
    if (!isAuthenticated && !autoStarted) return;
    navigate("/shops");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top strip: site identity + site-wide color picker */}
      <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3 md:px-10">
        <span className="text-sm font-bold uppercase tracking-[0.18em]">
          School Shops
        </span>
        <ColorPicker />
      </div>

      <div className="container-swiss grid min-h-[calc(100vh-3.25rem)] items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        {/* Left: welcome panel */}
        <div>
          <div className="grid-label mb-5 flex items-center gap-2">
            <span className="inline-block size-2.5 bg-primary" />
            Welcome
          </div>
          <h1 className="text-4xl font-bold uppercase leading-[1.02] tracking-tight md:text-6xl">
            School
            <br />
            Shops
          </h1>
          <p className="mt-5 max-w-md text-base leading-6 text-muted-foreground">
            Free storefronts run by students. Sign in, or just walk in and
            browse the shops.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={goShopping}
              className="h-12 gap-2 px-6 text-xs font-bold uppercase tracking-wider"
            >
              <Store className="size-4" />
              Browse shops
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 gap-2 border-2 border-foreground px-6 text-xs font-bold uppercase tracking-wider"
            >
              <Link to="/create-shop">
                Open a shop
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 grid-label">
            {featuredCount === undefined
              ? "Loading the shops…"
              : `${featuredCount.length} featured shop${featuredCount.length === 1 ? "" : "s"} today`}
          </p>
        </div>

        {/* Right: the sign-in card */}
        <div className="w-full max-w-md justify-self-start border-2 border-foreground bg-card p-8 lg:justify-self-end">
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "signIn" | "signUp");
              setError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signIn">Sign in</TabsTrigger>
              <TabsTrigger value="signUp">Sign up</TabsTrigger>
            </TabsList>
          </Tabs>

          <h2 className="mt-6 text-2xl font-bold uppercase tracking-tight">
            {mode === "signIn" ? "Welcome back" : "Make your account"}
          </h2>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {mode === "signIn"
              ? "Username and password — that's it."
              : "Pick a username and password. No email needed."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="home-username" className="grid-label mb-2 block">
                Username
              </Label>
              <Input
                id="home-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="juan.premium"
                autoComplete="username"
                className="h-12 border-2 border-foreground"
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="home-password" className="grid-label mb-2 block">
                Password
              </Label>
              <Input
                id="home-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signUp" ? "At least 8 characters" : "••••••••"}
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                className="h-12 border-2 border-foreground"
                disabled={isLoading}
                required
                minLength={mode === "signUp" ? 8 : undefined}
              />
            </div>
            {error && (
              <p className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="h-12 w-full text-sm font-bold uppercase tracking-wider"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signIn" ? (
                <>
                  <ShieldCheck className="size-4" />
                  Sign in
                </>
              ) : (
                <>
                  <User className="size-4" />
                  Create account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/shops" className="underline hover:text-primary">
              Just browsing? Enter here
            </Link>
            <Link to="/shop-signin" className="underline hover:text-primary">
              Have a shop code?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
