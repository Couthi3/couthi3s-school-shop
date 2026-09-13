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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SwissHeader } from "@/components/SwissHeader";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  ShieldCheck,
  TriangleAlert,
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

  // New admin powers
  const stats = useQuery(api.admin.siteStats, adminState?.isAdmin ? {} : "skip");
  const announcements = useQuery(
    api.admin.allAnnouncements,
    adminState?.isAdmin ? {} : "skip",
  );
  const postAnnouncement = useMutation(api.admin.postAnnouncement);
  const clearAnnouncement = useMutation(api.admin.clearAnnouncement);
  const deleteAnnouncement = useMutation(api.admin.deleteAnnouncement);
  const adminUpdateShop = useMutation(api.admin.adminUpdateShop);
  const adminResetShopCode = useMutation(api.admin.adminResetShopCode);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [busyShop, setBusyShop] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  // Announcements
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementUrgent, setAnnouncementUrgent] = useState(false);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Edit-shop dialog
  const [editShop, setEditShop] = useState<{ id: string; name: string; description: string } | null>(null);
  const [savingShop, setSavingShop] = useState(false);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setPostingAnnouncement(true);
    try {
      await postAnnouncement({ text: announcementText, urgent: announcementUrgent });
      setAnnouncementText("");
      setAnnouncementUrgent(false);
      toast.success(
        announcementUrgent
          ? "Urgent announcement posted — every visitor sees it until you take it down"
          : "Announcement posted — visible on every page",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleClearAnnouncement = async (id: string) => {
    try {
      await clearAnnouncement({ announcementId: id as never });
      toast.success("Announcement taken down");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement({ announcementId: id as never });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleSaveShopEdit = async () => {
    if (!editShop) return;
    setSavingShop(true);
    try {
      await adminUpdateShop({
        shopId: editShop.id as never,
        name: editShop.name,
        description: editShop.description,
      });
      toast.success("Shop updated");
      setEditShop(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingShop(false);
    }
  };

  const handleResetCode = async (shopId: string) => {
    setBusyShop(shopId);
    try {
      const result = await adminResetShopCode({ shopId: shopId as never });
      await navigator.clipboard.writeText(result.code).catch(() => {});
      toast.success(`New code ${result.code} (copied to clipboard)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyShop(null);
    }
  };

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
                Admin control panel
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

            {/* Site stats */}
            <section className="mt-8 grid grid-cols-2 gap-px border-2 border-foreground bg-foreground sm:grid-cols-4">
              {[
                { label: "Shops", value: stats?.shops ?? 0 },
                { label: "Accounts", value: stats?.users ?? 0 },
                { label: "Items", value: stats?.items ?? 0 },
                { label: "Orders", value: stats?.orders ?? 0 },
              ].map((s) => (
                <div key={s.label} className="bg-background px-4 py-3">
                  <div className="grid-label">{s.label}</div>
                  <div className="font-mono-swiss mt-1 text-2xl font-bold">
                    {stats === undefined ? "—" : s.value}
                  </div>
                </div>
              ))}
            </section>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats === undefined
                ? "Loading stats…"
                : `${stats.featuredShops} pinned · ${stats.bannedUsers} banned accounts · $${(
                    stats.revenueCents / 100
                  ).toFixed(2)} total order volume`}
            </p>

            {/* Global announcements */}
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-bold uppercase">Announcement</h2>
              <form
                onSubmit={handlePostAnnouncement}
                className="max-w-2xl border-2 border-foreground p-4"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4 text-primary" />
                  <span className="grid-label">Post a message to every page</span>
                </div>
                <Textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. The school store closes Friday — get your orders in!"
                  maxLength={200}
                  rows={2}
                  className="mt-3 resize-none border-foreground"
                />
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                      <Switch
                        checked={announcementUrgent}
                        onCheckedChange={setAnnouncementUrgent}
                        aria-label="Mark announcement as urgent"
                      />
                      <TriangleAlert
                        className={`size-3.5 ${announcementUrgent ? "text-destructive" : "text-muted-foreground"}`}
                      />
                      Urgent
                    </label>
                    <p className="max-w-xs text-[11px] leading-4 text-muted-foreground">
                      Urgent = red hazard-striped bar with a blinking alert.
                      Cannot be dismissed by visitors — it stays up until you
                      take it down.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {announcementText.length}/200 · replaces the current
                      announcement
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        postingAnnouncement || !announcementText.trim()
                      }
                      className={announcementUrgent ? "gap-1.5 bg-destructive text-white hover:bg-destructive/90" : "gap-1.5"}
                    >
                      {postingAnnouncement ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : announcementUrgent ? (
                        <TriangleAlert className="size-3.5" />
                      ) : (
                        <Megaphone className="size-3.5" />
                      )}
                      {announcementUrgent ? "Publish urgent" : "Publish"}
                    </Button>
                  </div>
                </div>
              </form>
              {announcements !== undefined && announcements.length > 0 && (
                <div className="mt-4 max-w-2xl border-2 border-foreground">
                  {announcements.slice(0, 8).map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <span
                        className={`inline-block size-2 shrink-0 ${
                          a.active
                            ? a.urgent
                              ? "announcement-blink bg-destructive"
                              : "bg-primary"
                            : "bg-muted-foreground/40"
                        }`}
                        title={
                          a.active
                            ? a.urgent
                              ? "Live · urgent"
                              : "Live"
                            : "Retired"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {a.urgent && (
                            <span className="mr-1.5 inline-block bg-destructive px-1 text-[10px] font-bold uppercase tracking-widest text-white">
                              Urgent
                            </span>
                          )}
                          {a.text}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {a.active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-foreground"
                          onClick={() => handleClearAnnouncement(a._id)}
                        >
                          Take down
                        </Button>
                      )}
                      {!a.active && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Delete from history"
                          onClick={() => handleDeleteAnnouncement(a._id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="mt-10 max-w-xl text-base leading-6 text-muted-foreground">
              Hand-pick the shops that appear on the explore page. Pinned shops
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
                              title="Edit name / description"
                              onClick={() =>
                                setEditShop({
                                  id: shop._id,
                                  name: shop.name,
                                  description: shop.description || "",
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={busyShop === shop._id}
                              title="Reset sign-in code (old code stops working)"
                              onClick={() => handleResetCode(shop._id)}
                            >
                              <KeyRound className="size-3.5" />
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
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              title="Edit name / description"
                              onClick={() =>
                                setEditShop({
                                  id: shop._id,
                                  name: shop.name,
                                  description: shop.description || "",
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={busyShop === shop._id}
                              title="Reset sign-in code (old code stops working)"
                              onClick={() => handleResetCode(shop._id)}
                            >
                              <KeyRound className="size-3.5" />
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

                {/* Edit shop dialog */}
                <Dialog
                  open={editShop !== null}
                  onOpenChange={(open) => !open && setEditShop(null)}
                >
                  <DialogContent className="border-2 border-foreground sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-bold uppercase tracking-tight">
                        Edit shop
                      </DialogTitle>
                      <DialogDescription>
                        Fix an inappropriate name or description without
                        deleting the shop. Changes go live immediately.
                      </DialogDescription>
                    </DialogHeader>
                    {editShop && (
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="edit-shop-name"
                            className="grid-label mb-1.5 block"
                          >
                            Shop name
                          </label>
                          <Input
                            id="edit-shop-name"
                            value={editShop.name}
                            onChange={(e) =>
                              setEditShop({ ...editShop, name: e.target.value })
                            }
                            maxLength={40}
                            className="h-11 border-foreground"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="edit-shop-desc"
                            className="grid-label mb-1.5 block"
                          >
                            Description
                          </label>
                          <Textarea
                            id="edit-shop-desc"
                            value={editShop.description}
                            onChange={(e) =>
                              setEditShop({
                                ...editShop,
                                description: e.target.value,
                              })
                            }
                            maxLength={200}
                            rows={3}
                            className="resize-none border-foreground"
                          />
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setEditShop(null)}
                        className="border-foreground"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveShopEdit}
                        disabled={
                          savingShop ||
                          !editShop ||
                          editShop.name.trim().length < 2
                        }
                      >
                        {savingShop && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        Save changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </>
        ) : (
          /* --------------------------- admin sign in -------------------------- */
          <div className="mt-6 max-w-md border-2 border-foreground p-8">
            <div className="mb-4 flex size-10 items-center justify-center bg-[var(--swiss-blue)]">
              <User className="size-5 text-background" />
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
