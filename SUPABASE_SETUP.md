# Supabase Backend Setup Guide

## Deployment

For Vercel environment variables, build settings, smoke tests, and monitoring, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Verify order isolation (RLS) after seeding:

```bash
npm run verify:rls
```

---

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

`SUPABASE_SERVICE_ROLE_KEY` is server-side only and is required for privileged seed scripts. Never expose it in client code or commit real values.

### 3. Initialize Database (recommended)

With `.env` configured (including `SUPABASE_DB_URL`), run one command:

```bash
npm run setup:supabase
```

This applies all migrations in order, seeds demo products/categories/blog data, and creates demo auth accounts.

Manual alternative: run these SQL files in the Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_row_level_security.sql`
3. `supabase/migrations/003_storage_buckets.sql`
4. `supabase/migrations/004_auth_profile_roles.sql`
5. `supabase/seed.sql`

### 4. Seed Demo Authentication Accounts

Included in `npm run setup:supabase`. To run auth seeding only:

```bash
npm run seed:demo-accounts
```

This idempotently creates or updates:

- Admin: `admin@himalayankoh.com` / `Admin123!`
- Customer: `customer@himalayankoh.com` / `Customer123!`

The script also upserts matching `profiles` rows and verifies both accounts can sign in with the existing Supabase auth flow and expected role.

---

## 📊 Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (linked to auth.users) |
| `categories` | Product categories |
| `products` | Product catalog |
| `inventory` | Stock levels per product |
| `addresses` | User shipping/billing addresses |
| `carts` | Shopping carts |
| `cart_items` | Items in carts |
| `wishlists` | User wishlists |
| `orders` | Customer orders |
| `order_items` | Items in orders |
| `blog_posts` | Blog articles |
| `reviews` | Product reviews |
| `notifications` | User notifications |

### Enums

- `user_role`: `customer` | `admin`
- `order_status`: `pending` | `confirmed` | `processing` | `shipped` | `delivered` | `cancelled` | `refunded`
- `payment_status`: `pending` | `paid` | `failed` | `refunded`
- `notification_type`: `order` | `promotion` | `system` | `reminder`

---

## 🔐 Row Level Security

All tables have RLS enabled with these policies:

### Public Access (No Auth Required)
- View active categories
- View active products
- View inventory (stock status)
- View published blog posts
- View approved reviews

### Authenticated Users
- View/update own profile
- Manage own addresses
- Manage own cart
- Manage own wishlist
- View own orders
- Create orders
- Create/update/delete own reviews
- View own notifications

### Admin Only
- Full CRUD on all tables
- Manage inventory
- Approve reviews
- Create notifications

---

## 📦 Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `products` | Product images | ✅ |
| `avatars` | User profile pictures | ✅ |
| `blog` | Blog post images | ✅ |
| `categories` | Category images | ✅ |

---

## 🛠 API Services

### Authentication (`authApi`)
```typescript
import { authApi } from './lib/supabase/api';

// Sign up
await authApi.signUp({ email, password, fullName });

// Sign in
await authApi.signIn({ email, password });

// Sign out
await authApi.signOut();

// Get/update profile
await authApi.getProfile(userId);
await authApi.updateProfile(userId, { full_name: 'New Name' });
```

### Products (`productsApi`)
```typescript
import { productsApi } from './lib/supabase/api';

// Get products with filters
const { products, count } = await productsApi.getProducts({
  categorySlug: 'edible-cooking-salt',
  search: 'pink',
  minPrice: 10,
  maxPrice: 100,
  sortBy: 'price_asc',
  limit: 12,
  offset: 0,
});

// Get single product
const product = await productsApi.getProductBySlug('himalayan-pink-salt');

// Get featured products
const featured = await productsApi.getFeaturedProducts(6);

// Get categories
const categories = await productsApi.getCategories();
```

### Cart (`cartApi`)
```typescript
import { cartApi } from './lib/supabase/api';

// Get cart with items
const cart = await cartApi.getCartWithItems(userId);

// Add to cart
await cartApi.addToCart(productId, quantity, unitPrice, grainSize, userId);

// Update quantity
await cartApi.updateCartItemQuantity(itemId, newQuantity);

// Remove item
await cartApi.removeFromCart(itemId);

// Clear cart
await cartApi.clearCart(userId);
```

### Orders (`ordersApi`)
```typescript
import { ordersApi } from './lib/supabase/api';

// Create order from cart
const order = await ordersApi.createOrder({
  email: 'customer@example.com',
  phone: '123-456-7890',
  shippingAddress: {
    fullName: 'John Doe',
    addressLine1: '123 Main St',
    city: 'Houston',
    state: 'TX',
    postalCode: '77001',
    country: 'USA',
  },
}, userId);

// Get user orders
const { orders, count } = await ordersApi.getUserOrders(userId, {
  status: 'delivered',
  limit: 10,
});

// Cancel order
await ordersApi.cancelOrder(orderId, userId);
```

### Wishlist (`wishlistApi`)
```typescript
import { wishlistApi } from './lib/supabase/api';

// Get wishlist
const wishlist = await wishlistApi.getWishlist(userId);

// Toggle wishlist
const isNowInWishlist = await wishlistApi.toggleWishlist(userId, productId);
```

### Blog (`blogApi`)
```typescript
import { blogApi } from './lib/supabase/api';

// Get posts
const { posts, count } = await blogApi.getPosts({
  category: 'Livestock Health',
  limit: 10,
});

// Get single post
const post = await blogApi.getPostBySlug('why-dairy-cows-need-trace-minerals');
```

---

## 🪝 React Hooks

```typescript
// Authentication
const { user, profile, isAuthenticated, signIn, signUp, signOut } = useAuth();

// Products
const { products, loading, error } = useProducts({ search: 'salt' });
const { product, loading } = useProduct('product-slug');
const { categories } = useCategories();

// Cart (Supabase)
const { items, totalItems, totalPrice, addToCart, removeItem } = useSupabaseCart();

// Blog
const { posts, loading } = useBlogPosts({ category: 'Guides' });
const { post } = useBlogPost('post-slug');
```

---

## 🔄 Realtime Subscriptions

```typescript
import { notificationsApi } from './lib/supabase/api';

// Subscribe to new notifications
const unsubscribe = notificationsApi.subscribeToNotifications(userId, (notification) => {
  console.log('New notification:', notification);
});

// Cleanup
unsubscribe();
```

---

## 📝 TypeScript Types

All database types are auto-generated in `src/lib/supabase/database.types.ts`:

```typescript
import type { 
  Product, 
  Category, 
  Order, 
  Profile,
  ProductWithCategory,
  OrderWithItems,
} from './lib/supabase/database.types';
```

---

## 🎯 Fallback Mode

The app works without Supabase configuration using local mock data. This is useful for:
- Development without a database
- Demo deployments
- Testing frontend changes

To enable fallback mode, simply don't set the environment variables.
