import { Home, Search, Calendar, Heart, User } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", icon: Home },
  { name: "Explore", icon: Search },
  { name: "Bookings", icon: Calendar },
  { name: "Saved", icon: Heart },
  { name: "Profile", icon: User },
];

const BottomNav = () => {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="glass border-t border-border/50 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
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
