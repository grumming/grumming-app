import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { 
  RefreshCw, Loader2, Calendar, TrendingUp, Download, 
  IndianRupee, ArrowUpRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RescheduleFee {
  id: string;
  booking_id: string;
  user_id: string;
  salon_id: string | null;
  salon_name: string;
  original_date: string;
  original_time: string;
  new_date: string;
  new_time: string;
  service_price: number;
  fee_amount: number;
  fee_percentage: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  customer_name?: string;
  customer_phone?: string;
}

interface Stats {
  totalFees: number;
  totalCount: number;
  todayFees: number;
  monthFees: number;
}

export function RescheduleCommissionManagement() {
  const { toast } = useToast();
  const [fees, setFees] = useState<RescheduleFee[]>([]);
  const [stats, setStats] = useState<Stats>({ totalFees: 0, totalCount: 0, todayFees: 0, monthFees: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch reschedule fees
      let query = supabase
        .from('reschedule_fees')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterPeriod === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd');
        query = query.gte('created_at', `${today}T00:00:00`);
      } else if (filterPeriod === 'week') {
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        query = query.gte('created_at', `${weekAgo}T00:00:00`);
      } else if (filterPeriod === 'month') {
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        query = query.gte('created_at', `${monthStart}T00:00:00`);
      }

      const { data: feesData, error } = await query;

      if (error) throw error;

      // Fetch customer profiles
      const userIds = [...new Set(feesData?.map(f => f.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Merge customer info
      const feesWithCustomers = (feesData || []).map(fee => ({
        ...fee,
        customer_name: profilesData?.find(p => p.user_id === fee.user_id)?.full_name || 'Unknown',
        customer_phone: profilesData?.find(p => p.user_id === fee.user_id)?.phone || ''
      }));

      setFees(feesWithCustomers);

      // Calculate stats
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const completedFees = feesWithCustomers.filter(f => f.status === 'completed');
      const todayFees = completedFees.filter(f => 
        f.paid_at && format(parseISO(f.paid_at), 'yyyy-MM-dd') === today
      );
      const monthFees = completedFees.filter(f => {
        if (!f.paid_at) return false;
        const paidDate = parseISO(f.paid_at);
        return paidDate >= monthStart && paidDate <= monthEnd;
      });

      setStats({
        totalFees: completedFees.reduce((sum, f) => sum + f.fee_amount, 0),
        totalCount: completedFees.length,
        todayFees: todayFees.reduce((sum, f) => sum + f.fee_amount, 0),
        monthFees: monthFees.reduce((sum, f) => sum + f.fee_amount, 0)
      });

    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterPeriod]);

  const filteredFees = fees.filter(fee => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      fee.salon_name.toLowerCase().includes(query) ||
      fee.customer_name?.toLowerCase().includes(query) ||
      fee.customer_phone?.includes(query)
    );
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Salon', 'Original Date', 'New Date', 'Service Price', 'Fee', 'Status'];
    const rows = filteredFees.map(f => [
      format(parseISO(f.created_at), 'yyyy-MM-dd HH:mm'),
      f.customer_name,
      f.salon_name,
      f.original_date,
      f.new_date,
      f.service_price,
      f.fee_amount,
      f.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reschedule-fees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold font-sans">₹{stats.totalFees.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.totalCount} reschedules</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold font-sans">₹{stats.todayFees.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold font-sans">₹{stats.monthFees.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fee Rate</p>
                <p className="text-2xl font-bold">10%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Per reschedule</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Reschedule Fees
              </CardTitle>
              <CardDescription>Customer reschedule commission history</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search customer or salon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredFees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reschedule fees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Salon</TableHead>
                    <TableHead>Original → New</TableHead>
                    <TableHead className="text-right">Service</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFees.map(fee => (
                    <TableRow key={fee.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(fee.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fee.customer_name}</p>
                          {fee.customer_phone && (
                            <p className="text-xs text-muted-foreground">{fee.customer_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{fee.salon_name}</TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">{fee.original_date}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{fee.new_date}</span>
                      </TableCell>
                      <TableCell className="text-right font-sans">₹{fee.service_price}</TableCell>
                      <TableCell className="text-right font-semibold text-primary font-sans">
                        ₹{fee.fee_amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fee.status === 'completed' ? 'default' : 'secondary'}
                          className={fee.status === 'completed' ? 'bg-green-500' : ''}
                        >
                          {fee.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}