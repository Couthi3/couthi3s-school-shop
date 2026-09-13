import { SwissHeader } from "@/components/SwissHeader";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Crown, Loader2, ShieldCheck, Users } from "lucide-react";import { Link } from "react-router";

// Ranks rendered with a distinct badge treatment.
const RANK_STYLE: Record<string, { badge: string; icon: typeof Crown }> = {
  owner: { badge: "bg-[var(--swiss-red)] text-white", icon: Crown },
  admin: { badge: "bg-[var(--swiss-blue)] text-white", icon: ShieldCheck },
  moderator: { badge: "bg-foreground text-background", icon: Users },
  helper: { badge: "bg-muted text-foreground border border-foreground", icon: Users },
};

const rankKey = (rank: string) => rank.trim().toLowerCase();

export default function Team() {
  const members = useQuery(api.team.teamMembers);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />

      <div className="container-swiss py-10 md:py-14">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          The people behind the site
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">
          Meet the team
        </h1>
        <p className="mt-4 max-w-xl text-base leading-6 text-muted-foreground">
          The folks who keep every shop running smoothly. Want to join them?{" "}
          <Link to="/tickets" className="underline hover:text-primary">
            Apply for staff
          </Link>
          .
        </p>

        {members === undefined ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-foreground p-10 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-lg font-bold uppercase">
              The roster is being written
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Team members will appear here once the site admin adds them.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const style = RANK_STYLE[rankKey(m.rank)] ?? {
                badge: "bg-muted text-foreground border border-foreground",
                icon: Users,
              };
              const Icon = style.icon;
              return (
                <div key={m._id} className="bg-background p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-12 items-center justify-center border-2 border-foreground text-2xl"
                        aria-hidden
                      >
                        {m.emoji || m.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h2 className="text-lg font-bold uppercase leading-tight">
                          {m.name}
                        </h2>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${style.badge}`}
                        >
                          <Icon className="size-3" />
                          {m.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                  {m.tagline && (
                    <p className="mt-3 text-sm leading-5 text-muted-foreground">
                      {m.tagline}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">

          Ranks are set by the site owner. Found a problem?{" "}
          <Link to="/tickets" className="underline hover:text-primary">
            File a ticket
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
