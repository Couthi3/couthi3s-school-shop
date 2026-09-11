import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

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
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss flex min-h-[80vh] max-w-md flex-col justify-center py-12">
        {step === "signIn" ? (
          <>
            <div className="grid-label mb-5 flex items-center gap-2">
              <span className="inline-block size-2.5 bg-primary" />
              Sign in
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">
              Get started
            </h1>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              Enter your email to log in or create a free account. We'll send
              you a six-digit code.
            </p>

            <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="email" className="grid-label mb-2 block">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@example.com"
                    type="email"
                    className="h-12 border-foreground pl-9"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full text-sm font-bold uppercase tracking-wider"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="grid-label mb-5 flex items-center gap-2">
              <span className="inline-block size-2.5 bg-primary" />
              Verify
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-tight md:text-4xl">
              Check your email
            </h1>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              We sent a six-digit code to {step.email}. It expires in 15
              minutes.
            </p>

            <form onSubmit={handleOtpSubmit} className="mt-8 space-y-5">
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="code" value={otp} />
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={6}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                    const form = (e.target as HTMLElement).closest("form");
                    if (form) form.requestSubmit();
                  }
                }}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && (
                <p className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="h-12 w-full text-sm font-bold uppercase tracking-wider"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setStep("signIn")}
                disabled={isLoading}
                className="w-full text-center text-xs text-muted-foreground underline hover:text-primary"
              >
                Use a different email
              </button>
            </form>
          </>
        )}
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
