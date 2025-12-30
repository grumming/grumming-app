import { useState, useEffect } from "react";
import { Home, MessageSquare, Settings, BarChart3, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSalonOwner } from "@/hooks/useSalonOwner";
import { Badge } from "@/components/ui/badge";

const SalonOwnerBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ownedSalons, isLoading: isOwnerLoading } = useSalonOwner();
  const [upcomingCount, setUpcomingCount] = useState(0);

  // Fetch and subscribe to upcoming booking count
  useEffect(() => {
    if (isOwnerLoading || ownedSalons.length === 0) return;

    const salonIds = ownedSalons.map(s => s.id);
    const salonNames = ownedSalons.map(s => s.name);

    const fetchUpcomingCount = async () => {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch upcoming bookings for owned salons
      const { data, error } = await supabase
        .from('bookings')
        .select('id, salon_id, salon_name')
        .eq('status', 'upcoming')
        .gte('booking_date', today);

      if (!error && data) {
        // Filter to only this owner's salons
        const ownedBookings = data.filter(booking => 
          (booking.salon_id && salonIds.includes(booking.salon_id)) ||
          salonNames.includes(booking.salon_name)
        );
        setUpcomingCount(ownedBookings.length);
      }
    };

    fetchUpcomingCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('booking-count-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          // Refetch count on any booking change
          fetchUpcomingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownedSalons, isOwnerLoading]);

  const navItems = [
    { name: "Dashboard", icon: Home, path: "/salon-dashboard?tab=overview" },
    { name: "Bookings", icon: Calendar, path: "/salon-dashboard?tab=bookings", badge: upcomingCount },
    { name: "Messages", icon: MessageSquare, path: "/chat" },
    { name: "Settings", icon: Settings, path: "/salon-dashboard?tab=settings" },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (currentPath === '/salon-dashboard') {
      if (tab === 'settings') return 'Settings';
      if (tab === 'bookings') return 'Bookings';
      if (tab === 'overview' || !tab) return 'Dashboard';
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
              className="relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors"
            >
              {activeTab === item.name && (
                <motion.div
                  layoutId="salonOwnerActiveTab"
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
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px] font-bold flex items-center justify-center"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
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

export default SalonOwnerBottomNav;
