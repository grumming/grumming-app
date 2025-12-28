import { motion } from 'framer-motion';
import { Gift, ArrowRight, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FirstBookingBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user has any completed bookings
  const { data: hasBookings, isLoading } = useQuery({
    queryKey: ['user-has-bookings', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) return false;
      return (count || 0) > 0;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // Don't show if loading, user has bookings, or not logged in
  if (isLoading || hasBookings || !user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      className="mx-4 mt-4"
    >
      <button
        onClick={() => navigate('/')}
        className="w-full relative overflow-hidden rounded-2xl group"
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl" />
        
        <div className="relative m-[2px] rounded-[14px] bg-gradient-to-br from-amber-500/90 via-orange-500/90 to-rose-500/90 px-5 py-4 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-500" />
            
            {/* Floating stars */}
            <motion.div
              animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-3 right-12"
            >
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </motion.div>
            <motion.div
              animate={{ y: [5, -5, 5], rotate: [0, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-4 right-24"
            >
              <Star className="w-3 h-3 text-yellow-200 fill-yellow-200" />
            </motion.div>
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon container */}
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 relative">
                <Gift className="w-7 h-7 text-white" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              </div>
              
              {/* Text content */}
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold uppercase tracking-wide">
                    New User
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  First Booking Bonus!
                </h3>
                <p className="text-sm text-white/80 mt-0.5">
                  Get <span className="font-semibold text-yellow-300">₹100 OFF</span> on your first booking
                </p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          
          {/* Bottom tag */}
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-medium text-white">
              🎁 Limited Time
            </span>
            <span className="text-xs text-white/70">
              Use code: FIRST100
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

export default FirstBookingBanner;
