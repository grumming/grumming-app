import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Loader2, RefreshCw, AlertCircle, CheckCircle, 
  XCircle, Clock, CreditCard, User, Calendar, DollarSign,
  ArrowUpRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CancelledBooking {
  id: string;
  user_id: string;
  salon_name: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface RefundStats {
  totalCancelled: number;
  pendingRefunds: number;
  processedRefunds: number;
  totalRefundAmount: number;
}

const RefundManagement = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<CancelledBooking[]>([]);
  const [stats, setStats] = useState<RefundStats>({
    totalCancelled: 0,
    pendingRefunds: 0,
    processedRefunds: 0,
    totalRefundAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Refund dialog state
  const [selectedBooking, setSelectedBooking] = useState<CancelledBooking | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCancelledBookings = async () => {
    setIsLoading(true);
    try {
      // Fetch cancelled bookings
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['cancelled', 'refund_initiated', 'refund_processed', 'refund_completed', 'refund_failed'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each booking
      if (bookingsData && bookingsData.length > 0) {
        const userIds = [...new Set(bookingsData.map(b => b.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedBookings = bookingsData.map(booking => ({
          ...booking,
          profile: profileMap.get(booking.user_id)
        }));

        setBookings(enrichedBookings);

        // Calculate stats
        const totalCancelled = bookingsData.length;
        const pendingRefunds = bookingsData.filter(b => 
          b.status === 'cancelled' && b.payment_id
        ).length;
        const processedRefunds = bookingsData.filter(b => 
          ['refund_initiated', 'refund_processed', 'refund_completed'].includes(b.status)
        ).length;
        const totalRefundAmount = bookingsData
          .filter(b => ['refund_processed', 'refund_completed'].includes(b.status))
          .reduce((sum, b) => sum + (b.service_price || 0), 0);

        setStats({
          totalCancelled,
          pendingRefunds,
          processedRefunds,
          totalRefundAmount
        });
      } else {
        setBookings([]);
        setStats({
          totalCancelled: 0,
          pendingRefunds: 0,
          processedRefunds: 0,
          totalRefundAmount: 0
        });
      }
    } catch (err) {
      console.error('Error fetching cancelled bookings:', err);
      toast({
        title: 'Error',
        description: 'Failed to load refund data',
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCancelledBookings();
  }, []);

  const handleRefundClick = (booking: CancelledBooking) => {
    setSelectedBooking(booking);
    setRefundAmount(booking.service_price.toString());
    setRefundNote('');
    setIsRefundDialogOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!selectedBooking) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedBooking.service_price) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid refund amount',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Call the refund edge function
      const { data, error } = await supabase.functions.invoke('process-razorpay-refund', {
        body: {
          booking_id: selectedBooking.id,
          refund_amount: amount
        }
      });

      if (error) throw error;

      toast({
        title: 'Refund Initiated',
        description: `₹${amount} refund has been initiated for ${selectedBooking.profile?.full_name || 'customer'}`
      });

      setIsRefundDialogOpen(false);
      fetchCancelledBookings();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      toast({
        title: 'Refund Failed',
        description: err.message || 'Failed to process refund',
        variant: 'destructive'
      });
    }
    setIsProcessing(false);
  };

  const handleOverrideStatus = async (booking: CancelledBooking, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Booking status changed to ${newStatus.replace('_', ' ')}`
      });

      fetchCancelledBookings();
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'refund_initiated':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Refund Initiated</Badge>;
      case 'refund_processed':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Refund Processed</Badge>;
      case 'refund_completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Refund Completed</Badge>;
      case 'refund_failed':
        return <Badge variant="destructive">Refund Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.salon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cancelled</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalCancelled}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Refunds</p>
                <h3 className="text-2xl font-bold mt-1">{stats.pendingRefunds}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <h3 className="text-2xl font-bold mt-1">{stats.processedRefunds}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Refunded</p>
                <h3 className="text-2xl font-bold mt-1">₹{stats.totalRefundAmount.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Refund Requests</CardTitle>
              <CardDescription>Manage and process customer refunds</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCancelledBookings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, salon, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="cancelled">Cancelled (Pending)</SelectItem>
                <SelectItem value="refund_initiated">Refund Initiated</SelectItem>
                <SelectItem value="refund_processed">Refund Processed</SelectItem>
                <SelectItem value="refund_completed">Refund Completed</SelectItem>
                <SelectItem value="refund_failed">Refund Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No refund requests found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {booking.profile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.profile?.email || booking.profile?.phone || 'No contact'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.salon_name}</p>
                          <p className="text-xs text-muted-foreground">{booking.service_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">₹{booking.service_price}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{format(new Date(booking.booking_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{booking.booking_time}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {booking.status === 'cancelled' && booking.payment_id && (
                            <Button
                              size="sm"
                              onClick={() => handleRefundClick(booking)}
                            >
                              Process Refund
                            </Button>
                          )}
                          {booking.status === 'refund_failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefundClick(booking)}
                            >
                              Retry
                            </Button>
                          )}
                          <Select
                            value=""
                            onValueChange={(value) => handleOverrideStatus(booking, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Override" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="refund_initiated">Set Initiated</SelectItem>
                              <SelectItem value="refund_processed">Set Processed</SelectItem>
                              <SelectItem value="refund_completed">Set Completed</SelectItem>
                              <SelectItem value="refund_failed">Set Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Review and process refund for this booking
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Booking Details */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedBooking.profile?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salon</span>
                  <span>{selectedBooking.salon_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span>{selectedBooking.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Amount</span>
                  <span className="font-semibold">₹{selectedBooking.service_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="text-xs font-mono">{selectedBooking.payment_id || 'N/A'}</span>
                </div>
              </div>

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount (₹)</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedBooking.service_price}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Max refundable: ₹{selectedBooking.service_price}
                </p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="refundNote">Admin Note (Optional)</Label>
                <Textarea
                  id="refundNote"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Add any notes about this refund..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundManagement;
