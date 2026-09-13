import { useMemo, useState } from "react";
import { SwissHeader } from "@/components/SwissHeader";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, Users } from "lucide-react";
import { Link } from "react-router";
import { rankBadgeClass } from "@/lib/team-ranks";

// Meet The Team, in the style of a staff roster page: a rank index on the
// left and big portrait cards on the right, grouped by rank.
export default function Team() {
  const members = useQuery(api.team.teamMembers);
  const [activeRank, setActiveRank] = useState<string>("ALL");

  // Group members by rank, in hierarchy order (Owner first).
  const groups = useMemo(() => {
    if (!members) return [];
    const byRank = new Map<string, typeof members>();
    for (const m of members) {
      const list = byRank.get(m.rank) ?? [];
      list.push(m);
      byRank.set(m.rank, list);
    }
    // Sort the rank keys by hierarchy position.
    return [...byRank.entries()].sort((a, b) => {
      const order = RANK_ORDER;
      return (order[a[0]] ?? 99) - (order[b[0]] ?? 99);
    });
  }, [members]);

  const visible =
    activeRank === "ALL"
      ? groups
      : groups.filter(([rank]) => rank === activeRank);

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
          The folks who keep every shop running smoothly, from the Owner down
          to our Trainees. Want to join them?{" "}
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
          <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Rank index */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav className="border-2 border-foreground">
                <button
                  onClick={() => setActiveRank("ALL")}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeRank === "ALL"
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  All ranks
                  <span>{members.length}</span>
                </button>
                {groups.map(([rank, list]) => (
                  <button
                    key={rank}
                    onClick={() => setActiveRank(rank)}
                    className={`flex w-full items-center justify-between border-t-2 border-foreground px-4 py-3 text-left text-xs font-bold uppercase tracking-widest transition-colors ${
                      activeRank === rank
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2 ${
                          activeRank === rank ? "bg-current" : ""
                        }`}
                        style={
                          activeRank === rank
                            ? undefined
                            : { background: rankDotColor(rank) }
                        }
                      />
                      {rank}
                    </span>
                    <span>{list.length}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Rank groups with big portrait cards */}
            <div className="min-w-0 space-y-12">
              {visible.map(([rank, list]) => (
                <section key={rank} id={`rank-${rank}`}>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-3xl font-bold">{rank}</h2>
                    <span className="grid-label">{list.length}</span>
                  </div>
                  <div className="mt-3 border-t-2 border-foreground" />

                  <div className="mt-6 flex flex-wrap gap-6">
                    {list.map((m) => (
                      <figure
                        key={m._id}
                        className="w-64 border-2 border-foreground bg-card p-3 transition-shadow hover:shadow-[6px_6px_0_0_var(--foreground)]"
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="aspect-[3/4] w-full border border-foreground object-contain"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center border border-foreground bg-muted">
                            <span
                              className="text-6xl font-bold uppercase"
                              aria-hidden
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <figcaption className="border-t border-foreground/20 pt-3 text-center">
                          <div className="text-base font-bold">
                            {m.name}
                          </div>
                          <span
                            className={`mt-1.5 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rankBadgeClass(m.rank)}`}
                          >
                            {m.rank}
                          </span>
                          {m.tagline && (
                            <p className="mt-2 text-xs leading-4 text-muted-foreground">
                              {m.tagline}
                            </p>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Position of each rank in the hierarchy — duplicated small map so the page
// can sort groups without importing from convex (keeps the client bundle lean).
const RANK_ORDER: Record<string, number> = {
  Owner: 1,
  "Co-Owner": 2,
  Manager: 3,
  "SR-Staff": 4,
  Admin: 5,
  Moderator: 6,
  "JR-Staff": 7,
  Trainee: 8,
};

const rankDotColor = (rank: string): string => {
  switch (rank) {
    case "Owner":
    case "Co-Owner":
      return "var(--swiss-red)";
    case "Manager":
    case "SR-Staff":
      return "var(--swiss-blue)";
    case "Admin":
    case "Moderator":
      return "var(--foreground)";
    default:
      return "var(--muted-foreground)";
  }
};
