import { NavLink, useLocation } from "react-router-dom";
import {
  House,
  MessageSquare,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "../lib/utils";

const MOBILE_TABS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/generate", label: "Create", icon: Sparkles },
  { to: "/stylist", label: "Stylist", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-16px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const active =
            item.end ? pathname === item.to : pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-gold-bright)]"
                  : "text-[color:var(--color-ink-muted)]"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-[color:var(--color-gold)]" : "text-[color:var(--color-ink-dim)]"
                )}
              />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
