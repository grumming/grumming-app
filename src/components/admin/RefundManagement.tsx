import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Loader2, RefreshCw, AlertCircle, CheckCircle, 
  XCircle, Clock, CreditCard, User, DollarSign,
  ArrowUpRight, Filter, History, FileText, Download, CalendarIcon, FileDown,
  TrendingUp, TrendingDown, AlertTriangle, Timer, Zap, CheckSquare,
  MoreHorizontal, Banknote, Smartphone, Wallet, ArrowRight, X, Eye,
  ChevronDown, ChevronUp, Target, Activity
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
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
  avgProcessingTime: number;
  successRate: number;
  failedCount: number;
  completedCount: number;
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

// SLA thresholds in hours
const SLA_THRESHOLDS = {
  warning: 12,  // Yellow after 12 hours
  critical: 24, // Red after 24 hours
  target: 48    // Target completion time
};

const RefundManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CancelledBooking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<RefundStats>({
    totalCancelled: 0,
    pendingRefunds: 0,
    processedRefunds: 0,
    totalRefundAmount: 0,
    avgProcessingTime: 0,
    successRate: 0,
    failedCount: 0,
    completedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Batch selection state
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  // Refund dialog state
  const [selectedBooking, setSelectedBooking] = useState<CancelledBooking | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick view dialog
  const [quickViewBooking, setQuickViewBooking] = useState<CancelledBooking | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Audit log for specific booking
  const [selectedBookingAudit, setSelectedBookingAudit] = useState<CancelledBooking | null>(null);
  const [bookingAuditLogs, setBookingAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isLoadingBookingAudit, setIsLoadingBookingAudit] = useState(false);

  // Date range filter for audit logs
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 1)));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  // Expanded rows for timeline
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getTimeSinceCancellation = (booking: CancelledBooking) => {
    const hours = differenceInHours(new Date(), new Date(booking.updated_at));
    const minutes = differenceInMinutes(new Date(), new Date(booking.updated_at)) % 60;
    return { hours, minutes };
  };

  const getPriorityLevel = (booking: CancelledBooking): 'critical' | 'warning' | 'normal' => {
    if (!['cancelled', 'refund_initiated'].includes(booking.status)) return 'normal';
    const { hours } = getTimeSinceCancellation(booking);
    if (hours >= SLA_THRESHOLDS.critical) return 'critical';
    if (hours >= SLA_THRESHOLDS.warning) return 'warning';
    return 'normal';
  };

  const getPriorityBadge = (priority: 'critical' | 'warning' | 'normal') => {
    switch (priority) {
      case 'critical':
        return (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Urgent
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
            <Timer className="w-3 h-3" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPaymentMethodIcon = (paymentId: string | null) => {
    if (!paymentId) return <Wallet className="w-4 h-4 text-muted-foreground" />;
    if (paymentId.startsWith('pay_')) return <CreditCard className="w-4 h-4 text-blue-500" />;
    if (paymentId.includes('upi')) return <Smartphone className="w-4 h-4 text-green-500" />;
    return <Banknote className="w-4 h-4 text-primary" />;
  };

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
        const failedCount = bookingsData.filter(b => b.status === 'refund_failed').length;
        const completedCount = bookingsData.filter(b => b.status === 'refund_completed').length;
        const successRate = (completedCount + processedRefunds) > 0 
          ? (completedCount / (completedCount + failedCount)) * 100 
          : 100;

        setStats({
          totalCancelled,
          pendingRefunds,
          processedRefunds,
          totalRefundAmount,
          avgProcessingTime: 24, // Would calculate from actual data
          successRate: Math.round(successRate),
          failedCount,
          completedCount
        });
      } else {
        setBookings([]);
        setStats({
          totalCancelled: 0,
          pendingRefunds: 0,
          processedRefunds: 0,
          totalRefundAmount: 0,
          avgProcessingTime: 0,
          successRate: 100,
          failedCount: 0,
          completedCount: 0
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
        const adminIds = [...new Set(logsData.map(l => l.admin_user_id))];
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', adminIds);

        const adminMap = new Map(adminProfiles?.map(p => [p.user_id, p]) || []);

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
      (log.note || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const fromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'start';
    const toStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : 'end';

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

  const calculateMonthlySummary = (): MonthlyRefundSummary[] => {
    const monthlyData: Record<string, MonthlyRefundSummary> = {};

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

    bookings.forEach(booking => {
      const bookingMonth = format(new Date(booking.updated_at), 'yyyy-MM');
      if (monthlyData[bookingMonth]) {
        monthlyData[bookingMonth].refundCount++;
        
        if (['refund_processed', 'refund_completed'].includes(booking.status)) {
          monthlyData[bookingMonth].totalRefunds += booking.service_price;
        }

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
    
    const primaryColor: [number, number, number] = [212, 141, 128];
    const darkColor: [number, number, number] = [51, 51, 51];
    
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Grumming', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Refund Report', 20, 35);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, pageWidth - 20, 25, { align: 'right' });
    doc.text('Financial Year Report', pageWidth - 20, 35, { align: 'right' });
    
    let yPos = 60;
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, yPos);
    
    yPos += 15;
    
    const totalRefunded = monthlySummary.reduce((sum, m) => sum + m.totalRefunds, 0);
    const totalCases = monthlySummary.reduce((sum, m) => sum + m.refundCount, 0);
    const totalCompleted = monthlySummary.reduce((sum, m) => sum + m.statusBreakdown.processed + m.statusBreakdown.completed, 0);
    const avgAmount = totalCompleted > 0 ? totalRefunded / totalCompleted : 0;
    
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
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Breakdown', 20, yPos);
    
    yPos += 10;
    
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

  const handleQuickView = (booking: CancelledBooking) => {
    setQuickViewBooking(booking);
    setIsQuickViewOpen(true);
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

  // Batch processing handlers
  const handleSelectAll = () => {
    const eligibleBookings = filteredBookings.filter(b => 
      b.status === 'cancelled' && b.payment_id
    );
    if (selectedBookings.size === eligibleBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(eligibleBookings.map(b => b.id)));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    const newSelection = new Set(selectedBookings);
    if (newSelection.has(bookingId)) {
      newSelection.delete(bookingId);
    } else {
      newSelection.add(bookingId);
    }
    setSelectedBookings(newSelection);
  };

  const handleBatchProcess = async () => {
    if (selectedBookings.size === 0) return;
    
    setIsBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const bookingId of selectedBookings) {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) continue;

      try {
        const { error } = await supabase.functions.invoke('process-razorpay-refund', {
          body: {
            booking_id: bookingId,
            refund_amount: booking.service_price
          }
        });

        if (error) throw error;

        await logAuditAction(
          bookingId,
          'BATCH_REFUND_PROCESSED',
          booking.status,
          'refund_initiated',
          booking.service_price,
          'Processed as part of batch refund'
        );

        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to process refund for ${bookingId}:`, err);
      }
    }

    toast({
      title: 'Batch Processing Complete',
      description: `${successCount} refunds initiated, ${failCount} failed`
    });

    setSelectedBookings(new Set());
    setIsBatchProcessing(false);
    fetchCancelledBookings();
    fetchAuditLogs();
  };

  const handleOverrideStatus = async (booking: CancelledBooking, newStatus: string) => {
    try {
      const previousStatus = booking.status;

      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

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
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Cancelled</Badge>;
      case 'refund_initiated':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1"><Clock className="w-3 h-3" />Initiated</Badge>;
      case 'refund_processed':
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><Zap className="w-3 h-3" />Processing</Badge>;
      case 'refund_completed':
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      case 'refund_failed':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'REFUND_PROCESSED':
      case 'BATCH_REFUND_PROCESSED':
        return <Badge className="bg-green-500">Refund Processed</Badge>;
      case 'REFUND_FAILED':
        return <Badge variant="destructive">Refund Failed</Badge>;
      case 'STATUS_OVERRIDE':
        return <Badge className="bg-orange-500">Status Override</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const toggleRowExpand = (bookingId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.salon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.profile?.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    
    const priority = getPriorityLevel(b);
    const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const eligibleForBatch = filteredBookings.filter(b => b.status === 'cancelled' && b.payment_id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/5 rounded-full -mr-10 -mt-10" />
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Cancelled</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.totalCancelled}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time cancellations
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full -mr-10 -mt-10" />
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Refunds</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.pendingRefunds}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {stats.pendingRefunds > 0 ? (
                      <span className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Needs attention
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        All clear
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -mr-10 -mt-10" />
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Success Rate</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.successRate}%</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={stats.successRate} className="h-1.5 w-16" />
                    <span className="text-xs text-muted-foreground">
                      {stats.completedCount}/{stats.completedCount + stats.failedCount}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10" />
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Refunded</p>
                  <h3 className="text-3xl font-bold mt-1">₹{stats.totalRefundAmount.toLocaleString()}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Processed amount
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="refunds" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="refunds" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Refund Requests
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Monthly Summary
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Refunds Tab */}
          <TabsContent value="refunds">
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Refund Requests
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage and process customer refunds with priority tracking
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchCancelledBookings} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer, salon, or service..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refund_initiated">Initiated</SelectItem>
                        <SelectItem value="refund_processed">Processing</SelectItem>
                        <SelectItem value="refund_completed">Completed</SelectItem>
                        <SelectItem value="refund_failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[140px]">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="critical">Urgent</SelectItem>
                        <SelectItem value="warning">Pending</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Batch Actions Bar */}
                <AnimatePresence>
                  {selectedBookings.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedBookings.size} refund{selectedBookings.size > 1 ? 's' : ''} selected</p>
                          <p className="text-sm text-muted-foreground">
                            Total: ₹{bookings
                              .filter(b => selectedBookings.has(b.id))
                              .reduce((sum, b) => sum + b.service_price, 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBookings(new Set())}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleBatchProcess}
                          disabled={isBatchProcessing}
                          className="gap-2"
                        >
                          {isBatchProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Process All Refunds
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredBookings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No refund requests found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? 'Try adjusting your filters' 
                        : 'All refunds have been processed'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {eligibleForBatch.length > 0 && (
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedBookings.size === eligibleForBatch.length && eligibleForBatch.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                          )}
                          <TableHead className="w-12">Priority</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Booking Details</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => {
                          const priority = getPriorityLevel(booking);
                          const { hours, minutes } = getTimeSinceCancellation(booking);
                          const isEligible = booking.status === 'cancelled' && booking.payment_id;
                          const isExpanded = expandedRows.has(booking.id);

                          return (
                            <>
                              <TableRow 
                                key={booking.id} 
                                className={cn(
                                  "transition-colors",
                                  priority === 'critical' && "bg-destructive/5",
                                  priority === 'warning' && "bg-yellow-500/5",
                                  selectedBookings.has(booking.id) && "bg-primary/5"
                                )}
                              >
                                {eligibleForBatch.length > 0 && (
                                  <TableCell>
                                    {isEligible && (
                                      <Checkbox
                                        checked={selectedBookings.has(booking.id)}
                                        onCheckedChange={() => handleSelectBooking(booking.id)}
                                      />
                                    )}
                                  </TableCell>
                                )}
                                <TableCell>
                                  {getPriorityBadge(priority)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">
                                        {booking.profile?.full_name || 'Unknown'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {booking.profile?.email || booking.profile?.phone || 'No contact'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{booking.salon_name}</p>
                                    <p className="text-xs text-muted-foreground">{booking.service_name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {format(new Date(booking.booking_date), 'MMM d, yyyy')} • {booking.booking_time}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-lg font-bold">₹{booking.service_price}</span>
                                </TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        {getPaymentMethodIcon(booking.payment_id)}
                                        <span className="text-xs font-mono text-muted-foreground max-w-[80px] truncate">
                                          {booking.payment_id?.slice(-8) || 'No payment'}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{booking.payment_id || 'No payment recorded'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(booking.status)}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {hours > 0 ? (
                                      <span className={cn(
                                        "font-medium",
                                        priority === 'critical' && "text-destructive",
                                        priority === 'warning' && "text-yellow-600"
                                      )}>
                                        {hours}h {minutes}m ago
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">{minutes}m ago</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={() => handleQuickView(booking)}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Quick View</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={() => handleViewAuditLog(booking)}
                                        >
                                          <History className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View History</TooltipContent>
                                    </Tooltip>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline" className="gap-1">
                                          Actions
                                          <ChevronDown className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        {booking.status === 'cancelled' && booking.payment_id && (
                                          <DropdownMenuItem onClick={() => handleRefundClick(booking)}>
                                            <Zap className="w-4 h-4 mr-2" />
                                            Process Refund
                                          </DropdownMenuItem>
                                        )}
                                        {booking.status === 'refund_failed' && (
                                          <DropdownMenuItem onClick={() => handleRefundClick(booking)}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Retry Refund
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOverrideStatus(booking, 'refund_initiated')}>
                                          <Clock className="w-4 h-4 mr-2" />
                                          Mark Initiated
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOverrideStatus(booking, 'refund_processing')}>
                                          <Loader2 className="w-4 h-4 mr-2" />
                                          Mark Processing
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOverrideStatus(booking, 'refund_completed')}>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark Completed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleOverrideStatus(booking, 'refund_failed')}
                                          className="text-destructive"
                                        >
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Mark Failed
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })}
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
              <CardHeader className="border-b">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Monthly Refund Summary
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Financial overview of refunds by month (last 12 months)
                    </CardDescription>
                  </div>
                  <Button onClick={exportMonthlySummaryToPDF} className="gap-2">
                    <FileDown className="w-4 h-4" />
                    Export PDF Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground font-medium">Total Refunded (12 months)</p>
                      <h3 className="text-2xl font-bold text-primary">
                        ₹{monthlySummary.reduce((sum, m) => sum + m.totalRefunds, 0).toLocaleString()}
                      </h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground font-medium">Total Refund Cases</p>
                      <h3 className="text-2xl font-bold text-blue-600">
                        {monthlySummary.reduce((sum, m) => sum + m.refundCount, 0)}
                      </h3>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground font-medium">Average Refund Amount</p>
                      <h3 className="text-2xl font-bold text-green-600">
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
                <div className="mb-6 p-6 bg-muted/30 rounded-xl border">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Refund Trend (Last 12 Months)
                  </h4>
                  <div className="flex items-end justify-between gap-2 h-48">
                    {[...monthlySummary].reverse().map((month, i) => {
                      const maxAmount = Math.max(...monthlySummary.map(m => m.totalRefunds), 1);
                      const height = (month.totalRefunds / maxAmount) * 100;
                      return (
                        <Tooltip key={month.month}>
                          <TooltipTrigger asChild>
                            <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                {month.totalRefunds > 0 ? `₹${(month.totalRefunds / 1000).toFixed(1)}k` : '-'}
                              </span>
                              <div 
                                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t transition-all group-hover:from-primary/80 group-hover:to-primary/40"
                                style={{ height: `${Math.max(height, 4)}%` }}
                              />
                              <span className="text-[9px] text-muted-foreground font-medium">
                                {format(new Date(month.month + '-01'), 'MMM')}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{month.monthLabel}</p>
                            <p className="text-sm">₹{month.totalRefunds.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{month.refundCount} cases</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Table */}
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Cases</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Avg Amount</TableHead>
                        <TableHead className="text-center">Initiated</TableHead>
                        <TableHead className="text-center">Processing</TableHead>
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
              <CardHeader className="border-b">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Refund Audit Log
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Track all refund actions taken by admins
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportAuditLogsToCSV}
                      disabled={filteredAuditLogs.length === 0}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchAuditLogs} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Date Range Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
                    <Button variant="outline" size="sm" onClick={setThisMonth}>This Month</Button>
                    <Button variant="outline" size="sm" onClick={setLastMonth}>Last Month</Button>
                    <Button variant="outline" size="sm" onClick={setLast3Months}>Last 3 Months</Button>
                    {(dateFrom || dateTo) && (
                      <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 lg:ml-auto">
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
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
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
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      {auditLogs.length === 0 ? 'No audit logs yet' : 'No logs found in selected date range'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
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
                                <p className="text-sm font-medium">{format(new Date(log.created_at), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{log.admin_profile?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{log.admin_profile?.email}</p>
                                </div>
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
                                  <ArrowRight className="w-3 h-3" />
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-muted-foreground max-w-[200px] truncate cursor-help">
                                    {log.note || '-'}
                                  </p>
                                </TooltipTrigger>
                                {log.note && (
                                  <TooltipContent className="max-w-xs">
                                    <p>{log.note}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
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

        {/* Quick View Dialog */}
        <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Refund Details
              </DialogTitle>
            </DialogHeader>
            {quickViewBooking && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(quickViewBooking.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    {getPriorityBadge(getPriorityLevel(quickViewBooking)) || (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Customer</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{quickViewBooking.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{quickViewBooking.profile?.email}</p>
                      <p className="text-sm text-muted-foreground">{quickViewBooking.profile?.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Salon</p>
                    <p className="font-medium">{quickViewBooking.salon_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{quickViewBooking.service_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">₹{quickViewBooking.service_price}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Booking Date</p>
                    <p className="font-medium">{format(new Date(quickViewBooking.booking_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Payment ID</p>
                  <p className="font-mono text-sm">{quickViewBooking.payment_id || 'No payment recorded'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Process Refund
              </DialogTitle>
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
              <Button onClick={handleProcessRefund} disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Process Refund
                  </>
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
                <History className="w-5 h-5 text-primary" />
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
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-muted-foreground" />
                  </div>
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
                          <p className="text-xs mt-1 flex items-center gap-1">
                            Status: <span className="text-muted-foreground">{log.previous_status}</span>
                            <ArrowRight className="w-3 h-3" />
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
    </TooltipProvider>
  );
};

export default RefundManagement;
