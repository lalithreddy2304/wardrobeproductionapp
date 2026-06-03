import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useState } from "react";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex">
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-5 md:px-10 pb-16 pt-6 md:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Floating mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 h-12 w-12 rounded-full gold-ring flex items-center justify-center shadow-2xl"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-[color:var(--color-gold)]" />
      </button>
    </div>
  );
}
