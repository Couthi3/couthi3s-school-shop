import { api } from "@/convex/_generated/api";
import { Megaphone, TriangleAlert, X } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Site-wide announcement bar. The admin posts a global message from the
 * admin panel and every visitor sees it at the top of every page.
 *
 * Two levels:
 * - Normal: bold accent-colored bar with a pulsing megaphone.
 * - Urgent: full-width hazard-striped red takeover with a blinking alert —
 *   no dismiss button, visible on every page until the admin takes it down.
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

  const urgent = announcement.urgent === true;
  if (!urgent && dismissed === announcement._id) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem("announcementDismissed", announcement._id);
    } catch {
      // storage unavailable — just hide for this render
    }
    setDismissed(announcement._id);
  };

  if (urgent) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="relative z-40 border-b-4 border-foreground bg-destructive text-white"
      >
        {/* moving hazard stripes */}
        <div className="announcement-hazard pointer-events-none absolute inset-0" />
        <div className="container-swiss relative flex items-start gap-3 py-3">
          <span className="announcement-blink mt-0.5 inline-flex shrink-0 items-center gap-1.5 border-2 border-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            <TriangleAlert className="size-3" />
            Urgent
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold uppercase leading-5 tracking-wide drop-shadow-sm sm:text-base">
              {announcement.text}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/85">
              Notice from the site admin · must be acknowledged ·{" "}
              {new Date(announcement.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            title="Urgent announcements cannot be dismissed"
            className="hidden shrink-0 items-center gap-1 border border-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90 sm:inline-flex"
          >
            Cannot dismiss
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="relative z-40 overflow-hidden border-b-2 border-foreground bg-primary text-primary-foreground"
    >
      {/* slow pulse that draws the eye without being obnoxious */}
      <div className="absolute inset-0 animate-pulse bg-white/10" />
      <div className="container-swiss relative flex items-start gap-3 py-2.5">
        <span className="mt-0.5 flex shrink-0 items-center gap-1.5 border border-primary-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
          <Megaphone className="announcement-blink size-3" />
          Announcement
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-5">{announcement.text}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-widest opacity-75">
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
    </div>
  );
}
