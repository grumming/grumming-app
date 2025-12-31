import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, CheckCircle2, AlertCircle, Loader2, 
  RefreshCw, ArrowRight, Wallet, XCircle, Timer, MessageCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, addHours, differenceInMinutes, differenceInHours, isFuture } from 'date-fns';

interface RefundBooking {
  id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  status: string;
  updated_at: string;
}

interface RefundStatusTrackerProps {
  userId: string;
}

const REFUND_STAGES = [
  { key: 'cancelled', label: 'Cancelled', description: 'Booking cancelled', avgHours: 0 },
  { key: 'refund_initiated', label: 'Initiated', description: 'Refund request submitted', avgHours: 2 },
  { key: 'refund_processing', label: 'Processing', description: 'Being processed', avgHours: 24 },
  { key: 'refund_completed', label: 'Completed', description: 'Credited to wallet', avgHours: 0 },
];

// Average time in hours for each stage to complete
const STAGE_PROCESSING_TIMES: Record<string, number> = {
  'cancelled': 2, // 2 hours to initiate
  'refund_initiated': 24, // 24 hours to process
  'refund_processing': 48, // 48 hours to complete
};

export const RefundStatusTracker = ({ userId }: RefundStatusTrackerProps) => {
  const [refundBookings, setRefundBookings] = useState<RefundBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefundBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['cancelled', 'refund_initiated', 'refund_processing', 'refund_completed', 'refund_failed'])
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setRefundBookings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRefundBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('refund-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedBooking = payload.new as RefundBooking;
          if (['cancelled', 'refund_initiated', 'refund_processing', 'refund_completed', 'refund_failed'].includes(updatedBooking.status)) {
            setRefundBookings(prev => {
              const exists = prev.find(b => b.id === updatedBooking.id);
              if (exists) {
                return prev.map(b => b.id === updatedBooking.id ? updatedBooking : b);
              }
              return [updatedBooking, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getStageIndex = (status: string) => {
    if (status === 'refund_failed') return -1;
    return REFUND_STAGES.findIndex(s => s.key === status);
  };

  const getProgressPercent = (status: string) => {
    if (status === 'refund_failed') return 100;
    const index = getStageIndex(status);
    if (index === -1) return 0;
    return ((index + 1) / REFUND_STAGES.length) * 100;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'cancelled':
        return { color: 'bg-amber-500', icon: Clock, text: 'Awaiting Refund' };
      case 'refund_initiated':
        return { color: 'bg-blue-500', icon: RefreshCw, text: 'Refund Initiated' };
      case 'refund_processing':
        return { color: 'bg-purple-500', icon: Loader2, text: 'Processing', animate: true };
      case 'refund_completed':
        return { color: 'bg-green-500', icon: CheckCircle2, text: 'Refund Completed' };
      case 'refund_failed':
        return { color: 'bg-destructive', icon: XCircle, text: 'Refund Failed' };
      default:
        return { color: 'bg-muted', icon: AlertCircle, text: 'Unknown' };
    }
  };

  const getEstimatedCompletion = (status: string, updatedAt: string) => {
    if (status === 'refund_completed' || status === 'refund_failed') {
      return null;
    }

    const processingHours = STAGE_PROCESSING_TIMES[status];
    if (!processingHours) return null;

    const updatedDate = parseISO(updatedAt);
    const estimatedDate = addHours(updatedDate, processingHours);
    
    return {
      date: estimatedDate,
      isFuture: isFuture(estimatedDate),
      hoursRemaining: Math.max(0, differenceInHours(estimatedDate, new Date())),
      minutesRemaining: Math.max(0, differenceInMinutes(estimatedDate, new Date()) % 60),
    };
  };

  const formatTimeRemaining = (hours: number, minutes: number) => {
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `~${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      return `~${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `~${minutes}m`;
    }
    return 'Soon';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (refundBookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Refunds</h3>
        <p className="text-muted-foreground">
          You don't have any refunds to track
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {refundBookings.map((booking, index) => {
        const statusConfig = getStatusConfig(booking.status);
        const StatusIcon = statusConfig.icon;
        const currentStageIndex = getStageIndex(booking.status);
        const isFailed = booking.status === 'refund_failed';
        const isCompleted = booking.status === 'refund_completed';
        const estimatedCompletion = getEstimatedCompletion(booking.status, booking.updated_at);

        return (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{booking.salon_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                  </div>
                  <Badge className={`${statusConfig.color} text-white gap-1`}>
                    <StatusIcon className={`w-3 h-3 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                    {statusConfig.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Refund Amount & Estimated Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground block mb-1">Refund Amount</span>
                    <span className="font-semibold text-lg text-primary">₹{booking.service_price}</span>
                  </div>
                  
                  {estimatedCompletion && !isCompleted && !isFailed && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Timer className="w-3 h-3" />
                        Est. Completion
                      </span>
                      <span className="font-semibold text-sm text-primary">
                        {estimatedCompletion.isFuture 
                          ? formatTimeRemaining(estimatedCompletion.hoursRemaining, estimatedCompletion.minutesRemaining)
                          : 'Any moment now'
                        }
                      </span>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <span className="text-xs text-muted-foreground block mb-1">Status</span>
                      <span className="font-semibold text-sm text-green-600 dark:text-green-400">Completed!</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress 
                    value={getProgressPercent(booking.status)} 
                    className={`h-2 ${isFailed ? '[&>div]:bg-destructive' : ''}`}
                  />
                  
                  {/* Stage Indicators */}
                  {!isFailed && (
                    <div className="flex justify-between">
                      {REFUND_STAGES.map((stage, stageIndex) => {
                        const isCompleted = stageIndex <= currentStageIndex;
                        const isCurrent = stageIndex === currentStageIndex;
                        
                        return (
                          <div 
                            key={stage.key} 
                            className={`flex flex-col items-center text-center ${
                              stageIndex < REFUND_STAGES.length - 1 ? 'flex-1' : ''
                            }`}
                          >
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-all ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stageIndex + 1}
                            </div>
                            <span className={`text-[10px] leading-tight ${
                              isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                            }`}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Failed State */}
                  {isFailed && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">
                          Refund failed. Please contact support for assistance.
                        </p>
                      </div>
                      <a
                        href={`https://wa.me/919229506624?text=${encodeURIComponent(
                          `Hi, I need help with a failed refund.\n\nBooking: ${booking.salon_name}\nService: ${booking.service_name}\nAmount: ₹${booking.service_price}\nBooking ID: ${booking.id}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chat with Support on WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last updated: {format(parseISO(booking.updated_at), 'MMM d, yyyy h:mm a')}</span>
                    {estimatedCompletion && estimatedCompletion.isFuture && (
                      <span className="text-primary">
                        Expected by {format(estimatedCompletion.date, 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  
                  {booking.status === 'refund_completed' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg"
                    >
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">
                        ₹{booking.service_price} has been credited to your wallet
                      </p>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
