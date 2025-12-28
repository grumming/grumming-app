import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Ticket, Clock, CheckCircle, Copy, Tag, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture } from 'date-fns';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order_value: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_used: boolean;
  used_at: string | null;
  source: string;
  created_at: string;
}

const MyVouchers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['user-vouchers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_vouchers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Voucher[];
    },
    enabled: !!user,
  });

  const activeVouchers = vouchers.filter(v => 
    !v.is_used && 
    (!v.valid_until || !isPast(new Date(v.valid_until))) &&
    (!v.valid_from || !isFuture(new Date(v.valid_from)))
  );
  
  const usedVouchers = vouchers.filter(v => v.is_used);
  
  const expiredVouchers = vouchers.filter(v => 
    !v.is_used && v.valid_until && isPast(new Date(v.valid_until))
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Code Copied!',
      description: `${code} copied to clipboard`,
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'referral':
        return <Gift className="w-4 h-4" />;
      case 'cashback':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'referral':
        return 'Referral Reward';
      case 'cashback':
        return 'Cashback';
      case 'promotional':
        return 'Special Offer';
      default:
        return 'Voucher';
    }
  };

  const VoucherCard = ({ voucher, isActive = true }: { voucher: Voucher; isActive?: boolean }) => {
    const discountText = voucher.discount_type === 'percentage'
      ? `${voucher.discount_value}% OFF`
      : `₹${voucher.discount_value} OFF`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden ${!isActive ? 'opacity-60' : ''}`}
      >
        <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-0">
            <div className="flex">
              {/* Left section - Discount */}
              <div className="flex-shrink-0 w-24 bg-primary/10 flex flex-col items-center justify-center p-4 border-r border-dashed border-primary/30">
                <span className="text-2xl font-bold text-primary">{discountText}</span>
                {voucher.max_discount && voucher.discount_type === 'percentage' && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Max ₹{voucher.max_discount}
                  </span>
                )}
              </div>

              {/* Right section - Details */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{voucher.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {getSourceIcon(voucher.source)}
                      <span className="text-xs text-muted-foreground">
                        {getSourceLabel(voucher.source)}
                      </span>
                    </div>
                  </div>
                  {voucher.is_used ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Used
                    </Badge>
                  ) : !isActive ? (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Expired
                    </Badge>
                  ) : null}
                </div>

                {voucher.description && (
                  <p className="text-sm text-muted-foreground mb-3">{voucher.description}</p>
                )}

                {voucher.min_order_value && voucher.min_order_value > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Min. order: ₹{voucher.min_order_value}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-primary/10 rounded text-sm font-mono font-semibold text-primary">
                      {voucher.code}
                    </code>
                    {isActive && !voucher.is_used && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => copyCode(voucher.code)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {voucher.valid_until && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {voucher.is_used 
                          ? `Used on ${format(new Date(voucher.used_at!), 'MMM dd')}`
                          : isPast(new Date(voucher.valid_until))
                            ? 'Expired'
                            : `Valid till ${format(new Date(voucher.valid_until), 'MMM dd')}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const EmptyState = ({ type }: { type: 'active' | 'used' | 'expired' }) => {
    const messages = {
      active: {
        icon: <Ticket className="w-12 h-12 text-muted-foreground/50" />,
        title: 'No Active Vouchers',
        description: 'Complete bookings and refer friends to earn vouchers!',
      },
      used: {
        icon: <CheckCircle className="w-12 h-12 text-muted-foreground/50" />,
        title: 'No Used Vouchers',
        description: "Vouchers you've used will appear here.",
      },
      expired: {
        icon: <Clock className="w-12 h-12 text-muted-foreground/50" />,
        title: 'No Expired Vouchers',
        description: 'Great! You have no expired vouchers.',
      },
    };

    const { icon, title, description } = messages[type];

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {icon}
        <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
        {type === 'active' && (
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/referrals')}
          >
            <Gift className="w-4 h-4 mr-2" />
            Refer & Earn
          </Button>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Please login to view your vouchers
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">My Vouchers</h1>
            <p className="text-sm text-muted-foreground">
              {activeVouchers.length} active voucher{activeVouchers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="active" className="relative">
              Active
              {activeVouchers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                  {activeVouchers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="used">Used</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : activeVouchers.length > 0 ? (
              activeVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} isActive />
              ))
            ) : (
              <EmptyState type="active" />
            )}
          </TabsContent>

          <TabsContent value="used" className="space-y-4">
            {usedVouchers.length > 0 ? (
              usedVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} isActive={false} />
              ))
            ) : (
              <EmptyState type="used" />
            )}
          </TabsContent>

          <TabsContent value="expired" className="space-y-4">
            {expiredVouchers.length > 0 ? (
              expiredVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} isActive={false} />
              ))
            ) : (
              <EmptyState type="expired" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyVouchers;
