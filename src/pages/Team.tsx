import { SwissHeader } from "@/components/SwissHeader";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, Users } from "lucide-react";
import { Link } from "react-router";
import { rankBadgeClass } from "@/lib/team-ranks";

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
          <div className="mt-12 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={m._id} className="bg-background p-6">
                <div className="flex items-center gap-4">
                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="size-16 shrink-0 border-2 border-foreground object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-16 shrink-0 items-center justify-center border-2 border-foreground bg-muted text-xl font-bold uppercase"
                      aria-hidden
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold uppercase leading-tight">
                      {m.name}
                    </h2>
                    <span
                      className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rankBadgeClass(m.rank)}`}
                    >
                      {m.rank}
                    </span>
                  </div>
                </div>
                {m.tagline && (
                  <p className="mt-3 text-sm leading-5 text-muted-foreground">
                    {m.tagline}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
