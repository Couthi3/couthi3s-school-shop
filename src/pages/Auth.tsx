import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwissHeader } from "@/components/SwissHeader";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/manage",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const flow = mode === "signIn" ? "signIn" : "signUp";
    try {
      await signIn("password", {
        username: username.trim(),
        password,
        flow,
      });
      toast.success(
        mode === "signIn" ? "Welcome back" : "Account created — you're in",
      );
      navigate(redirect);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss flex min-h-[80vh] max-w-md flex-col justify-center py-12">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          {mode === "signIn" ? "Sign in" : "Create account"}
        </div>
        <h1 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">
          {mode === "signIn" ? "Welcome back" : "Make your account"}
        </h1>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">
          {mode === "signIn"
            ? "Log in with your username and password."
            : "Pick a username and a password. No email needed."}
        </p>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as "signIn" | "signUp");
            setError(null);
          }}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signIn">Sign in</TabsTrigger>
            <TabsTrigger value="signUp">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="grid-label mb-2 block">
              Username
            </label>
            <Input
              id="username"
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
            <label htmlFor="password" className="grid-label mb-2 block">
              Password
            </label>
            <Input
              id="password"
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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Opening a shop doesn't need an account — you just need a store name at{" "}
          <a
            href="/create-shop"
            className="underline hover:text-primary"
            onClick={(e) => {
              e.preventDefault();
              navigate("/create-shop");
            }}
          >
            Open a shop
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
