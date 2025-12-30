import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Calendar, Clock, IndianRupee, User } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Booking {
  id: string;
  salon_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  service_price: number;
  status: string;
  created_at: string;
  user_id: string;
}

export const LiveActivityFeed = () => {
  const [activities, setActivities] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch recent bookings
    const fetchRecentBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setActivities(data);
      }
      setIsLoading(false);
    };

    fetchRecentBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('live-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const newBooking = payload.new as Booking;
          setActivities(prev => [newBooking, ...prev.slice(0, 19)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const updatedBooking = payload.new as Booking;
          setActivities(prev => 
            prev.map(booking => 
              booking.id === updatedBooking.id ? updatedBooking : booking
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return format(date, 'MMM d, h:mm a');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="relative">
            <Activity className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <AnimatePresence mode="popLayout">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {activities.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="relative"
                  >
                    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getActivityIcon(booking.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {booking.service_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {booking.salon_name}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs shrink-0 ${getStatusColor(booking.status)}`}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(booking.booking_date), 'MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.booking_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {booking.service_price}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatTimeAgo(booking.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;
