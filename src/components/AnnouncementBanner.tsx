import { api } from "@/convex/_generated/api";
import { Megaphone, X } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Site-wide announcement bar. The admin posts a global message from the
 * admin panel and every visitor sees it at the top of every page.
 * Dismissal is per-session so a reload brings it back.
 */
export function AnnouncementBanner() {
  const announcement = useQuery(api.admin.activeAnnouncement);
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Dismissal is keyed to the announcement id, so posting a new message
  // makes the bar reappear.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem("announcementDismissed"));
  }, []);

  if (announcement === undefined) return null;
  if (announcement === null) return null;
  if (dismissed === announcement._id) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem("announcementDismissed", announcement._id);
    } catch {
      // storage unavailable — just hide for this render
    }
    setDismissed(announcement._id);
  };

  return (
    <div className="flex items-start gap-3 border-b-2 border-foreground bg-primary px-4 py-2.5 text-primary-foreground">
      <Megaphone className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5">
          <span className="mr-2 inline-block border border-primary-foreground px-1.5 text-[10px] uppercase tracking-widest">
            Announcement
          </span>
          {announcement.text}
        </p>
        <p className="mt-0.5 text-[11px] opacity-75">
          Posted by the site admin ·{" "}
          {new Date(announcement.createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded-none p-1 transition-opacity hover:opacity-70"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
