import { Home, MessageSquare, Settings, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", icon: Home, path: "/salon-dashboard" },
  { name: "Messages", icon: MessageSquare, path: "/chat" },
  { name: "Analytics", icon: BarChart3, path: "/salon-dashboard?tab=overview" },
  { name: "Settings", icon: Settings, path: "/salon-dashboard?tab=settings" },
];

const SalonOwnerBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (currentPath === '/salon-dashboard') {
      if (tab === 'settings') return 'Settings';
      if (tab === 'overview') return 'Analytics';
      return 'Dashboard';
    }
    if (currentPath === '/chat') return 'Messages';
    
    return 'Dashboard';
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
                  layoutId="salonOwnerActiveTab"
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

export default SalonOwnerBottomNav;
