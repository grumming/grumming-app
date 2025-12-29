import { Home, Search, Calendar, User, MessageCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, conversations!inner(user_id)')
        .eq('sender_type', 'salon')
        .eq('is_read', false)
        .eq('conversations.user_id', user.id);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
      return data?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Explore", icon: Search, path: "/search" },
    { name: "Bookings", icon: Calendar, path: "/my-bookings" },
    { name: "Chat", icon: MessageCircle, path: "/chat", badge: unreadCount },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/chat')) return 'Chat';
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
              className="relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors"
            >
              {activeTab === item.name && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                />
              )}
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 relative z-10 transition-colors ${
                    activeTab === item.name ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1 z-20">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
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
