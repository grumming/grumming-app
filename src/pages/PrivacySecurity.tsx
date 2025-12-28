import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Shield, Trash2, Download, FileText, Lock, 
  ChevronRight, AlertTriangle, Eye, UserX, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    
    try {
      // Fetch user data from various tables
      const [profileRes, bookingsRes, addressesRes, walletsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id),
        supabase.from('bookings').select('*').eq('user_id', user.id),
        supabase.from('user_addresses').select('*').eq('user_id', user.id),
        supabase.from('wallets').select('*').eq('user_id', user.id),
      ]);

      const userData = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data?.[0] || null,
        bookings: bookingsRes.data || [],
        addresses: addressesRes.data || [],
        wallet: walletsRes.data?.[0] || null,
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    
    try {
      // Delete user data from tables (in order of dependencies)
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await supabase.from('wallet_transactions').delete().eq('user_id', user.id);
      await supabase.from('wallets').delete().eq('user_id', user.id);
      await supabase.from('bookings').delete().eq('user_id', user.id);
      await supabase.from('user_addresses').delete().eq('user_id', user.id);
      await supabase.from('favorite_salons').delete().eq('user_id', user.id);
      await supabase.from('reviews').delete().eq('user_id', user.id);
      await supabase.from('referrals').delete().eq('referrer_id', user.id);
      await supabase.from('referrals').delete().eq('referee_id', user.id);
      await supabase.from('referral_codes').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);

      // Sign out the user
      await signOut();
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all associated data have been deleted.',
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion failed',
        description: 'Failed to delete your account. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const securitySettings = [
    {
      icon: Lock,
      label: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      value: twoFactorEnabled,
      onChange: (v: boolean) => {
        setTwoFactorEnabled(v);
        toast({
          title: v ? 'Coming soon' : 'Disabled',
          description: v ? 'Two-factor authentication will be available soon.' : '2FA disabled',
        });
      },
      badge: 'Coming Soon',
    },
    {
      icon: Eye,
      label: 'Login Alerts',
      description: 'Get notified when someone logs into your account',
      value: loginAlerts,
      onChange: (v: boolean) => {
        setLoginAlerts(v);
        toast({
          title: 'Setting updated',
          description: `Login alerts ${v ? 'enabled' : 'disabled'}`,
        });
      },
    },
  ];

  const privacySettings = [
    {
      icon: Shield,
      label: 'Data Sharing',
      description: 'Allow sharing anonymized data for service improvement',
      value: dataSharing,
      onChange: (v: boolean) => {
        setDataSharing(v);
        toast({
          title: 'Setting updated',
          description: `Data sharing ${v ? 'enabled' : 'disabled'}`,
        });
      },
    },
    {
      icon: Shield,
      label: 'Analytics',
      description: 'Help us improve by sharing usage analytics',
      value: analyticsEnabled,
      onChange: (v: boolean) => {
        setAnalyticsEnabled(v);
        toast({
          title: 'Setting updated',
          description: `Analytics ${v ? 'enabled' : 'disabled'}`,
        });
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/profile')} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">Privacy & Security</h1>
        </div>
      </header>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">SECURITY</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {securitySettings.map((setting, index) => (
            <div
              key={setting.label}
              className={`flex items-center gap-4 p-4 ${
                index !== securitySettings.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <setting.icon className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-foreground">{setting.label}</Label>
                  {setting.badge && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {setting.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
              </div>
              <Switch
                checked={setting.value}
                onCheckedChange={setting.onChange}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Privacy Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 pb-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">PRIVACY</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {privacySettings.map((setting, index) => (
            <div
              key={setting.label}
              className={`flex items-center gap-4 p-4 ${
                index !== privacySettings.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <setting.icon className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">{setting.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
              </div>
              <Switch
                checked={setting.value}
                onCheckedChange={setting.onChange}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Data Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 pb-4"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">DATA MANAGEMENT</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              {isExporting ? (
                <Loader2 className="w-4.5 h-4.5 text-muted-foreground animate-spin" />
              ) : (
                <Download className="w-4.5 h-4.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Download My Data</span>
              <p className="text-xs text-muted-foreground mt-0.5">Export all your personal data as JSON</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => window.open('/privacy-policy', '_blank')}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Privacy Policy</span>
              <p className="text-xs text-muted-foreground mt-0.5">Read our privacy policy</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => window.open('/terms', '_blank')}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-foreground">Terms of Service</span>
              <p className="text-xs text-muted-foreground mt-0.5">Read our terms of service</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4 pb-4"
      >
        <h2 className="text-sm font-semibold text-destructive mb-3 px-1">DANGER ZONE</h2>
        <div className="bg-card rounded-xl border border-destructive/30 overflow-hidden">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="w-full flex items-center gap-4 p-4 hover:bg-destructive/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                  <UserX className="w-4.5 h-4.5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-destructive">Delete Account</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data</p>
                </div>
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Delete Account
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your profile information</li>
                    <li>All bookings and history</li>
                    <li>Wallet balance and transactions</li>
                    <li>Saved addresses and preferences</li>
                    <li>Reviews and referrals</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default PrivacySecurity;
