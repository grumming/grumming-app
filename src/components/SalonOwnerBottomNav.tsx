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
      <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.name;
            
            return (
              <motion.button
                key={item.name}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.95 }}
                className="relative flex flex-col items-center gap-1.5 py-2 px-5 rounded-2xl transition-all duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="salonOwnerActiveTab"
                    className="absolute inset-0 bg-gradient-to-b from-primary/15 to-primary/5 rounded-2xl border border-primary/20"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-300 ${
                      isActive 
                        ? "text-primary drop-shadow-sm" 
                        : "text-muted-foreground/70"
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </motion.div>
                <span
                  className={`text-[11px] font-semibold relative z-10 transition-all duration-300 tracking-tight ${
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground/70"
                  }`}
                >
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="salonOwnerDot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SalonOwnerBottomNav;
