-- Fix overly permissive INSERT policies by adding proper user-based checks
-- These policies still allow service role to insert on behalf of users, 
-- but now also validate that the user_id matches the authenticated user for direct inserts

-- 1. Fix notifications table - users should only be able to insert notifications for themselves
-- Service role bypasses RLS, so system operations continue to work
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can receive notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Fix user_vouchers table - users should only receive vouchers for themselves
DROP POLICY IF EXISTS "System can insert vouchers" ON public.user_vouchers;

CREATE POLICY "Users can receive vouchers"
ON public.user_vouchers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Fix test_phone_audit_log table - only admins should be able to insert audit logs
-- This is a security-sensitive table that tracks test phone changes
DROP POLICY IF EXISTS "System can insert audit logs" ON public.test_phone_audit_log;

CREATE POLICY "Admins can insert audit logs"
ON public.test_phone_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));