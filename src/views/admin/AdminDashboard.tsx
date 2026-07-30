import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  FolderTree,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Users,
  BarChart3,
  Plus,
  FileText,
} from 'lucide-react';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { adminApi, AdminDashboardAnalytics } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalCategories: number;
  recentOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [realtimeNotice, setRealtimeNotice] = useState('');

  const fetchDashboard = useCallback(async () => {
      if (!isSupabaseConfigured()) {
        setStats(null);
        setAnalytics(null);
        setLoading(false);
        return;
      }

      try {
        setFetchError(null);
        const [data, analyticsData] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getDashboardAnalytics(),
        ]);
        setStats(data);
        setAnalytics(analyticsData);
      } catch (err) {
        setFetchError(getErrorMessage(err, 'Failed to load dashboard data.'));
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setRealtimeNotice('New order received');
        fetchDashboard();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setRealtimeNotice('New customer activity');
        fetchDashboard();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory' }, () => {
        setRealtimeNotice('Inventory updated');
        fetchDashboard();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchDashboard]);

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-blue-500',
      link: '/admin/products',
    },
    {
      label: 'Categories',
      value: stats?.totalCategories || 0,
      icon: FolderTree,
      color: 'bg-purple-500',
      link: '/admin/categories',
    },
    {
      label: 'Recent Orders',
      value: stats?.recentOrders || 0,
      icon: ShoppingCart,
      color: 'bg-green-500',
      link: '/admin/orders',
    },
    {
      label: 'Total Revenue',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-himalayan',
      link: '/admin/analytics',
    },
    {
      label: 'Customers',
      value: analytics?.totalCustomers || 0,
      icon: Users,
      color: 'bg-indigo-500',
      link: '/admin/customers',
    },
    {
      label: 'New Customers',
      value: analytics?.newCustomers || 0,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      link: '/admin/customers',
    },
    {
      label: 'Repeat Customers',
      value: analytics?.repeatCustomers || 0,
      icon: Users,
      color: 'bg-purple-500',
      link: '/admin/customers',
    },
    {
      label: 'Inventory Alerts',
      value: analytics?.inventoryAlerts.length || stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      link: '/admin/products?filter=low_stock',
    },
  ];

  const maxRevenue = Math.max(...(analytics?.revenueSeries.map((point) => point.revenue) || [1]), 1);
  const maxProductRevenue = Math.max(...(analytics?.topProducts.map((product) => product.revenue) || [1]), 1);
  const mobileActions = [
    // Creating a product is the Products page's own Add Product button now, so
    // this leads there rather than to a second, more restrictive form.
    { label: 'Add Product', path: '/admin/products', icon: Plus, color: 'bg-himalayan text-white' },
    { label: 'Products', path: '/admin/products', icon: Package, color: 'bg-white text-charcoal' },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart, color: 'bg-white text-charcoal' },
    { label: 'Blog', path: '/admin/blog', icon: FileText, color: 'bg-white text-charcoal' },
    { label: 'Customers', path: '/admin/customers', icon: Users, color: 'bg-white text-charcoal' },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, color: 'bg-white text-charcoal' },
  ];

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
            <p className="text-charcoal-light">Welcome back! Here&apos;s what&apos;s happening.</p>
          </div>
          {realtimeNotice && (
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
              {realtimeNotice}
            </div>
          )}
        </div>
      </div>

      {!isSupabaseConfigured() && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Supabase not connected</p>
          <p className="mt-1">Add Supabase environment variables to view live orders, revenue, and inventory.</p>
        </div>
      )}

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Dashboard failed to load</p>
          <p className="mt-1">{fetchError}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="lg:hidden grid grid-cols-2 gap-3">
        {mobileActions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className={`min-h-[72px] rounded-2xl shadow-sm p-4 flex items-center gap-3 ${action.color}`}
          >
            <action.icon size={20} />
            <span className="font-semibold text-sm">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={stat.link}
              className="block bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={18} className="text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-sm text-charcoal-light">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid xl:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2 bg-white rounded-2xl p-4 lg:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-charcoal">Revenue Analytics</h3>
                <p className="text-sm text-charcoal-light">Last 7 days revenue and order volume</p>
              </div>
              <BarChart3 size={20} className="text-himalayan" />
            </div>
            <div className="h-64 flex items-end gap-3">
              {analytics.revenueSeries.map((point) => (
                <div key={point.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-48 bg-gray-50 rounded-xl overflow-hidden">
                    <div
                      className="w-full bg-himalayan rounded-t-xl min-h-2 transition-all"
                      style={{ height: `${Math.max(6, (point.revenue / maxRevenue) * 100)}%` }}
                      title={`$${point.revenue.toFixed(2)} · ${point.orders} orders`}
                    />
                  </div>
                  <span className="text-xs text-charcoal-light">{point.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm"
          >
            <h3 className="font-semibold text-charcoal mb-4">Orders Analytics</h3>
            <div className="space-y-3">
              {Object.entries(analytics.orderStatusCounts).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-charcoal capitalize">{status}</span>
                    <span className="font-semibold text-charcoal">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-himalayan rounded-full"
                      style={{ width: `${stats?.recentOrders ? Math.min(100, (count / stats.recentOrders) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-2 bg-white rounded-2xl p-4 lg:p-6 shadow-sm"
          >
            <h3 className="font-semibold text-charcoal mb-4">Product Analytics</h3>
            <div className="space-y-4">
              {analytics.topProducts.length === 0 ? (
                <p className="text-sm text-charcoal-light">No product sales yet.</p>
              ) : analytics.topProducts.map((product) => (
                <div key={product.productName}>
                  <div className="flex justify-between gap-4 text-sm mb-1">
                    <span className="font-medium text-charcoal truncate">{product.productName}</span>
                    <span className="text-charcoal-light">${product.revenue.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.max(5, (product.revenue / maxProductRevenue) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-charcoal-light mt-1">{product.quantity} units sold</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm"
          >
            <h3 className="font-semibold text-charcoal mb-4">Inventory Alerts</h3>
            <div className="space-y-3">
              {analytics.inventoryAlerts.length === 0 ? (
                <p className="text-sm text-charcoal-light">No low-stock alerts.</p>
              ) : analytics.inventoryAlerts.map((alert) => (
                <Link
                  key={alert.productId}
                  to="/admin/products?filter=low_stock"
                  className="block p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <p className="text-sm font-medium text-amber-800 line-clamp-1">{alert.productName}</p>
                  <p className="text-xs text-amber-700">Qty {alert.quantity} · threshold {alert.threshold}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Alerts & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        {(stats?.lowStockCount || 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Low Stock Alert</h3>
                <p className="text-sm text-amber-700 mt-1">
                  {stats?.lowStockCount} products are running low on stock and need attention.
                </p>
                <Link
                  to="/admin/products?filter=low_stock"
                  className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-800 hover:underline"
                >
                  View Products
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-5 shadow-sm"
        >
          <h3 className="font-semibold text-charcoal mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/products?action=new"
              className="flex items-center gap-3 p-3 bg-himalayan/5 rounded-xl hover:bg-himalayan/10 transition-colors"
            >
              <Package size={18} className="text-himalayan" />
              <span className="text-sm font-medium text-charcoal">Add Product</span>
            </Link>
            <Link
              to="/admin/categories"
              className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <FolderTree size={18} className="text-purple-600" />
              <span className="text-sm font-medium text-charcoal">Add Category</span>
            </Link>
            <Link
              to="/admin/orders"
              className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <ShoppingCart size={18} className="text-green-600" />
              <span className="text-sm font-medium text-charcoal">View Orders</span>
            </Link>
            <Link
              to="/admin/analytics"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <TrendingUp size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-charcoal">Analytics</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm"
      >
        <h3 className="font-semibold text-charcoal mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {(analytics?.recentActivity || []).length === 0 ? (
            <p className="text-sm text-charcoal-light">No recent activity yet.</p>
          ) : analytics?.recentActivity.map((item) => (
            <div key={`${item.type}-${item.id}`} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activityColor(item.type)}`}>
                {item.type === 'order' ? <ShoppingCart size={18} /> : item.type === 'inventory' ? <Package size={18} /> : <Users size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-charcoal">{item.action}</p>
                <p className="text-xs text-charcoal-light">{new Date(item.time).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function activityColor(type: 'order' | 'customer' | 'inventory') {
  if (type === 'order') return 'text-green-600 bg-green-50';
  if (type === 'customer') return 'text-purple-600 bg-purple-50';
  return 'text-amber-600 bg-amber-50';
}
