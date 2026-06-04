import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";

export function Layout() {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex">
        <Sidebar />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-5 md:px-10 md:pb-16 md:pt-10">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
