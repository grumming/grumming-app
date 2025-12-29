-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  booking_reminders BOOLEAN NOT NULL DEFAULT true,
  booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  promotions BOOLEAN NOT NULL DEFAULT false,
  app_updates BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create preferences on new profile creation
CREATE TRIGGER on_profile_created_notification_prefs
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_preferences_for_user();