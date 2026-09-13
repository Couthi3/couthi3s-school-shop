import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { SwissHeader } from "@/components/SwissHeader";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Loader2,
  LogOut,
  Pin,
  PinOff,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Admin() {
  const adminState = useQuery(api.admin.adminState);
  const allShops = useQuery(
    api.admin.allShops,
    adminState?.isAdmin ? {} : "skip",
  );

  const { signIn } = useAuthActions();
  const adminSignIn = useMutation(api.admin.adminSignIn);
  const adminSignOut = useMutation(api.admin.adminSignOut);
  const setFeatured = useMutation(api.admin.setFeatured);
  const moveFeatured = useMutation(api.admin.moveFeatured);
  const deleteShop = useMutation(api.admin.deleteShop);
  const setUserBanned = useMutation(api.admin.setUserBanned);
  const users = useQuery(api.admin.allUsers, adminState?.isAdmin ? {} : "skip");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [busyShop, setBusyShop] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  // Ensure this browser has an auth session (anonymous) so the admin grant
  // has something to bind to. Runs once; never blocks the form.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (adminState === undefined || autoStarted.current) return;
    autoStarted.current = true;
    if (!adminState.signedIn) {
      signIn("anonymous").catch(() => {});
    }
  }, [adminState, signIn]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      await adminSignIn({ username, password });
      toast.success("Admin access granted");
      setUsername("");
      setPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Incorrect username or password",
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleExitAdmin = async () => {
    try {
      await adminSignOut({});
      toast.success("Admin session closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggleFeatured = async (shopId: string, featured: boolean) => {
    setBusyShop(shopId);
    try {
      await setFeatured({ shopId: shopId as never, featured });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

  const move = async (shopId: string, direction: "up" | "down") => {
    setBusyShop(shopId);
    try {
      await moveFeatured({ shopId: shopId as never, direction });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    setBusyShop(shopId);
    try {
      await deleteShop({ shopId: shopId as never });
      toast.success("Shop deleted permanently");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

  const handleSetBanned = async (userId: string, banned: boolean) => {
    setBusyUser(userId);
    try {
      await setUserBanned({ userId: userId as never, banned });
      toast.success(banned ? "User banned" : "User unbanned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyUser(null);
    }
  };

  const deleteDialog = (shopId: string, shopName: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          className="border-destructive text-destructive"
          disabled={busyShop === shopId}
          title="Delete shop"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-2 border-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold uppercase tracking-tight">
            Delete “{shopName}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the shop, all its items and orders, and
            its sign-in code. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-2 border-foreground">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => handleDeleteShop(shopId)}
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (adminState === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SwissHeader />
        <div className="container-swiss py-20 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const featured = (allShops ?? [])
    .filter((s) => s.featured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);
  const rest = (allShops ?? [])
    .filter((s) => !s.featured)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Site administration
        </div>

        {adminState.isAdmin ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
                Featured stores
              </h1>
              <Button
                variant="outline"
                onClick={handleExitAdmin}
                className="gap-1.5 border-foreground"
              >
                <LogOut className="size-4" />
                Exit admin
              </Button>
            </div>
            <p className="mt-4 max-w-xl text-base leading-6 text-muted-foreground">
              Hand-pick the shops that appear on the home page. Pinned shops
              show first, in the order you set.
            </p>

            {allShops === undefined ? (
              <div className="mt-12 py-10 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Featured list */}
                <section className="mt-12">
                  <h2 className="mb-5 text-xl font-bold uppercase">
                    Pinned to home page
                    <span className="ml-2 font-mono-swiss text-sm text-primary">
                      {featured.length}
                    </span>
                  </h2>
                  {featured.length === 0 ? (
                    <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                      Nothing pinned yet — use “Pin” below to feature a shop.
                    </div>
                  ) : (
                    <div className="border-2 border-foreground">
                      {featured.map((shop, idx) => (
                        <div
                          key={shop._id}
                          className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 last:border-b-0"
                        >
                          <span className="font-mono-swiss w-8 text-lg font-bold text-primary">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold uppercase">
                              {shop.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {shop.description || "No description"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-xs uppercase"
                            >
                              <Link to={`/shop/${shop._id}`}>View</Link>
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={idx === 0 || busyShop === shop._id}
                              title="Move up"
                              onClick={() => move(shop._id, "up")}
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={
                                idx === featured.length - 1 ||
                                busyShop === shop._id
                              }
                              title="Move down"
                              onClick={() => move(shop._id, "down")}
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-foreground"
                              disabled={busyShop === shop._id}
                              onClick={() => toggleFeatured(shop._id, false)}
                            >
                              <PinOff className="size-3.5" />
                              Unpin
                            </Button>
                            {deleteDialog(shop._id, shop.name)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* All other shops */}
                <section className="mt-12">
                  <h2 className="mb-5 text-xl font-bold uppercase">
                    All shops
                    <span className="ml-2 font-mono-swiss text-sm text-muted-foreground">
                      {rest.length}
                    </span>
                  </h2>
                  {rest.length === 0 ? (
                    <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                      No unpinned shops. New shops appear here as students
                      create them.
                    </div>
                  ) : (
                    <div className="border-2 border-foreground">
                      {rest.map((shop) => (
                        <div
                          key={shop._id}
                          className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold uppercase">
                              {shop.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {shop.description || "No description"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-xs uppercase"
                            >
                              <Link to={`/shop/${shop._id}`}>View</Link>
                            </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-foreground"
                            disabled={busyShop === shop._id}
                            onClick={() => toggleFeatured(shop._id, true)}
                          >
                            <Pin className="size-3.5" />
                            Pin
                          </Button>
                          {deleteDialog(shop._id, shop.name)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Users & moderation */}
                <section className="mt-12">
                  <h2 className="mb-5 text-xl font-bold uppercase">
                    Users
                    <span className="ml-2 font-mono-swiss text-sm text-muted-foreground">
                      {users?.length ?? 0}
                    </span>
                  </h2>
                  {users === undefined ? (
                    <div className="py-6 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                      No accounts yet.
                    </div>
                  ) : (
                    <div className="border-2 border-foreground">
                      {users.map((u) => (
                        <div
                          key={u._id}
                          className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold uppercase">
                              {u.name || u.email || "Guest"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              Account
                              {u.isAdmin ? " · admin" : ""}
                              {u.banned
                                ? ` · banned${
                                    u.bannedAt
                                      ? ` ${new Date(u.bannedAt).toLocaleDateString()}`
                                      : ""
                                  }`
                                : ""}
                            </span>
                          </div>
                          {!u.isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={
                                u.banned
                                  ? "gap-1.5 border-foreground"
                                  : "gap-1.5 border-destructive text-destructive"
                              }
                              disabled={busyUser === u._id}
                              onClick={() => handleSetBanned(u._id, !u.banned)}
                            >
                              {u.banned ? (
                                <>
                                  <UserCheck className="size-3.5" />
                                  Unban
                                </>
                              ) : (
                                <>
                                  <Ban className="size-3.5" />
                                  Ban
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          /* --------------------------- admin sign in -------------------------- */
          <div className="mt-6 max-w-md border-2 border-foreground p-8">
            <div className="mb-4 flex size-10 items-center justify-center bg-[var(--swiss-blue)]">
              <User className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">
              Admin sign-in
            </h1>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Enter the site administrator credentials to manage featured
              stores.
            </p>
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-username" className="grid-label mb-2 block">
                  Username
                </label>
                <Input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  required
                  className="h-12 border-2 border-foreground font-mono-swiss"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="grid-label mb-2 block">
                  Password
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="h-12 border-2 border-foreground font-mono-swiss"
                />
              </div>
              <Button
                type="submit"
                disabled={signingIn || !username.trim() || !password}
                className="w-full gap-2 py-6 text-sm font-bold uppercase tracking-wider"
              >
                {signingIn ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Sign in as admin
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
