import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "./ui/PageHeader";
import { useAuth } from "../context/AuthContext";

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

export function TopBar({ onOpenMobile }: { onOpenMobile: () => void }) {
  void onOpenMobile;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Home";

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[color:var(--color-bg)]/80 border-b border-[color:var(--color-border-soft)]">
      <div className="px-5 md:px-8 py-4 flex items-center justify-between gap-4">
        <PageHeader title={title} />
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-gold)] hover:border-[color:var(--color-gold)]/50"
          aria-label="Open profile"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-serif leading-none">{user?.displayName?.[0]?.toUpperCase() ?? "U"}</span>
          )}
        </button>
      </div>
    </header>
  );
}
