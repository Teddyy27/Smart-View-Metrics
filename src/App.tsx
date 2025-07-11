import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Automation from "./pages/Automation";
import User from "./pages/User";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import AnalyticsPage from "./pages/Analytics";
import Report from "./pages/Report";
import Notification from "./pages/Notification";
import { AuthProvider } from "./contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react"
import PrivateRoute from "./PrivateRoute";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

const NOTIF_KEY = "last_notification_time";
const NOTIF_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in ms
const NOTIF_DURATION = 10000; // 10 seconds in ms

const App = () => {
  useEffect(() => {
    const now = Date.now();
    const last = parseInt(localStorage.getItem(NOTIF_KEY) || "0", 10);
    if (isNaN(last) || now - last > NOTIF_INTERVAL) {
      const { id, dismiss } = toast({
        title: "System Status",
        description: "All devices are under control",
      });
      setTimeout(() => dismiss(), NOTIF_DURATION);
      localStorage.setItem(NOTIF_KEY, now.toString());
    }
  }, []);
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Index />
                  </PrivateRoute>
                }
              />
              <Route
                path="/automation"
                element={
                  <PrivateRoute>
                    <Automation />
                  </PrivateRoute>
                }
              />
              <Route
                path="/user"
                element={
                  <PrivateRoute>
                    <User />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute>
                    <Users />
                  </PrivateRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <PrivateRoute>
                    <AnalyticsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <PrivateRoute>
                    <Report />
                  </PrivateRoute>
                }
              />
              <Route
                path="/notification"
                element={
                  <PrivateRoute>
                    <Notification />
                  </PrivateRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Analytics />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
