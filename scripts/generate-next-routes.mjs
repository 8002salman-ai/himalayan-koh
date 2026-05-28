import fs from 'fs';
import path from 'path';

const root = 'src/app';

function page(routeDir, mod, extra) {
  const full = path.join(root, routeDir);
  fs.mkdirSync(full, { recursive: true });
  const content = extra
    ? `'use client';\nimport C from '${mod}';\nexport default function Page() { return <C ${extra} />; }\n`
    : `'use client';\nexport { default } from '${mod}';\n`;
  fs.writeFileSync(path.join(full, 'page.tsx'), content);
}

const main = [
  ['(main)', '@/views/HomePage'],
  ['(main)/products', '@/views/ProductsPage'],
  ['(main)/products/[slug]', '@/views/ProductDetailPage'],
  ['(main)/about', '@/views/AboutPage'],
  ['(main)/blog', '@/views/BlogPage'],
  ['(main)/blog/[slug]', '@/views/BlogDetailPage'],
  ['(main)/gallery', '@/views/GalleryPage'],
  ['(main)/contact', '@/views/ContactPage'],
  ['(main)/checkout', '@/views/CheckoutPage'],
  ['(main)/checkout/success', '@/views/CheckoutSuccessPage'],
  ['(main)/checkout/cancel', '@/views/CheckoutCancelPage'],
  ['(main)/checkout/failed', '@/views/CheckoutFailedPage'],
  ['(main)/order-confirmation', '@/views/OrderConfirmationPage'],
];
main.forEach(([d, m]) => page(d, m));

page('(main)/terms', '@/views/LegalPage', 'type="terms"');
page('(main)/privacy', '@/views/LegalPage', 'type="privacy"');

const auth = [
  ['(auth)/login', '@/views/auth/LoginPage'],
  ['(auth)/signup', '@/views/auth/SignupPage'],
  ['(auth)/forgot-password', '@/views/auth/ForgotPasswordPage'],
  ['(auth)/reset-password', '@/views/auth/ResetPasswordPage'],
  ['(auth)/verify-email', '@/views/auth/VerifyEmailPage'],
];
auth.forEach(([d, m]) => page(d, m));

const prot = [
  ['(protected)/account', '@/views/AccountPage'],
  ['(protected)/orders', '@/views/OrdersPage'],
  ['(protected)/orders/[orderId]', '@/views/OrderDetailPage'],
  ['(protected)/wishlist', '@/views/WishlistPage'],
];
prot.forEach(([d, m]) => page(d, m));

const admin = [
  ['admin', '@/views/admin/AdminDashboard'],
  ['admin/products', '@/views/admin/AdminProducts'],
  ['admin/categories', '@/views/admin/AdminCategories'],
  ['admin/orders', '@/views/admin/AdminOrders'],
  ['admin/blog', '@/views/admin/AdminBlog'],
  ['admin/category-hubs', '@/views/admin/AdminCategoryHubs'],
  ['admin/customers', '@/views/admin/AdminCustomers'],
  ['admin/analytics', '@/views/admin/AdminAnalytics'],
];
admin.forEach(([d, m]) => page(d, m));

fs.writeFileSync(
  path.join(root, 'not-found.tsx'),
  `'use client';\nexport { default } from '@/views/NotFoundPage';\n`
);

console.log('Next.js routes generated.');
