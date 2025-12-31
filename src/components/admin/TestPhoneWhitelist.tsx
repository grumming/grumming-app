import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Plus, Trash2, Loader2, Search, Edit2, Save, X, AlertCircle, History, UserCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface WhitelistedPhone {
  id: string;
  phone: string;
  otp_code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  phone: string;
  old_otp_code: string | null;
  new_otp_code: string | null;
  old_is_active: boolean | null;
  new_is_active: boolean | null;
  old_description: string | null;
  new_description: string | null;
  performed_by: string | null;
  performed_at: string;
  admin_name?: string;
}

const TestPhoneWhitelist = () => {
  const { toast } = useToast();
  const [phones, setPhones] = useState<WhitelistedPhone[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [newPhone, setNewPhone] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit state
  const [editOtp, setEditOtp] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchPhones = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('test_phone_whitelist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching whitelist:', error);
      toast({ title: 'Error', description: 'Failed to load whitelist', variant: 'destructive' });
    } else {
      setPhones(data || []);
    }
    setIsLoading(false);
  };

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    const { data, error } = await supabase
      .from('test_phone_audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
    } else {
      // Fetch admin names for each log entry
      const logsWithNames = await Promise.all(
        (data || []).map(async (log) => {
          if (log.performed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', log.performed_by)
              .maybeSingle();
            return { ...log, admin_name: profile?.full_name || 'Unknown Admin' };
          }
          return { ...log, admin_name: 'System' };
        })
      );
      setAuditLogs(logsWithNames);
    }
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    fetchPhones();
    fetchAuditLogs();
  }, []);

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    let digits = input.replace(/\D/g, '');
    
    // If starts with 91 and is 12 digits, format with +91
    if (digits.startsWith('91') && digits.length === 12) {
      return '+' + digits;
    }
    
    // If 10 digits, add +91
    if (digits.length === 10) {
      return '+91' + digits;
    }
    
    // If already has +, return as is
    if (input.startsWith('+')) {
      return input;
    }
    
    return '+91' + digits;
  };

  const handleAddPhone = async () => {
    if (!newPhone || !newOtp) {
      toast({ title: 'Error', description: 'Phone and OTP are required', variant: 'destructive' });
      return;
    }

    if (newOtp.length !== 6 || !/^\d+$/.test(newOtp)) {
      toast({ title: 'Error', description: 'OTP must be exactly 6 digits', variant: 'destructive' });
      return;
    }

    const formattedPhone = formatPhoneNumber(newPhone);
    
    // Validate phone format
    const phoneRegex = /^\+91[6-9][0-9]{9}$/;
    if (!phoneRegex.test(formattedPhone)) {
      toast({ 
        title: 'Error', 
        description: 'Invalid Indian phone number. Use 10 digits starting with 6-9.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('test_phone_whitelist')
      .insert({
        phone: formattedPhone,
        otp_code: newOtp,
        description: newDescription || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'This phone number is already whitelisted', variant: 'destructive' });
      } else {
        console.error('Error adding phone:', error);
        toast({ title: 'Error', description: 'Failed to add phone number', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Success', description: 'Phone number added to whitelist' });
      setNewPhone('');
      setNewOtp('');
      setNewDescription('');
      setIsAddDialogOpen(false);
      fetchPhones();
      fetchAuditLogs();
    }
    setIsSaving(false);
  };

  const handleUpdatePhone = async (id: string) => {
    if (!editOtp || editOtp.length !== 6 || !/^\d+$/.test(editOtp)) {
      toast({ title: 'Error', description: 'OTP must be exactly 6 digits', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('test_phone_whitelist')
      .update({
        otp_code: editOtp,
        description: editDescription || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating phone:', error);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Updated successfully' });
      setEditingId(null);
      fetchPhones();
      fetchAuditLogs();
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('test_phone_whitelist')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error toggling status:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      fetchPhones();
      fetchAuditLogs();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('test_phone_whitelist')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting phone:', error);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Phone number removed from whitelist' });
      fetchPhones();
      fetchAuditLogs();
    }
  };

  const startEditing = (phone: WhitelistedPhone) => {
    setEditingId(phone.id);
    setEditOtp(phone.otp_code);
    setEditDescription(phone.description || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditOtp('');
    setEditDescription('');
  };

  const filteredPhones = phones.filter(p => 
    p.phone.includes(searchQuery) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = phones.filter(p => p.is_active).length;

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getChangeDescription = (log: AuditLogEntry): string => {
    if (log.action === 'INSERT') {
      return `Added with OTP ${log.new_otp_code}`;
    }
    if (log.action === 'DELETE') {
      return `Removed (was OTP ${log.old_otp_code})`;
    }
    if (log.action === 'UPDATE') {
      const changes: string[] = [];
      if (log.old_otp_code !== log.new_otp_code) {
        changes.push(`OTP: ${log.old_otp_code} → ${log.new_otp_code}`);
      }
      if (log.old_is_active !== log.new_is_active) {
        changes.push(`Status: ${log.old_is_active ? 'Active' : 'Inactive'} → ${log.new_is_active ? 'Active' : 'Inactive'}`);
      }
      if (log.old_description !== log.new_description) {
        changes.push(`Description updated`);
      }
      return changes.join(', ') || 'Minor changes';
    }
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Test Phone Whitelist
            </CardTitle>
            <CardDescription className="mt-1">
              Manage whitelisted phone numbers for OTP testing. These numbers use fixed OTPs and bypass SMS delivery.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {activeCount} active / {phones.length} total
            </Badge>
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Number
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="numbers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="numbers" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Numbers ({phones.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Audit Log ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          {/* Numbers Tab */}
          <TabsContent value="numbers" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Info Alert */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-muted-foreground">
                <strong>How it works:</strong> Whitelisted numbers skip SMS delivery and use the specified OTP directly. 
                Inactive numbers will receive real SMS like regular users.
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredPhones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No matching phone numbers found' : 'No whitelisted phone numbers yet'}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>OTP</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredPhones.map((phone) => (
                        <motion.tr
                          key={phone.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="group"
                        >
                          <TableCell className="font-mono">{phone.phone}</TableCell>
                          <TableCell>
                            {editingId === phone.id ? (
                              <Input
                                value={editOtp}
                                onChange={(e) => setEditOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-24 font-mono"
                                placeholder="6 digits"
                              />
                            ) : (
                              <Badge variant="secondary" className="font-mono">
                                {phone.otp_code}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === phone.id ? (
                              <Input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-40"
                                placeholder="Description"
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {phone.description || '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={phone.is_active}
                                onCheckedChange={() => handleToggleActive(phone.id, phone.is_active)}
                              />
                              <span className={`text-xs ${phone.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {phone.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(phone.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingId === phone.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleUpdatePhone(phone.id)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => startEditing(phone)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(phone.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            {isLoadingLogs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs yet. Changes will be tracked here.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                            <span className="font-mono text-sm font-medium">{log.phone}</span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {log.action === 'UPDATE' && <ArrowRight className="w-3 h-3" />}
                            {getChangeDescription(log)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCircle className="w-3 h-3" />
                            <span>{log.admin_name || 'Unknown'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Test Phone Number</DialogTitle>
            <DialogDescription>
              Add a phone number to the whitelist with a fixed OTP for testing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="10 digit mobile number"
              />
              <p className="text-xs text-muted-foreground">
                Enter 10-digit number or with +91 prefix
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp">Fixed OTP</Label>
              <Input
                id="otp"
                value={newOtp}
                onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 digit OTP"
                maxLength={6}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., Test account for QA team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPhone} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TestPhoneWhitelist;
