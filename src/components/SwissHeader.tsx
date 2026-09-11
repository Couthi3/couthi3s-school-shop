import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LogOut, ShieldCheck, Store } from "lucide-react";
import { useNavigate, Link } from "react-router";
import { Button } from "./ui/button";

export function SwissHeader() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const myShop = useQuery(api.shops.myShop);
  const mySession = useQuery(api.shops.myCodeSession);
  const adminState = useQuery(api.admin.adminState);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const hasShop = myShop !== undefined && myShop !== null;

  return (
    <header className="border-b-2 border-foreground bg-background">
      <div className="container-swiss flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center bg-primary">
            <Store className="size-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.18em]">
            School Shops
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {isAuthenticated && hasShop && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/manage">My Shop</Link>
            </Button>
          )}
          {isAuthenticated && mySession && !hasShop && (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/manage/${mySession.shopId}`}>
                {mySession.shopName}
              </Link>
            </Button>
          )}
          {isAuthenticated && adminState?.isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin" className="gap-1.5">
                <ShieldCheck className="size-3.5" />
                Admin
              </Link>
            </Button>
          )}
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
