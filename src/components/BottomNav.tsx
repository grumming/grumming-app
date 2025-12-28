import { Home, Search, Calendar, Heart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "Explore", icon: Search, path: "/search" },
  { name: "Bookings", icon: Calendar, path: "/my-bookings" },
  { name: "Profile", icon: User, path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeItem = navItems.find(item => item.path === currentPath);
    return activeItem?.name || "Home";
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="glass border-t border-border/50 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors"
            >
              {activeTab === item.name && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  activeTab === item.name ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors ${
                  activeTab === item.name ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
