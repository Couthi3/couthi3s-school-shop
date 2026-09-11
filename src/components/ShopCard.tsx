import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";

export function ShopCard({
  name,
  description,
  href,
}: {
  name: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex h-full flex-col border border-foreground bg-card transition-colors hover:bg-foreground hover:text-background"
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <h3 className="text-lg font-bold uppercase leading-tight tracking-tight">
          {name}
        </h3>
        <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="p-5 pt-2 text-sm leading-5 opacity-70">
        {description || "No description yet."}
      </p>
      <div className="mt-auto border-t border-current/20 p-2.5">
        <span className="grid-label">Open storefront →</span>
      </div>
    </Link>
  );
}
