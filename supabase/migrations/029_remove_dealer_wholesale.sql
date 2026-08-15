-- =============================================
-- REMOVE DEALER / WHOLESALE (B2B) PROGRAM
-- =============================================
-- Retail-only storefront. Drops every object that was created by the
-- removed 015/016/017/018/019/021 migrations (dealer_applications,
-- wholesale_purchase_requests, products.dealer_* columns, etc.).
--
-- Every statement is guarded with IF EXISTS so this is also safe on a
-- fresh database that never had the B2B program at all.

-- Triggers that reference dealer/wholesale functions
drop trigger if exists cart_items_dealer_isolation on public.cart_items;
drop trigger if exists trg_crm_lead_from_dealer_application on public.dealer_applications;

-- Products policies that reference dealer_only / is_approved_dealer
drop policy if exists "Anyone can view active non-dealer-only products" on public.products;
drop policy if exists "Admins and approved dealers can view dealer-only products" on public.products;

-- Orders FK back to wholesale purchase requests
alter table public.orders drop constraint if exists orders_source_purchase_request_id_fkey;
alter table public.orders drop column if exists source_purchase_request_id;

-- CRM leads FK + column back to dealer applications
alter table public.crm_leads drop constraint if exists crm_leads_dealer_application_id_fkey;
alter table public.crm_leads drop column if exists dealer_application_id;

-- Dealer / wholesale tables (children first, then parents)
drop table if exists public.wholesale_purchase_request_invoices;
drop table if exists public.wholesale_purchase_request_messages;
drop table if exists public.wholesale_purchase_request_emails;
drop table if exists public.wholesale_purchase_request_audit;
drop table if exists public.wholesale_purchase_request_notes;
drop table if exists public.wholesale_purchase_request_items;
drop table if exists public.wholesale_purchase_requests;
drop table if exists public.dealer_emails;
drop table if exists public.dealer_audit_log;
drop table if exists public.dealer_notes;
drop table if exists public.dealer_documents;
drop table if exists public.dealer_applications;

-- Dealer / wholesale functions
drop function if exists public.is_approved_dealer();
drop function if exists public.enforce_cart_item_dealer_isolation();
drop function if exists public.convert_wholesale_purchase_request(p_request_id uuid, p_admin_id uuid);
drop function if exists public.generate_wholesale_request_number();
drop function if exists public.generate_wholesale_invoice_number();
drop function if exists public.crm_lead_from_dealer_application();

-- Products columns from the dealer program
alter table public.products drop column if exists dealer_price;
alter table public.products drop column if exists distributor_price;
alter table public.products drop column if exists moq;
alter table public.products drop column if exists dealer_only;
alter table public.products drop column if exists retail_only;

-- CRM leads that came from dealer applications (demo seed data)
delete from public.crm_leads where source = 'dealer_application';
