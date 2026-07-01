# Phase 2: Wholesale Portal Architecture
## Enterprise B2B System Design

---

## EXECUTIVE SUMMARY

Himalayan Koh will operate two completely isolated customer systems:
- **SYSTEM A (Retail)**: B2C ecommerce at https://himalayankoh.com
- **SYSTEM B (Wholesale)**: B2B dealer portal at https://himalayankoh.com/wholesale

The two systems share:
- Product catalog and inventory (read-only from wholesale perspective)
- Orders database (role-separated views)
- Customer database (role-separated)

The systems remain isolated via:
- Separate authentication flows
- Role-based middleware
- Permission-gated routes
- Distinct pricing logic
- API segregation

---

## SYSTEM ARCHITECTURE

### SYSTEM A: Retail Store (Existing)
```
https://himalayankoh.com
├── Public pages (home, products, about, contact, gallery, blog)
├── Customer auth (signup, login, password reset)
├── Shopping (cart, checkout, payment)
├── Account (orders, profile, addresses, wishlist, notifications)
├── Orders (tracking, history, management)
└── Support (contact, blog, FAQ)
```

### SYSTEM B: Wholesale Portal (New)
```
https://himalayankoh.com/wholesale
├── Public pages (landing, about, why-wholesale)
├── Wholesaler auth (signup/registration, login, password reset)
├── Dealer dashboard (overview, metrics, quick stats)
├── Products (catalog, pricing, MOQs, wholesale-only)
├── Ordering (quick order, bulk import, saved lists)
├── Orders (history, invoices, status tracking)
├── Account (company profile, documents, credit terms)
├── Statements (purchases, credits, payments)
└── Support (tickets, docs, resources)
```

---

## DATABASE SCHEMA ADDITIONS

### New Tables

#### `wholesale_applications`
```sql
CREATE TABLE wholesale_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Business Info
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  
  -- Business Details
  business_type ENUM ('llc', 'corporation', 'sole_proprietor', 'individual'),
  reseller_permit_number TEXT,
  tax_id TEXT NOT NULL,
  business_website TEXT,
  years_in_business INT,
  estimated_monthly_purchase DECIMAL(10, 2),
  business_description TEXT,
  notes TEXT,
  
  -- Application Status
  status ENUM ('pending', 'approved', 'rejected', 'more_info_needed') DEFAULT 'pending',
  status_reason TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Admin
  dealer_level ENUM ('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
  credit_terms INT DEFAULT 0, -- days net
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  purchase_limit DECIMAL(12, 2),
  assigned_sales_rep_id UUID REFERENCES profiles(id),
  
  -- Dates
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(business_email)
);
```

#### `wholesale_documents`
```sql
CREATE TABLE wholesale_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES wholesale_applications(id),
  
  document_type ENUM ('reseller_permit', 'business_license', 'tax_certificate', 'supporting'),
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- /storage/wholesale-docs/{app_id}/{filename}
  file_size INT,
  mime_type TEXT,
  
  uploaded_at TIMESTAMP DEFAULT now(),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES profiles(id),
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  
  UNIQUE(application_id, document_type)
);
```

#### `wholesale_orders` (extends orders table)
```sql
-- Add to existing orders table:
ALTER TABLE orders ADD COLUMN (
  dealer_id UUID REFERENCES profiles(id),
  dealer_level ENUM ('bronze', 'silver', 'gold', 'platinum'),
  wholesale_pricing_applied BOOLEAN DEFAULT false,
  dealer_discount_percentage DECIMAL(5, 2),
  net_terms INT DEFAULT 0, -- payment terms in days
  purchase_order_number TEXT,
  is_wholesale BOOLEAN DEFAULT false
);
```

#### `wholesale_pricing`
```sql
CREATE TABLE wholesale_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  
  -- Pricing Levels
  retail_price DECIMAL(10, 2) NOT NULL,
  wholesale_price DECIMAL(10, 2) NOT NULL,
  distributor_price DECIMAL(10, 2),
  
  -- MOQ & Constraints
  min_order_qty INT DEFAULT 1,
  wholesale_only BOOLEAN DEFAULT false,
  retail_only BOOLEAN DEFAULT false,
  
  -- Dealer Discounts (tiered)
  bronze_discount DECIMAL(5, 2) DEFAULT 0,
  silver_discount DECIMAL(5, 2) DEFAULT 0,
  gold_discount DECIMAL(5, 2) DEFAULT 0,
  platinum_discount DECIMAL(5, 2) DEFAULT 0,
  
  -- Volume Pricing (future)
  volume_tiers JSONB, -- [{qty: 100, discount: 5}, {qty: 500, discount: 10}]
  
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `dealer_statements` (future)
```sql
CREATE TABLE dealer_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES profiles(id),
  
  statement_period_start DATE,
  statement_period_end DATE,
  
  total_purchases DECIMAL(12, 2),
  total_discounts DECIMAL(12, 2),
  total_paid DECIMAL(12, 2),
  balance_due DECIMAL(12, 2),
  
  generated_at TIMESTAMP DEFAULT now()
);
```

#### `dealer_credit_limits`
```sql
CREATE TABLE dealer_credit_limits (
  dealer_id UUID PRIMARY KEY REFERENCES profiles(id),
  
  credit_limit DECIMAL(12, 2),
  current_balance DECIMAL(12, 2),
  available_credit DECIMAL(12, 2),
  
  net_terms INT DEFAULT 30, -- days
  net_due_date DATE,
  
  last_payment_date DATE,
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `dealer_documents` (for storing company documents)
```sql
CREATE TABLE dealer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES profiles(id),
  
  document_type TEXT, -- 'w9', 'tax_exemption', 'contract', etc.
  original_filename TEXT,
  file_path TEXT,
  
  uploaded_at TIMESTAMP DEFAULT now()
);
```

### Schema Modifications

#### `profiles` table additions
```sql
ALTER TABLE profiles ADD COLUMN (
  role ENUM ('customer', 'admin', 'approved_wholesale', 'sales_rep', 'manager', 'super_admin'),
  
  -- Wholesale fields
  wholesale_company_name TEXT,
  wholesale_approved BOOLEAN DEFAULT false,
  wholesale_approval_date TIMESTAMP,
  dealer_level ENUM ('bronze', 'silver', 'gold', 'platinum'),
  assigned_sales_rep_id UUID REFERENCES profiles(id),
  
  -- Disable retail functions for wholesale users
  hide_from_retail BOOLEAN DEFAULT false
);
```

#### `products` table additions
```sql
ALTER TABLE products ADD COLUMN (
  wholesale_only BOOLEAN DEFAULT false,
  retail_only BOOLEAN DEFAULT false,
  wholesale_price DECIMAL(10, 2),
  min_order_qty_wholesale INT,
  
  -- Future tiered pricing
  pricing_tiers JSONB
);
```

---

## AUTHENTICATION FLOW

### Retail Authentication (Existing)
```
User → /login → Supabase Auth (email/password)
  ↓
  Check role in profiles.role
  ↓
  role = 'customer' → Load retail dashboard
  role = 'admin' → Redirect to /admin
```

### Wholesale Authentication (New)
```
Visitor → /wholesale
  ↓
  Unauthenticated → /wholesale/landing
  ↓
  Click "Apply" → /wholesale/register
  ↓
  Submit application → Application pending
  ↓
  (Admin reviews, approves/rejects)
  ↓
  Email notification to user
  ↓
  If approved → User can login at /wholesale/login
  ↓
  Sign in with email/password → Check:
    - profiles.wholesale_approved = true
    - profiles.role = 'approved_wholesale'
  ↓
  Load wholesale dashboard at /wholesale/dashboard
```

### Role-Based Access Control
```
guest (unauthenticated)
  ↓ can access public pages
  
retail_customer
  ↓ can access /products, /cart, /checkout, /account, /orders
  ↓ CANNOT access /wholesale routes
  
approved_wholesale
  ↓ can access /wholesale/* routes
  ↓ CANNOT see retail checkout or shopping cart
  ↓ can see wholesale pricing and apply discounts
  
sales_rep
  ↓ can access /admin/wholesale
  ↓ can manage assigned dealers
  ↓ can create orders on behalf of dealers
  
manager
  ↓ can access /admin/wholesale/*
  ↓ can view all dealer stats
  ↓ can approve/reject applications
  
admin / super_admin
  ↓ full access to all systems
```

---

## ROUTING STRUCTURE

### Wholesale Routes (New)
```
/wholesale
├── / (landing page, why-wholesale, pricing structure, how-it-works)
├── /register (application form)
├── /register/success (confirmation page)
├── /login (sign in)
├── /forgot-password (password reset)
├── /verify-email (email verification)
├── /dashboard (dealer dashboard, metrics, quick-links)
├── /products (wholesale product catalog, MOQs, pricing)
├── /products/[slug] (product detail with wholesale info)
├── /ordering
│   ├── / (quick order entry)
│   ├── /bulk-import (CSV upload)
│   ├── /saved-lists (saved orders)
│   └── /quotes (saved quotes - future)
├── /orders
│   ├── / (order history)
│   └── /[orderId] (order details, tracking, invoice)
├── /invoices (invoice history, download)
├── /statements (monthly statements, payment history - future)
├── /profile
│   ├── / (company info, edit)
│   ├── /documents (upload/manage business docs)
│   └── /credit (credit terms, payment history)
└── /support
    ├── /contact (support contact form)
    ├── /tickets (support ticket history)
    └── /resources (docs, guides, FAQs)
```

### Admin Wholesale Routes (New)
```
/admin/wholesale
├── /applications
│   ├── / (pending applications list)
│   └── /[appId] (review, approve, reject, request more info)
├── /dealers
│   ├── / (all approved dealers)
│   ├── /[dealerId]
│   │   ├── / (dealer profile)
│   │   ├── /orders (dealer order history)
│   │   ├── /documents (uploaded documents)
│   │   ├── /credit (credit limits, payment terms)
│   │   └── /audit (activity log)
│   └── /levels (manage dealer levels and discounts)
├── /pricing
│   ├── / (manage wholesale pricing)
│   ├── /tiers (volume discounts)
│   └── /products (product-level wholesale config)
├── /sales-reps
│   ├── / (manage sales representatives)
│   └── /[repId] (assign dealers, view metrics)
└── /settings
    ├── /dealer-levels (bronze/silver/gold/platinum config)
    └── /approval-workflow (email templates, notifications)
```

---

## PERMISSION MODEL & MIDDLEWARE

### Middleware Flow
```
Request → Check Auth
  ↓
  No auth? → Route to public pages only
  ↓
  Has auth? → Check profiles.wholesale_approved
  ↓
  If accessing /wholesale/* and NOT approved?
    → Redirect to /wholesale/register or /login
  ↓
  If accessing /products (retail) and wholesale=true
    → Filter based on wholesale_only flag
  ↓
  Allow access
```

### Route Protection Middleware
```typescript
// Pseudo-code structure

function requireWholesale(req, res, next) {
  const user = getUser(req);
  const profile = getProfile(user.id);
  
  if (!profile.wholesale_approved) {
    return redirect('/wholesale/register');
  }
  
  if (profile.role !== 'approved_wholesale' && !isAdmin(profile)) {
    return forbidden('Not authorized for wholesale');
  }
  
  next();
}

function separateWholesalePricing(req, res, next) {
  const user = getUser(req);
  const isWholesale = user && user.wholesale_approved;
  
  // API calls will filter pricing based on this flag
  req.pricing = isWholesale ? 'wholesale' : 'retail';
  
  next();
}

function preventRetailAccess(req, res, next) {
  const user = getUser(req);
  
  if (user.wholesale_approved) {
    // Block access to /cart, /checkout, /wishlist
    return forbidden('Wholesale users use dealer ordering');
  }
  
  next();
}
```

---

## PRICING MODEL

### Pricing Tiers
```
Product Level:
├── Retail Price (public, B2C)
├── Wholesale Price (base B2B price)
├── Distributor Price (future, highest volume)
└── Volume Tiers (future, % off at qty thresholds)

Dealer Level Multipliers:
├── Bronze: base wholesale price
├── Silver: -5% off wholesale
├── Gold: -10% off wholesale
└── Platinum: -15% off wholesale (custom terms possible)

Applied As:
├── Final Price = Base Wholesale × (1 - Dealer Discount%) × (1 - Volume Discount%)
└── MOQ enforcement at product + dealer level
```

### Pricing API
```
GET /api/wholesale/products?filter=pricing
  Response includes:
  {
    id, name, image,
    retail_price: 29.99,
    wholesale_price: 18.00,
    min_order_qty: 10,
    dealer_discount: 10%, // based on user's dealer level
    final_price: 16.20,
    volume_tiers: [
      { qty: 100, discount: 3% },
      { qty: 500, discount: 7% }
    ]
  }
```

---

## ADMIN WORKFLOW

### Application Review Workflow
```
Step 1: Notification
  Dealer submits application
  → Email sent to admin: "New wholesale application pending"
  → Dashboard notification: Red badge on /admin/wholesale/applications

Step 2: Review
  Admin clicks application card
  → Review screen shows:
    - All submitted info
    - Uploaded documents (with download)
    - Business details verification
    - Payment terms to be set

Step 3: Approval/Rejection
  Option A: Approve
    → Set dealer level (bronze/silver/gold/platinum)
    → Set credit limit
    → Set net payment terms (0, 15, 30, 60 days)
    → Optionally assign sales rep
    → Click "Approve"
    → Email sent: "Your wholesale account is approved"
    → User can now login and start ordering

  Option B: Reject
    → Enter rejection reason
    → Click "Reject"
    → Email sent: "Unfortunately your application was not approved"

  Option C: Request More Info
    → Enter specific document/info needed
    → Click "Request More Info"
    → Email sent with request
    → Dealer uploads new docs
    → Application status: "more_info_needed"
    → Returns to admin for re-review

Step 4: Management
  After approval, admin can:
    - View dealer's order history
    - Manage credit limits and payment terms
    - Change dealer level (affects pricing)
    - Assign or reassign sales rep
    - Suspend account if needed
    - View audit log of all actions
```

### Admin Dashboards
```
/admin/wholesale/applications
├── Filters: status (pending, approved, rejected, more_info)
├── Sort: date, company_name, status
├── Bulk actions: approve multiple, request info, etc.
└── Search: company name, email, owner

/admin/wholesale/dealers
├── List: all approved dealers
├── Columns: company, owner, dealer_level, credit_limit, total_orders, last_order
├── Actions: view details, edit, suspend, view orders
└── Export: CSV of dealer list

/admin/wholesale/pricing
├── Edit wholesale prices by product
├── Set MOQs
├── Define volume discounts
├── View current dealer multipliers
└── Publish pricing changes

/admin/wholesale/sales-reps
├── List sales reps
├── Assign dealers to reps
├── View rep's dealer metrics
└── Export rep performance data
```

---

## API DESIGN

### Authentication Endpoints
```
POST /api/auth/wholesale/register
  Body: { business_name, owner_name, email, phone, ... }
  Response: { application_id, status: 'pending' }

POST /api/auth/wholesale/login
  Body: { email, password }
  Response: { user, session, token, dealer_level }

POST /api/auth/wholesale/logout
  Response: { status: 'success' }

POST /api/auth/wholesale/forgot-password
  Body: { email }
  Response: { status: 'success' }

POST /api/auth/wholesale/reset-password
  Body: { token, password }
  Response: { status: 'success' }
```

### Wholesale Products API
```
GET /api/wholesale/products
  Query: {
    category?, 
    search?, 
    page?, 
    limit?
  }
  Response: [
    {
      id, name, image,
      retail_price,
      wholesale_price,
      dealer_discount_percentage,
      final_price_after_discount,
      min_order_qty,
      volume_tiers,
      wholesale_only,
      stock_available
    }
  ]

GET /api/wholesale/products/[id]
  Response: { full product details + wholesale pricing + dealer level pricing }
```

### Ordering API
```
POST /api/wholesale/orders
  Body: {
    items: [
      { product_id, qty, grain_size }
    ],
    shipping_method,
    purchase_order_number?,
    notes?
  }
  Response: { order_id, total, estimated_delivery, next_steps }

POST /api/wholesale/orders/bulk-import
  Body: FormData { file: CSV }
  Response: { 
    status: 'imported',
    order_id,
    line_item_count,
    total,
    warnings?: []
  }

GET /api/wholesale/orders
  Response: [
    {
      id, number, date, status,
      items_count, total,
      tracking, invoice_available
    }
  ]

GET /api/wholesale/orders/[id]
  Response: { full order details with tracking and invoice }
```

### Admin API
```
GET /api/admin/wholesale/applications
  Query: { status?, page?, limit? }
  Response: [{ app details, docs, notes }]

POST /api/admin/wholesale/applications/[appId]/approve
  Body: {
    dealer_level,
    credit_limit,
    net_terms,
    sales_rep_id?,
    notes?
  }
  Response: { status: 'approved', email_sent: true }

POST /api/admin/wholesale/applications/[appId]/reject
  Body: { reason }
  Response: { status: 'rejected', email_sent: true }

POST /api/admin/wholesale/applications/[appId]/request-more-info
  Body: { required_documents, message }
  Response: { status: 'more_info_needed', email_sent: true }

PUT /api/admin/wholesale/dealers/[dealerId]
  Body: { dealer_level?, credit_limit?, net_terms?, sales_rep_id? }
  Response: { updated dealer profile }

PUT /api/admin/wholesale/pricing/[productId]
  Body: {
    wholesale_price,
    min_order_qty,
    volume_tiers
  }
  Response: { updated pricing }
```

---

## SECURITY MODEL

### Data Isolation
```
Retail Users:
  ├── Can view retail prices only
  ├── Can access cart/checkout
  ├── CANNOT see wholesale routes
  └── CANNOT see wholesale pricing

Wholesale Users:
  ├── Can view wholesale prices only
  ├── Can access dealer ordering
  ├── CANNOT see retail cart
  ├── CANNOT see /checkout for retail
  └── CAN see other dealers' PUBLIC info (future)

Admin:
  ├── Can see BOTH pricing systems
  ├── Can switch between retail/wholesale views
  ├── Can manage both customer types
  └── Has audit log access
```

### RLS (Row-Level Security) Policies
```sql
-- Wholesale Applications: Only admin can read all, users can read own
CREATE POLICY "admins_read_all_applications"
  ON wholesale_applications
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );

CREATE POLICY "users_read_own_application"
  ON wholesale_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Wholesale Orders: Only dealers can access own orders, admin/sales_rep can access assigned
CREATE POLICY "dealer_read_own_orders"
  ON orders
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND is_wholesale = true)
    OR
    (auth.uid() IN (SELECT assigned_sales_rep_id FROM profiles WHERE id = auth.uid()))
  );

-- Products: Wholesale products hidden from retail users
CREATE POLICY "retail_users_see_retail_products"
  ON products
  FOR SELECT TO authenticated
  USING (
    (retail_only = true OR (retail_only = false AND wholesale_only = false))
    OR
    (auth.uid() IN (SELECT id FROM profiles WHERE wholesale_approved = true))
  );
```

### Document Security
```
Wholesale Documents:
├── Stored in /storage/wholesale-docs/{app_id}/
├── Only accessible by:
  ├── Application owner
  ├── Admin staff
  └── Assigned sales rep
├── Download audit logged
├── Deletion protected for 7 years (compliance)

Sensitive Fields (Encrypted):
├── Tax ID
├── Reseller Permit Number
├── Credit card info (future)
└── Payment transactions
```

---

## FOLDER STRUCTURE

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── wholesale/ (new)
│   │   │       ├── login.ts
│   │   │       ├── register.ts
│   │   │       ├── logout.ts
│   │   │       └── password-reset.ts
│   │   ├── wholesale/ (new)
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── orders/track.ts
│   │   │   ├── pricing.ts
│   │   │   ├── profile.ts
│   │   │   └── documents.ts
│   │   ├── admin/
│   │   │   └── wholesale/ (new)
│   │   │       ├── applications.ts
│   │   │       ├── dealers.ts
│   │   │       ├── pricing.ts
│   │   │       └── sales-reps.ts
│   │   └── ...existing routes...
│   └── ...existing routes...
│
├── views/
│   ├── wholesale/ (new)
│   │   ├── WholesaleLanding.tsx
│   │   ├── WholesaleRegister.tsx
│   │   ├── WholesaleLogin.tsx
│   │   ├── WholesaleDashboard.tsx
│   │   ├── WholesaleProducts.tsx
│   │   ├── WholesaleOrdering.tsx
│   │   ├── WholesaleOrderDetail.tsx
│   │   ├── WholesaleInvoices.tsx
│   │   ├── WholesaleStatements.tsx
│   │   ├── WholesaleProfile.tsx
│   │   ├── WholesaleSupport.tsx
│   │   └── ...other pages...
│   ├── admin/wholesale/ (new)
│   │   ├── AdminWholesaleApplications.tsx
│   │   ├── AdminWholesaleApplicationDetail.tsx
│   │   ├── AdminWholesaleDealers.tsx
│   │   ├── AdminWholesalePricing.tsx
│   │   ├── AdminSalesReps.tsx
│   │   └── ...other admin pages...
│   └── ...existing views...
│
├── components/
│   ├── wholesale/ (new)
│   │   ├── WholesaleNav.tsx
│   │   ├── WholesaleHeader.tsx
│   │   ├── DealerDashboardCard.tsx
│   │   ├── QuickOrderForm.tsx
│   │   ├── BulkImportWidget.tsx
│   │   ├── OrderSummary.tsx
│   │   ├── WholesalePricingDisplay.tsx
│   │   ├── DealerBadge.tsx
│   │   └── ...other components...
│   ├── admin/
│   │   └── wholesale/ (new)
│   │       ├── ApplicationReviewCard.tsx
│   │       ├── ApplicationApprovalModal.tsx
│   │       ├── DealerManagementPanel.tsx
│   │       ├── PricingEditor.tsx
│   │       └── ...other admin components...
│   └── ...existing components...
│
├── context/
│   ├── WholesaleContext.tsx (new)
│   ├── AuthContext.tsx (updated for dual system)
│   └── ...existing contexts...
│
├── lib/
│   ├── wholesale/ (new)
│   │   ├── pricing.ts (calculate wholesale pricing)
│   │   ├── validation.ts (application form validation)
│   │   ├── permissions.ts (role & permission checks)
│   │   ├── api.ts (wholesale API client)
│   │   └── constants.ts (dealer levels, terms, etc.)
│   ├── auth/
│   │   ├── wholesale.ts (new - wholesale auth logic)
│   │   └── ...existing auth...
│   ├── supabase/
│   │   ├── api.ts (updated with wholesale endpoints)
│   │   └── ...existing...
│   └── ...existing lib...
│
├── hooks/
│   ├── useWholesaleAuth.ts (new)
│   ├── useWholesaleUser.ts (new)
│   ├── useWholesalePricing.ts (new)
│   ├── useDealerLevel.ts (new)
│   └── ...existing hooks...
│
├── store/
│   ├── wholesaleOrderStore.ts (new - bulk order builder)
│   └── ...existing stores...
│
├── types/
│   ├── wholesale.ts (new - all wholesale types)
│   └── ...existing types...
│
├── middleware/
│   ├── wholesaleAuth.ts (new)
│   ├── pricingFilter.ts (new - retail vs wholesale)
│   └── ...existing middleware...
│
└── ...existing structure...

supabase/
├── migrations/
│   ├── 015_wholesale_applications.sql (new)
│   ├── 016_wholesale_documents.sql (new)
│   ├── 017_wholesale_pricing.sql (new)
│   ├── 018_wholesale_orders_extensions.sql (new)
│   ├── 019_dealer_credit_limits.sql (new)
│   └── ...other migrations...
│
└── ...existing...

docs/
├── PHASE2_WHOLESALE_ARCHITECTURE.md (this file)
├── WHOLESALE_ADMIN_GUIDE.md (implementation guide)
├── WHOLESALE_API_DOCS.md (detailed API reference)
└── ...existing docs...
```

---

## DEVELOPMENT ROADMAP

### Phase 2a: Core Infrastructure (Weeks 1-2)
```
Database:
  ✓ Create wholesale tables (applications, documents, pricing, extensions)
  ✓ Add RLS policies
  ✓ Add migrations

Auth System:
  ✓ Implement wholesale authentication endpoints
  ✓ Create wholesale registration flow
  ✓ Create wholesale login flow
  ✓ Implement role-based middleware
  ✓ Separate retail/wholesale auth contexts

Pricing System:
  ✓ Implement wholesale price calculation logic
  ✓ Create pricing API endpoints
  ✓ Implement dealer level discounts
  ✓ Add RLS to filter retail vs wholesale pricing
```

### Phase 2b: Wholesale Portal MVP (Weeks 3-4)
```
Frontend:
  ✓ Create /wholesale landing page
  ✓ Create /wholesale/register form
  ✓ Create /wholesale/login page
  ✓ Create /wholesale/dashboard
  ✓ Create /wholesale/products (catalog with wholesale pricing)
  ✓ Create /wholesale/ordering (quick order form)
  ✓ Create /wholesale/orders (order history)
  ✓ Create /wholesale/profile (company info)

Navigation:
  ✓ Create wholesale-specific header/nav
  ✓ Implement route guards
  ✓ Block retail users from wholesale routes
  ✓ Block wholesale users from retail checkout
```

### Phase 2c: Admin Dashboard (Weeks 5-6)
```
Admin Routes:
  ✓ Create /admin/wholesale/applications
  ✓ Create /admin/wholesale/dealers
  ✓ Create /admin/wholesale/pricing
  ✓ Create /admin/wholesale/sales-reps

Admin Features:
  ✓ Application approval/rejection workflow
  ✓ Dealer management (edit, suspend, level management)
  ✓ Pricing management (wholesale prices, MOQs, volume discounts)
  ✓ Sales rep assignment
  ✓ Audit logging
  ✓ Email notifications (approval, rejection, new applications)
```

### Phase 2d: Advanced Features (Weeks 7-8)
```
Ordering:
  ✓ Bulk CSV import
  ✓ Saved order lists
  ✓ Quick reorder from history
  ✓ Quotes (future - save as draft, email to admin)

Dealer Management:
  ✓ Credit limits and payment terms
  ✓ Purchase history and statements
  ✓ Document uploads (business licenses, tax certs)
  ✓ Payment tracking (future - integrate payment gateway)

Analytics:
  ✓ Dealer dashboard metrics (total orders, volume, last order)
  ✓ Admin dashboards (total dealers, pending apps, revenue by dealer)
  ✓ Sales rep dashboards (assigned dealer metrics)
  ✓ Export reports (CSV, PDF)
```

### Phase 2e: Polish & Testing (Week 9)
```
Testing:
  ✓ End-to-end testing (application → approval → ordering)
  ✓ Permission testing (route guards, data isolation)
  ✓ Pricing accuracy testing (discounts, volume tiers)
  ✓ Email notification testing
  ✓ Security testing (XSS, SQL injection, auth bypass)

Documentation:
  ✓ Admin guide (how to approve applications, manage dealers)
  ✓ API documentation (for future integrations)
  ✓ Troubleshooting guide
  ✓ FAQ

Deployment:
  ✓ Staging environment testing
  ✓ Production migration
  ✓ Dealer communication (system launch email)
  ✓ Monitoring setup
```

---

## ESTIMATED IMPLEMENTATION PHASES

### Timeline Estimate
```
Total Duration: 9 weeks (2+ months)

Phase 2a: Weeks 1-2 (40 hours)
  - Database design and migrations
  - Authentication endpoints
  - Middleware and role system
  - Pricing calculation engine

Phase 2b: Weeks 3-4 (50 hours)
  - Wholesale portal UI/UX
  - Product catalog display
  - Ordering interface
  - Responsive design

Phase 2c: Weeks 5-6 (45 hours)
  - Admin dashboard implementation
  - Application workflow
  - Dealer management
  - Reporting features

Phase 2d: Weeks 7-8 (40 hours)
  - Advanced features (CSV import, quotes, statements)
  - Analytics and insights
  - Integrations (payment, shipping)

Phase 2e: Week 9 (35 hours)
  - Testing and QA
  - Documentation
  - Deployment and launch

Total: ~210 hours (5-6 developer weeks at 40 hours/week)
```

---

## RISKS & MITIGATION

### Technical Risks
```
RISK: Data isolation failure - retail customer sees wholesale pricing
  IMPACT: High - breaks core business model
  MITIGATION:
    - Implement strict RLS policies
    - Unit tests for pricing logic
    - Audit logging for all pricing queries
    - Admin can view pricing discrepancies

RISK: Authentication bypass - unauthorized wholesale access
  IMPACT: Critical - security breach
  MITIGATION:
    - Middleware on every wholesale route
    - JWT token validation
    - Session timeout (30 min)
    - Audit log all auth attempts

RISK: Concurrent order processing - double-charge dealer
  IMPACT: High - financial loss
  MITIGATION:
    - Database transaction locks
    - Idempotent API endpoints
    - Duplicate order detection
    - Payment reconciliation audit trail

RISK: File upload vulnerabilities - malicious documents uploaded
  IMPACT: Medium - security/compliance
  MITIGATION:
    - File type validation (PDF, PNG, JPG only)
    - File size limits (5MB max)
    - Virus scanning (future)
    - Quarantine suspicious files for admin review
```

### Business Risks
```
RISK: Low dealer adoption
  MITIGATION:
    - Onboarding support calls
    - Video tutorials
    - Dedicated support team
    - Competitive pricing tiers

RISK: Admin approval bottleneck
  MITIGATION:
    - Clear approval criteria
    - Auto-approve for verified businesses
    - Sales rep delegation
    - SLA: approve within 24 hours

RISK: Pricing model confusion
  MITIGATION:
    - Clear documentation
    - Admin training
    - Support tickets for pricing questions
    - Comparison tool (retail vs wholesale)

RISK: Sales rep conflicts (multiple reps, overlapping territories)
  MITIGATION:
    - Territory/region configuration
    - Sales rep hierarchy
    - Conflict resolution process
    - Quota tracking
```

### Compliance Risks
```
RISK: Tax compliance - sales tax not collected correctly
  MITIGATION:
    - Tax calculation library
    - State-by-state rules
    - Admin override capability
    - Monthly audit report

RISK: Data privacy - PII not protected
  MITIGATION:
    - GDPR compliance (if selling to EU)
    - Data encryption at rest
    - PCI compliance for payments
    - Regular security audits
    - Data deletion on request

RISK: Document retention - lose proof of application
  MITIGATION:
    - Permanent document storage
    - Immutable audit log
    - Backup to cloud storage
    - 7-year retention policy
```

---

## FUTURE SCALABILITY RECOMMENDATIONS

### Short Term (3-6 months)
```
Multi-Currency Support:
  - Support CAD, GBP, EUR currencies
  - Exchange rate management
  - Regional pricing tiers

Advanced Inventory Visibility:
  - Real-time stock visibility for dealers
  - Backorder management
  - Allocation system for limited stock
  - Forecast demand

Quotes System:
  - Create, save, email quotes
  - Quote expiration
  - Quote-to-order conversion
  - Sales rep quote templates
```

### Medium Term (6-12 months)
```
Payment Terms & Credit:
  - Net-15, Net-30, Net-60 payment terms
  - Automated payment reminders
  - Credit line management
  - Late payment penalties
  - Credit card on file

Custom Pricing & Discounts:
  - Dealer-specific pricing overrides
  - Campaign pricing (seasonal)
  - Loyalty rebates
  - Volume cumulative (year-to-date)
  - Promotional codes

Customer Service Portal:
  - Ticket system for dealers
  - Knowledge base for FAQs
  - Live chat support
  - Video training library
  - Webinar registration
```

### Long Term (12+ months)
```
B2B Marketplace Features:
  - Inter-dealer marketplace (secondary sales)
  - Dealer referral program
  - Co-selling opportunities

EDI Integration:
  - EDI 850 (purchase orders)
  - EDI 856 (shipping notification)
  - EDI 810 (invoices)
  - Integration with dealer's ERP systems

API & Webhooks:
  - REST API for custom integrations
  - Webhooks for order events
  - Zapier/IFTTT integrations
  - Open API for third-party apps

Advanced Analytics:
  - Predictive analytics (demand forecasting)
  - Dealer profitability analysis
  - Market insights and trends
  - Benchmarking against peer dealers
  - Mobile app for on-the-go ordering
```

---

## DEPLOYMENT CHECKLIST

Before going live, verify:

### Database
- [ ] All migrations run successfully
- [ ] RLS policies tested and working
- [ ] Backups configured and tested
- [ ] Performance: queries < 200ms average

### Authentication
- [ ] Login flows tested (both retail and wholesale)
- [ ] Password reset working
- [ ] Email verification functional
- [ ] JWT tokens validated on every protected route
- [ ] Session timeouts configured

### Security
- [ ] XSS protection enabled (Content-Security-Policy)
- [ ] CSRF tokens on forms
- [ ] HTTPS enforced
- [ ] Secrets not in code (use Vercel secrets)
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection tests passed

### Performance
- [ ] Pricing API response < 100ms
- [ ] Product catalog loads < 1s
- [ ] Admin dashboard loads < 2s
- [ ] Image optimization (lazy loading, WebP)
- [ ] Database query indexes created

### Email
- [ ] Application approval email tested
- [ ] Rejection email tested
- [ ] Welcome email tested
- [ ] Support request email tested
- [ ] Email templates branded correctly

### Documentation
- [ ] Admin guide complete
- [ ] API docs complete
- [ ] FAQ written
- [ ] Troubleshooting guide written
- [ ] Support team trained

### Monitoring
- [ ] Error tracking (Sentry) set up
- [ ] Logging configured
- [ ] Dashboard alerts configured
- [ ] Performance monitoring (PageSpeed Insights)
- [ ] Uptime monitoring configured

---

## CONCLUSION

This wholesale portal architecture provides:
- ✓ Complete data isolation between retail and wholesale
- ✓ Role-based access control for multiple user types
- ✓ Flexible pricing and discount management
- ✓ Scalable admin workflow for dealer management
- ✓ Professional B2B experience
- ✓ Compliance and security by design

Implementation can proceed in phases, with MVP achievable in 4 weeks, and full feature set in 9 weeks.

---

**Document Status**: Architecture Design Complete
**Last Updated**: 2026-07-01
**Next Step**: Awaiting approval to proceed with Phase 2 implementation
