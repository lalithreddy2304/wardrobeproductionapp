import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Heart, Luggage, MoreHorizontal } from "lucide-react";
import { PageHeader } from "./ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const TITLES: Record<string, string> = {
  "/": "Home",
  "/wardrobe": "Closet",
  "/generate": "Create",
  "/stylist": "Stylist",
  "/saved": "Saved",
  "/insights": "Insights",
  "/shopping": "Smart Buy",
  "/pack": "Pack My Bag",
  "/profile": "Profile",
};

const MORE_ITEMS = [
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/pack", label: "Pack", icon: Luggage },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

export function TopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Home";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.to));

  useEffect(() => {
    if (!moreOpen) return;

    const close = (event: PointerEvent) => {
      if (moreRef.current?.contains(event.target as Node)) return;
      setMoreOpen(false);
    };

    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[color:var(--color-bg)]/80 border-b border-[color:var(--color-border-soft)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 md:px-8 md:py-4">
        <PageHeader title={title} />
        <div className="flex shrink-0 items-center gap-2">
          <div ref={moreRef} className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setMoreOpen((current) => !current)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                moreActive || moreOpen
                  ? "border-[color:var(--color-gold)]/45 bg-[color:var(--color-gold)]/10 text-[color:var(--color-gold-bright)]"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]"
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Open more navigation"
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </button>

            {moreOpen && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] w-44 overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)]/98 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
                role="menu"
              >
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-[color:var(--color-surface)] text-[color:var(--color-gold-bright)]"
                          : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface)]/70 hover:text-[color:var(--color-ink)]"
                      )}
                      role="menuitem"
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-[color:var(--color-gold)]" : "text-[color:var(--color-ink-dim)]")} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-gold)] hover:border-[color:var(--color-gold)]/50 md:h-10 md:w-10"
            aria-label="Open profile"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-serif leading-none">{user?.displayName?.[0]?.toUpperCase() ?? "U"}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
