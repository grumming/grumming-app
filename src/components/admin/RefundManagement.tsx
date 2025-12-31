import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Loader2, RefreshCw, AlertCircle, CheckCircle, 
  XCircle, Clock, CreditCard, User, DollarSign,
  ArrowUpRight, Filter, History, FileText, Download, CalendarIcon, FileDown
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyRefundSummary {
  month: string;
  monthLabel: string;
  totalRefunds: number;
  refundCount: number;
  avgRefundAmount: number;
  statusBreakdown: {
    initiated: number;
    processed: number;
    completed: number;
    failed: number;
  };
}

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

interface AuditLogEntry {
  id: string;
  booking_id: string;
  admin_user_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  refund_amount: number | null;
  note: string | null;
  created_at: string;
  admin_profile?: {
    full_name: string | null;
    email: string | null;
  };
  booking?: {
    salon_name: string;
    service_name: string;
  };
}

const RefundManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CancelledBooking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<RefundStats>({
    totalCancelled: 0,
    pendingRefunds: 0,
    processedRefunds: 0,
    totalRefundAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Refund dialog state
  const [selectedBooking, setSelectedBooking] = useState<CancelledBooking | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Audit log for specific booking
  const [selectedBookingAudit, setSelectedBookingAudit] = useState<CancelledBooking | null>(null);
  const [bookingAuditLogs, setBookingAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isLoadingBookingAudit, setIsLoadingBookingAudit] = useState(false);

  // Date range filter for audit logs
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 1)));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  const logAuditAction = async (
    bookingId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string | null,
    refundAmount: number | null,
    note: string | null
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('refund_audit_log')
        .insert({
          booking_id: bookingId,
          admin_user_id: user.id,
          action,
          previous_status: previousStatus,
          new_status: newStatus,
          refund_amount: refundAmount,
          note
        });

      if (error) {
        console.error('Error logging audit action:', error);
      }
    } catch (err) {
      console.error('Error logging audit action:', err);
    }
  };

  const fetchCancelledBookings = async () => {
    setIsLoading(true);
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['cancelled', 'refund_initiated', 'refund_processed', 'refund_completed', 'refund_failed'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

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

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const { data: logsData, error } = await supabase
        .from('refund_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (logsData && logsData.length > 0) {
        // Get admin profiles
        const adminIds = [...new Set(logsData.map(l => l.admin_user_id))];
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', adminIds);

        const adminMap = new Map(adminProfiles?.map(p => [p.user_id, p]) || []);

        // Get booking details
        const bookingIds = [...new Set(logsData.map(l => l.booking_id))];
        const { data: bookingDetails } = await supabase
          .from('bookings')
          .select('id, salon_name, service_name')
          .in('id', bookingIds);

        const bookingMap = new Map(bookingDetails?.map(b => [b.id, b]) || []);

        const enrichedLogs = logsData.map(log => ({
          ...log,
          admin_profile: adminMap.get(log.admin_user_id),
          booking: bookingMap.get(log.booking_id)
        }));

        setAuditLogs(enrichedLogs);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
    setIsLoadingAudit(false);
  };

  const fetchBookingAuditLogs = async (bookingId: string) => {
    setIsLoadingBookingAudit(true);
    try {
      const { data: logsData, error } = await supabase
        .from('refund_audit_log')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (logsData && logsData.length > 0) {
        const adminIds = [...new Set(logsData.map(l => l.admin_user_id))];
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', adminIds);

        const adminMap = new Map(adminProfiles?.map(p => [p.user_id, p]) || []);

        const enrichedLogs = logsData.map(log => ({
          ...log,
          admin_profile: adminMap.get(log.admin_user_id)
        }));

        setBookingAuditLogs(enrichedLogs);
      } else {
        setBookingAuditLogs([]);
      }
    } catch (err) {
      console.error('Error fetching booking audit logs:', err);
    }
    setIsLoadingBookingAudit(false);
  };

  // Filter audit logs by date range
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!dateFrom && !dateTo) return true;
    
    const logDate = new Date(log.created_at);
    
    if (dateFrom && dateTo) {
      return isWithinInterval(logDate, {
        start: startOfDay(dateFrom),
        end: endOfDay(dateTo)
      });
    }
    
    if (dateFrom) {
      return logDate >= startOfDay(dateFrom);
    }
    
    if (dateTo) {
      return logDate <= endOfDay(dateTo);
    }
    
    return true;
  });

  const exportAuditLogsToCSV = () => {
    if (filteredAuditLogs.length === 0) return;

    // Define CSV headers
    const headers = [
      'Timestamp',
      'Admin Name',
      'Admin Email',
      'Booking ID',
      'Salon Name',
      'Service Name',
      'Action',
      'Previous Status',
      'New Status',
      'Refund Amount',
      'Note'
    ];

    // Convert filtered audit logs to CSV rows
    const rows = filteredAuditLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_profile?.full_name || 'Unknown',
      log.admin_profile?.email || 'N/A',
      log.booking_id,
      log.booking?.salon_name || 'N/A',
      log.booking?.service_name || 'N/A',
      log.action,
      log.previous_status || '',
      log.new_status || '',
      log.refund_amount?.toString() || '',
      (log.note || '').replace(/"/g, '""') // Escape quotes
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create filename with date range
    const fromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'start';
    const toStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : 'end';

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `refund-audit-log-${fromStr}-to-${toStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${filteredAuditLogs.length} audit log entries to CSV`
    });
  };

  const setThisMonth = () => {
    setDateFrom(startOfMonth(new Date()));
    setDateTo(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setDateFrom(startOfMonth(lastMonth));
    setDateTo(endOfMonth(lastMonth));
  };

  const setLast3Months = () => {
    setDateFrom(startOfMonth(subMonths(new Date(), 2)));
    setDateTo(new Date());
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Calculate monthly refund summary from bookings
  const calculateMonthlySummary = (): MonthlyRefundSummary[] => {
    const monthlyData: Record<string, MonthlyRefundSummary> = {};

    // Get last 12 months
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy');
      monthlyData[monthKey] = {
        month: monthKey,
        monthLabel,
        totalRefunds: 0,
        refundCount: 0,
        avgRefundAmount: 0,
        statusBreakdown: {
          initiated: 0,
          processed: 0,
          completed: 0,
          failed: 0
        }
      };
    }

    // Process bookings
    bookings.forEach(booking => {
      const bookingMonth = format(new Date(booking.updated_at), 'yyyy-MM');
      if (monthlyData[bookingMonth]) {
        monthlyData[bookingMonth].refundCount++;
        
        // Only count amount for processed/completed refunds
        if (['refund_processed', 'refund_completed'].includes(booking.status)) {
          monthlyData[bookingMonth].totalRefunds += booking.service_price;
        }

        // Status breakdown
        switch (booking.status) {
          case 'refund_initiated':
            monthlyData[bookingMonth].statusBreakdown.initiated++;
            break;
          case 'refund_processed':
            monthlyData[bookingMonth].statusBreakdown.processed++;
            break;
          case 'refund_completed':
            monthlyData[bookingMonth].statusBreakdown.completed++;
            break;
          case 'refund_failed':
            monthlyData[bookingMonth].statusBreakdown.failed++;
            break;
        }
      }
    });

    // Calculate averages
    Object.values(monthlyData).forEach(month => {
      const completedCount = month.statusBreakdown.processed + month.statusBreakdown.completed;
      month.avgRefundAmount = completedCount > 0 ? month.totalRefunds / completedCount : 0;
    });

    return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
  };

  const monthlySummary = calculateMonthlySummary();

  const exportMonthlySummaryToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Brand colors
    const primaryColor: [number, number, number] = [212, 141, 128]; // Rose gold
    const darkColor: [number, number, number] = [51, 51, 51];
    
    // Header with branding
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Grumming', 20, 25);
    
    // Report title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Refund Report', 20, 35);
    
    // Report date
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, pageWidth - 20, 25, { align: 'right' });
    doc.text('Financial Year Report', pageWidth - 20, 35, { align: 'right' });
    
    // Summary section
    let yPos = 60;
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, yPos);
    
    yPos += 15;
    
    // Calculate totals
    const totalRefunded = monthlySummary.reduce((sum, m) => sum + m.totalRefunds, 0);
    const totalCases = monthlySummary.reduce((sum, m) => sum + m.refundCount, 0);
    const totalCompleted = monthlySummary.reduce((sum, m) => sum + m.statusBreakdown.processed + m.statusBreakdown.completed, 0);
    const avgAmount = totalCompleted > 0 ? totalRefunded / totalCompleted : 0;
    
    // Summary boxes
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(20, yPos, 55, 30, 3, 3, 'F');
    doc.roundedRect(80, yPos, 55, 30, 3, 3, 'F');
    doc.roundedRect(140, yPos, 55, 30, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Total Refunded', 47.5, yPos + 10, { align: 'center' });
    doc.text('Total Cases', 107.5, yPos + 10, { align: 'center' });
    doc.text('Average Amount', 167.5, yPos + 10, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(`₹${totalRefunded.toLocaleString()}`, 47.5, yPos + 22, { align: 'center' });
    doc.text(`${totalCases}`, 107.5, yPos + 22, { align: 'center' });
    doc.text(`₹${Math.round(avgAmount).toLocaleString()}`, 167.5, yPos + 22, { align: 'center' });
    
    yPos += 45;
    
    // Monthly breakdown title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Breakdown', 20, yPos);
    
    yPos += 10;
    
    // Monthly data table
    const tableData = monthlySummary.map(month => [
      month.monthLabel,
      month.refundCount.toString(),
      `₹${month.totalRefunds.toLocaleString()}`,
      `₹${Math.round(month.avgRefundAmount).toLocaleString()}`,
      month.statusBreakdown.initiated.toString(),
      month.statusBreakdown.processed.toString(),
      month.statusBreakdown.completed.toString(),
      month.statusBreakdown.failed.toString()
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Month', 'Cases', 'Total Amount', 'Avg Amount', 'Initiated', 'Processed', 'Completed', 'Failed']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 18 }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Grumming - Confidential Financial Report', 20, pageHeight - 12);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
    }
    
    // Save the PDF
    doc.save(`grumming-refund-report-${format(new Date(), 'yyyy-MM')}.pdf`);
    
    toast({
      title: 'PDF Exported',
      description: 'Monthly refund report has been downloaded'
    });
  };

  useEffect(() => {
    fetchCancelledBookings();
    fetchAuditLogs();
  }, []);

  const handleRefundClick = (booking: CancelledBooking) => {
    setSelectedBooking(booking);
    setRefundAmount(booking.service_price.toString());
    setRefundNote('');
    setIsRefundDialogOpen(true);
  };

  const handleViewAuditLog = (booking: CancelledBooking) => {
    setSelectedBookingAudit(booking);
    setIsAuditDialogOpen(true);
    fetchBookingAuditLogs(booking.id);
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
      const previousStatus = selectedBooking.status;

      const { data, error } = await supabase.functions.invoke('process-razorpay-refund', {
        body: {
          booking_id: selectedBooking.id,
          refund_amount: amount
        }
      });

      if (error) throw error;

      // Log the action
      await logAuditAction(
        selectedBooking.id,
        'REFUND_PROCESSED',
        previousStatus,
        'refund_initiated',
        amount,
        refundNote || null
      );

      toast({
        title: 'Refund Initiated',
        description: `₹${amount} refund has been initiated for ${selectedBooking.profile?.full_name || 'customer'}`
      });

      setIsRefundDialogOpen(false);
      fetchCancelledBookings();
      fetchAuditLogs();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      
      // Log failed attempt
      await logAuditAction(
        selectedBooking.id,
        'REFUND_FAILED',
        selectedBooking.status,
        null,
        parseFloat(refundAmount),
        `Failed: ${err.message || 'Unknown error'}. ${refundNote || ''}`
      );

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
      const previousStatus = booking.status;

      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

      // Log the override action
      await logAuditAction(
        booking.id,
        'STATUS_OVERRIDE',
        previousStatus,
        newStatus,
        null,
        `Admin manually changed status from ${previousStatus} to ${newStatus}`
      );

      toast({
        title: 'Status Updated',
        description: `Booking status changed to ${newStatus.replace('_', ' ')}`
      });

      fetchCancelledBookings();
      fetchAuditLogs();
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'REFUND_PROCESSED':
        return <Badge className="bg-green-500">Refund Processed</Badge>;
      case 'REFUND_FAILED':
        return <Badge variant="destructive">Refund Failed</Badge>;
      case 'STATUS_OVERRIDE':
        return <Badge className="bg-orange-500">Status Override</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
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

      {/* Tabs for Refunds, Summary and Audit Log */}
      <Tabs defaultValue="refunds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="refunds">Refund Requests</TabsTrigger>
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Refunds Tab */}
        <TabsContent value="refunds">
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewAuditLog(booking)}
                                title="View audit log"
                              >
                                <History className="w-4 h-4" />
                              </Button>
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
        </TabsContent>

        {/* Monthly Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Monthly Refund Summary
                  </CardTitle>
                  <CardDescription>Financial overview of refunds by month (last 12 months)</CardDescription>
                </div>
                <Button onClick={exportMonthlySummaryToPDF} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  Export PDF Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Refunded (12 months)</p>
                    <h3 className="text-2xl font-bold">
                      ₹{monthlySummary.reduce((sum, m) => sum + m.totalRefunds, 0).toLocaleString()}
                    </h3>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Refund Cases</p>
                    <h3 className="text-2xl font-bold">
                      {monthlySummary.reduce((sum, m) => sum + m.refundCount, 0)}
                    </h3>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Average Refund Amount</p>
                    <h3 className="text-2xl font-bold">
                      ₹{(() => {
                        const totalAmount = monthlySummary.reduce((sum, m) => sum + m.totalRefunds, 0);
                        const totalCompleted = monthlySummary.reduce((sum, m) => sum + m.statusBreakdown.processed + m.statusBreakdown.completed, 0);
                        return totalCompleted > 0 ? Math.round(totalAmount / totalCompleted).toLocaleString() : '0';
                      })()}
                    </h3>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Chart Visualization */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-4">Refund Trend (Last 12 Months)</h4>
                <div className="flex items-end justify-between gap-2 h-40">
                  {[...monthlySummary].reverse().map((month, i) => {
                    const maxAmount = Math.max(...monthlySummary.map(m => m.totalRefunds), 1);
                    const height = (month.totalRefunds / maxAmount) * 100;
                    return (
                      <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {month.totalRefunds > 0 ? `₹${(month.totalRefunds / 1000).toFixed(1)}k` : '-'}
                        </span>
                        <div 
                          className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${month.monthLabel}: ₹${month.totalRefunds.toLocaleString()}`}
                        />
                        <span className="text-[9px] text-muted-foreground">{format(new Date(month.month + '-01'), 'MMM')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Refund Cases</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Avg Amount</TableHead>
                      <TableHead className="text-center">Initiated</TableHead>
                      <TableHead className="text-center">Processed</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummary.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.monthLabel}</TableCell>
                        <TableCell className="text-right">{month.refundCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{month.totalRefunds.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Math.round(month.avgRefundAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.statusBreakdown.initiated > 0 ? (
                            <Badge className="bg-yellow-500">{month.statusBreakdown.initiated}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.statusBreakdown.processed > 0 ? (
                            <Badge className="bg-blue-500">{month.statusBreakdown.processed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.statusBreakdown.completed > 0 ? (
                            <Badge className="bg-green-500">{month.statusBreakdown.completed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.statusBreakdown.failed > 0 ? (
                            <Badge variant="destructive">{month.statusBreakdown.failed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Refund Audit Log
                  </CardTitle>
                  <CardDescription>Track all refund actions taken by admins</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportAuditLogsToCSV}
                    disabled={filteredAuditLogs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Date Range Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
                  <Button variant="outline" size="sm" onClick={setThisMonth}>This Month</Button>
                  <Button variant="outline" size="sm" onClick={setLastMonth}>Last Month</Button>
                  <Button variant="outline" size="sm" onClick={setLast3Months}>Last 3 Months</Button>
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" onClick={clearDateFilter}>Clear</Button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal min-w-[130px]",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal min-w-[130px]",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Results count */}
              {(dateFrom || dateTo) && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {filteredAuditLogs.length} of {auditLogs.length} entries
                  {dateFrom && dateTo && (
                    <span> from {format(dateFrom, 'MMM d, yyyy')} to {format(dateTo, 'MMM d, yyyy')}</span>
                  )}
                </div>
              )}

              {isLoadingAudit ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {auditLogs.length === 0 ? 'No audit logs yet' : 'No logs found in selected date range'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status Change</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm">{format(new Date(log.created_at), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{log.admin_profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{log.admin_profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{log.booking?.salon_name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{log.booking?.service_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            {log.previous_status && log.new_status ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">{log.previous_status}</span>
                                <span>→</span>
                                <span className="font-medium">{log.new_status}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.refund_amount ? (
                              <span className="font-semibold">₹{log.refund_amount}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={log.note || ''}>
                              {log.note || '-'}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

              <div className="space-y-2">
                <Label htmlFor="refundNote">Admin Note (Optional)</Label>
                <Textarea
                  id="refundNote"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Add any notes about this refund..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This note will be saved in the audit log
                </p>
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

      {/* Booking Audit Log Dialog */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Booking Audit History
            </DialogTitle>
            <DialogDescription>
              {selectedBookingAudit && (
                <span>
                  {selectedBookingAudit.salon_name} - {selectedBookingAudit.service_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            {isLoadingBookingAudit ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : bookingAuditLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No audit history for this booking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingAuditLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-6 pb-4 border-l-2 border-muted last:border-transparent"
                  >
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          {log.refund_amount && (
                            <span className="text-sm font-semibold">₹{log.refund_amount}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {log.admin_profile?.full_name || 'Unknown admin'}
                      </p>
                      {log.previous_status && log.new_status && (
                        <p className="text-xs mt-1">
                          Status: <span className="text-muted-foreground">{log.previous_status}</span>
                          {' → '}
                          <span className="font-medium">{log.new_status}</span>
                        </p>
                      )}
                      {log.note && (
                        <p className="text-sm mt-2 p-2 bg-background rounded text-muted-foreground">
                          {log.note}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundManagement;
