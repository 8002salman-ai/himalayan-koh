-- ============================================================================
-- One-time fix: rebrand demo DB rows "Dealer" -> "Wholesale/Wholesaler"
-- Run this in the Supabase SQL editor (production project).
-- Only touches DISPLAY TEXT in demo rows. No schema/columns/keys are changed.
-- Safe to run more than once (idempotent).
-- ============================================================================

-- 1) Demo profile display name (person -> Wholesaler)
update profiles
set full_name = 'Demo Gold Wholesaler'
where full_name = 'Demo Gold Dealer';

-- 2) Demo business name (program/company -> Wholesale)
--    business_name lives on dealer_applications (profiles has no such column).
update dealer_applications
set business_name = 'Himalayan Koh Demo Wholesale LLC'
where business_name = 'Himalayan Koh Demo Dealer LLC';

-- 3) Demo dashboard notifications (copy)
update notifications
set title = 'Welcome to your Wholesale Portal',
    message = 'Your Gold wholesale account is approved and ready — browse wholesale pricing and place your first order.'
where title = 'Welcome to your Dealer Portal';

update notifications
set message = 'Order 50+ units this month to qualify for the next wholesale tier.'
where title = 'Wholesale Promotion'
  and message = 'Order 50+ units this month to qualify for the next dealer tier.';

-- 4) Demo application notes (admin-visible)
update dealer_applications
set notes = replace(notes, 'Not a real dealer application;', 'Not a real wholesale application;')
where notes like '%Not a real dealer application;%';
