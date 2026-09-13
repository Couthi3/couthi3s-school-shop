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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SwissHeader } from "@/components/SwissHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAM_RANKS, rankBadgeClass } from "@/lib/team-ranks";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
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
  Upload,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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

  // Tickets & team management
  const tickets = useQuery(
    api.support.allTickets,
    adminState?.isAdmin ? {} : "skip",
  );
  const updateTicket = useMutation(api.support.updateTicket);
  const deleteTicket = useMutation(api.support.deleteTicket);
  const teamMembers = useQuery(api.team.teamMembers);
  const addTeamMember = useMutation(api.team.addTeamMember);
  const updateTeamMember = useMutation(api.team.updateTeamMember);
  const removeTeamMember = useMutation(api.team.removeTeamMember);
  const moveTeamMember = useMutation(api.team.moveTeamMember);

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

  // Team management dialog state
  const [teamDialog, setTeamDialog] = useState<{
    id: string | null; // null = adding new
    name: string;
    rank: string;
    tagline: string;
    imageId: string | null;
    imageUrl: string | null;
  } | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const generateUploadUrl = useMutation(api.team.generateUploadUrl);

  const handlePhotoUpload = async (file: File) => {
    if (!teamDialog) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    // GIFs (especially animated) run big, so they get a higher cap.
    const isGif = file.type === "image/gif";
    const maxBytes = isGif ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        isGif ? "GIF is too large (max 10 MB)" : "Image is too large (max 5 MB)",
      );
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: string };
      setTeamDialog({
        ...teamDialog,
        imageId: storageId,
        imageUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearPhoto = () => {
    if (!teamDialog) return;
    setTeamDialog({ ...teamDialog, imageId: null, imageUrl: null });
  };

  const saveTeamMember = async () => {
    if (!teamDialog) return;
    setSavingTeam(true);
    try {
      if (teamDialog.id) {
        await updateTeamMember({
          memberId: teamDialog.id as never,
          name: teamDialog.name,
          rank: teamDialog.rank,
          tagline: teamDialog.tagline || undefined,
          // null clears the photo; a new id replaces it; undefined keeps it
          imageId:
            teamDialog.imageId !== null
              ? (teamDialog.imageId as never)
              : teamDialog.imageUrl === null
                ? null
                : undefined,
        });
        toast.success("Team member updated");
      } else {
        await addTeamMember({
          name: teamDialog.name,
          rank: teamDialog.rank,
          tagline: teamDialog.tagline || undefined,
          imageId: (teamDialog.imageId ?? undefined) as never,
        });
        toast.success("Added to the team");
      }
      setTeamDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingTeam(false);
    }
  };

  const moveTeam = async (memberId: string, direction: "up" | "down") => {
    try {
      await moveTeamMember({ memberId: memberId as never, direction });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleTicketStatus = async (
    ticketId: string,
    status: "open" | "in_progress" | "resolved",
  ) => {
    try {
      await updateTicket({ ticketId: ticketId as never, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleTicketNote = async (ticketId: string, note: string) => {
    try {
      await updateTicket({ ticketId: ticketId as never, adminNote: note });
      toast.success("Reply saved — the submitter sees it on their ticket");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleTicketDelete = async (ticketId: string) => {
    try {
      await deleteTicket({ ticketId: ticketId as never });
      toast.success("Ticket deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

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
                    stats.moneyOfferCents / 100
                  ).toFixed(2)} money offered · ${stats.tradeOffers} trade${stats.tradeOffers === 1 ? "" : "s"}`}
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

                {/* Tickets */}
                <section className="mt-12">
                  <h2 className="mb-5 text-xl font-bold uppercase">
                    Tickets
                    <span className="ml-2 font-mono-swiss text-sm text-muted-foreground">
                      {tickets?.length ?? 0}
                    </span>
                  </h2>
                  {tickets === undefined ? (
                    <div className="py-6 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                      No tickets yet — issues, suggestions and staff
                      applications from /tickets appear here.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t) => (
                        <div key={t._id} className="border-2 border-foreground p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-bold uppercase">
                                {t.title}
                              </span>
                              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {t.category.replace("_", " ")} ·{" "}
                                {t.contact || "guest"} ·{" "}
                                {new Date(t.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  t.status === "open"
                                    ? "bg-[var(--swiss-red)] text-white"
                                    : t.status === "in_progress"
                                      ? "bg-[var(--swiss-blue)] text-white"
                                      : "bg-foreground text-background"
                                }`}
                              >
                                {t.status.replace("_", " ")}
                              </span>
                              {t.status === "open" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-foreground"
                                  onClick={() => handleTicketStatus(t._id, "in_progress")}
                                >
                                  Start
                                </Button>
                              )}
                              {t.status !== "resolved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-foreground"
                                  onClick={() => handleTicketStatus(t._id, "resolved")}
                                >
                                  Resolve
                                </Button>
                              )}
                              {t.status !== "open" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTicketStatus(t._id, "open")}
                                >
                                  Reopen
                                </Button>
                              )}
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Delete ticket"
                                onClick={() => handleTicketDelete(t._id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap border-l-4 border-border pl-3 text-sm leading-5 text-muted-foreground">
                            {t.body}
                          </p>
                          <TicketReply
                            initial={t.adminNote ?? ""}
                            onSave={(note) => handleTicketNote(t._id, note)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Team roster management */}
                <section className="mt-12">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold uppercase">
                      Meet the Team
                      <span className="ml-2 font-mono-swiss text-sm text-muted-foreground">
                        {teamMembers?.length ?? 0}
                      </span>
                    </h2>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        setTeamDialog({
                          id: null,
                          name: "",
                          rank: "",
                          tagline: "",
                          imageId: null,
                          imageUrl: null,
                        })
                      }
                    >
                      <UserPlus className="size-3.5" />
                      Add member
                    </Button>
                  </div>
                  <p className="mb-4 max-w-xl text-xs leading-4 text-muted-foreground">
                    This roster is public at /team — order it by rank
                    (highest first). Students can apply via a staff ticket.
                  </p>
                  {teamMembers === undefined ? (
                    <div className="py-6 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
                      No team members yet — add yourself first.
                    </div>
                  ) : (
                    <div className="border-2 border-foreground">
                      {teamMembers.map((m, idx) => (
                        <div
                          key={m._id}
                          className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
                        >
                          <span className="font-mono-swiss w-8 text-lg font-bold text-primary">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {m.imageUrl ? (
                            <img
                              src={m.imageUrl}
                              alt=""
                              className="size-10 shrink-0 border-2 border-foreground object-cover"
                            />
                          ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center border-2 border-foreground bg-muted text-sm font-bold uppercase">
                              {m.name.charAt(0)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold uppercase">
                              {m.name}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rankBadgeClass(m.rank)}`}
                              >
                                {m.rank}
                              </span>
                              {m.tagline && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {m.tagline}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={idx === 0}
                              title="Move up (higher rank)"
                              onClick={() => moveTeam(m._id, "up")}
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              disabled={idx === (teamMembers?.length ?? 0) - 1}
                              title="Move down (lower rank)"
                              onClick={() => moveTeam(m._id, "down")}
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-foreground"
                              title="Edit member"
                              onClick={() =>
                                setTeamDialog({
                                  id: m._id,
                                  name: m.name,
                                  rank: m.rank,
                                  tagline: m.tagline ?? "",
                                  imageId: null,
                                  imageUrl: m.imageUrl,
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="border-destructive text-destructive"
                              title="Remove from team"
                              onClick={() => removeTeamMember({ memberId: m._id as never })}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
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

      {/* Team member add/edit dialog */}
      <Dialog
        open={teamDialog !== null}
        onOpenChange={(open) => !open && setTeamDialog(null)}
      >
        <DialogContent className="border-2 border-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-tight">
              {teamDialog?.id ? "Edit team member" : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              Shown publicly on the Meet The Team page. Order the list by rank,
              highest first.
            </DialogDescription>
          </DialogHeader>
          {teamDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {teamDialog.imageUrl ? (
                  <img
                    src={teamDialog.imageUrl}
                    alt=""
                    className="size-20 shrink-0 border-2 border-foreground object-cover"
                  />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center border-2 border-dashed border-foreground bg-muted text-xl font-bold uppercase text-muted-foreground">
                    {teamDialog.name.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <div className="space-y-1.5">
                  <Label className="grid-label block">Photo</Label>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer">
                      <span className="inline-flex h-8 items-center gap-1.5 border-2 border-foreground px-3 text-xs font-bold uppercase tracking-wide hover:bg-muted">
                        {uploadingPhoto ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        {teamDialog.imageUrl ? "Replace" : "Upload"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handlePhotoUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {teamDialog.imageUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-foreground"
                        onClick={clearPhoto}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    JPG/PNG/GIF — GIFs up to 10 MB, photos up to 5 MB. Shown
                    big on the public team page; use a tall image for best
                    results.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="team-name" className="grid-label mb-1.5 block">
                  Name
                </Label>
                <Input
                  id="team-name"
                  value={teamDialog.name}
                  onChange={(e) =>
                    setTeamDialog({ ...teamDialog, name: e.target.value })
                  }
                  maxLength={40}
                  className="h-11 border-foreground"
                />
              </div>
              <div>
                <Label htmlFor="team-rank" className="grid-label mb-1.5 block">
                  Rank
                </Label>
                <Select
                  value={teamDialog.rank}
                  onValueChange={(v) => setTeamDialog({ ...teamDialog, rank: v })}
                >
                  <SelectTrigger id="team-rank" className="h-11 w-full border-foreground">
                    <SelectValue placeholder="Pick a rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_RANKS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="team-tagline" className="grid-label mb-1.5 block">
                  Tagline (optional)
                </Label>
                <Input
                  id="team-tagline"
                  value={teamDialog.tagline}
                  onChange={(e) =>
                    setTeamDialog({ ...teamDialog, tagline: e.target.value })
                  }
                  placeholder="Runs the site and keeps shops in line"
                  maxLength={100}
                  className="h-11 border-foreground"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeamDialog(null)}
              className="border-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTeamMember}
              disabled={
                savingTeam ||
                uploadingPhoto ||
                !teamDialog ||
                teamDialog.name.trim().length < 1 ||
                teamDialog.rank.trim().length < 1
              }
            >
              {savingTeam && <Loader2 className="size-4 animate-spin" />}
              {teamDialog?.id ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline admin-reply editor shown under each ticket. */
function TicketReply({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState(initial);
  const inputId = useId();
  const dirty = note.trim() !== initial;
  return (
    <div className="mt-3">
      <Label htmlFor={inputId} className="grid-label mb-1.5 block">
        Admin reply (visible to the submitter)
      </Label>
      <Textarea
        id={inputId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write a reply…"
        rows={2}
        maxLength={500}
        className="resize-none border-foreground"
      />
      <Button
        size="sm"
        className="mt-2 gap-1.5"
        disabled={!dirty || note.trim().length === 0}
        onClick={() => onSave(note.trim())}
      >
        <Check className="size-3.5" />
        Save reply
      </Button>
    </div>
  );
}
