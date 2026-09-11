import { Link } from "react-router";
import { SwissHeader } from "@/components/SwissHeader";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SwissHeader />
      <div className="container-swiss flex min-h-[70vh] flex-col justify-center py-16">
        <div className="grid-label mb-5 flex items-center gap-2">
          <span className="inline-block size-2.5 bg-primary" />
          Error 404
        </div>
        <h1 className="text-6xl font-bold uppercase tracking-tight md:text-8xl">
          Not
          <br />
          found
        </h1>
        <p className="mt-6 max-w-md text-base leading-6 text-muted-foreground">
          The page you're looking for doesn't exist. It may have moved, or the
          address might be wrong.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="border-2 border-foreground bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            to="/create-shop"
            className="border-2 border-foreground px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-muted"
          >
            Open a shop
          </Link>
        </div>
      </div>
    </div>
  );
}
