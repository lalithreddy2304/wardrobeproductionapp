import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WardrobeProvider } from "./context/WardrobeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { Wardrobe } from "./pages/Wardrobe";
import { OutfitGenerator } from "./pages/OutfitGenerator";
import { Stylist } from "./pages/Stylist";
import { SavedOutfits } from "./pages/SavedOutfits";
import { Insights } from "./pages/Insights";
import { Shopping } from "./pages/Shopping";
import { Profile } from "./pages/Profile";
import { PackMyBag } from "./pages/PackMyBag";

export default function App() {
  return (
    <BrowserRouter>
      <WardrobeProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Protected app routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/generate" element={<OutfitGenerator />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/saved" element={<SavedOutfits />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/pack" element={<PackMyBag />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </WardrobeProvider>
    </BrowserRouter>
  );
}
