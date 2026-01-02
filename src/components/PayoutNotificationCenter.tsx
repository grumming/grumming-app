import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Wallet, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface PayoutNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link: string | null;
}

const getStatusIcon = (title: string) => {
  if (title.includes('completed') || title.includes('approved')) {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  if (title.includes('processing')) {
    return <Clock className="h-5 w-5 text-blue-500" />;
  }
  if (title.includes('failed')) {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  if (title.includes('scheduled') || title.includes('pending')) {
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  }
  return <Wallet className="h-5 w-5 text-primary" />;
};

const getStatusBadge = (title: string) => {
  if (title.includes('completed')) {
    return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
  }
  if (title.includes('approved')) {
    return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
  }
  if (title.includes('processing')) {
    return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Processing</Badge>;
  }
  if (title.includes('failed')) {
    return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
  }
  if (title.includes('scheduled') || title.includes('pending')) {
    return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
  }
  return <Badge variant="secondary">Update</Badge>;
};

export const PayoutNotificationCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['payout-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'payout')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PayoutNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('type', 'payout')
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-notifications'] });
      toast.success('All payout notifications marked as read');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-notifications'] });
      toast.success('Notification deleted');
    },
  });

  const filteredNotifications = notifications.filter((n) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unread') return !n.is_read;
    if (statusFilter === 'completed') return n.title.toLowerCase().includes('completed');
    if (statusFilter === 'processing') return n.title.toLowerCase().includes('processing');
    if (statusFilter === 'pending') return n.title.toLowerCase().includes('scheduled') || n.title.toLowerCase().includes('pending');
    if (statusFilter === 'failed') return n.title.toLowerCase().includes('failed');
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Payout Alerts</span>
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Payout Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          {/* Filter */}
          <div className="flex items-center gap-2 mt-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter !== 'all' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setStatusFilter('all')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No payout notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statusFilter !== 'all' 
                    ? 'Try changing your filter' 
                    : 'You\'ll be notified about your payout updates here'}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      relative p-4 rounded-xl border transition-all
                      ${notification.is_read 
                        ? 'bg-background border-border' 
                        : 'bg-primary/5 border-primary/20 shadow-sm'}
                    `}
                  >
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}

                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`
                        h-10 w-10 rounded-full flex items-center justify-center shrink-0
                        ${notification.is_read ? 'bg-muted' : 'bg-primary/10'}
                      `}>
                        {getStatusIcon(notification.title)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2">
                            {notification.title.replace(/[✅❌💸📅📋]/g, '').trim()}
                          </h4>
                          {getStatusBadge(notification.title)}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>

                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Bottom summary */}
        {notifications.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && ` (filtered)`}
              </span>
              <span>{unreadCount} unread</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
