import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, DollarSign, Play, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

interface PayoutSettings {
  id: string;
  is_enabled: boolean;
  day_of_week: number;
  minimum_payout_amount: number;
  auto_approve_threshold: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

export function PayoutScheduleSettings() {
  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManually, setRunningManually] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_schedule_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load payout settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payout_schedule_settings')
        .update({
          is_enabled: settings.is_enabled,
          day_of_week: settings.day_of_week,
          minimum_payout_amount: settings.minimum_payout_amount,
          auto_approve_threshold: settings.auto_approve_threshold,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Payout schedule settings saved');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunningManually(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scheduled-payouts');

      if (error) throw error;

      if (data.success) {
        toast.success(`Processed ${data.payoutsCreated} payouts (${data.payoutsAutoApproved} auto-approved)`);
        fetchSettings();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error running payouts:', error);
      toast.error('Failed to run scheduled payouts: ' + error.message);
    } finally {
      setRunningManually(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Automated Payout Schedule
        </CardTitle>
        <CardDescription>
          Configure automatic weekly payouts to salon owners
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Automated Payouts</Label>
            <p className="text-sm text-muted-foreground">
              Automatically create payout requests on the scheduled day
            </p>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payout Day
            </Label>
            <Select
              value={settings.day_of_week.toString()}
              onValueChange={(value) => setSettings({ ...settings, day_of_week: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Minimum Payout (₹)
            </Label>
            <Input
              type="number"
              value={settings.minimum_payout_amount}
              onChange={(e) => setSettings({ ...settings, minimum_payout_amount: parseFloat(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Skip salons with balance below this amount
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Auto-Approve Threshold (₹)
            </Label>
            <Input
              type="number"
              value={settings.auto_approve_threshold || ''}
              onChange={(e) => setSettings({ 
                ...settings, 
                auto_approve_threshold: e.target.value ? parseFloat(e.target.value) : null 
              })}
              min={0}
              placeholder="Leave empty to require manual approval"
            />
            <p className="text-xs text-muted-foreground">
              Payouts at or below this amount will be auto-approved
            </p>
          </div>
        </div>

        {(settings.last_run_at || settings.next_run_at) && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Schedule Status</span>
            </div>
            {settings.last_run_at && (
              <p className="text-sm">
                <span className="text-muted-foreground">Last run:</span>{' '}
                {format(new Date(settings.last_run_at), 'PPp')}
              </p>
            )}
            {settings.next_run_at && settings.is_enabled && (
              <p className="text-sm">
                <span className="text-muted-foreground">Next run:</span>{' '}
                {format(new Date(settings.next_run_at), 'PPp')}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRunNow} 
            disabled={runningManually}
          >
            <Play className="h-4 w-4 mr-2" />
            {runningManually ? 'Processing...' : 'Run Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}