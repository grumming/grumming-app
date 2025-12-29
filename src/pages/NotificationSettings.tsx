import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, BellOff, Loader2, Smartphone, Calendar, MessageSquare, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { 
    isSupported, 
    isRegistered, 
    token, 
    error,
    register, 
    unregister 
  } = usePushNotifications();

  // Local notification preferences (would typically be stored in database)
  const [preferences, setPreferences] = useState({
    bookingReminders: true,
    bookingConfirmations: true,
    promotions: false,
    updates: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleTogglePushNotifications = async () => {
    setIsProcessing(true);
    
    if (isRegistered) {
      await unregister();
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    } else {
      const success = await register();
      if (success) {
        toast({
          title: 'Push notifications enabled',
          description: 'You will now receive push notifications.',
        });
      } else {
        toast({
          title: 'Failed to enable notifications',
          description: error || 'Please check your device settings.',
          variant: 'destructive',
        });
      }
    }
    
    setIsProcessing(false);
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: !prev[key] };
      
      // In a real app, you would save this to the database
      toast({
        title: 'Preference updated',
        description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} notifications ${newPrefs[key] ? 'enabled' : 'disabled'}.`,
      });
      
      return newPrefs;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <header className="bg-gradient-primary p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-primary-foreground">Notification Settings</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Push Notifications Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Push Notifications</CardTitle>
                  <CardDescription>
                    {isSupported 
                      ? 'Receive notifications on your device'
                      : 'Push notifications require a native app'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isSupported ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isRegistered ? (
                        <Bell className="w-5 h-5 text-primary" />
                      ) : (
                        <BellOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {isRegistered ? 'Notifications enabled' : 'Notifications disabled'}
                        </p>
                        {token && (
                          <p className="text-xs text-muted-foreground">
                            Device registered
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={isRegistered ? 'outline' : 'default'}
                      size="sm"
                      onClick={handleTogglePushNotifications}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRegistered ? (
                        'Disable'
                      ) : (
                        'Enable'
                      )}
                    </Button>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Push notifications are only available when using the mobile app. 
                    Install the app to enable notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Booking Reminders */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="bookingReminders" className="font-medium cursor-pointer">
                      Booking Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded before your appointments
                    </p>
                  </div>
                </div>
                <Switch
                  id="bookingReminders"
                  checked={preferences.bookingReminders}
                  onCheckedChange={() => handlePreferenceChange('bookingReminders')}
                />
              </div>

              <Separator />

              {/* Booking Confirmations */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="bookingConfirmations" className="font-medium cursor-pointer">
                      Booking Confirmations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive confirmation when bookings are made
                    </p>
                  </div>
                </div>
                <Switch
                  id="bookingConfirmations"
                  checked={preferences.bookingConfirmations}
                  onCheckedChange={() => handlePreferenceChange('bookingConfirmations')}
                />
              </div>

              <Separator />

              {/* Promotions */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="promotions" className="font-medium cursor-pointer">
                      Promotions & Offers
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about special deals and discounts
                    </p>
                  </div>
                </div>
                <Switch
                  id="promotions"
                  checked={preferences.promotions}
                  onCheckedChange={() => handlePreferenceChange('promotions')}
                />
              </div>

              <Separator />

              {/* Updates */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="updates" className="font-medium cursor-pointer">
                      App Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new features and improvements
                    </p>
                  </div>
                </div>
                <Switch
                  id="updates"
                  checked={preferences.updates}
                  onCheckedChange={() => handlePreferenceChange('updates')}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                You can change your notification preferences at any time. 
                Push notifications require the mobile app and device permissions.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationSettings;
