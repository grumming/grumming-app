import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, Tag, Pencil, Trash2, Check, X, 
  Loader2, ToggleLeft, ToggleRight, Search, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_discount: number | null;
  min_order_value: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyPromo = {
  code: '',
  discount_type: 'fixed' as 'fixed' | 'percentage',
  discount_value: 0,
  max_discount: null as number | null,
  min_order_value: null as number | null,
  usage_limit: null as number | null,
  valid_from: '',
  valid_until: '',
  is_active: true,
};

const AdminPromoCodes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState(emptyPromo);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deletePromo, setDeletePromo] = useState<PromoCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch promo codes
  const fetchPromoCodes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setPromoCodes(data as PromoCode[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPromoCodes();
    }
  }, [isAdmin]);

  // Filter promo codes based on search
  const filteredPromoCodes = promoCodes.filter(promo =>
    promo.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open modal for adding new promo
  const handleAddNew = () => {
    setEditingPromo(null);
    setFormData(emptyPromo);
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discount_type: promo.discount_type as 'fixed' | 'percentage',
      discount_value: promo.discount_value,
      max_discount: promo.max_discount,
      min_order_value: promo.min_order_value,
      usage_limit: promo.usage_limit,
      valid_from: promo.valid_from ? promo.valid_from.split('T')[0] : '',
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
      is_active: promo.is_active,
    });
    setShowModal(true);
  };

  // Save promo code
  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({ title: 'Error', description: 'Promo code is required', variant: 'destructive' });
      return;
    }
    if (formData.discount_value <= 0) {
      toast({ title: 'Error', description: 'Discount value must be greater than 0', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const promoData = {
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      max_discount: formData.max_discount || null,
      min_order_value: formData.min_order_value || null,
      usage_limit: formData.usage_limit || null,
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      is_active: formData.is_active,
    };

    try {
      if (editingPromo) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingPromo.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promo code updated successfully' });
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert(promoData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promo code created successfully' });
      }

      setShowModal(false);
      fetchPromoCodes();
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to save promo code', 
        variant: 'destructive' 
      });
    }

    setIsSaving(false);
  };

  // Toggle active status
  const handleToggleActive = async (promo: PromoCode) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({ 
        title: 'Success', 
        description: `Promo code ${promo.is_active ? 'deactivated' : 'activated'}` 
      });
      fetchPromoCodes();
    }
  };

  // Delete promo code
  const handleDelete = async () => {
    if (!deletePromo) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', deletePromo.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete promo code', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Promo code deleted' });
      fetchPromoCodes();
    }
    
    setIsDeleting(false);
    setDeletePromo(null);
  };

  // Show loading while checking admin status
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied for non-admins
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access this page.</p>
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin panel.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold">Promo Codes</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <Button onClick={handleAddNew} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search promo codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Promo Codes List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPromoCodes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No promo codes found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first promo code'}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Promo Code
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPromoCodes.map((promo) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={!promo.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-mono font-semibold text-lg">{promo.code}</span>
                          <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {promo.discount_type === 'percentage' 
                            ? `${promo.discount_value}% off${promo.max_discount ? ` (Max ₹${promo.max_discount})` : ''}`
                            : `₹${promo.discount_value} off`}
                          {promo.min_order_value ? ` • Min order ₹${promo.min_order_value}` : ''}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Used: {promo.used_count}{promo.usage_limit ? `/${promo.usage_limit}` : ''}</span>
                          {promo.valid_until && (
                            <span>• Expires: {new Date(promo.valid_until).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(promo)}
                          title={promo.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {promo.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(promo)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePromo(promo)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
            </DialogTitle>
            <DialogDescription>
              {editingPromo ? 'Update the promo code details below.' : 'Fill in the details to create a new promo code.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Promo Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20"
                className="uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'fixed' | 'percentage') => 
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Discount Value *
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value || ''}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  placeholder={formData.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                />
              </div>
            </div>

            {formData.discount_type === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="max_discount">Max Discount (₹)</Label>
                <Input
                  id="max_discount"
                  type="number"
                  value={formData.max_discount || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_discount: e.target.value ? Number(e.target.value) : null 
                  })}
                  placeholder="e.g. 200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="min_order_value">Min Order Value (₹)</Label>
              <Input
                id="min_order_value"
                type="number"
                value={formData.min_order_value || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  min_order_value: e.target.value ? Number(e.target.value) : null 
                })}
                placeholder="e.g. 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">Usage Limit</Label>
              <Input
                id="usage_limit"
                type="number"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  usage_limit: e.target.value ? Number(e.target.value) : null 
                })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {editingPromo ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePromo} onOpenChange={() => setDeletePromo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the promo code "{deletePromo?.code}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPromoCodes;
