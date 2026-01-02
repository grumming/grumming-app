import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { 
  Download, Filter, Calendar, IndianRupee, Clock, 
  CheckCircle, XCircle, Loader2, AlertCircle, FileText,
  ChevronDown, Search, RefreshCw, Building2, Smartphone, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payout {
  id: string;
  salon_id: string;
  amount: number;
  status: string;
  payout_method: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface SalonPayoutHistoryProps {
  salonId: string;
  salonName: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <CheckCircle className="w-3 h-3" /> },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
};

const getPayoutMethodDisplay = (method: string | null) => {
  switch (method?.toLowerCase()) {
    case 'instant_upi':
      return {
        label: 'Instant UPI',
        icon: <Zap className="w-3 h-3" />,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        isInstant: true
      };
    case 'upi':
      return {
        label: 'UPI',
        icon: <Smartphone className="w-3 h-3" />,
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        isInstant: false
      };
    case 'bank_transfer':
    case 'bank':
      return {
        label: 'Bank',
        icon: <Building2 className="w-3 h-3" />,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        isInstant: false
      };
    default:
      return {
        label: method || '-',
        icon: null,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        isInstant: false
      };
  }
};

export const SalonPayoutHistory = ({ salonId, salonName }: SalonPayoutHistoryProps) => {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingAmount: 0,
    totalPayouts: 0,
    completedPayouts: 0
  });

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('salon_payouts')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);
      
      // Calculate stats
      const totalPaid = (data || [])
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = (data || [])
        .filter(p => ['pending', 'approved', 'processing'].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0);
      const completedPayouts = (data || []).filter(p => p.status === 'completed').length;
      
      setStats({
        totalPaid,
        pendingAmount,
        totalPayouts: data?.length || 0,
        completedPayouts
      });
    } catch (err) {
      console.error('Error fetching payouts:', err);
      toast({
        title: 'Error',
        description: 'Failed to load payout history',
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPayouts();
  }, [salonId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...payouts];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let filterStart: Date;
      let filterEnd = now;

      switch (dateRange) {
        case 'today':
          filterStart = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          filterStart = subDays(now, 7);
          break;
        case 'month':
          filterStart = startOfMonth(now);
          filterEnd = endOfMonth(now);
          break;
        case '3months':
          filterStart = subDays(now, 90);
          break;
        case 'custom':
          if (startDate) filterStart = parseISO(startDate);
          if (endDate) filterEnd = parseISO(endDate);
          break;
        default:
          filterStart = new Date(0);
      }

      filtered = filtered.filter(p => {
        const payoutDate = parseISO(p.created_at);
        return payoutDate >= filterStart && payoutDate <= filterEnd;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.id.toLowerCase().includes(query) ||
        p.payout_method?.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredPayouts(filtered);
  }, [payouts, statusFilter, dateRange, startDate, endDate, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Amount', 'Status', 'Method', 'Period', 'Processed At', 'Notes'];
      const rows = filteredPayouts.map(p => [
        format(parseISO(p.created_at), 'dd MMM yyyy'),
        p.amount,
        p.status,
        p.payout_method || '-',
        p.period_start && p.period_end 
          ? `${format(parseISO(p.period_start), 'dd MMM')} - ${format(parseISO(p.period_end), 'dd MMM yyyy')}`
          : '-',
        p.processed_at ? format(parseISO(p.processed_at), 'dd MMM yyyy HH:mm') : '-',
        p.notes || '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${salonName.replace(/\s+/g, '_')}_payouts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast({ title: 'Exported', description: 'Payout history exported to CSV' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to export', variant: 'destructive' });
    }
    setIsExporting(false);
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(139, 92, 246);
      doc.text('Payout History', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(salonName, 14, 32);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 40);

      // Summary
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Total Received: ${formatCurrency(stats.totalPaid)}`, 14, 52);
      doc.text(`Pending: ${formatCurrency(stats.pendingAmount)}`, 14, 58);
      doc.text(`Total Payouts: ${stats.totalPayouts}`, 100, 52);
      doc.text(`Completed: ${stats.completedPayouts}`, 100, 58);

      // Table
      autoTable(doc, {
        startY: 68,
        head: [['Date', 'Amount', 'Status', 'Method', 'Period', 'Processed']],
        body: filteredPayouts.map(p => [
          format(parseISO(p.created_at), 'dd MMM yyyy'),
          formatCurrency(p.amount),
          statusConfig[p.status]?.label || p.status,
          p.payout_method?.toUpperCase() || '-',
          p.period_start && p.period_end 
            ? `${format(parseISO(p.period_start), 'dd MMM')} - ${format(parseISO(p.period_end), 'dd MMM')}`
            : '-',
          p.processed_at ? format(parseISO(p.processed_at), 'dd MMM yyyy') : '-'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] }
      });

      doc.save(`${salonName.replace(/\s+/g, '_')}_payouts_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Exported', description: 'Payout history exported to PDF' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to export', variant: 'destructive' });
    }
    setIsExporting(false);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Total Received</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm">Total Payouts</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalPayouts}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Completed</span>
            </div>
            <p className="text-2xl font-bold">{stats.completedPayouts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Payout History</CardTitle>
              <CardDescription>View and export your payout records</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPayouts}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting || filteredPayouts.length === 0}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, method, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateRange === 'all' ? 'All Time' : 
                   dateRange === 'today' ? 'Today' :
                   dateRange === 'week' ? 'Last 7 Days' :
                   dateRange === 'month' ? 'This Month' :
                   dateRange === '3months' ? 'Last 3 Months' : 'Custom'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateRange === 'custom' && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {(statusFilter !== 'all' || dateRange !== 'all' || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredPayouts.length} of {payouts.length} payouts
          </p>

          {/* Payouts Table */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-lg mb-1">No payouts found</h3>
              <p className="text-muted-foreground text-sm">
                {payouts.length === 0 
                  ? "You haven't received any payouts yet"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Method</TableHead>
                    <TableHead className="hidden md:table-cell">Period</TableHead>
                    <TableHead className="hidden lg:table-cell">Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const status = statusConfig[payout.status] || statusConfig.pending;
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {format(parseISO(payout.created_at), 'dd MMM yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(payout.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-lg">
                            {formatCurrency(payout.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(() => {
                            const methodInfo = getPayoutMethodDisplay(payout.payout_method);
                            return (
                              <div className="flex items-center gap-2">
                                <Badge className={`${methodInfo.color} gap-1`}>
                                  {methodInfo.icon}
                                  {methodInfo.label}
                                </Badge>
                                {methodInfo.isInstant && (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs gap-0.5">
                                    <Zap className="w-2.5 h-2.5" />
                                    Instant
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payout.period_start && payout.period_end ? (
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(payout.period_start), 'dd MMM')} - {format(parseISO(payout.period_end), 'dd MMM')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {payout.processed_at ? (
                            <span className="text-sm">
                              {format(parseISO(payout.processed_at), 'dd MMM yyyy')}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalonPayoutHistory;
