import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Loader2 } from "lucide-react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";
import { initAppColor } from "./lib/app-color";

// --- Stale-build recovery ---------------------------------------------------
// After a new build is deployed, an already-open tab still references old
// chunk hashes. When a lazy-loaded route chunk can no longer be fetched,
// reload the page once so the browser picks up the fresh HTML and assets
// instead of showing a blank screen or a fetch error.
const STALE_CHUNK_KEY = "swiss-shops:last-stale-reload";

const recoverFromStaleChunk = () => {
  try {
    const last = Number(sessionStorage.getItem(STALE_CHUNK_KEY) ?? 0);
    if (Date.now() - last < 10_000) return; // avoid reload loops
    sessionStorage.setItem(STALE_CHUNK_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    // sessionStorage unavailable — leave the manual refresh as the fallback.
  }
};

const isStaleChunkMessage = (value: unknown) =>
  typeof value === "string" &&
  value.includes("Failed to fetch dynamically imported module");

// Resource errors (e.g. a stale <script src="/assets/..."> tag) don't bubble,
// so listen in the capture phase.
window.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.src.includes("/assets/")) {
      recoverFromStaleChunk();
      return;
    }
    if (isStaleChunkMessage(event.message)) recoverFromStaleChunk();
  },
  true,
);

// Dynamic-import failures surface as unhandled promise rejections in some
// browsers.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as { message?: unknown } | null;
  if (isStaleChunkMessage(reason?.message ?? reason)) recoverFromStaleChunk();
});

// Restore the visitor's site color choice before first paint of the app.
initAppColor();

// Lazy load route components for better code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Shops = lazy(() => import("./pages/Shops.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const CreateShop = lazy(() => import("./pages/CreateShop.tsx"));
const ShopSignIn = lazy(() => import("./pages/ShopSignIn.tsx"));
const Storefront = lazy(() => import("./pages/Storefront.tsx"));
const ManageShop = lazy(() => import("./pages/ManageShop.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shops" element={<Shops />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/manage" />}
              />
              <Route
                path="/create-shop"
                element={
                  <RequireAuth>
                    <CreateShop />
                  </RequireAuth>
                }
              />
              <Route
                path="/shop-signin"
                element={
                  <RequireAuth>
                    <ShopSignIn />
                  </RequireAuth>
                }
              />
              <Route path="/shop/:shopId" element={<Storefront />} />
              <Route
                path="/manage"
                element={
                  <RequireAuth>
                    <ManageShop />
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/:shopId"
                element={
                  <RequireAuth>
                    <ManageShop />
                  </RequireAuth>
                }
              />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
