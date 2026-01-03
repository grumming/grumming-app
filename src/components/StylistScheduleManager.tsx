import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { 
  Clock, Calendar, Plus, Trash2, Loader2, Save, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Stylist {
  id: string;
  name: string;
  photo_url: string | null;
}

interface StylistSchedule {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface StylistDayOff {
  id: string;
  stylist_id: string;
  date_off: string;
  reason: string | null;
}

interface StylistScheduleManagerProps {
  salonId: string;
  stylists: Stylist[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export function StylistScheduleManager({ salonId, stylists }: StylistScheduleManagerProps) {
  const { toast } = useToast();
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(
    stylists.length > 0 ? stylists[0].id : null
  );
  const [schedules, setSchedules] = useState<StylistSchedule[]>([]);
  const [daysOff, setDaysOff] = useState<StylistDayOff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Day off dialog state
  const [isDayOffDialogOpen, setIsDayOffDialogOpen] = useState(false);
  const [dayOffDate, setDayOffDate] = useState('');
  const [dayOffReason, setDayOffReason] = useState('');
  const [isAddingDayOff, setIsAddingDayOff] = useState(false);

  const selectedStylist = stylists.find(s => s.id === selectedStylistId);

  // Fetch schedules for selected stylist
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedStylistId) return;

      setIsLoading(true);
      try {
        // Fetch weekly schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('stylist_schedules')
          .select('*')
          .eq('stylist_id', selectedStylistId)
          .order('day_of_week');

        if (scheduleError) throw scheduleError;

        // If no schedule exists, create default schedule
        if (!scheduleData || scheduleData.length === 0) {
          const defaultSchedules = DAYS_OF_WEEK.map(day => ({
            stylist_id: selectedStylistId,
            day_of_week: day.value,
            start_time: '09:00:00',
            end_time: '18:00:00',
            is_working: day.value !== 0, // Closed on Sunday by default
          }));

          const { data: insertedData, error: insertError } = await supabase
            .from('stylist_schedules')
            .insert(defaultSchedules)
            .select();

          if (insertError) throw insertError;
          setSchedules(insertedData || []);
        } else {
          setSchedules(scheduleData);
        }

        // Fetch days off
        const { data: daysOffData, error: daysOffError } = await supabase
          .from('stylist_days_off')
          .select('*')
          .eq('stylist_id', selectedStylistId)
          .gte('date_off', format(new Date(), 'yyyy-MM-dd'))
          .order('date_off');

        if (daysOffError) throw daysOffError;
        setDaysOff(daysOffData || []);

      } catch (err) {
        console.error('Error fetching schedules:', err);
        toast({
          title: 'Error',
          description: 'Failed to load stylist schedule',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    };

    fetchSchedules();
  }, [selectedStylistId, toast]);

  // Update schedule for a day
  const updateSchedule = (dayOfWeek: number, updates: Partial<StylistSchedule>) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, ...updates } : s
    ));
  };

  // Save all schedule changes
  const handleSaveSchedules = async () => {
    if (!selectedStylistId) return;

    setIsSaving(true);
    try {
      for (const schedule of schedules) {
        const { error } = await supabase
          .from('stylist_schedules')
          .update({
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_working: schedule.is_working,
          })
          .eq('id', schedule.id);

        if (error) throw error;
      }

      toast({
        title: 'Schedule saved',
        description: `${selectedStylist?.name}'s working hours have been updated`,
      });
    } catch (err) {
      console.error('Error saving schedules:', err);
      toast({
        title: 'Error',
        description: 'Failed to save schedule',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  // Add a day off
  const handleAddDayOff = async () => {
    if (!selectedStylistId || !dayOffDate) return;

    setIsAddingDayOff(true);
    try {
      const { data, error } = await supabase
        .from('stylist_days_off')
        .insert({
          stylist_id: selectedStylistId,
          date_off: dayOffDate,
          reason: dayOffReason || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already marked',
            description: 'This date is already marked as a day off',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        setDaysOff(prev => [...prev, data].sort((a, b) => a.date_off.localeCompare(b.date_off)));
        setIsDayOffDialogOpen(false);
        setDayOffDate('');
        setDayOffReason('');
        toast({
          title: 'Day off added',
          description: `${selectedStylist?.name} will be off on ${format(new Date(dayOffDate), 'MMM d, yyyy')}`,
        });
      }
    } catch (err) {
      console.error('Error adding day off:', err);
      toast({
        title: 'Error',
        description: 'Failed to add day off',
        variant: 'destructive',
      });
    }
    setIsAddingDayOff(false);
  };

  // Remove a day off
  const handleRemoveDayOff = async (dayOffId: string) => {
    try {
      const { error } = await supabase
        .from('stylist_days_off')
        .delete()
        .eq('id', dayOffId);

      if (error) throw error;

      setDaysOff(prev => prev.filter(d => d.id !== dayOffId));
      toast({
        title: 'Day off removed',
        description: 'The day off has been removed',
      });
    } catch (err) {
      console.error('Error removing day off:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove day off',
        variant: 'destructive',
      });
    }
  };

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (stylists.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium">No stylists to schedule</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add stylists first to manage their schedules
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stylist Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Stylist Schedules
          </CardTitle>
          <CardDescription>
            Set working hours and days off for each stylist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stylists.map(stylist => (
              <button
                key={stylist.id}
                onClick={() => setSelectedStylistId(stylist.id)}
                className={`flex flex-col items-center min-w-[80px] p-3 rounded-xl border-2 transition-all ${
                  selectedStylistId === stylist.id
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:border-primary/50 bg-muted/20'
                }`}
              >
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarImage src={stylist.photo_url || undefined} alt={stylist.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {stylist.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-center line-clamp-1">{stylist.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading schedule...</span>
            </div>
          </CardContent>
        </Card>
      ) : selectedStylist && (
        <>
          {/* Weekly Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedStylist.name}'s Weekly Hours</CardTitle>
                  <CardDescription className="text-xs">
                    Toggle days on/off and set working hours
                  </CardDescription>
                </div>
                <Button onClick={handleSaveSchedules} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const schedule = schedules.find(s => s.day_of_week === day.value);
                if (!schedule) return null;

                return (
                  <motion.div
                    key={day.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      schedule.is_working 
                        ? 'bg-background border-border' 
                        : 'bg-muted/50 border-muted'
                    }`}
                  >
                    <div className="w-20">
                      <span className={`font-medium text-sm ${!schedule.is_working && 'text-muted-foreground'}`}>
                        {day.label}
                      </span>
                    </div>
                    
                    <Switch
                      checked={schedule.is_working}
                      onCheckedChange={(checked) => updateSchedule(day.value, { is_working: checked })}
                    />

                    {schedule.is_working ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Select
                          value={schedule.start_time.substring(0, 5)}
                          onValueChange={(v) => updateSchedule(day.value, { start_time: `${v}:00` })}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time} value={time} className="text-xs">
                                {formatTimeDisplay(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-sm">to</span>
                        <Select
                          value={schedule.end_time.substring(0, 5)}
                          onValueChange={(v) => updateSchedule(day.value, { end_time: `${v}:00` })}
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time} value={time} className="text-xs">
                                {formatTimeDisplay(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Off</span>
                    )}
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Days Off */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Scheduled Days Off</CardTitle>
                  <CardDescription className="text-xs">
                    Add specific dates when {selectedStylist.name} is unavailable
                  </CardDescription>
                </div>
                <Button onClick={() => setIsDayOffDialogOpen(true)} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Day Off
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {daysOff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming days off scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {daysOff.map(dayOff => (
                      <motion.div
                        key={dayOff.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(dayOff.date_off), 'EEEE, MMM d, yyyy')}
                            </p>
                            {dayOff.reason && (
                              <p className="text-xs text-muted-foreground">{dayOff.reason}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveDayOff(dayOff.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Day Off Dialog */}
      <Dialog open={isDayOffDialogOpen} onOpenChange={setIsDayOffDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Day Off</DialogTitle>
            <DialogDescription>
              Mark a date when {selectedStylist?.name} will be unavailable
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={dayOffDate}
                onChange={(e) => setDayOffDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={dayOffReason}
                onChange={(e) => setDayOffReason(e.target.value)}
                placeholder="e.g., Personal leave, Training, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDayOffDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDayOff} disabled={!dayOffDate || isAddingDayOff}>
              {isAddingDayOff && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Day Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}