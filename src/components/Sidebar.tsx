import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  MessageSquare,
  Heart,
  LineChart,
  ShoppingBag,
  Luggage,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/wardrobe", label: "Closet", icon: Shirt },
  { to: "/generate", label: "Create", icon: Sparkles },
  { to: "/stylist", label: "Stylist", icon: MessageSquare },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/shopping", label: "Smart Buy", icon: ShoppingBag },
  { to: "/pack", label: "Pack", icon: Luggage },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-[220px] h-screen sticky top-0 flex flex-col border-r border-[color:var(--color-border-soft)] bg-[color:var(--color-bg-elev)]/80 backdrop-blur-xl">
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gold-ring flex items-center justify-center">
            <span className="text-[color:var(--color-gold)] font-serif text-lg leading-none">M</span>
          </div>
          <p className="font-serif text-base text-[color:var(--color-ink)]">Wardrobe</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden h-8 w-8 rounded-md hover:bg-[color:var(--color-surface)] flex items-center justify-center">
            <X className="h-4 w-4 text-[color:var(--color-ink-muted)]" />
          </button>
        )}
      </div>

      <nav className="px-2 flex-1">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.end !== undefined ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  end={item.end}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
                    active
                      ? "text-[color:var(--color-ink)] bg-[color:var(--color-surface)]"
                      : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[color:var(--color-gold)]" : "")} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-[color:var(--color-border-soft)]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigate("/profile");
              onClose?.();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[color:var(--color-surface)]/60"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[color:var(--color-gold)]/20 flex items-center justify-center text-xs text-[color:var(--color-gold)]">
                {user?.displayName?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.displayName}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-ink-dim)]" />
          </button>
          <button onClick={signOut} className="h-8 w-8 rounded-md hover:bg-[color:var(--color-surface)] flex items-center justify-center text-[color:var(--color-ink-dim)]" aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
