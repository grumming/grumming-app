import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface WebhookLog {
  id: string;
  event_type: string;
  event_id: string | null;
  payload: Json;
  status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export function WebhookLogViewer() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching webhook logs:', err);
      toast({ title: 'Error', description: 'Failed to fetch webhook logs', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('webhook_logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webhook_logs' }, (payload) => {
        setLogs((prev) => [payload.new as WebhookLog, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, eventFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'received':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Processed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'received':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Received</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.includes('captured') || eventType.includes('authorized')) {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{eventType}</Badge>;
    }
    if (eventType.includes('failed')) {
      return <Badge variant="destructive">{eventType}</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const payload = log.payload as Record<string, unknown>;
    const payloadStr = JSON.stringify(payload).toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      log.event_id?.toLowerCase().includes(searchLower) ||
      payloadStr.includes(searchLower)
    );
  });

  const uniqueEventTypes = [...new Set(logs.map((l) => l.event_type))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Webhook Logs
            </CardTitle>
            <CardDescription>
              View all incoming Razorpay webhook events for debugging
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by event, ID, or payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {uniqueEventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No webhook logs found</p>
            <p className="text-sm">Webhook events will appear here when received</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const payload = log.payload as Record<string, unknown>;
                const payloadInner = payload?.payload as Record<string, unknown> | undefined;
                const paymentEntity = (payloadInner?.payment as Record<string, unknown>)?.entity as Record<string, unknown> | undefined;
                const orderEntity = (payloadInner?.order as Record<string, unknown>)?.entity as Record<string, unknown> | undefined;
                const bookingId = (paymentEntity?.notes as Record<string, unknown>)?.booking_id || 
                                  (orderEntity?.notes as Record<string, unknown>)?.booking_id;

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getEventBadge(log.event_type)}
                          {getStatusBadge(log.status)}
                          {bookingId && (
                            <span className="text-xs text-muted-foreground">
                              Booking: {String(bookingId).slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                          {log.event_id && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{log.event_id}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-3 space-y-3">
                        {log.error_message && (
                          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                            <strong>Error:</strong> {log.error_message}
                          </div>
                        )}

                        {log.processed_at && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Processed at:</strong> {format(new Date(log.processed_at), 'MMM d, yyyy HH:mm:ss')}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-medium mb-1">Payload:</p>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto font-mono">
                              {JSON.stringify(payload, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
