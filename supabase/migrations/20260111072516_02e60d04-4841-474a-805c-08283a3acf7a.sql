-- Add explicit public denial policies for all sensitive tables
-- This provides defense-in-depth protection: even if RLS is disabled or misconfigured,
-- anonymous users cannot access sensitive data

-- 1. profiles - personal user data
CREATE POLICY "deny_anon_profiles" ON public.profiles FOR ALL TO anon USING (false);

-- 2. payment_methods - payment card details
CREATE POLICY "deny_anon_payment_methods" ON public.payment_methods FOR ALL TO anon USING (false);

-- 3. salon_bank_accounts - business banking details
CREATE POLICY "deny_anon_salon_bank_accounts" ON public.salon_bank_accounts FOR ALL TO anon USING (false);

-- 4. bookings - customer booking history
CREATE POLICY "deny_anon_bookings" ON public.bookings FOR ALL TO anon USING (false);

-- 5. payments - financial transactions
CREATE POLICY "deny_anon_payments" ON public.payments FOR ALL TO anon USING (false);

-- 6. wallets - customer wallet balances
CREATE POLICY "deny_anon_wallets" ON public.wallets FOR ALL TO anon USING (false);

-- 7. wallet_transactions - financial activity
CREATE POLICY "deny_anon_wallet_transactions" ON public.wallet_transactions FOR ALL TO anon USING (false);

-- 8. user_addresses - home addresses
CREATE POLICY "deny_anon_user_addresses" ON public.user_addresses FOR ALL TO anon USING (false);

-- 9. fcm_tokens - push notification tokens
CREATE POLICY "deny_anon_fcm_tokens" ON public.fcm_tokens FOR ALL TO anon USING (false);

-- 10. cancellation_penalties - penalty information
CREATE POLICY "deny_anon_cancellation_penalties" ON public.cancellation_penalties FOR ALL TO anon USING (false);

-- 11. support_tickets - customer complaints
CREATE POLICY "deny_anon_support_tickets" ON public.support_tickets FOR ALL TO anon USING (false);

-- 12. referrals - referral relationships
CREATE POLICY "deny_anon_referrals" ON public.referrals FOR ALL TO anon USING (false);

-- 13. conversations - private messaging metadata
CREATE POLICY "deny_anon_conversations" ON public.conversations FOR ALL TO anon USING (false);

-- 14. messages - private chat messages
CREATE POLICY "deny_anon_messages" ON public.messages FOR ALL TO anon USING (false);

-- 15. live_chat_sessions - support sessions
CREATE POLICY "deny_anon_live_chat_sessions" ON public.live_chat_sessions FOR ALL TO anon USING (false);

-- 16. live_chat_messages - support chat content
CREATE POLICY "deny_anon_live_chat_messages" ON public.live_chat_messages FOR ALL TO anon USING (false);

-- 17. reschedule_fees - reschedule payment data
CREATE POLICY "deny_anon_reschedule_fees" ON public.reschedule_fees FOR ALL TO anon USING (false);

-- Additional sensitive tables that should be protected
-- 18. user_roles - role assignments
CREATE POLICY "deny_anon_user_roles" ON public.user_roles FOR ALL TO anon USING (false);

-- 19. user_vouchers - personal vouchers
CREATE POLICY "deny_anon_user_vouchers" ON public.user_vouchers FOR ALL TO anon USING (false);

-- 20. notification_preferences - user preferences
CREATE POLICY "deny_anon_notification_preferences" ON public.notification_preferences FOR ALL TO anon USING (false);

-- 21. notifications - personal notifications
CREATE POLICY "deny_anon_notifications" ON public.notifications FOR ALL TO anon USING (false);

-- 22. favorite_salons - user favorites
CREATE POLICY "deny_anon_favorite_salons" ON public.favorite_salons FOR ALL TO anon USING (false);

-- 23. referral_codes - referral codes
CREATE POLICY "deny_anon_referral_codes" ON public.referral_codes FOR ALL TO anon USING (false);

-- 24. message_reactions - chat reactions
CREATE POLICY "deny_anon_message_reactions" ON public.message_reactions FOR ALL TO anon USING (false);

-- 25. email_otps - OTP codes
CREATE POLICY "deny_anon_email_otps" ON public.email_otps FOR ALL TO anon USING (false);

-- 26. phone_otps - OTP codes
CREATE POLICY "deny_anon_phone_otps" ON public.phone_otps FOR ALL TO anon USING (false);

-- 27. salon_payouts - payout data
CREATE POLICY "deny_anon_salon_payouts" ON public.salon_payouts FOR ALL TO anon USING (false);

-- 28. salon_penalty_remittances - penalty remittance data
CREATE POLICY "deny_anon_salon_penalty_remittances" ON public.salon_penalty_remittances FOR ALL TO anon USING (false);

-- 29. promo_code_usage - usage tracking
CREATE POLICY "deny_anon_promo_code_usage" ON public.promo_code_usage FOR ALL TO anon USING (false);

-- 30. refund_audit_log - refund audit trail
CREATE POLICY "deny_anon_refund_audit_log" ON public.refund_audit_log FOR ALL TO anon USING (false);

-- 31. settlements - settlement data
CREATE POLICY "deny_anon_settlements" ON public.settlements FOR ALL TO anon USING (false);

-- 32. webhook_logs - webhook audit data
CREATE POLICY "deny_anon_webhook_logs" ON public.webhook_logs FOR ALL TO anon USING (false);

-- 33. response_templates - support templates
CREATE POLICY "deny_anon_response_templates" ON public.response_templates FOR ALL TO anon USING (false);

-- 34. otp_rate_limits - rate limiting data
CREATE POLICY "deny_anon_otp_rate_limits" ON public.otp_rate_limits FOR ALL TO anon USING (false);

-- 35. test_phone_whitelist - test phone data
CREATE POLICY "deny_anon_test_phone_whitelist" ON public.test_phone_whitelist FOR ALL TO anon USING (false);

-- 36. test_phone_audit_log - audit data
CREATE POLICY "deny_anon_test_phone_audit_log" ON public.test_phone_audit_log FOR ALL TO anon USING (false);

-- 37. payout_schedule_settings - payout settings
CREATE POLICY "deny_anon_payout_schedule_settings" ON public.payout_schedule_settings FOR ALL TO anon USING (false);

-- 38. salon_owners - ownership data
CREATE POLICY "deny_anon_salon_owners" ON public.salon_owners FOR ALL TO anon USING (false);